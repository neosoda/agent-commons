#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { startWebServer } from '../web/server.js';
import { runDoctor } from '../commands/doctor.js';
import { runCatalog } from '../commands/catalog.js';
import { reviewLocalCatalog } from '../commands/catalog-review.js';
import { searchPublicCatalog, readPublicCatalog } from '../commands/public-catalog.js';
import { installCatalogSkill, uninstallCatalogSkill, updateCatalogSkill, listCatalogOutdated } from '../commands/skill-install.js';
import { verifyCatalogSkills } from '../commands/skill-verify.js';
import { runList } from '../commands/list.js';
import { runSync } from '../commands/sync.js';
import { discoverCentralSkills } from '../sync/skills.js';
import { readSavedProfiles, saveAgentProfile, clearAgentProfile, runSavedProfilesSync } from '../commands/saved-profiles.js';
import { createFullBackup, listBackups, restoreBackup } from '../core/backup.js';
import { createEnvironmentContext } from '../core/context.js';
import { redactSecrets } from '../security/scrubber.js';

// Read the installed package metadata, rather than shipping a stale hard-coded CLI version.
const VERSION: string = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version;

function getMainHelp(): string {
  return `
Agent Commons v${VERSION}
Local-first multi-agent AI skills and MCP configuration synchronizer.

USAGE:
  agent-commons <command> [options]

COMMANDS:
  doctor                  Diagnose environment, link capabilities, central library, and 17 agents
  list                    List central skills, MCP servers, agent inventories, and backups
  catalog                 Inventory local skills / explore curated public skill metadata
  profiles                Save per-agent skill choices locally (never auto-applied)
  web                     Open local browser dashboard for skills, profiles and backups
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
  --skill <id>             Link only this central skill (repeatable; excludes MCP)
  --profile <category>     Link only catalog skills in this category (repeatable; excludes MCP)
  --saved-profiles         Sync only locally saved per-agent selections; no MCP writes

EXAMPLES:
  agent-commons doctor
  agent-commons list
  agent-commons catalog
  agent-commons catalog --json
  agent-commons catalog list
  agent-commons catalog search playwright
  agent-commons catalog info skill-creator
  agent-commons catalog review --json
  agent-commons catalog verify --json
  agent-commons web
  agent-commons sync --dry-run
  agent-commons sync --profile design --agent codex --dry-run
  agent-commons sync --skill skill-creator --agent codex
  agent-commons profiles set codex --skill skill-creator --profile design
  agent-commons sync --saved-profiles --dry-run
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
Usage: agent-commons catalog [subcommand] [options]

Without a subcommand: inventory LOCAL skills only (existing behavior).
  catalog [--json]                    Local inventory and source attribution
  catalog review [--json]             Private triage of missing origins, licenses and duplicates
  catalog list [--category <id>]      Curated PUBLIC metadata (offline)
  catalog search <query>              Search public skills by name, description or tags
  catalog info <id>                   Source, author, license and pinned ref
  catalog install <id>                Preview exact pinned GitHub files (no writes)
  catalog install <id> --yes          Explicitly approve staged installation
  catalog install <id> --dry-run      Preview only (never write)
  catalog update <id>                 Preview pinned catalog changes (no writes)
  catalog update <id> --yes           Approve update of intact, unlinked managed skill
  catalog uninstall <id>              Verify receipt and preview removal (offline)
  catalog uninstall <id> --yes        Remove intact managed skill after backup
  catalog outdated                    Offline comparison against reviewed catalog commits
  catalog verify [id]                 Offline read-only integrity audit of installed catalog skills

Filters for list/search: --category, --source, --author, --license
Options: --home <path>, --json, --help

Note: The public catalog contains only manually reviewed source/license references.
It does not include private skills or authorize executing third-party code.
`.trim();
    case 'profiles':
      return `
Usage: agent-commons profiles <list|show|set|clear> [agent-id] [options]

  profiles list                         Read saved per-agent skills and categories
  profiles show <agent-id>              Show one agent's saved preferences
  profiles set <agent-id> --skill <id>  Store selected skill(s); repeatable
  profiles set <agent-id> --profile <category>  Store category choices; repeatable
  profiles clear <agent-id>             Remove saved preference (not installed skills)

Profiles are stored in ~/.agents/agent-profiles.json. Saving does NOT sync.
Use sync --saved-profiles --dry-run to inspect and sync --saved-profiles to apply.
No MCP changes, no automatic removal of old links, no network access.
`.trim();
    case 'web':
      return `
Usage: agent-commons web [--port <number>] [--home <path>] [--no-open]

Starts the local Skill Hub dashboard on 127.0.0.1 only.
Opens your browser by default. No login, telemetry, CORS, or public network listener.
Mutating actions require explicit preview/confirmation in the dashboard.

Options:
  --port <number>  Listening port (default: 4173)
  --home <path>    Use an isolated home directory
  --no-open        Do not open a browser window automatically
  -h, --help       Show this message
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
  --skill <id>      Sync only named central skill(s); repeatable
  --profile <id>    Sync central skills matching public catalog category; repeatable
  --saved-profiles  Apply stored per-agent selections only (no MCP changes)
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
        list: { type: 'boolean', default: false },
        category: { type: 'string' },
        source: { type: 'string' },
        author: { type: 'string' },
        license: { type: 'string' },
        yes: { type: 'boolean', default: false },
        skill: { type: 'string', multiple: true },
        profile: { type: 'string', multiple: true },
        'saved-profiles': { type: 'boolean', default: false }
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
      const subcommand = positionals[1];
      if (!subcommand || subcommand === 'audit') {
        const report = runCatalog(ctx);
        if (values.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log('=== Agent Commons Local Skill Inventory ===');
          console.log('Skills: ' + report.count + ', sources recorded: ' + report.attributed +
            ', sources unknown: ' + report.unattributed);
          for (const skill of report.skills) {
            console.log('  ' + skill.name + ' | ' + (skill.sourceUrl ?? 'SOURCE UNKNOWN') +
              ' | license: ' + (skill.declaredLicense ?? 'UNKNOWN') + ' (unverified)');
          }
          for (const warning of report.warnings) console.error('Warning: ' + warning);
          console.log('Local only. Review for private data and licenses before sharing.');
        }
        return 0;
      }
      if (subcommand === 'review') {
        if (positionals.length !== 2) {
          console.error('Usage: agent-commons catalog review [--json]');
          return 1;
        }
        const report = reviewLocalCatalog(ctx);
        if (values.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log('=== PRIVATE Agent Commons Skill Review ===');
          console.log('Scanned: ' + report.scanned +
            ', needs metadata: ' + report.needingMetadata +
            ', ready for human review: ' + report.awaitingHumanReview);
          console.log('Missing origins: ' + report.missingOrigins +
            ', missing license claims: ' + report.missingLicenseClaims +
            ', duplicate upstream references: ' + report.duplicateReferences);
          for (const entry of report.entries) {
            console.log('  ' + entry.name + ': ' + entry.status +
              ' [' + entry.reasons.join(', ') + ']');
          }
          for (const warning of report.warnings) console.error('Warning: ' + warning);
          console.log('PRIVATE report only. No third-party skill is automatically approved or published.');
        }
        return 0;
      }
      if (subcommand === 'uninstall') {
        if (positionals.length !== 3 || !positionals[2]) {
          console.error('Usage: agent-commons catalog uninstall <id> [--yes | --dry-run]');
          return 1;
        }
        const result = uninstallCatalogSkill(ctx, positionals[2], {
          yes: values.yes && !values['dry-run']
        });
        if (values.json) console.log(JSON.stringify(result, null, 2));
        else {
          console.log('=== Agent Commons Managed Skill ' +
            (result.removed ? 'Removal' : 'Removal Preview') + ' ===');
          console.log('Skill: ' + result.preview.skill);
          console.log('Source: ' + result.preview.source);
          console.log('Commit: ' + result.preview.commit);
          console.log('Directory: ' + result.preview.target);
          console.log('Verified files: ' + result.preview.files.length);
          if (result.removed) {
            console.log('Skill removed after backup. Restore: agent-commons restore ' + result.snapshotId);
          } else {
            console.log('Preview only: no files changed. Use --yes to remove this intact, unlinked managed skill.');
          }
        }
        return 0;
      }
      if (subcommand === 'verify') {
        if (positionals.length > 3 || values.yes || values.force || values.adopt ||
            values['mcp-only'] || values['skills-only'] || values['saved-profiles'] ||
            values.agent?.length || values.profile?.length || values.skill?.length ||
            values.category || values.source || values.author || values.license || values.list) {
          throw new Error('Usage: agent-commons catalog verify [id] [--json] [--home <path>]');
        }
        const report = verifyCatalogSkills(ctx, positionals[2]);
        if (values.json) console.log(JSON.stringify(report, null, 2));
        else {
          console.log('=== Agent Commons Local Catalog Integrity ===');
          for (const result of report.results) {
            console.log('  ' + result.skill + ' | ' + result.status +
              ' | checked: ' + result.checkedFiles +
              ' | commit: ' + (result.commit ?? 'unknown'));
            for (const issue of result.issues) {
              console.log('    ! ' + issue.type + ': ' + issue.reason +
                (issue.path ? ' [' + issue.path + ']' : ''));
            }
          }
          if (!report.scanned) console.log('No installed reviewed-catalog skills found.');
          console.log('Offline and read-only. Hash verification does not establish that upstream code is safe.');
        }
        return report.healthy ? 0 : 1;
      }
      if (subcommand === 'outdated') {
        if (positionals.length !== 2) {
          console.error('Usage: agent-commons catalog outdated [--json]');
          return 1;
        }
        const results = listCatalogOutdated(ctx);
        if (values.json) console.log(JSON.stringify(results, null, 2));
        else {
          console.log('=== Agent Commons Managed Skill Catalog Status ===');
          for (const item of results) {
            console.log('  ' + item.skill + ' | ' + item.status +
              ' | installed: ' + (item.installedCommit ?? 'unknown') +
              ' | catalog: ' + item.catalogCommit);
          }
          if (results.length === 0) console.log('No Agent Commons-managed catalog skills found.');
          console.log('Offline check against reviewed catalog pins, NOT a check for latest upstream revisions.');
        }
        return 0;
      }
      if (subcommand === 'install' || subcommand === 'update') {
        console.error('Catalog ' + subcommand + ' requires the async CLI entry point or is not yet supported.');
        console.error('Review the upstream project and use its installation instructions only if you trust it.');
        console.error('Agent Commons did not download, run or modify anything.');
        return 1;
      }
      if (subcommand === 'list' || subcommand === 'search' || subcommand === 'info') {
        const filter = {
          query: subcommand === 'search' ? positionals.slice(2).join(' ').trim() : undefined,
          category: values.category,
          source: values.source,
          author: values.author,
          license: values.license
        };
        if (subcommand === 'search' && !filter.query) {
          console.error('Usage: agent-commons catalog search <query>');
          return 1;
        }
        const { catalog } = readPublicCatalog();
        const matched = searchPublicCatalog(ctx, filter);
        if (subcommand === 'info') {
          const id = positionals[2];
          if (!id || positionals.length !== 3) {
            console.error('Usage: agent-commons catalog info <id>');
            return 1;
          }
          const selected = matched.find(skill => skill.id === id);
          if (!selected) {
            console.error('Unknown public skill: ' + redactSecrets(id));
            return 1;
          }
          if (values.json) console.log(JSON.stringify(selected, null, 2));
          else {
            console.log('=== ' + selected.name + ' ===');
            console.log(selected.description);
            console.log('Author: ' + selected.author + ' | Category: ' + selected.category);
            console.log('Repository: ' + selected.repository);
            console.log('Source: ' + selected.source);
            console.log('Pinned ref: ' + selected.ref);
            console.log('License: ' + selected.license + ' (source text: ' + selected.licenseEvidence + ')');
            console.log('Upstream status: ' + (selected.lifecycle === 'archived' ? 'ARCHIVED (historical)' : 'active at reviewed commit'));
            console.log('Locally installed: ' + (selected.installed ? 'yes' : 'no'));
            console.log('Review: source and license only; scripts have NOT been security-audited.');
          }
          return 0;
        }
        if (values.json) console.log(JSON.stringify({
          total: catalog.skills.length, count: matched.length, skills: matched
        }, null, 2));
        else {
          console.log('=== Agent Commons Public Skill Hub (' + matched.length + ' / ' +
            catalog.skills.length + ') ===');
          for (const skill of matched) {
            console.log('  ' + skill.id + ' | ' + skill.category + ' | ' + skill.author +
              ' | ' + skill.license + (skill.lifecycle === 'archived' ? ' | ARCHIVED' : '') + (skill.installed ? ' | INSTALLED' : ''));
            console.log('    ' + skill.description);
            console.log('    ' + skill.source);
          }
          if (matched.length === 0) console.log('No public skills matched your filters.');
          console.log('Metadata only. Installing and updating are currently disabled.');
        }
        return 0;
      }
      console.error('Unknown catalog subcommand: ' + redactSecrets(subcommand));
      return 1;
    }

    if (command === 'profiles') {
      const action = positionals[1];
      if (action === 'list') {
        if (positionals.length !== 2) throw new Error('Usage: profiles list');
        const manifest = readSavedProfiles(ctx);
        if (values.json) console.log(JSON.stringify(manifest, null, 2));
        else {
          console.log('=== Saved Agent Skill Profiles (local only) ===');
          for (const [agent, profile] of Object.entries(manifest.profiles)) {
            console.log('  ' + agent + ': skills=' + (profile.skills.join(', ') || '(none)') +
              ' | categories=' + (profile.categories.join(', ') || '(none)'));
          }
          if (!Object.keys(manifest.profiles).length) console.log('No saved profiles yet.');
        }
        return 0;
      }
      const agent = positionals[2];
      if (!agent || positionals.length !== 3) throw new Error('Usage: profiles <show|set|clear> <agent-id>');
      if (action === 'set') {
        const manifest = saveAgentProfile(ctx, agent, {
          skills: values.skill, categories: values.profile
        });
        if (values.json) console.log(JSON.stringify(manifest.profiles[agent], null, 2));
        else console.log('Saved local profile for ' + agent + '. Preview using sync --saved-profiles --dry-run.');
        return 0;
      }
      if (action === 'show') {
        const profile = readSavedProfiles(ctx).profiles[agent];
        if (!profile) throw new Error('No saved profile for agent: ' + agent);
        if (values.json) console.log(JSON.stringify(profile, null, 2));
        else console.log(agent + ': skills=' + (profile.skills.join(', ') || '(none)') +
          ', categories=' + (profile.categories.join(', ') || '(none)'));
        return 0;
      }
      if (action === 'clear') {
        clearAgentProfile(ctx, agent);
        console.log('Cleared saved selection for ' + agent + '; existing agent links were not modified.');
        return 0;
      }
      throw new Error('Usage: profiles <list|show|set|clear> [agent-id]');
    }

    if (command === 'sync') {
      if (values['saved-profiles'] && (values.profile?.length || values.skill?.length ||
          values.adopt || values.force || values['mcp-only'])) {
        throw new Error('--saved-profiles cannot combine with --skill, --profile, --adopt, --force or --mcp-only.');
      }
      if (values.profile?.length && values.skill?.length) {
        throw new Error('Use either --profile or --skill, not both.');
      }
      let skillFilter = values.skill;
      if (values.profile?.length) {
        const { catalog, categories } = readPublicCatalog();
        const allowed = new Set(categories.map(c => c.id));
        const unknown = values.profile.filter(p => !allowed.has(p));
        if (unknown.length > 0) {
          throw new Error('Unknown profile: ' + unknown.join(', ') +
            ' (see catalog/categories.json for valid categories).');
        }
        const chosen = new Set(values.profile);
        const installedCentral = new Set(discoverCentralSkills(ctx).map(s => s.name));
        skillFilter = catalog.skills
          .filter(s => chosen.has(s.category) && installedCentral.has(s.id))
          .map(s => s.id);
      }
      const report = values['saved-profiles'] ? runSavedProfilesSync(ctx, {
        agentFilter: values.agent, dryRun: values['dry-run']
      }) : runSync(ctx, {
        skillFilter,
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
        console.log(`\nDry-run complete. No files were modified. Run "agent-commons sync${values['saved-profiles'] ? ' --saved-profiles' : ''}" to apply.`);
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


/**
 * Only the explicit install command requires network access and asynchronous work.
 * The existing synchronous runCli API is preserved for all other commands.
 */
export async function runCliAsync(argv: string[] = process.argv.slice(2)): Promise<number> {
  if (argv[0] === 'web') {
    try {
      const parsed = parseArgs({ args: argv, strict: true, allowPositionals: true,
        options: { help: { type: 'boolean', short: 'h', default: false },
          home: { type: 'string' }, port: { type: 'string' },
          'no-open': { type: 'boolean', default: false } } });
      if (parsed.values.help) { console.log(getCommandHelp('web')); return 0; }
      if (parsed.positionals.length !== 1) throw new Error('Usage: agent-commons web [--port <number>] [--home <path>] [--no-open]');
      const requested = parsed.values.port;
      if (requested !== undefined && !/^[0-9]{1,5}$/.test(requested)) throw new Error('Invalid web port.');
      const port = requested === undefined ? 4173 : Number(requested);
      if (port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535.');
      const instance = await startWebServer({ context: createEnvironmentContext({ homeDir: parsed.values.home }),
        port, openBrowser: !parsed.values['no-open'] });
      console.log('Agent Commons Skill Hub running at ' + instance.url + '\nPress Ctrl+C to stop.');
      return 0;
    } catch (err) {
      console.error('Error: ' + redactSecrets((err as Error).message));
      return 1;
    }
  }
  if (argv[0] !== 'catalog' || !['install', 'update'].includes(argv[1] ?? '') ||
      argv.includes('--help') || argv.includes('-h')) return runCli(argv);
  try {
    const parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        home: { type: 'string' }, json: { type: 'boolean', default: false },
        yes: { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false }
      }
    });
    if (parsed.positionals.length !== 3 || !parsed.positionals[2]) {
      console.error('Usage: agent-commons catalog ' + parsed.positionals[1] + ' <id> [--dry-run | --yes] [--home <path>]');
      return 1;
    }
    const { values } = parsed;
    const ctx = createEnvironmentContext({ homeDir: values.home });
    const approved = Boolean(values.yes) && !values['dry-run'];
    if (parsed.positionals[1] === 'update') {
      const result = await updateCatalogSkill(ctx, parsed.positionals[2], { yes: approved });
      if (values.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log('=== Agent Commons Pinned Skill ' + (result.updated ? 'Update' : 'Update Preview') + ' ===');
        console.log('Skill: ' + result.preview.skill);
        console.log('Before: ' + result.preview.previousCommit);
        console.log('After:  ' + result.preview.proposedCommit);
        console.log('Source: ' + result.preview.source);
        console.log('Destination: ' + result.preview.target);
        console.log('Added: ' + result.preview.added.join(', '));
        console.log('Changed: ' + result.preview.changed.join(', '));
        console.log('Removed: ' + result.preview.removed.join(', '));
        if (result.updated) {
          console.log('Updated without running third-party scripts. Restore snapshot: ' + result.snapshotId);
        } else {
          console.log('Preview only; no files changed. Inspect upstream and pass --yes to approve.');
        }
      }
    } else {
      const result = await installCatalogSkill(ctx, parsed.positionals[2], { yes: approved });
      if (values.json) console.log(JSON.stringify(result, null, 2));
      else {
        console.log('=== Agent Commons Pinned Skill ' + (result.installed ? 'Installation' : 'Preview') + ' ===');
        console.log('Skill: ' + result.preview.skill);
        console.log('Source: ' + result.preview.source);
        console.log('Commit: ' + result.preview.commit);
        console.log('Declared upstream license: ' + result.preview.license);
        console.log('Destination: ' + result.preview.target);
        console.log('Files: ' + result.preview.files.length + ', bytes: ' + result.preview.totalBytes);
        for (const file of result.preview.files) console.log('  + ' + file.relativePath + ' (' + file.size + ' bytes)');
        if (result.installed) console.log('Installed without executing third-party scripts. Backup: ' + result.snapshotId);
        else console.log('Preview only; no files changed. Review upstream and use --yes to approve.');
      }
    }
    return 0;
  } catch (err) {
    console.error('Error: ' + redactSecrets((err as Error).message));
    return 1;
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('agent-commons') ||
    process.argv[1].endsWith('index.ts'));

if (isMain) {
  void runCliAsync(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  }).catch(err => {
    console.error('Error: ' + redactSecrets((err as Error).message));
    process.exitCode = 1;
  });
}
