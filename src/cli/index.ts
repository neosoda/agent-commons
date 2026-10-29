#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { runDoctor } from '../commands/doctor.js';
import { runCatalog } from '../commands/catalog.js';
import { runList } from '../commands/list.js';
import { runSync } from '../commands/sync.js';
import { createFullBackup, listBackups, restoreBackup } from '../core/backup.js';
import { createEnvironmentContext } from '../core/context.js';
import { redactSecrets } from '../security/scrubber.js';

const VERSION = '0.1.1';

function getMainHelp(): string {
  return `
Agent Commons v${VERSION}
Local-first multi-agent AI skills and MCP configuration synchronizer.

USAGE:
  agent-commons <command> [options]

COMMANDS:
  doctor                  Diagnose environment, link capabilities, central library, and 17 agents
  list                    List central skills, MCP servers, agent inventories, and backups
  catalog                 Inventory skills with source attribution and license claims
  sync                    Synchronize skills and MCP configurations to installed agents
  backup                  Create a point-in-time snapshot of all agent skills and MCP configs
  restore [snapshot-id]   Restore state from a snapshot (defaults to latest snapshot)

GLOBAL OPTIONS:
  --home <path>           Override user home root (or set AGENT_COMMONS_HOME)
  --agent <id>            Filter by specific agent ID (repeatable, e.g. --agent claude-code)
  --json                  Output structured JSON report
  -h, --help              Show help for command
  -v, --version           Show version

SYNC OPTIONS:
  --dry-run               Simulate all operations without modifying the filesystem
  --adopt                 Adopt local-only physical skills from agents into ~/.agents/skills/
  --force                 Backup and replace diverged skill folders or conflicting MCP entries
  --skills-only           Synchronize only skills (skip MCP manifest)
  --mcp-only              Synchronize only MCP servers (skip skills)

EXAMPLES:
  agent-commons doctor
  agent-commons list
  agent-commons catalog
  agent-commons catalog --json
  agent-commons sync --dry-run
  agent-commons sync
  agent-commons backup
  agent-commons restore
`.trim();
}

