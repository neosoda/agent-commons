import { detectAgents } from '../agents/detector.js';
import { restoreBackup, SnapshotSession } from '../core/backup.js';
import { redactSecrets } from '../security/scrubber.js';
import { loadCentralMcpManifest, syncMcpForAgents } from '../sync/mcp.js';
import { discoverCentralSkills, syncSkillsForAgents } from '../sync/skills.js';
import type {
  EnvironmentContext,
  McpSyncResultItem,
  SkillSyncResultItem,
  SyncOptions,
  SyncReport
} from '../types.js';

/**
 * Executes a full or filtered synchronization of Skills and MCP configurations,
 * creating an automatic pre-sync snapshot and rolling back if a fatal error occurs.
 */
export function runSync(ctx: EnvironmentContext, options: SyncOptions = {}): SyncReport {
  const dryRun = Boolean(options.dryRun);
  const agents = detectAgents(ctx, options.agentFilter);
  const installedCount = agents.filter((a) => a.installed).length;

  const snapshot = dryRun ? null : new SnapshotSession(ctx, 'pre-sync');
  let skillResults: SkillSyncResultItem[] = [];
  let mcpResults: McpSyncResultItem[] = [];
  const errors: string[] = [];
  let rolledBack = false;

  try {
    if (options.skillFilter !== undefined) {
      if (options.skillFilter.length === 0) {
        throw new Error('No skills selected; refusing an empty filtered sync.');
      }
      if (options.adopt || options.mcpOnly) {
        throw new Error('Selective skills sync cannot be combined with --adopt or --mcp-only.');
      }
      const present = new Set(discoverCentralSkills(ctx).map(skill => skill.name));
      const missing = options.skillFilter.filter(name => !present.has(name));
      if (missing.length > 0) {
        throw new Error('Selected skills are not in the physical central library: ' + missing.join(', '));
      }
    }
    if (!options.mcpOnly) {
      skillResults = syncSkillsForAgents(ctx, agents, options, snapshot);
    }

    // When a skill subset is selected, MCP configs are never touched implicitly.
    if (!options.skillsOnly && options.skillFilter === undefined) {
      mcpResults = syncMcpForAgents(ctx, agents, options, snapshot);
    }

    // Check if any step recorded an explicit filesystem/permission error after partial modifications
    const itemErrors = [
      ...skillResults.filter((r) => r.action === 'error').map((r) => r.message),
      ...mcpResults.filter((r) => r.action === 'error').map((r) => r.message)
    ];

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
      if (!dryRun && snapshot && snapshot.hasEntries()) {
        restoreBackup(ctx, snapshot.id);
        rolledBack = true;
      }
    }
  } catch (err) {
    const safeMsg = redactSecrets((err as Error).message);
    errors.push(safeMsg);
    if (!dryRun && snapshot && snapshot.hasEntries()) {
      try {
        restoreBackup(ctx, snapshot.id);
        rolledBack = true;
      } catch (rollbackErr) {
        errors.push(`Rollback failed: ${redactSecrets((rollbackErr as Error).message)}`);
      }
    }
  }

  const finalCentralSkills = discoverCentralSkills(ctx);
  const loadedMcp = loadCentralMcpManifest(ctx);
  const centralMcpCount = Object.keys(loadedMcp.manifest.mcpServers).length;

  return {
    dryRun,
    snapshotId: snapshot && snapshot.hasEntries() ? snapshot.id : null,
    rolledBack,
    centralSkillsCount: finalCentralSkills.length,
    centralMcpServersCount: centralMcpCount,
    detectedAgentsCount: installedCount,
    skillResults,
    mcpResults,
    errors
  };
}
