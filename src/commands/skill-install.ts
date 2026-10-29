import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createFullBackup, SnapshotSession, restoreBackup } from '../core/backup.js';
import { detectAgents } from '../agents/detector.js';
import { arePathsEqual, inspectPath, removePhysicalDirectorySafe, writeFileAtomicSync } from '../core/links.js';
import { readPublicCatalog, type PublicSkill } from './public-catalog.js';
import type { EnvironmentContext } from '../types.js';

const MAX_FILES = 150;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_TREE_ENTRIES = 20000;
const RECEIPT_NAME = '.agent-commons-source.json';
const SEGMENT = /^[A-Za-z0-9_. -]+$/;

export interface InstallFile {
  relativePath: string;
  sha: string;
  size: number;
}
export interface InstallPreview {
  skill: string;
  source: string;
  commit: string;
  license: string;
  target: string;
  files: InstallFile[];
  totalBytes: number;
  installed: false;
}
export interface InstallOutcome {
  preview: InstallPreview;
  installed: boolean;
  snapshotId: string | null;
}
export type FetchJson = (url: string) => Promise<unknown>;

function canonicalGitHubRepository(repo: string): { owner: string; name: string } {
  const u = new URL(repo);
  const parts = u.pathname.split('/').filter(Boolean);
  if (u.protocol !== 'https:' || u.hostname !== 'github.com' || parts.length !== 2 ||
      !parts.every(p => /^[A-Za-z0-9_.-]+$/.test(p))) {
    throw new Error('Secure installer currently supports public GitHub repositories only.');
  }
  return { owner: parts[0]!, name: parts[1]! };
}

function assertPhysicalRoots(ctx: EnvironmentContext): void {
  if (inspectPath(ctx.homeDir).state !== 'directory') {
    throw new Error('Home directory must be a physical directory.');
  }
  for (const p of [ctx.commonsDir, ctx.centralSkillsDir, ctx.backupsDir]) {
    const state = inspectPath(p).state;
    if (state !== 'missing' && state !== 'directory') {
      throw new Error('Refusing linked or invalid Agent Commons directory.');
    }
  }
}

/** Network is only used on explicit install/preview; catalog browsing remains offline. */
export const githubJson: FetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'agent-commons' },
    redirect: 'error',
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error('Upstream GitHub request failed (HTTP ' + response.status + ').');
  return await response.json() as unknown;
};

function entryPathSafe(relative: string): boolean {
  return relative.length > 0 && relative.length < 500 &&
    relative.split('/').every(segment =>
      segment !== '.' && segment !== '..' && SEGMENT.test(segment) && !segment.endsWith('.') &&
      segment.toLowerCase() !== RECEIPT_NAME && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment));
}
function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object' && !Array.isArray(input);
}

function currentSkill(ctx: EnvironmentContext, id: string): PublicSkill {
  const { catalog } = readPublicCatalog();
  const skill = catalog.skills.find(s => s.id === id);
  if (!skill) throw new Error('Skill is not in the reviewed public catalog.');
  if (skill.lifecycle === 'archived') throw new Error('Archived skill: installation disabled.');
  return skill;
}

export async function previewCatalogInstall(
  ctx: EnvironmentContext,
  id: string,
  fetchJson: FetchJson = githubJson
): Promise<InstallPreview> {
  const skill = currentSkill(ctx, id);
  assertPhysicalRoots(ctx);
  const target = path.join(ctx.centralSkillsDir, id);
  if (inspectPath(target).state !== 'missing') {
    throw new Error('Skill already exists locally; refusing overwrite (including links).');
  }
  return previewPinnedFiles(ctx, skill, fetchJson);
}

