import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { detectAgents } from '../agents/detector.js';
import { isSafeSubpath, isValidIdentifier } from '../security/validator.js';
import type { BackupEntry, BackupManifest, EnvironmentContext } from '../types.js';
import {
  arePathsEqual,
  copyDirectorySafe,
  createDirectoryLink,
  inspectPath,
  removePhysicalDirectorySafe,
  writeFileAtomicSync
} from './links.js';

function generateSnapshotId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const ts =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-` +
    `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  const rand = crypto.randomBytes(3).toString('hex');
  return `snapshot-${ts}-${rand}`;
}

export class SnapshotSession {
  public readonly id: string;
  public readonly snapshotDir: string;
  private readonly payloadDir: string;
  private readonly ctx: EnvironmentContext;
  private readonly reason: 'manual' | 'pre-sync';
  private readonly recordedPaths = new Set<string>();
  private readonly entries: BackupEntry[] = [];
  private initialized = false;

  constructor(ctx: EnvironmentContext, reason: 'manual' | 'pre-sync' = 'pre-sync') {
    this.ctx = ctx;
    this.reason = reason;
    this.id = generateSnapshotId();
    this.snapshotDir = path.join(ctx.backupsDir, this.id);
    this.payloadDir = path.join(this.snapshotDir, 'payload');
  }

  private ensureInitialized(): void {
    if (this.initialized) return;
    fs.mkdirSync(this.payloadDir, { recursive: true });
    this.initialized = true;
  }

  public hasEntries(): boolean {
    return this.entries.length > 0;
  }

  public recordPathBeforeModify(
    agentId: string,
    kind: BackupEntry['kind'],
    originalPath: string
  ): void {
    const resolvedOriginal = path.resolve(originalPath);
    const dedupKey =
      this.ctx.platform === 'win32' ? resolvedOriginal.toLowerCase() : resolvedOriginal;
    if (this.recordedPaths.has(dedupKey)) {
      return;
    }
    this.recordedPaths.add(dedupKey);
    this.ensureInitialized();

    const info = inspectPath(resolvedOriginal);
    const index = this.entries.length;
    const safeBase = path.basename(resolvedOriginal).replace(/[^A-Za-z0-9._-]/g, '_');

    if (info.state === 'missing') {
      this.entries.push({
        agentId,
        kind,
        originalPath: resolvedOriginal,
        stateBefore: 'missing'
      });
    } else if (info.state === 'link') {
      this.entries.push({
        agentId,
        kind,
        originalPath: resolvedOriginal,
        stateBefore: 'link',
        linkTarget: info.resolvedTarget ?? info.linkTarget
      });
    } else if (info.state === 'file') {
      const relPayload = `payload/${index}_${safeBase}`;
      const destFile = path.join(this.snapshotDir, relPayload);
      fs.copyFileSync(resolvedOriginal, destFile);
      this.entries.push({
        agentId,
        kind,
        originalPath: resolvedOriginal,
        stateBefore: 'file',
        backupRelativePath: relPayload
      });
    } else if (info.state === 'directory') {
      const relPayload = `payload/${index}_${safeBase}`;
      const destDir = path.join(this.snapshotDir, relPayload);
      copyDirectorySafe(resolvedOriginal, destDir);
      this.entries.push({
        agentId,
        kind,
        originalPath: resolvedOriginal,
        stateBefore: 'directory',
        backupRelativePath: relPayload
      });
    }

    this.commitManifest();
  }