function getCommandHelp(command: string): string {
  switch (command) {
    case 'doctor':
      return `
Usage: agent-commons doctor [options]

Runs a non-destructive health check of:
  - OS link strategy (Windows NTFS Junctions vs POSIX Symlinks)
  - Central library (~/.agents/skills/ and ~/.agents/mcp.json)
  - All 17 registered AI coding agents (broken links, diverged copies, MCP syntax)

Options:
  --home <path>     Override user home directory
  --agent <id>      Inspect specific agent(s) only
  --json            Emit JSON output
  -h, --help        Show this help message
`.trim();
    case 'list':
      return `
Usage: agent-commons list [options]

Lists central skills, central MCP servers, per-agent inventories, and backup snapshots.

Options:
  --home <path>     Override user home directory
  --agent <id>      Filter specific agent(s)
  --json            Emit JSON output
  -h, --help        Show this help message
`.trim();
    case 'catalog':
      return `
Usage: agent-commons catalog [options]

Read-only catalog of installed central skills, with provenance from
~/.agents/.skill-lock.json or ~/.agents/skills-lock.json when available.
An author-declared license is NOT proof of redistribution rights.
No network requests or changes to skill files are performed.

Options:
  --home <path>     Override user home directory
  --json            Output metadata as JSON for LOCAL REVIEW only
  -h, --help        Show this help message
`.trim();
    case 'sync':
      return `
Usage: agent-commons sync [options]

Synchronizes ~/.agents/skills/ and ~/.agents/mcp.json across all installed agents.
Automatically creates a pre-sync snapshot and rolls back if a fatal error occurs.

Options:
  --dry-run         Preview every planned action without touching the disk
  --adopt           Move unique physical skills from agents into ~/.agents/skills/
  --force           Backup and overwrite diverged physical skills or conflicting MCP servers
  --skills-only     Sync skills only
  --mcp-only        Sync MCP servers only
  --agent <id>      Target specific agent(s) only
  --home <path>     Override user home directory
  --json            Emit JSON output
  -h, --help        Show this help message
`.trim();
    case 'backup':
      return `
Usage: agent-commons backup [options]

Creates a timestamped snapshot in ~/.agents/backups/ capturing MCP configs,
physical skill folders, and link targets across all installed agents.

Options:
  --home <path>     Override user home directory
  --json            Emit JSON output
  -h, --help        Show this help message
`.trim();
    case 'restore':
      return `
Usage: agent-commons restore [snapshot-id] [options]

Restores agent skills and MCP configurations from a backup snapshot.
If [snapshot-id] is omitted or "latest", restores the most recent snapshot.

Options:
  --list            List available snapshots without restoring
  --home <path>     Override user home directory
  --json            Emit JSON output
  -h, --help        Show this help message
`.trim();
    default:
      return getMainHelp();
  }
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
        json: { type: 'boolean', default: false },
        home: { type: 'string' },
        agent: { type: 'string', multiple: true },
        'dry-run': { type: 'boolean', default: false },
        adopt: { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        'skills-only': { type: 'boolean', default: false },
        'mcp-only': { type: 'boolean', default: false },
        list: { type: 'boolean', default: false }
      }
    });

    const { values, positionals } = parsed;

    if (values.version) {
      console.log(VERSION);
      return 0;
    }

    const command = positionals[0];

    if (!command) {
      console.log(getMainHelp());
      return values.help ? 0 : 1;
    }

    if (values.help) {
      console.log(getCommandHelp(command));
      return 0;
    }

    const ctx = createEnvironmentContext({
      homeDir: values.home
    });

    if (command === 'doctor') {
      const report = runDoctor(ctx, values.agent);
      if (values.json) {
        console.log(JSON.stringify(report, null, 2));
        return report.healthy ? 0 : 1;
      }

      console.log(`=== Agent Commons Doctor (v${VERSION}) ===`);
      console.log(`Platform       : ${report.platform} (${report.nodeVersion})`);
      console.log(
        `Link Strategy  : ${report.linkStrategy} (${report.linkCapabilityVerified ? 'OK' : 'FAILED'})`
      );
      console.log(`Commons Root   : ${report.commonsDir}`);
      console.log(`Central Skills : ${report.centralSkillsCount} (${report.centralSkillsDir})`);
      console.log(
        `Central MCP    : ${report.centralMcpServersCount} servers [status: ${report.centralMcpStatus}]`
      );
      console.log(
        `\nAgents (${report.agents.filter((a) => a.installed).length}/${report.agents.length} installed):`
      );

      for (const a of report.agents) {
        if (!a.installed) {
          console.log(`  - [${a.id.padEnd(18)}] not installed`);
          continue;
        }
        const mcpInfo = a.mcpSupported
          ? `MCP: ${a.mcpStatus} (${a.mcpServersCount} servers, ${a.mcpFormat})`
          : `MCP: skills-only`;
        console.log(
          `  * [${a.id.padEnd(18)}] Skills: ${a.linkedSkillsCount} linked, ${a.physicalSkillsCount} physical (${a.conflictSkillsCount} conflicts), ${a.brokenLinksCount} broken | ${mcpInfo}`
        );
      }

      if (report.issues.length > 0) {
        console.log(`\nIssues detected (${report.issues.length}):`);
        for (const issue of report.issues) {
          console.log(`  ! ${redactSecrets(issue)}`);
        }
        console.log(
          `\nNext step: Run "agent-commons sync --dry-run" to preview repairs before applying changes.`
        );
      } else {
        console.log(`\nStatus: Healthy (0 issues detected)`);
      }

      return report.healthy ? 0 : 1;
    }

    if (command === 'list') {
      const report = runList(ctx, values.agent);
      if (values.json) {
        console.log(JSON.stringify(report, null, 2));
        return 0;
      }

      console.log(`=== Agent Commons Inventory ===`);
      console.log(`Central Skills (${report.centralSkills.length}):`);
      if (report.centralSkills.length === 0) {
        console.log(`  (none - place skill folders containing SKILL.md inside ${ctx.centralSkillsDir})`);
      } else {
        console.log(`  ${report.centralSkills.join(', ')}`);
      }

      console.log(`\nCentral MCP Servers (${report.centralMcpServers.length}):`);
      if (report.centralMcpServers.length === 0) {
        console.log(`  (none - define servers in ${ctx.centralMcpPath})`);
      } else {
        console.log(`  ${report.centralMcpServers.join(', ')}`);
      }

      console.log(`\nInstalled Agents:`);
      const installed = report.agents.filter((a) => a.installed);
      if (installed.length === 0) {
        console.log(`  (no supported agents detected in ${ctx.homeDir})`);
      } else {
        for (const a of installed) {
          const mcpSummary = a.mcpSupported
            ? `MCP servers (${a.mcpServers.length}): ${a.mcpServers.join(', ') || 'none'}`
            : `MCP: skills-only`;
          console.log(
            `  - ${a.name} (${a.id}): ${a.linkedSkills.length} linked skills, ${a.localPhysicalSkills.length} local copies | ${mcpSummary}`
          );
        }
      }

      console.log(`\nBackup Snapshots (${report.backups.length}):`);
      if (report.backups.length === 0) {
        console.log(`  (none)`);
      } else {
        for (const b of report.backups.slice(0, 10)) {
          console.log(
            `  - ${b.id} (${b.createdAt}, reason: ${b.reason}, entries: ${b.entriesCount})`
          );
        }
      }

      return 0;
    }

    if (command === 'catalog') {
      const report = runCatalog(ctx);
      if (values.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log('=== Agent Commons Skill Catalog ===');
        console.log('Skills: ' + report.count + ', sources recorded: ' + report.attributed +
          ', sources unknown: ' + report.unattributed);
        for (const skill of report.skills) {
          console.log('  ' + skill.name + ' | ' + (skill.sourceUrl ?? 'SOURCE UNKNOWN') +
            ' | license: ' + (skill.declaredLicense ?? 'UNKNOWN') + ' (unverified)');
        }
        for (const warning of report.warnings) console.error('Warning: ' + warning);
        console.log('Metadata only. Check source ownership, licenses and privacy before sharing.');
      }
      return 0;
    }

    if (command === 'sync') {
      const report = runSync(ctx, {
        dryRun: values['dry-run'],
        adopt: values.adopt,
        force: values.force,
        agentFilter: values.agent,
        skillsOnly: values['skills-only'],
        mcpOnly: values['mcp-only']
      });

      if (values.json) {
        console.log(JSON.stringify(report, null, 2));
        return report.errors.length > 0 ? 1 : 0;
      }

      const modeLabel = report.dryRun ? '[DRY-RUN] ' : '';
      console.log(`=== ${modeLabel}Agent Commons Sync ===`);
      console.log(`Detected Agents : ${report.detectedAgentsCount}`);
      console.log(`Central Skills  : ${report.centralSkillsCount}`);
      console.log(`Central MCP     : ${report.centralMcpServersCount}`);
      if (report.snapshotId) {
        console.log(`Pre-Sync Backup : ${report.snapshotId}`);
      }

      const skillChanged = report.skillResults.filter((r) => r.action !== 'already-synced');
      const skillSyncedCount = report.skillResults.filter(
        (r) => r.action === 'already-synced'
      ).length;

      console.log(
        `\nSkills Summary  : ${skillSyncedCount} already synced, ${skillChanged.length} action(s)`
      );
      for (const item of skillChanged) {
        console.log(`  [${item.agentId}] ${item.skillName}: ${item.action} - ${item.message}`);
      }

      const mcpChanged = report.mcpResults.filter((r) => r.action !== 'unchanged');
      const mcpUnchangedCount = report.mcpResults.filter((r) => r.action === 'unchanged').length;

      console.log(
        `\nMCP Summary     : ${mcpUnchangedCount} unchanged, ${mcpChanged.length} action(s)`
      );
      for (const item of mcpChanged) {
        console.log(`  [${item.agentId}] ${item.serverName}: ${item.action} - ${item.message}`);
      }

      if (report.rolledBack) {
        console.error(
          `\n! Sync encountered errors and automatically rolled back to snapshot ${report.snapshotId}.`
        );
      }

      if (report.errors.length > 0) {
        console.error(`\nErrors (${report.errors.length}):`);
        for (const err of report.errors) {
          console.error(`  ! ${redactSecrets(err)}`);
        }
        return 1;
      }

      if (report.dryRun) {
        console.log(`\nDry-run complete. No files were modified. Run "agent-commons sync" to apply.`);
      } else {
        console.log(`\nSynchronization complete.`);
      }
      return 0;
    }

    if (command === 'backup') {
      const manifest = createFullBackup(ctx, 'manual');
      if (values.json) {
        console.log(JSON.stringify(manifest, null, 2));
        return 0;
      }
      console.log(`=== Agent Commons Backup ===`);
      console.log(`Snapshot ID : ${manifest.id}`);
      console.log(`Created At  : ${manifest.createdAt}`);
      console.log(`Entries     : ${manifest.entries.length}`);
      console.log(`Location    : ${ctx.backupsDir}`);
      console.log(`To restore  : agent-commons restore ${manifest.id}`);
      return 0;
    }

    if (command === 'restore') {
      if (values.list) {
        const backups = listBackups(ctx);
        if (values.json) {
          console.log(JSON.stringify(backups, null, 2));
          return 0;
        }
        if (backups.length === 0) {
          console.log('No backup snapshots available.');
          return 0;
        }
        console.log(`Available Snapshots (${backups.length}):`);
        for (const b of backups) {
          console.log(`  - ${b.id} (${b.createdAt}, ${b.reason}, ${b.entries.length} entries)`);
        }
        return 0;
      }

      const snapshotId = positionals[1];
      const restored = restoreBackup(ctx, snapshotId);
      if (values.json) {
        console.log(JSON.stringify(restored, null, 2));
        return 0;
      }
      console.log(`=== Agent Commons Restore ===`);
      console.log(`Restored Snapshot : ${restored.id}`);
      console.log(`Snapshot Date     : ${restored.createdAt}`);
      console.log(`Entries Restored  : ${restored.entries.length}`);
      return 0;
    }

    console.error(`Unknown command: "${command}". Run "agent-commons --help" for usage.`);
    return 1;
  } catch (err) {
    console.error(`Error: ${redactSecrets((err as Error).message)}`);
    console.error(`Hint: Run "agent-commons --help" for supported options and usage.`);
    return 1;
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('agent-commons') ||
    process.argv[1].endsWith('index.ts'));

if (isMain) {
  const code = runCli(process.argv.slice(2));
  process.exitCode = code;
}