async function previewPinnedFiles(
  ctx: EnvironmentContext, skill: PublicSkill, fetchJson: FetchJson
): Promise<InstallPreview> {
  const target = path.join(ctx.centralSkillsDir, skill.id);
  const { owner, name } = canonicalGitHubRepository(skill.repository);
  const url = 'https://api.github.com/repos/' + owner + '/' + name +
    '/git/trees/' + skill.ref + '?recursive=1';
  const response = await fetchJson(url);
  if (!isRecord(response) || !Array.isArray(response.tree) || response.truncated === true ||
      response.tree.length > MAX_TREE_ENTRIES) {
    throw new Error('Invalid or truncated upstream Git tree.');
  }

  const prefix = skill.path === '.' ? '' : skill.path + '/';
  const files: InstallFile[] = [];
  let totalBytes = 0;
  for (const raw of response.tree) {
    if (!isRecord(raw) || typeof raw.path !== 'string' || !raw.path.startsWith(prefix)) continue;
    const relativePath = raw.path.slice(prefix.length);
    if (!relativePath) continue;
    if (!entryPathSafe(relativePath)) {
      throw new Error('Unsafe path in upstream skill tree.');
    }
    if (raw.type !== 'blob' || raw.mode !== '100644' && raw.mode !== '100755') {
      // Git symlinks (120000), gitlinks (160000) and unknown entry types must
      // never be written. Directory entries are handled implicitly.
      if (raw.type === 'tree' && raw.mode === '040000') continue;
      throw new Error('Unsupported or linked entry in upstream skill tree.');
    }
    if (typeof raw.sha !== 'string' || !/^[a-f0-9]{40}$/.test(raw.sha) ||
        typeof raw.size !== 'number' || !Number.isSafeInteger(raw.size) ||
        raw.size < 0 || raw.size > MAX_FILE_BYTES) {
      throw new Error('Unsafe or oversized upstream skill file.');
    }
    totalBytes += raw.size;
    files.push({ relativePath, sha: raw.sha, size: raw.size });
    if (files.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
      throw new Error('Skill exceeds safe installation limits.');
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (!files.some(x => x.relativePath === 'SKILL.md')) {
    throw new Error('Upstream revision does not contain a root SKILL.md.');
  }
  if (new Set(files.map(x => x.relativePath.toLowerCase())).size !== files.length) {
    throw new Error('Case-insensitive path collision in upstream skill.');
  }
  return { skill: skill.id, source: skill.source, commit: skill.ref,
    license: skill.license, target, files, totalBytes, installed: false };
}

function decodeVerifiedBlob(input: unknown, file: InstallFile): Buffer {
  if (!isRecord(input) || input.encoding !== 'base64' || typeof input.content !== 'string' ||
      typeof input.size !== 'number' || input.size !== file.size ||
      typeof input.sha !== 'string' || input.sha !== file.sha) {
    throw new Error('GitHub blob metadata mismatch.');
  }
  const encoded = input.content.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error('Invalid upstream blob encoding.');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.length !== file.size) throw new Error('Downloaded blob size mismatch.');
  const expectedHash = crypto.createHash('sha1')
    .update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  if (expectedHash !== file.sha) throw new Error('Downloaded blob hash mismatch.');
  return bytes;
}

/**
 * Installs only an ABSENT reviewed GitHub skill at its exact pinned commit.
 * The default is preview-only; an explicit --yes is mandatory for filesystem writes.
 * Any staging failure leaves an existing skill untouched.
 */
export async function installCatalogSkill(
  ctx: EnvironmentContext,
  id: string,
  options: { yes?: boolean; fetchJson?: FetchJson } = {}
): Promise<InstallOutcome> {
  const fetchJson = options.fetchJson ?? githubJson;
  const preview = await previewCatalogInstall(ctx, id, fetchJson);
  if (!options.yes) return { preview, installed: false, snapshotId: null };

  // Recheck before changing the filesystem, and refuse any pre-existing skill.
  assertPhysicalRoots(ctx);
  if (inspectPath(preview.target).state !== 'missing') {
    throw new Error('Skill appeared during preflight; refusing to overwrite it.');
  }
  const skill = currentSkill(ctx, id);
  const { owner, name } = canonicalGitHubRepository(skill.repository);
  fs.mkdirSync(ctx.commonsDir, { recursive: true });
  const staging = fs.mkdtempSync(path.join(ctx.commonsDir, '.agent-commons-stage-'));
  let moved = false;
  try {
    for (const file of preview.files) {
      const remote = 'https://api.github.com/repos/' + owner + '/' + name +
        '/git/blobs/' + file.sha;
      const bytes = decodeVerifiedBlob(await fetchJson(remote), file);
      const destination = path.join(staging, ...file.relativePath.split('/'));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const receipt = {
      schemaVersion: 1, skill: id, repository: skill.repository,
      source: skill.source, commit: skill.ref, managedBy: 'agent-commons',
      files: preview.files.map(x => ({ path: x.relativePath, gitBlobSha1: x.sha }))
    };
    writeFileAtomicSync(path.join(staging, RECEIPT_NAME), JSON.stringify(receipt, null, 2));
    // A snapshot is taken before introducing the new managed directory.
    const snapshot = createFullBackup(ctx);
    fs.mkdirSync(ctx.centralSkillsDir, { recursive: true });
    if (inspectPath(preview.target).state !== 'missing') {
      throw new Error('Target appeared after snapshot; refusing to overwrite.');
    }
    fs.renameSync(staging, preview.target);
    moved = true;
    return { preview, installed: true, snapshotId: snapshot.id };
  } finally {
    if (!moved && inspectPath(staging).state === 'directory') {
      removePhysicalDirectorySafe(staging);
    }
  }
}


export interface UninstallPreview {
  skill: string;
  source: string;
  commit: string;
  target: string;
  files: string[];
  totalBytes: number;
  clean: true;
}
export interface UninstallOutcome {
  preview: UninstallPreview;
  removed: boolean;
  snapshotId: string | null;
}

interface ManagedReceipt {
  schemaVersion: 1;
  skill: string;
  repository: string;
  source: string;
  commit: string;
  managedBy: 'agent-commons';
  files: Array<{ path: string; gitBlobSha1: string }>;
}

/** Every file must match the signed-off install receipt; unknown files are user data. */
function inspectManagedInstall(ctx: EnvironmentContext, id: string): UninstallPreview {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error('Invalid skill identifier.');
  }
  assertPhysicalRoots(ctx);
  const target = path.join(ctx.centralSkillsDir, id);
  if (inspectPath(target).state !== 'directory') {
    throw new Error('Only physical, Agent Commons-managed skill directories can be uninstalled.');
  }
  const receiptPath = path.join(target, RECEIPT_NAME);
  if (inspectPath(receiptPath).state !== 'file' || fs.lstatSync(receiptPath).size > 128 * 1024) {
    throw new Error('Missing or invalid Agent Commons management receipt.');
  }

  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as unknown; }
  catch { throw new Error('Invalid Agent Commons management receipt.'); }
  if (!isRecord(raw) || raw.schemaVersion !== 1 || raw.skill !== id ||
      raw.managedBy !== 'agent-commons' || typeof raw.repository !== 'string' ||
      typeof raw.source !== 'string' || typeof raw.commit !== 'string' ||
      !/^[0-9a-f]{40}$/.test(raw.commit) || !Array.isArray(raw.files) ||
      raw.files.length === 0 || raw.files.length > MAX_FILES) {
    throw new Error('Untrusted or malformed management receipt.');
  }
  const catalog = readPublicCatalog().catalog;
  const known = catalog.skills.find(s => s.id === id);
  const expectedSource = known && known.repository + '/tree/' + raw.commit +
    (known.path === '.' ? '' : '/' + known.path);
  if (!known || known.repository !== raw.repository ||
      raw.source !== expectedSource) {
    throw new Error('Receipt provenance does not match reviewed catalog origins.');
  }

  const receiptFiles = new Map<string, string>();
  let expectedSKILL = false;
  for (const file of raw.files) {
    if (!isRecord(file) || typeof file.path !== 'string' ||
        !entryPathSafe(file.path) || typeof file.gitBlobSha1 !== 'string' ||
        !/^[0-9a-f]{40}$/.test(file.gitBlobSha1)) {
      throw new Error('Unsafe or malformed management receipt entry.');
    }
    const key = file.path.toLowerCase();
    if (receiptFiles.has(key)) throw new Error('Duplicate path in management receipt.');
    receiptFiles.set(key, file.gitBlobSha1);
    if (file.path === 'SKILL.md') expectedSKILL = true;
  }
  if (!expectedSKILL) throw new Error('Management receipt does not include SKILL.md.');

  let totalBytes = 0;
  let foundFiles = 0;
  const discovered = new Set<string>();
  const expectedDirs = new Set<string>();
  for (const file of raw.files as Array<{ path: string }>) {
    const parts = file.path.split('/');
    for (let i = 1; i < parts.length; i++) {
      expectedDirs.add(parts.slice(0, i).join('/').toLowerCase());
    }
  }

  const walk = (dir: string, prefix = ''): void => {
    for (const name of fs.readdirSync(dir)) {
      const relative = prefix ? prefix + '/' + name : name;
      const child = path.join(dir, name);
      const stat = fs.lstatSync(child); // Never follow symlinks or junctions.
      if (stat.isSymbolicLink()) {
        throw new Error('Skill contains a link; refusing removal.');
      }
      if (stat.isDirectory()) {
        if (!expectedDirs.has(relative.toLowerCase())) {
          throw new Error('Skill has an unexpected directory; refusing removal.');
        }
        walk(child, relative);
      } else if (stat.isFile()) {
        if (relative === RECEIPT_NAME) continue;
        const key = relative.toLowerCase();
        const expectedSha = receiptFiles.get(key);
        if (!expectedSha || discovered.has(key) || stat.size > MAX_FILE_BYTES) {
          throw new Error('Skill contains untracked, duplicate or oversized files; refusing removal.');
        }
        discovered.add(key);
        totalBytes += stat.size;
        foundFiles++;
        if (totalBytes > MAX_TOTAL_BYTES || foundFiles > MAX_FILES) {
          throw new Error('Managed skill exceeds safe limits.');
        }
        const contents = fs.readFileSync(child);
        const actualSha = crypto.createHash('sha1')
          .update('blob ' + contents.length + '\0').update(contents).digest('hex');
        if (actualSha !== expectedSha) {
          throw new Error('Local skill has been modified; refusing to remove user changes.');
        }
      } else {
        throw new Error('Skill has an unsupported filesystem entry; refusing removal.');
      }
    }
  };
  walk(target);
  if (discovered.size !== receiptFiles.size) {
    throw new Error('Managed skill is missing files; refusing removal.');
  }

  // Prevent breaking agent links when the central skill is removed.
  for (const agent of detectAgents(ctx)) {
    if (!agent.installed) continue;
    const skillsDir = agent.skillsDirPath;
    if (inspectPath(skillsDir).state === 'link') {
      throw new Error('Agent skill directory is linked; refusing removal.');
    }
    const agentEntry = path.join(skillsDir, id);
    const info = inspectPath(agentEntry);
    if (info.state === 'link' && info.resolvedTarget &&
        arePathsEqual(info.resolvedTarget, target, ctx.platform)) {
      throw new Error('Skill is linked to an installed agent; detach the link safely before uninstalling.');
    }
  }

  return { skill: id, source: raw.source as string,
    commit: raw.commit as string, target,
    files: (raw.files as Array<{ path: string }>).map(x => x.path).sort(),
    totalBytes, clean: true };
}

