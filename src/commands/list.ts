import fs from 'node:fs';
import path from 'node:path';
import { detectAgents } from '../agents/detector.js';
import { listBackups } from '../core/backup.js';
import { inspectPath } from '../core/links.js';
import { isValidIdentifier } from '../security/validator.js';
import { inspectAgentMcpConfig, loadCentralMcpManifest } from '../sync/mcp.js';
import { discoverCentralSkills } from '../sync/skills.js';
import type { EnvironmentContext, ListReport } from '../types.js';

/**
 * Lists all central skills, central MCP servers, agent inventories, and available backup snapshots.
 */
export function runList(ctx: EnvironmentContext, agentFilter?: string[]): ListReport {
  const centralSkills = discoverCentralSkills(ctx).map((s) => s.name);
  const loadedMcp = loadCentralMcpManifest(ctx);
  const centralMcpServers = Object.keys(loadedMcp.manifest.mcpServers).sort();

  const detectedAgents = detectAgents(ctx, agentFilter);
  const agents = detectedAgents.map((agent) => {
    const linkedSkills: string[] = [];
    const localPhysicalSkills: string[] = [];
    const brokenLinks: string[] = [];

    if (agent.installed && inspectPath(agent.skillsDirPath).state === 'directory') {
      const entries = fs.readdirSync(agent.skillsDirPath).sort();
      for (const name of entries) {
        if (!isValidIdentifier(name)) continue;
        const entryPath = path.join(agent.skillsDirPath, name);
        const info = inspectPath(entryPath);
        if (info.state === 'link') {
          if (info.targetExists) {
            linkedSkills.push(name);
          } else {
            brokenLinks.push(name);
          }
        } else if (info.state === 'directory') {
          localPhysicalSkills.push(name);
        }
      }
    }

    const mcpInspected = inspectAgentMcpConfig(agent);

    return {
      id: agent.definition.id,
      name: agent.definition.name,
      installed: agent.installed,
      skillsSupported: true,
      mcpSupported: Boolean(agent.definition.mcpConfig),
      linkedSkills,
      localPhysicalSkills,
      brokenLinks,
      mcpServers: mcpInspected.serverNames.sort()
    };
  });

  const backups = listBackups(ctx).map((b) => ({
    id: b.id,
    createdAt: b.createdAt,
    reason: b.reason,
    entriesCount: b.entries.length
  }));

  return {
    commonsDir: ctx.commonsDir,
    centralSkills,
    centralMcpServers,
    agents,
    backups
  };
}
