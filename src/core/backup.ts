import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { detectAgents } from '../agents/detector.js';
import { isSafeSubpath, isValidIdentifier } from '../security/validator.js';
import type { BackupEntry, BackupManifest, EnvironmentContext } from '../types.js';
import {
  copyDirectorySafe,
  createDirectoryLink,
  detachLinkSafe,
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

  const snapshotDir = path.join(ctx.backupsDir, targetManifest.id);

  // Pre-validate every entry path before performing any destructive change
  for (const entry of targetManifest.entries) {
    const targetPath = path.resolve(entry.originalPath);
    const insideHome = isSafeSubpath(ctx.homeDir, targetPath);
    const insideLocalAppData = isSafeSubpath(ctx.localAppDataDir, targetPath);
    if (!insideHome && !insideLocalAppData) {
      throw new Error(
        `Security violation: backup entry target "${targetPath}" is outside allowed user roots.`
      );
    }
  }

  // Restore in reverse order of modification
  const reversedEntries = [...targetManifest.entries].reverse();

  for (const entry of reversedEntries) {
    const targetPath = path.resolve(entry.originalPath);
    const currentInfo = inspectPath(targetPath);

    // 1. Safely clear current state at targetPath without ever traversing links
    if (currentInfo.state === 'link') {
      detachLinkSafe(targetPath);
    } else if (currentInfo.state === 'directory') {
      removePhysicalDirectorySafe(targetPath);
    } else if (currentInfo.state === 'file') {
      fs.unlinkSync(targetPath);
    }

    // 2. Re-apply stateBefore
    if (entry.stateBefore === 'missing') {
      continue;
    }

    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (entry.stateBefore === 'link') {
      if (entry.linkTarget && inspectPath(entry.linkTarget).state === 'directory') {
        createDirectoryLink(targetPath, entry.linkTarget, ctx.platform);
      }
    } else if (entry.stateBefore === 'file' && entry.backupRelativePath) {
      const srcFile = path.join(snapshotDir, entry.backupRelativePath);
      if (isSafeSubpath(snapshotDir, srcFile) && inspectPath(srcFile).state === 'file') {
        fs.copyFileSync(srcFile, targetPath);
      }
    } else if (entry.stateBefore === 'directory' && entry.backupRelativePath) {
      const srcDir = path.join(snapshotDir, entry.backupRelativePath);
      if (isSafeSubpath(snapshotDir, srcDir) && inspectPath(srcDir).state === 'directory') {
        copyDirectorySafe(srcDir, targetPath);
      }
    }
  }

  return targetManifest;
}