  public commitManifest(): BackupManifest {
    this.ensureInitialized();
    const manifest: BackupManifest = {
      id: this.id,
      version: 1,
      createdAt: new Date().toISOString(),
      reason: this.reason,
      platform: this.ctx.platform,
      entries: this.entries
    };
    const manifestPath = path.join(this.snapshotDir, 'manifest.json');
    writeFileAtomicSync(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  }
}

/**
 * Creates a full point-in-time backup snapshot of central skills/MCP and all detected agents.
 */
export function createFullBackup(
  ctx: EnvironmentContext,
  reason: 'manual' | 'pre-sync' = 'manual'
): BackupManifest {
  const session = new SnapshotSession(ctx, reason);

  if (inspectPath(ctx.centralMcpPath).state === 'file') {
    session.recordPathBeforeModify('commons', 'mcp-config', ctx.centralMcpPath);
  }

  if (inspectPath(ctx.centralSkillsDir).state === 'directory') {
    const centralEntries = fs.readdirSync(ctx.centralSkillsDir);
    for (const name of centralEntries) {
      const skillPath = path.join(ctx.centralSkillsDir, name);
      const info = inspectPath(skillPath);
      if (info.state === 'directory' || info.state === 'link') {
        session.recordPathBeforeModify('commons', 'central-skill', skillPath);
      }
    }
  }

  const detected = detectAgents(ctx);
  for (const agent of detected) {
    if (!agent.installed) continue;

    if (agent.mcpConfigPath && inspectPath(agent.mcpConfigPath).state === 'file') {
      session.recordPathBeforeModify(agent.definition.id, 'mcp-config', agent.mcpConfigPath);
    }

    if (inspectPath(agent.skillsDirPath).state === 'directory') {
      const skillEntries = fs.readdirSync(agent.skillsDirPath);
      for (const name of skillEntries) {
        const entryPath = path.join(agent.skillsDirPath, name);
        session.recordPathBeforeModify(agent.definition.id, 'skill-entry', entryPath);
      }
    }
  }

  return session.commitManifest();
}

/**
 * Lists all valid backup snapshots sorted newest-first.
 */
export function listBackups(ctx: EnvironmentContext): BackupManifest[] {
  if (inspectPath(ctx.backupsDir).state !== 'directory') {
    return [];
  }

  const dirs = fs.readdirSync(ctx.backupsDir);
  const manifests: BackupManifest[] = [];

  for (const name of dirs) {
    const manifestPath = path.join(ctx.backupsDir, name, 'manifest.json');
    if (inspectPath(manifestPath).state === 'file') {
      try {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const parsed = JSON.parse(raw) as BackupManifest;
        if (parsed && parsed.version === 1 && Array.isArray(parsed.entries)) {
          manifests.push(parsed);
        }
      } catch {
        // Ignore unreadable backup folders
      }
    }
  }

  manifests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return manifests;
}


/**
 * Verify every restored directory payload before touching any destination.
 * Otherwise copyDirectorySafe can discover a nested link only after its
 * original target has already been deleted during restore.
 */
function preflightPhysicalPayloadTree(root: string): void {
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop()!;
    for (const name of fs.readdirSync(directory)) {
      const child = path.join(directory, name);
      const info = fs.lstatSync(child);
      if (info.isSymbolicLink()) {
        throw new Error('Snapshot payload contains a linked entry; nothing was restored.');
      }
      if (info.isDirectory()) {
        pending.push(child);
      } else if (!info.isFile()) {
        throw new Error('Snapshot payload contains an unsupported entry; nothing was restored.');
      }
    }
  }
}

/**
 * Preflight the COMPLETE snapshot before deleting anything. Backup manifests are local
 * files and must not be trusted as a list of arbitrary paths to overwrite or remove.
 * A missing/corrupt payload must fail before the first destructive operation.
 */