/** Offline preview and strictly opt-in deletion. The target is backed up for restore. */
export function previewCatalogUninstall(ctx: EnvironmentContext, id: string): UninstallPreview {
  return inspectManagedInstall(ctx, id);
}

export function uninstallCatalogSkill(
  ctx: EnvironmentContext,
  id: string,
  options: { yes?: boolean } = {}
): UninstallOutcome {
  const preview = previewCatalogUninstall(ctx, id);
  if (!options.yes) return { preview, removed: false, snapshotId: null };

  // Recheck immediately before the first write; never touch an unmanaged folder.
  inspectManagedInstall(ctx, id);
  const session = new SnapshotSession(ctx, 'manual');
  session.recordPathBeforeModify('commons', 'central-skill', preview.target);
  const snapshot = session.commitManifest();
  try {
    removePhysicalDirectorySafe(preview.target);
  } catch (err) {
    try { restoreBackup(ctx, snapshot.id); }
    catch (rollback) {
      throw new Error('Uninstall failed and restore also failed; recover from snapshot ' +
        snapshot.id + ': ' + (rollback as Error).message, { cause: err });
    }
    throw err;
  }
  return { preview, removed: true, snapshotId: snapshot.id };
}


export interface UpdatePreview {
  skill: string;
  source: string;
  previousCommit: string;
  proposedCommit: string;
  target: string;
  added: string[];
  changed: string[];
  removed: string[];
  files: InstallFile[];
  totalBytes: number;
}
export interface UpdateOutcome {
  preview: UpdatePreview;
  updated: boolean;
  snapshotId: string | null;
}
export interface OutdatedSkill {
  skill: string;
  installedCommit: string | null;
  catalogCommit: string;
  status: 'current' | 'outdated' | 'blocked';
  message?: string;
}

