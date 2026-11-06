import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  arePathsEqual,
  copyDirectorySafe,
  inspectPath,
  removePhysicalDirectorySafe,
  writeFileAtomicSync
} from '../core/links.js';
import { isValidIdentifier } from '../security/validator.js';
import type { EnvironmentContext } from '../types.js';

export interface CentralRepairItem {
  name: string;
  centralPath: string;
  oldTarget: string;
  sourcePath: string | null;
  status: 'repairable' | 'skipped' | 'repaired' | 'error';
  message: string;
}
export interface CentralRepairReport {
  applied: boolean;
  recoveryDir: string | null;
  items: CentralRepairItem[];
  errors: string[];
}

/** Physical SKILL.md directories only: never follow a link while scanning .sources. */
function sourceCandidates(ctx: EnvironmentContext): Map<string, string[]> {
  const root = path.join(ctx.centralSkillsDir, '.sources');
  const found = new Map<string, string[]>();
  const rootInfo = inspectPath(root);
  if (rootInfo.state === 'missing') return found;
  if (rootInfo.state !== 'directory') {
    throw new Error('The .sources root must be a physical directory; no repair was attempted.');
  }

  const pending = [{ dir: root, depth: 0 }];
  let entriesSeen = 0;
  while (pending.length) {
    const { dir, depth } = pending.pop()!;
    for (const name of fs.readdirSync(dir).sort()) {
      if (++entriesSeen > 20000) {
        throw new Error('.sources exceeds the safe scan limit; no repair was attempted.');
      }
      const full = path.join(dir, name);
      if (inspectPath(full).state !== 'directory') continue;
      if (isValidIdentifier(name) &&
          inspectPath(path.join(full, 'SKILL.md')).state === 'file') {
        const existing = found.get(name) ?? [];
        existing.push(full);
        found.set(name, existing);
      }
      if (depth < 6) pending.push({ dir: full, depth: depth + 1 });
    }
  }
  return found;
}

/**
 * Only circular central links with one unambiguous, physical .sources directory
 * qualify. Other links and real directories are user-owned and never replaced.
 */
export function previewCentralRepair(ctx: EnvironmentContext): CentralRepairReport {
  if (inspectPath(ctx.commonsDir).state !== 'directory' ||
      inspectPath(ctx.centralSkillsDir).state !== 'directory') {
    throw new Error('Central skills root must be a physical directory.');
  }
  const sources = sourceCandidates(ctx);
  const items: CentralRepairItem[] = [];
  for (const name of fs.readdirSync(ctx.centralSkillsDir).sort()) {
    if (!isValidIdentifier(name)) continue;
    const centralPath = path.join(ctx.centralSkillsDir, name);
    const info = inspectPath(centralPath);
    if (info.state !== 'link') continue;
    const oldTarget = info.resolvedTarget ?? info.linkTarget ?? '';
    const matches = sources.get(name) ?? [];
    const circular = Boolean(info.resolvedTarget) &&
      arePathsEqual(info.resolvedTarget!, centralPath, ctx.platform);

    let status: CentralRepairItem['status'] = 'skipped';
    let sourcePath: string | null = null;
    let message: string;
    if (!circular) {
      message = info.targetExists
        ? 'Linked central entry is not circular; preserved unchanged.'
        : 'Dangling central link is not self-referential; preserved unchanged.';
    } else if (matches.length === 0) {
      message = 'Circular link has no matching physical SKILL.md in .sources; preserved.';
    } else if (matches.length > 1) {
      message = 'More than one physical source matches this skill; manual selection required.';
    } else {
      status = 'repairable';
      sourcePath = matches[0]!;
      message = 'Can restore a physical central copy from .sources and archive the old junction.';
    }
    items.push({ name, centralPath, oldTarget, sourcePath, status, message });
  }
  return { applied: false, recoveryDir: null, items, errors: [] };
}

/**
 * Repair is preview-only by default and always opt-in (--yes).
 * Originals are MOVED into an independent recovery folder, never deleted.
 * Each staged copy is completed before the junction is moved, with per-entry
 * rollback on errors; non-circular links and physical folders stay untouched.
 */
export function repairCentralSkills(
  ctx: EnvironmentContext,
  options: { yes?: boolean; dryRun?: boolean } = {}
): CentralRepairReport {
  const report = previewCentralRepair(ctx);
  if (!options.yes || options.dryRun) return report;
  const eligible = report.items.filter(item => item.status === 'repairable');
  if (!eligible.length) return report;
  if (inspectPath(ctx.backupsDir).state === 'link' ||
      inspectPath(ctx.backupsDir).state === 'file') {
    throw new Error('Backup directory must be physical; no repair was attempted.');
  }

  const tag = new Date().toISOString().replace(/[-:.TZ]/g, '') +
    '-' + crypto.randomBytes(4).toString('hex');
  const recoveryDir = path.join(ctx.backupsDir, 'central-repair-' + tag);
  fs.mkdirSync(recoveryDir, { recursive: true });
  report.recoveryDir = recoveryDir;
  const history: Array<{ name: string; oldTarget: string; sourcePath: string }> = [];

  for (const item of eligible) {
    let stage: string | null = null;
    const archived = path.join(recoveryDir, item.name);
    let moved = false;
    try {
      const info = inspectPath(item.centralPath);
      if (info.state !== 'link' || info.targetExists ||
          !info.resolvedTarget ||
          !arePathsEqual(info.resolvedTarget, item.centralPath, ctx.platform) ||
          info.resolvedTarget !== item.oldTarget ||
          inspectPath(item.sourcePath!).state !== 'directory' ||
          inspectPath(path.join(item.sourcePath!, 'SKILL.md')).state !== 'file') {
        throw new Error('Central link or source changed since preview; refusing repair.');
      }
      stage = fs.mkdtempSync(path.join(ctx.centralSkillsDir, '.agent-commons-repair-'));
      const stagedCopy = path.join(stage, 'skill');
      copyDirectorySafe(item.sourcePath!, stagedCopy);
      if (inspectPath(path.join(stagedCopy, 'SKILL.md')).state !== 'file') {
        throw new Error('Staged copy is incomplete.');
      }

      fs.renameSync(item.centralPath, archived);
      moved = true;
      try {
        if (inspectPath(item.centralPath).state !== 'missing') {
          throw new Error('Central path appeared during repair.');
        }
        fs.renameSync(stagedCopy, item.centralPath);
      } catch (err) {
        if (inspectPath(item.centralPath).state === 'missing') {
          fs.renameSync(archived, item.centralPath);
          moved = false;
        }
        throw err;
      }
      item.status = 'repaired';
      item.message = 'Physical copy restored; old junction archived in recovery directory.';
      history.push({ name: item.name, oldTarget: item.oldTarget, sourcePath: item.sourcePath! });
      report.applied = true;
    } catch (err) {
      item.status = 'error';
      item.message = (err as Error).message +
        (moved ? ' Original junction remains in recovery directory.' : '');
      report.errors.push(item.name + ': ' + item.message);
    } finally {
      if (stage && inspectPath(stage).state === 'directory') {
        removePhysicalDirectorySafe(stage);
      }
    }
  }
  writeFileAtomicSync(path.join(recoveryDir, 'central-repair.json'),
    JSON.stringify({ createdAt: new Date().toISOString(), entries: history }, null, 2));
  return report;
}
