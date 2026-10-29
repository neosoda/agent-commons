import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectAgents } from '../agents/detector.js';
import {
  areDirectoriesIdentical,
  arePathsEqual,
  createDirectoryLink,
  detachLinkSafe,
  inspectPath,
  removePhysicalDirectorySafe
} from '../core/links.js';
import { redactSecrets } from '../security/scrubber.js';
import { isValidIdentifier } from '../security/validator.js';
import { inspectAgentMcpConfig, loadCentralMcpManifest } from '../sync/mcp.js';
import { discoverCentralSkills } from '../sync/skills.js';
import type { AgentDoctorStatus, DoctorReport, EnvironmentContext } from '../types.js';

function probeLinkCapability(platform: NodeJS.Platform): { ok: boolean; error?: string } {
  const probeRoot = path.join(
    os.tmpdir(),
    `agent-commons-probe-${process.pid}-${crypto.randomBytes(4).toString('hex')}`
  );
  const targetDir = path.join(probeRoot, 'target');
  const linkDir = path.join(probeRoot, 'link');

  try {
    fs.mkdirSync(targetDir, { recursive: true });
    createDirectoryLink(linkDir, targetDir, platform);
    const info = inspectPath(linkDir);
    if (info.state !== 'link' || !info.targetExists) {
      throw new Error('Created link did not resolve as a valid directory link.');
    }
    detachLinkSafe(linkDir);
    removePhysicalDirectorySafe(probeRoot);
    return { ok: true };
  } catch (err) {
    try {
      if (inspectPath(linkDir).state === 'link') {
        detachLinkSafe(linkDir);
      }
      if (inspectPath(probeRoot).state === 'directory') {
        removePhysicalDirectorySafe(probeRoot);
      }
    } catch {
      // Ignore cleanup errors
    }
    return { ok: false, error: redactSecrets((err as Error).message) };
  }
}

/**
 * Runs a comprehensive, read-only health check across the central library and all 17 agents.
 */
export function runDoctor(ctx: EnvironmentContext, agentFilter?: string[]): DoctorReport {
  const issues: string[] = [];
  const linkStrategy = ctx.platform === 'win32' ? 'ntfs-junction' : 'posix-symlink';
  const probe = probeLinkCapability(ctx.platform);

  if (!probe.ok) {
    issues.push(`Filesystem link probe failed (${linkStrategy}): ${probe.error ?? 'unknown error'}`);
  }

  const centralSkills = discoverCentralSkills(ctx);
  const centralSkillsMap = new Map(centralSkills.map((s) => [s.name, s.path]));

  const loadedMcp = loadCentralMcpManifest(ctx);
  if (loadedMcp.status === 'corrupted') {
    issues.push(`Central MCP manifest (${ctx.centralMcpPath}) is corrupted: ${loadedMcp.error}`);
  }

  const centralMcpCount = Object.keys(loadedMcp.manifest.mcpServers).length;
  const detectedAgents = detectAgents(ctx, agentFilter);
  const agentStatuses: AgentDoctorStatus[] = [];

  for (const agent of detectedAgents) {
    const agentIssues: string[] = [];
    let linkedCount = 0;
    let brokenCount = 0;
    let physicalCount = 0;
    let conflictCount = 0;

    if (agent.installed) {
      const skillsDirInfo = inspectPath(agent.skillsDirPath);
      if (skillsDirInfo.state === 'link' || skillsDirInfo.state === 'file') {
        conflictCount++;
        agentIssues.push(
          `Skills root "${agent.skillsDirPath}" is a ${skillsDirInfo.state} instead of a physical directory.`
        );
      } else if (skillsDirInfo.state === 'directory') {
        const entries = fs.readdirSync(agent.skillsDirPath).sort();
        for (const name of entries) {
          if (!isValidIdentifier(name)) continue;
          const entryPath = path.join(agent.skillsDirPath, name);
          const info = inspectPath(entryPath);

          if (info.state === 'link') {
            if (!info.targetExists) {
              brokenCount++;
              agentIssues.push(
                `Broken skill link: "${name}" -> ${info.resolvedTarget ?? 'missing'} (run "agent-commons sync" to repair)`
              );
            } else {
              const centralTarget = centralSkillsMap.get(name);
              if (
                centralTarget &&
                info.resolvedTarget &&
                arePathsEqual(info.resolvedTarget, centralTarget, ctx.platform)
              ) {
                linkedCount++;
              } else {
                linkedCount++;
                if (centralTarget) {
                  agentIssues.push(
                    `Skill link "${name}" points to "${info.resolvedTarget}" instead of central "${centralTarget}" (run "agent-commons sync" to re-point)`
                  );
                }
              }
            }
          } else if (info.state === 'directory') {
            physicalCount++;
            const centralTarget = centralSkillsMap.get(name);
            if (centralTarget) {
              const identical = areDirectoriesIdentical(entryPath, centralTarget);
              if (!identical) {
                conflictCount++;
                agentIssues.push(
                  `Skill "${name}" is a physical copy that differs from central skill (use "agent-commons sync --force" to backup and replace).`
                );
              }
            }
          }
        }
      }
    }

    const mcpInspected = inspectAgentMcpConfig(agent);
    if (agent.installed && mcpInspected.status === 'corrupted') {
      agentIssues.push(
        `MCP config (${agent.mcpConfigPath}) is corrupted: ${mcpInspected.error ?? 'parse error'}`
      );
    }

    if (agentIssues.length > 0) {
      for (const issue of agentIssues) {
        issues.push(`[${agent.definition.name}] ${issue}`);
      }
    }

    agentStatuses.push({
      id: agent.definition.id,
      name: agent.definition.name,
      installed: agent.installed,
      skillsSupported: true,
      mcpSupported: Boolean(agent.definition.mcpConfig),
      mcpFormat: agent.mcpFormat,
      skillsDir: agent.skillsDirPath,
      linkedSkillsCount: linkedCount,
      brokenLinksCount: brokenCount,
      physicalSkillsCount: physicalCount,
      conflictSkillsCount: conflictCount,
      mcpConfigPath: agent.mcpConfigPath,
      mcpStatus: mcpInspected.status,
      mcpServersCount: mcpInspected.serverNames.length,
      issues: agentIssues
    });
  }

  const hasCriticalIssues =
    !probe.ok ||
    loadedMcp.status === 'corrupted' ||
    agentStatuses.some((a) => a.brokenLinksCount > 0 || a.mcpStatus === 'corrupted');

  return {
    healthy: !hasCriticalIssues,
    platform: ctx.platform,
    nodeVersion: process.version,
    linkStrategy,
    linkCapabilityVerified: probe.ok,
    linkCapabilityError: probe.error,
    commonsDir: ctx.commonsDir,
    centralSkillsDir: ctx.centralSkillsDir,
    centralSkillsCount: centralSkills.length,
    centralMcpPath: ctx.centralMcpPath,
    centralMcpStatus: loadedMcp.status,
    centralMcpServersCount: centralMcpCount,
    agents: agentStatuses,
    issues
  };
}