/** Completely offline: compare an intact managed receipt to the bundled pinned catalog. */
export function listCatalogOutdated(ctx: EnvironmentContext): OutdatedSkill[] {
  assertPhysicalRoots(ctx);
  const { catalog } = readPublicCatalog();
  const results: OutdatedSkill[] = [];
  for (const skill of catalog.skills) {
    const target = path.join(ctx.centralSkillsDir, skill.id);
    if (inspectPath(path.join(target, RECEIPT_NAME)).state !== 'file') continue;
    try {
      const installed = inspectManagedInstall(ctx, skill.id);
      results.push({
        skill: skill.id,
        installedCommit: installed.commit,
        catalogCommit: skill.ref,
        status: skill.lifecycle === 'archived' ? 'blocked' :
          installed.commit === skill.ref ? 'current' : 'outdated',
        ...(skill.lifecycle === 'archived' ? { message: 'Archived upstream reference' } : {})
      });
    } catch (err) {
      results.push({
        skill: skill.id, installedCommit: null, catalogCommit: skill.ref,
        status: 'blocked', message: (err as Error).message
      });
    }
  }
  return results;
}

/** A source pinned in the reviewed public catalog is the only accepted update target. */
export async function previewCatalogUpdate(
  ctx: EnvironmentContext, id: string, fetchJson: FetchJson = githubJson
): Promise<UpdatePreview> {
  const installed = inspectManagedInstall(ctx, id);
  const skill = currentSkill(ctx, id);
  canonicalGitHubRepository(skill.repository);
  if (installed.commit === skill.ref) {
    throw new Error('Skill already matches the pinned catalog revision.');
  }
  const proposed = await previewPinnedFiles(ctx, skill, fetchJson);
  const oldFiles = new Map<string, string>();
  for (const file of installed.files) {
    const data = fs.readFileSync(path.join(installed.target, ...file.split('/')));
    oldFiles.set(file, crypto.createHash('sha1')
      .update('blob ' + data.length + '\0').update(data).digest('hex'));
  }
  const newFiles = new Map(proposed.files.map(file => [file.relativePath, file.sha]));
  const added = proposed.files.filter(file => !oldFiles.has(file.relativePath)).map(file => file.relativePath);
  const changed = proposed.files.filter(file => oldFiles.has(file.relativePath) &&
    oldFiles.get(file.relativePath) !== file.sha).map(file => file.relativePath);
  const removed = [...oldFiles.keys()].filter(name => !newFiles.has(name)).sort();
  return {
    skill: id, source: skill.source, previousCommit: installed.commit,
    proposedCommit: skill.ref, target: installed.target,
    added, changed, removed,
    files: proposed.files, totalBytes: proposed.totalBytes
  };
}