function preflightRestore(
  ctx: EnvironmentContext,
  manifest: BackupManifest,
  selectedId: string
): string {
  if (
    !isValidIdentifier(selectedId) ||
    !manifest ||
    manifest.version !== 1 ||
    manifest.id !== selectedId ||
    !Array.isArray(manifest.entries)
  ) {
    throw new Error('Invalid snapshot manifest or snapshot ID mismatch.');
  }
  if (manifest.platform !== ctx.platform) {
    throw new Error('Snapshot platform differs from the current platform.');
  }

  const snapshotDir = path.join(ctx.backupsDir, selectedId);
  if (inspectPath(ctx.backupsDir).state !== 'directory' ||
      inspectPath(snapshotDir).state !== 'directory' ||
      inspectPath(path.join(snapshotDir, 'manifest.json')).state !== 'file') {
    throw new Error('Snapshot directories and manifest must be physical paths, not links.');
  }

  const payloadDir = path.join(snapshotDir, 'payload');
  const agents = detectAgents(ctx);
  const seen = new Set<string>();

  for (const entry of manifest.entries) {
    if (!entry || typeof entry.originalPath !== 'string' ||
        typeof entry.agentId !== 'string' ||
        !['central-skill', 'skill-entry', 'mcp-config'].includes(entry.kind) ||
        !['missing', 'link', 'file', 'directory'].includes(entry.stateBefore)) {
      throw new Error('Invalid backup entry in snapshot manifest.');
    }

    const targetPath = path.resolve(entry.originalPath);
    const agent = agents.find((a) => a.definition.id === entry.agentId);
    const isImmediateSkill = (parent: string): boolean =>
      arePathsEqual(path.dirname(targetPath), parent, ctx.platform) &&
      isValidIdentifier(path.basename(targetPath));

    const allowed =
      (entry.kind === 'central-skill' &&
        entry.agentId === 'commons' &&
        isImmediateSkill(ctx.centralSkillsDir)) ||
      (entry.kind === 'skill-entry' &&
        Boolean(agent && isImmediateSkill(agent.skillsDirPath))) ||
      (entry.kind === 'mcp-config' &&
        ((entry.agentId === 'commons' &&
          arePathsEqual(targetPath, ctx.centralMcpPath, ctx.platform)) ||
          Boolean(agent?.mcpConfigPath &&
            arePathsEqual(targetPath, agent.mcpConfigPath, ctx.platform))));

    if (!allowed) {
      throw new Error('Security violation: snapshot attempts to restore an unmanaged path.');
    }

    const pathKey = ctx.platform === 'win32' ? targetPath.toLowerCase() : targetPath;
    if (seen.has(pathKey)) {
      throw new Error('Invalid snapshot: duplicate restore path.');
    }
    seen.add(pathKey);

    // Reject a junction/symlink in any parent directory: lstat(target) alone
    // would otherwise miss writes through an ancestor link.
    const boundary = isSafeSubpath(ctx.homeDir, targetPath)
      ? ctx.homeDir
      : ctx.localAppDataDir;
    let parent = path.dirname(targetPath);
    while (!arePathsEqual(parent, boundary, ctx.platform)) {
      if (inspectPath(parent).state === 'link') {
        throw new Error('Security violation: restore destination has a linked ancestor.');
      }
      const next = path.dirname(parent);
      if (next === parent) {
        throw new Error('Security violation: restore destination escaped its root.');
      }
      parent = next;
    }

    if (entry.stateBefore === 'link') {
      if (typeof entry.linkTarget !== 'string' ||
          inspectPath(entry.linkTarget).state !== 'directory') {
        throw new Error('Snapshot link target is missing or invalid; refusing destructive restore.');
      }
    } else if (entry.stateBefore === 'file' || entry.stateBefore === 'directory') {
      if (typeof entry.backupRelativePath !== 'string' ||
          !entry.backupRelativePath.startsWith('payload/') ||
          !/^[A-Za-z0-9._-]+$/.test(entry.backupRelativePath.slice('payload/'.length))) {
        throw new Error('Invalid or missing snapshot payload path.');
      }
      const sourcePath = path.resolve(snapshotDir, entry.backupRelativePath);
      const expectedState = entry.stateBefore;
      if (!isSafeSubpath(payloadDir, sourcePath) ||
          inspectPath(payloadDir).state !== 'directory' ||
          inspectPath(sourcePath).state !== expectedState) {
        throw new Error('Snapshot payload is missing, linked, or has the wrong type; nothing was restored.');
      }
      if (expectedState === 'directory') {
        preflightPhysicalPayloadTree(sourcePath);
      }
    }
  }

  return snapshotDir;
}

