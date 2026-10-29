import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { PathInspection } from '../types.js';

/**
 * Strips Windows extended-length path prefixes (e.g., \\?\ or \??\) and resolves relative targets.
 */
export function normalizeLinkTarget(linkPath: string, rawTarget: string): string {
  const cleaned = rawTarget.replace(/^(\\\\\?\\|\\\?\?\\)/, '');
  if (path.isAbsolute(cleaned)) {
    return path.resolve(cleaned);
  }
  return path.resolve(path.dirname(linkPath), cleaned);
}

function resolveCanonicalPath(p: string): string {
  const stripped = p.replace(/^(\\\\\?\\|\\\?\?\\)/, '');
  try {
    return fs.realpathSync.native(stripped).replace(/^(\\\\\?\\|\\\?\?\\)/, '');
  } catch {
    return path.resolve(stripped);
  }
}

/**
 * Compares two filesystem paths, resolving Windows 8.3 short names and respecting OS case sensitivity.
 */
export function arePathsEqual(
  pathA: string,
  pathB: string,
  platform: NodeJS.Platform = process.platform
): boolean {
  const normA = resolveCanonicalPath(pathA);
  const normB = resolveCanonicalPath(pathB);
  if (platform === 'win32' || platform === 'darwin') {
    return normA.toLowerCase() === normB.toLowerCase();
  }
  return normA === normB;
}

/**
 * Inspects a path using `lstatSync` (never following symlinks/junctions).
 * Safely detects broken symlinks/junctions as well as active ones.
 */
export function inspectPath(targetPath: string): PathInspection {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(targetPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { state: 'missing' };
    }
    throw err;
  }

  if (stat.isSymbolicLink()) {
    const rawTarget = fs.readlinkSync(targetPath);
    const resolvedTarget = normalizeLinkTarget(targetPath, rawTarget);
    let targetExists = false;
    try {
      targetExists = fs.existsSync(resolvedTarget);
    } catch {
      targetExists = false;
    }
    return {
      state: 'link',
      linkTarget: rawTarget,
      resolvedTarget,
      targetExists
    };
  }

  if (stat.isDirectory()) {
    return { state: 'directory' };
  }

  return { state: 'file' };
}

/**
 * Atomically writes a UTF-8 file by writing to a temporary sibling file, flushing to disk,
 * and renaming into place. Refuses to follow or overwrite a symlink at `filePath`.
 */
export function writeFileAtomicSync(filePath: string, content: string): void {
  const resolved = path.resolve(filePath);
  const info = inspectPath(resolved);
  if (info.state === 'link') {
    throw new Error(
      `Security violation: refusing to overwrite symlinked file at "${resolved}".`
    );
  }
  if (info.state === 'directory') {
    throw new Error(
      `Cannot write file at "${resolved}": a directory exists at this path.`
    );
  }

  const parentDir = path.dirname(resolved);
  const parentInfo = inspectPath(parentDir);
  if (parentInfo.state === 'link') {
    throw new Error(
      `Security violation: parent directory "${parentDir}" is a symlink/junction.`
    );
  }
  if (parentInfo.state === 'missing') {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const rand = crypto.randomBytes(4).toString('hex');
  const tmpPath = `${resolved}.tmp-${process.pid}-${rand}`;

  let fd: number | null = null;
  try {
    fd = fs.openSync(tmpPath, 'w', 0o600);
    fs.writeFileSync(fd, content, 'utf8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;
    fs.renameSync(tmpPath, resolved);
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Ignore close error
      }
    }
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // Ignore cleanup error
    }
    throw err;
  }
}

/**
 * Creates a directory link:
 * - Windows (`win32`): NTFS Junction (`'junction'`), which requires NO admin privileges or Developer Mode.
 * - Linux / macOS: Directory symlink (`'dir'`).
 */