/**
 * Update only a clean, unlinked Agent Commons-managed GitHub skill.
 * A focused snapshot is made before a two-rename swap. On failure, try to
 * put the original directory back; snapshot restore stays available.
 */
export async function updateCatalogSkill(
  ctx: EnvironmentContext, id: string,
  options: { yes?: boolean; fetchJson?: FetchJson } = {}
): Promise<UpdateOutcome> {
  const fetchJson = options.fetchJson ?? githubJson;
  const preview = await previewCatalogUpdate(ctx, id, fetchJson);
  if (!options.yes) return { preview, updated: false, snapshotId: null };
  const skill = currentSkill(ctx, id);
  const { owner, name } = canonicalGitHubRepository(skill.repository);
  assertPhysicalRoots(ctx);
  const staging = fs.mkdtempSync(path.join(ctx.commonsDir, '.agent-commons-stage-'));
  let staged = true;
  try {
    for (const file of preview.files) {
      const remote = 'https://api.github.com/repos/' + owner + '/' + name +
        '/git/blobs/' + file.sha;
      const bytes = decodeVerifiedBlob(await fetchJson(remote), file);
      const destination = path.join(staging, ...file.relativePath.split('/'));
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes, { flag: 'wx', mode: 0o600 });
    }
    const receipt = {
      schemaVersion: 1, skill: id, repository: skill.repository,
      source: skill.source, commit: skill.ref, managedBy: 'agent-commons',
      files: preview.files.map(file => ({ path: file.relativePath, gitBlobSha1: file.sha }))
    };
    writeFileAtomicSync(path.join(staging, RECEIPT_NAME), JSON.stringify(receipt, null, 2));

    // Revalidate after network activity, before any local original can be moved.
    const before = inspectManagedInstall(ctx, id);
    if (before.commit !== preview.previousCommit ||
        before.source !== skill.repository + '/tree/' + before.commit +
          (skill.path === '.' ? '' : '/' + skill.path)) {
      throw new Error('Local managed skill changed during update; refusing replacement.');
    }

    const session = new SnapshotSession(ctx, 'manual');
    session.recordPathBeforeModify('commons', 'central-skill', preview.target);
    const snapshot = session.commitManifest();

    const quarantine = fs.mkdtempSync(path.join(ctx.commonsDir, '.agent-commons-prev-'));
    // mkdtemp produces an empty destination; rename requires it absent.
    fs.rmdirSync(quarantine);
    let oldMoved = false;
    let newMoved = false;
    try {
      // No user files are deleted until after a verified backup exists.
      fs.renameSync(preview.target, quarantine);
      oldMoved = true;
      fs.renameSync(staging, preview.target);
      staged = false;
      newMoved = true;
    } catch (err) {
      try {
        if (newMoved && inspectPath(preview.target).state === 'directory') {
          removePhysicalDirectorySafe(preview.target);
        }
        if (oldMoved && inspectPath(quarantine).state === 'directory') {
          fs.renameSync(quarantine, preview.target);
        }
      } catch (rollback) {
        throw new Error('Update failed and directory rollback failed. Restore snapshot ' +
          snapshot.id + ': ' + (rollback as Error).message, { cause: err });
      }
      throw err;
    }
    // The snapshot is the durable rollback. Failure to clean the previous
    // directory must not risk removing the newly installed version.
    try { removePhysicalDirectorySafe(quarantine); } catch { /* preserve old copy */ }
    return { preview, updated: true, snapshotId: snapshot.id };
  } finally {
    if (staged && inspectPath(staging).state === 'directory') {
      removePhysicalDirectorySafe(staging);
    }
  }
}