/**
 * Restores a backup snapshot by ID (or 'latest' / omitted for the most recent snapshot).
 * Enforces strict path boundary checks and never follows symlinks/junctions when clearing paths.
 */
export function restoreBackup(ctx: EnvironmentContext, snapshotId?: string): BackupManifest {
  let targetManifest: BackupManifest | undefined;

  if (!snapshotId || snapshotId === 'latest') {
    const all = listBackups(ctx);
    if (all.length === 0) {
      throw new Error(
        `No backup snapshots found in "${ctx.backupsDir}". Run "agent-commons backup" first.`
      );
    }
    targetManifest = all[0];
  } else {
    if (!isValidIdentifier(snapshotId)) {
      throw new Error(`Invalid snapshot identifier: "${snapshotId}".`);
    }
    const snapshotDir = path.join(ctx.backupsDir, snapshotId);
    if (!isSafeSubpath(ctx.backupsDir, snapshotDir)) {
      throw new Error(`Snapshot path outside backups directory: "${snapshotId}".`);
    }
    const manifestPath = path.join(snapshotDir, 'manifest.json');
    if (inspectPath(manifestPath).state !== 'file') {
      throw new Error(`Snapshot "${snapshotId}" does not exist at "${manifestPath}".`);
    }
    targetManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BackupManifest;
  }

  if (!targetManifest) {
    throw new Error('Could not load backup manifest.');
  }

  const selectedId = snapshotId && snapshotId !== 'latest' ? snapshotId : targetManifest.id;
  const snapshotDir = preflightRestore(ctx, targetManifest, selectedId);

  // Every replacement is prepared on the destination filesystem BEFORE any original
  // is moved. Moving existing paths aside (rather than deleting them) lets us roll back
  // earlier entries when a later rename fails. Staging next to each destination avoids
  // cross-device rename failures for localAppData on another volume.
  interface RestoreStage {
    target: string;
    temporaryDir: string;
    initialState: string;
    displaced: boolean;
    installed: boolean;
    installedFingerprint?: string;
  }
  const stages: RestoreStage[] = [];

  // Fingerprint the entire physical tree, not just the directory inode.
  // In-place edits to SKILL.md do not necessarily change the parent directory.
  // lstat never traverses symlinks/junctions; metadata checks are best-effort,
  // not a filesystem-wide atomic lock against concurrent writers.
  const fingerprint = (target: string): string => {
    if (inspectPath(target).state === 'missing') return 'missing';
    const hash = crypto.createHash('sha256');
    const pending: Array<{ absolute: string; relative: string }> =
      [{ absolute: target, relative: '.' }];
    while (pending.length > 0) {
      const { absolute, relative } = pending.pop()!;
      const stat = fs.lstatSync(absolute);
      hash.update(JSON.stringify([relative, stat.dev, stat.ino, stat.mode,
        stat.size, stat.mtimeMs, stat.ctimeMs, stat.nlink]) + '\n');
      if (stat.isSymbolicLink()) {
        hash.update(JSON.stringify(fs.readlinkSync(absolute)) + '\n');
      } else if (stat.isDirectory()) {
        for (const name of fs.readdirSync(absolute).sort().reverse()) {
          pending.push({
            absolute: path.join(absolute, name),
            relative: relative === '.' ? name : relative + '/' + name
          });
        }
      }
    }
    return hash.digest('hex');
  };

  const assertPhysicalParents = (target: string): void => {
    const boundary = isSafeSubpath(ctx.homeDir, target) ? ctx.homeDir : ctx.localAppDataDir;
    let parent = path.dirname(target);
    while (!arePathsEqual(parent, boundary, ctx.platform)) {
      if (inspectPath(parent).state === 'link') {
        throw new Error('Security violation: restore destination has a linked ancestor.');
      }
      const next = path.dirname(parent);
      if (next === parent) throw new Error('Security violation: restore destination escaped its root.');
      parent = next;
    }
  };

  try {
    for (const entry of [...targetManifest.entries].reverse()) {
      const target = path.resolve(entry.originalPath);
      assertPhysicalParents(target);
      const initialState = fingerprint(target);
      const parentDir = path.dirname(target);
      fs.mkdirSync(parentDir, { recursive: true });
      assertPhysicalParents(target);
      const temporaryDir = fs.mkdtempSync(path.join(parentDir, '.agent-commons-restore-'));
      const stage: RestoreStage = { target, temporaryDir, initialState,
        displaced: false, installed: false };
      stages.push(stage);

      const replacement = path.join(temporaryDir, 'replacement');
      if (entry.stateBefore === 'file' && entry.backupRelativePath) {
        fs.copyFileSync(path.join(snapshotDir, entry.backupRelativePath), replacement,
          fs.constants.COPYFILE_EXCL);
      } else if (entry.stateBefore === 'directory' && entry.backupRelativePath) {
        copyDirectorySafe(path.join(snapshotDir, entry.backupRelativePath), replacement);
      } else if (entry.stateBefore === 'link') {
        createDirectoryLink(replacement, entry.linkTarget!, ctx.platform);
      }
    }

    for (const stage of stages) {
      assertPhysicalParents(stage.target);
      if (fingerprint(stage.target) !== stage.initialState) {
        throw new Error('Restore destination changed during preparation; refusing stale restore.');
      }
      if (stage.initialState !== 'missing') {
        fs.renameSync(stage.target, path.join(stage.temporaryDir, 'original'));
        stage.displaced = true;
      }
      // On POSIX, rename would silently replace a freshly created target.
      // Reject it rather than overwriting another process's new file.
      if (inspectPath(stage.target).state !== 'missing') {
        throw new Error('Restore destination appeared during commit; refusing overwrite.');
      }
      if (inspectPath(path.join(stage.temporaryDir, 'replacement')).state !== 'missing') {
        fs.renameSync(path.join(stage.temporaryDir, 'replacement'), stage.target);
        stage.installed = true;
        stage.installedFingerprint = fingerprint(stage.target);
      }
    }
  } catch (error) {
    // Reverse every already-applied entry, including the entry whose installation
    // failed. Keep staging directories intact if rollback fails: they contain the
    // originals, which must never be silently deleted during cleanup.
    let rollbackFailed = false;
    for (const stage of [...stages].reverse()) {
      try {
        if (stage.installed) {
          // A separate writer may have changed our replacement: do not
          // destroy its modifications during recovery.
          if (fingerprint(stage.target) !== stage.installedFingerprint) {
            throw new Error('Restore target was modified during rollback.');
          }
          fs.renameSync(stage.target, path.join(stage.temporaryDir, 'discarded'));
        }
        if (stage.displaced) {
          // Do not overwrite a new, independently-created target on Unix.
          if (inspectPath(stage.target).state !== 'missing') {
            throw new Error('Restore target was recreated during rollback.');
          }
          fs.renameSync(path.join(stage.temporaryDir, 'original'), stage.target);
        }
      } catch {
        rollbackFailed = true;
      }
    }
    if (rollbackFailed) {
      throw new Error('Restore failed and rollback was incomplete. Original data remains in restore staging folders.', { cause: error });
    }
    for (const stage of stages) removePhysicalDirectorySafe(stage.temporaryDir);
    throw error;
  }

  // Only discard old destinations after the entire restore was committed.
  for (const stage of stages) removePhysicalDirectorySafe(stage.temporaryDir);
  return targetManifest;
}