export function createDirectoryLink(
  linkPath: string,
  targetDirPath: string,
  platform: NodeJS.Platform = process.platform
): void {
  const resolvedTarget = path.resolve(targetDirPath);
  const targetInfo = inspectPath(resolvedTarget);
  if (targetInfo.state !== 'directory') {
    throw new Error(
      `Cannot create link at "${linkPath}": target "${resolvedTarget}" is not a physical directory (state=${targetInfo.state})`
    );
  }

  const existingInfo = inspectPath(linkPath);
  if (existingInfo.state !== 'missing') {
    throw new Error(
      `Cannot create link at "${linkPath}": path already exists (state=${existingInfo.state})`
    );
  }

  const parentDir = path.dirname(linkPath);
  const parentInfo = inspectPath(parentDir);
  if (parentInfo.state === 'link') {
    throw new Error(
      `Security violation: parent directory "${parentDir}" is a symlink/junction. Refusing to create nested link inside a linked parent.`
    );
  }
  if (parentInfo.state === 'missing') {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  const linkType = platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(resolvedTarget, path.resolve(linkPath), linkType);
}

/**
 * Detaches a symlink or NTFS junction WITHOUT ever touching the target directory's contents.
 * Throws if the path is a physical directory or file.
 */
export function detachLinkSafe(linkPath: string): void {
  const info = inspectPath(linkPath);
  if (info.state === 'missing') {
    return;
  }
  if (info.state !== 'link') {
    throw new Error(
      `Safety violation: refusing to detach "${linkPath}" because it is a physical ${info.state}, not a link/junction.`
    );
  }

  try {
    fs.unlinkSync(linkPath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EPERM' || code === 'EISDIR') {
      fs.rmdirSync(linkPath);
      return;
    }
    throw err;
  }
}

/**
 * Removes a physical directory after first detaching any nested symlinks/junctions inside it,
 * guaranteeing that no external target directory is ever traversed and deleted.
 */
export function removePhysicalDirectorySafe(dirPath: string): void {
  const info = inspectPath(dirPath);
  if (info.state === 'missing') {
    return;
  }
  if (info.state === 'link') {
    throw new Error(
      `Safety violation: "${dirPath}" is a link/junction. Use detachLinkSafe instead of removePhysicalDirectorySafe.`
    );
  }
  if (info.state === 'file') {
    fs.unlinkSync(dirPath);
    return;
  }

  function detachNestedLinks(currentDir: string): void {
    const entries = fs.readdirSync(currentDir);
    for (const name of entries) {
      const fullPath = path.join(currentDir, name);
      const entryInfo = inspectPath(fullPath);
      if (entryInfo.state === 'link') {
        detachLinkSafe(fullPath);
      } else if (entryInfo.state === 'directory') {
        detachNestedLinks(fullPath);
      }
    }
  }

  detachNestedLinks(dirPath);
  fs.rmSync(dirPath, { recursive: true, force: false });
}

/**
 * Computes a deterministic manifest of relative paths -> SHA256 hashes for a physical directory.
 */
function computeDirectoryDigestMap(rootDir: string): Map<string, string> {
  const map = new Map<string, string>();

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir).sort();
    for (const name of entries) {
      const fullPath = path.join(currentDir, name);
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
      const info = inspectPath(fullPath);
      if (info.state === 'link') {
        map.set(relPath, `link:${info.resolvedTarget ?? info.linkTarget ?? ''}`);
      } else if (info.state === 'directory') {
        map.set(relPath, 'dir');
        walk(fullPath);
      } else if (info.state === 'file') {
        const bytes = fs.readFileSync(fullPath);
        const hash = crypto.createHash('sha256').update(bytes).digest('hex');
        map.set(relPath, `file:${hash}`);
      }
    }
  }

  walk(rootDir);
  return map;
}

/**
 * Compares two physical directories byte-for-byte to detect whether a local skill copy
 * has diverged from the central skill.
 */
export function areDirectoriesIdentical(dirA: string, dirB: string): boolean {
  const infoA = inspectPath(dirA);
  const infoB = inspectPath(dirB);
  if (infoA.state !== 'directory' || infoB.state !== 'directory') {
    return false;
  }

  const mapA = computeDirectoryDigestMap(dirA);
  const mapB = computeDirectoryDigestMap(dirB);

  if (mapA.size !== mapB.size) {
    return false;
  }

  for (const [relPath, hashA] of mapA.entries()) {
    if (mapB.get(relPath) !== hashA) {
      return false;
    }
  }

  return true;
}

/**
 * Copies a physical directory recursively without traversing symlinks/junctions.
 */
export function copyDirectorySafe(srcDir: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir);
  for (const name of entries) {
    const srcPath = path.join(srcDir, name);
    const destPath = path.join(destDir, name);
    const info = inspectPath(srcPath);
    if (info.state === 'directory') {
      copyDirectorySafe(srcPath, destPath);
    } else if (info.state === 'file') {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
