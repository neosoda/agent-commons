import fs from 'node:fs';
import path from 'node:path';
import type { SnapshotSession } from '../core/backup.js';
import {
  areDirectoriesIdentical,
  arePathsEqual,
  copyDirectorySafe,
  createDirectoryLink,
  detachLinkSafe,
  inspectPath,
  removePhysicalDirectorySafe
} from '../core/links.js';
import { redactSecrets } from '../security/scrubber.js';
import { assertSafeSubpath, isValidIdentifier } from '../security/validator.js';
import type {
  DetectedAgent,
  EnvironmentContext,
  SkillSyncResultItem,
  SyncOptions
} from '../types.js';

export interface CentralSkill {
  name: string;
  path: string;
}

/**
 * Discovers all valid central skills in `~/.agents/skills/` (physical directories containing SKILL.md).
 */
export function discoverCentralSkills(ctx: EnvironmentContext): CentralSkill[] {
  const dirInfo = inspectPath(ctx.centralSkillsDir);
  if (dirInfo.state !== 'directory') {
    return [];
  }

  const names = fs.readdirSync(ctx.centralSkillsDir).sort();
  const skills: CentralSkill[] = [];

  for (const name of names) {
    if (!isValidIdentifier(name)) {
      continue;
    }
    const skillPath = path.join(ctx.centralSkillsDir, name);
    const info = inspectPath(skillPath);
    if (info.state !== 'directory') {
      continue;
    }
    const skillMdInfo = inspectPath(path.join(skillPath, 'SKILL.md'));
    if (skillMdInfo.state === 'file') {
      skills.push({ name, path: skillPath });
    }
  }

  return skills;
}

/**
 * Synchronizes skills across all detected agents with conflict detection,
 * idempotent NTFS junctions (Windows) / symlinks (POSIX), and zero data loss.
 */
