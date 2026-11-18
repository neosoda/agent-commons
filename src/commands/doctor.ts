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
  isSelfReferentialLink,
  removePhysicalDirectorySafe
} from '../core/links.js';
import { estimateSkillMetadataTokens, lintSkillsDirectory } from '../core/skill-lint.js';
import { inspectLaunchTarget, readAgentMcpServers, resolveCommand } from '../mcp/health.js';
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

const PREREQUISITES = ['npm', 'npx', 'git', 'uv', 'uvx', 'python', 'docker'] as const;

function checkPrerequisites(): DoctorReport['prerequisites'] {
  const major = Number(process.versions.node.split('.')[0]);
  const list: DoctorReport['prerequisites'] = [
    { name: 'node', found: major >= 22, detail: process.version + (major >= 22 ? '' : ' (Node.js 22+ required)') }
  ];
  for (const name of PREREQUISITES) {
    // PATH lookup only: nothing is executed.
    const resolved = resolveCommand(name) ?? (name === 'python' ? resolveCommand('python3') : null);
    list.push({ name, found: resolved !== null });
  }
  return list;
}

const LAUNCH_HINTS: Record<string, string> = {
  uv: 'install uv (Windows: "winget install astral-sh.uv")',
  uvx: 'install uv (Windows: "winget install astral-sh.uv")',
  npx: 'install Node.js 22+ with npm',
  npm: 'install Node.js 22+ with npm',
  docker: 'install Docker Desktop',
  python: 'install Python 3'
};

/**
 * Runs a comprehensive, read-only health check across the central library and supported agents.
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
  let invalidCentralLinks = 0;
  const centralDirInfo = inspectPath(ctx.centralSkillsDir);
  if (centralDirInfo.state === 'link' || centralDirInfo.state === 'file') {
    issues.push('Central skills root is not a physical directory.');
    invalidCentralLinks++;
  } else if (centralDirInfo.state === 'directory') {
    for (const name of fs.readdirSync(ctx.centralSkillsDir).sort()) {
      if (!isValidIdentifier(name)) continue;
      const entry = path.join(ctx.centralSkillsDir, name);
      const info = inspectPath(entry);
      if (info.state !== 'link') continue;
      invalidCentralLinks++;
      const circular = isSelfReferentialLink(entry, info.resolvedTarget, ctx.platform);
      issues.push(circular
        ? `Circular central skill link "${name}" (preview "agent-commons repair-central").`
        : `Central skill "${name}" is a link, not a physical directory (preserved).`);
    }
  }

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

    if (agent.installed && agent.definition.skillsSupported !== false) {
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
      skillsSupported: agent.definition.skillsSupported !== false,
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
      skillMetadataTokens: agent.installed && agent.definition.skillsSupported !== false
        ? estimateSkillMetadataTokens(agent.skillsDirPath) : 0,
      issues: agentIssues
    });
  }

  const warnings: string[] = [];
  const prerequisites = checkPrerequisites();
  const mcpLaunch: DoctorReport['mcpLaunch'] = [];
  const recordLaunch = (scope: string, label: string, server: string, spec: Parameters<typeof inspectLaunchTarget>[0]) => {
    const r = inspectLaunchTarget(spec, process.env, ctx.platform);
    mcpLaunch.push({ scope, server, status: r.status, message: r.message });
    if (r.status === 'missing-command' || r.status === 'missing-script' || r.status === 'invalid') {
      const base = spec.command ? path.basename(spec.command).replace(/\.(exe|cmd|bat)$/i, '').toLowerCase() : '';
      const hint = r.status === 'missing-command' && LAUNCH_HINTS[base] ? `; ${LAUNCH_HINTS[base]}` : '';
      warnings.push(`[${label}] MCP "${server}" cannot start: ${r.message}${hint}.`);
    }
  };
  if (loadedMcp.status === 'valid') {
    for (const [name, spec] of Object.entries(loadedMcp.manifest.mcpServers)) recordLaunch('central', 'Central MCP', name, spec);
  }
  for (const agent of detectedAgents) {
    if (!agent.installed) continue;
    const status = agentStatuses.find(a => a.id === agent.definition.id);
    if (status?.mcpStatus !== 'valid') continue;
    try {
      for (const [name, spec] of Object.entries(readAgentMcpServers(agent))) {
        recordLaunch(agent.definition.id, agent.definition.name, name, spec);
      }
    } catch { /* parse errors are already reported as corrupted */ }
  }

  const skillLint: DoctorReport['skillLint'] = [];
  const lintScope = (scope: string, label: string, dir: string) => {
    for (const r of lintSkillsDirectory(dir)) {
      skillLint.push({ scope, skill: r.skill, errors: r.errors, advisories: r.advisories });
      if (r.errors.length) warnings.push(`[${label}] Skill "${r.skill}" will be rejected by clients such as Codex: ${r.errors.join('; ')}.`);
    }
  };
  lintScope('central', 'Central skills', ctx.centralSkillsDir);
  for (const agent of detectedAgents) {
    if (agent.installed && agent.definition.skillsSupported !== false &&
        !arePathsEqual(agent.skillsDirPath, ctx.centralSkillsDir, ctx.platform)) {
      lintScope(agent.definition.id, agent.definition.name, agent.skillsDirPath);
    }
  }

  const hasCriticalIssues =
    !probe.ok ||
    invalidCentralLinks > 0 ||
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
    issues,
    warnings: warnings.map(w => redactSecrets(w)),
    prerequisites,
    mcpLaunch,
    skillLint
  };
}