export function syncSkillsForAgents(
  ctx: EnvironmentContext,
  agents: DetectedAgent[],
  options: SyncOptions,
  snapshot: SnapshotSession | null
): SkillSyncResultItem[] {
  const results: SkillSyncResultItem[] = [];
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);
  const adopt = Boolean(options.adopt);
  const selected = options.skillFilter === undefined ? null : new Set(options.skillFilter);

  const installedAgents = agents.filter((a) => a.installed);

  // Guard against centralSkillsDir itself being a symlink/file
  const centralDirInfo = inspectPath(ctx.centralSkillsDir);
  if (centralDirInfo.state === 'link' || centralDirInfo.state === 'file') {
    results.push({
      agentId: 'commons',
      agentName: 'Agent Commons',
      skillName: '*',
      targetPath: ctx.centralSkillsDir,
      action: 'error',
      message: `Central skills directory "${ctx.centralSkillsDir}" is a ${centralDirInfo.state}, expected physical directory.`
    });
    return results;
  }

  // Step 1: Optional adoption of local-only physical skills into central ~/.agents/skills/
  const initialCentral = new Set(discoverCentralSkills(ctx).map((s) => s.name));

  for (const agent of installedAgents) {
    const skillsDirInfo = inspectPath(agent.skillsDirPath);
    if (skillsDirInfo.state === 'link' || skillsDirInfo.state === 'file') {
      results.push({
        agentId: agent.definition.id,
        agentName: agent.definition.name,
        skillName: '*',
        targetPath: agent.skillsDirPath,
        action: 'conflict-skipped',
        message: `Agent skills directory "${agent.skillsDirPath}" is a ${skillsDirInfo.state} rather than a physical directory. Preserved untouched.`
      });
      continue;
    }

    if (skillsDirInfo.state !== 'directory') continue;
    const entries = fs.readdirSync(agent.skillsDirPath).sort();

    for (const entryName of entries) {
      if (!isValidIdentifier(entryName)) continue;
      if (selected && !selected.has(entryName)) continue;
      if (initialCentral.has(entryName)) continue;

      const agentSkillPath = path.join(agent.skillsDirPath, entryName);
      const info = inspectPath(agentSkillPath);
      if (info.state !== 'directory') continue;

      const hasSkillMd = inspectPath(path.join(agentSkillPath, 'SKILL.md')).state === 'file';
      if (!hasSkillMd) continue;

      if (adopt) {
        const centralTarget = path.join(ctx.centralSkillsDir, entryName);
        assertSafeSubpath(ctx.centralSkillsDir, centralTarget, 'Central skill path');
        assertSafeSubpath(agent.skillsDirPath, agentSkillPath, 'Agent skill path');

        try {
          if (!dryRun) {
            fs.mkdirSync(ctx.centralSkillsDir, { recursive: true });
            snapshot?.recordPathBeforeModify('commons', 'central-skill', centralTarget);
            snapshot?.recordPathBeforeModify(agent.definition.id, 'skill-entry', agentSkillPath);
            copyDirectorySafe(agentSkillPath, centralTarget);
            removePhysicalDirectorySafe(agentSkillPath);
            createDirectoryLink(agentSkillPath, centralTarget, ctx.platform);
          }
          initialCentral.add(entryName);
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            skillName: entryName,
            targetPath: agentSkillPath,
            action: 'adopted-to-central',
            message: dryRun
              ? `[DRY-RUN] Would adopt local skill "${entryName}" to central library and link.`
              : `Adopted local skill "${entryName}" to central library and linked.`
          });
        } catch (err) {
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            skillName: entryName,
            targetPath: agentSkillPath,
            action: 'error',
            message: redactSecrets((err as Error).message)
          });
        }
      } else {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          skillName: entryName,
          targetPath: agentSkillPath,
          action: 'unmanaged-local',
          message: `Preserved local-only skill "${entryName}" (use --adopt to centralize).`
        });
      }
    }
  }

  // Step 2: Synchronize central skills to all installed agents
  const centralSkills = discoverCentralSkills(ctx)
    .filter(skill => !selected || selected.has(skill.name));

  for (const agent of installedAgents) {
    const skillsDirInfo = inspectPath(agent.skillsDirPath);
    if (skillsDirInfo.state === 'link' || skillsDirInfo.state === 'file') {
      continue;
    }

    for (const cs of centralSkills) {
      const alreadyHandled = results.some(
        (r) =>
          r.agentId === agent.definition.id &&
          r.skillName === cs.name &&
          r.action === 'adopted-to-central'
      );
      if (alreadyHandled) continue;

      const targetSkillPath = path.join(agent.skillsDirPath, cs.name);
      assertSafeSubpath(agent.skillsDirPath, targetSkillPath, 'Agent skill path');

      try {
        const info = inspectPath(targetSkillPath);

        if (info.state === 'missing') {
          if (!dryRun) {
            snapshot?.recordPathBeforeModify(agent.definition.id, 'skill-entry', targetSkillPath);
            createDirectoryLink(targetSkillPath, cs.path, ctx.platform);
          }
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            skillName: cs.name,
            targetPath: targetSkillPath,
            action: 'created-link',
            message: dryRun
              ? `[DRY-RUN] Would create ${ctx.platform === 'win32' ? 'NTFS junction' : 'symlink'} -> ${cs.path}`
              : `Created ${ctx.platform === 'win32' ? 'NTFS junction' : 'symlink'} -> ${cs.path}`
          });
          continue;
        }

        if (info.state === 'link') {
          const isValidTarget =
            Boolean(info.targetExists) &&
            Boolean(info.resolvedTarget) &&
            arePathsEqual(info.resolvedTarget!, cs.path, ctx.platform);

          if (isValidTarget) {
            results.push({
              agentId: agent.definition.id,
              agentName: agent.definition.name,
              skillName: cs.name,
              targetPath: targetSkillPath,
              action: 'already-synced',
              message: 'Link already points to central skill.'
            });
          } else {
            if (!dryRun) {
              snapshot?.recordPathBeforeModify(
                agent.definition.id,
                'skill-entry',
                targetSkillPath
              );
              detachLinkSafe(targetSkillPath);
              createDirectoryLink(targetSkillPath, cs.path, ctx.platform);
            }
            results.push({
              agentId: agent.definition.id,
              agentName: agent.definition.name,
              skillName: cs.name,
              targetPath: targetSkillPath,
              action: 'repaired-link',
              message: dryRun
                ? `[DRY-RUN] Would repair link (${info.resolvedTarget ?? 'broken'} -> ${cs.path})`
                : `Repaired link (${info.resolvedTarget ?? 'broken'} -> ${cs.path})`
            });
          }
          continue;
        }

        if (info.state === 'directory') {
          const identical = areDirectoriesIdentical(targetSkillPath, cs.path);
          if (identical) {
            if (!dryRun) {
              snapshot?.recordPathBeforeModify(
                agent.definition.id,
                'skill-entry',
                targetSkillPath
              );
              removePhysicalDirectorySafe(targetSkillPath);
              createDirectoryLink(targetSkillPath, cs.path, ctx.platform);
            }
            results.push({
              agentId: agent.definition.id,
              agentName: agent.definition.name,
              skillName: cs.name,
              targetPath: targetSkillPath,
              action: 'replaced-identical-copy',
              message: dryRun
                ? `[DRY-RUN] Would replace identical physical folder with link.`
                : `Backed up and replaced identical physical folder with link.`
            });
          } else if (force) {
            if (!dryRun) {
              snapshot?.recordPathBeforeModify(
                agent.definition.id,
                'skill-entry',
                targetSkillPath
              );
              removePhysicalDirectorySafe(targetSkillPath);
              createDirectoryLink(targetSkillPath, cs.path, ctx.platform);
            }
            results.push({
              agentId: agent.definition.id,
              agentName: agent.definition.name,
              skillName: cs.name,
              targetPath: targetSkillPath,
              action: 'replaced-forced',
              message: dryRun
                ? `[DRY-RUN] Would backup and force-replace diverged physical folder with link.`
                : `Backed up diverged physical folder to snapshot and replaced with link (--force).`
            });
          } else {
            results.push({
              agentId: agent.definition.id,
              agentName: agent.definition.name,
              skillName: cs.name,
              targetPath: targetSkillPath,
              action: 'conflict-skipped',
              message: `Conflict: physical folder differs from central skill. Preserved untouched (use --force to backup and replace).`
            });
          }
          continue;
        }

        // info.state === 'file'
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          skillName: cs.name,
          targetPath: targetSkillPath,
          action: 'conflict-skipped',
          message: `Conflict: a file exists at "${targetSkillPath}". Preserved untouched.`
        });
      } catch (err) {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          skillName: cs.name,
          targetPath: targetSkillPath,
          action: 'error',
          message: redactSecrets((err as Error).message)
        });
      }
    }
  }

  return results;
}
