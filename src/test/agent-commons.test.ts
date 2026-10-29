import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  AGENT_REGISTRY,
  assertSafeSubpath,
  containsRawSecret,
  createDirectoryLink,
  createEnvironmentContext,
  createFullBackup,
  detachLinkSafe,
  detectAgents,
  inspectPath,
  isValidIdentifier,
  listBackups,
  parseCodexTomlMcpServers,
  parseJsoncObject,
  redactObjectSecrets,
  redactSecrets,
  removePhysicalDirectorySafe,
  restoreBackup,
  runDoctor,
  runList,
  runSync,
  writeFileAtomicSync
} from '../index.js';
import { runCli } from '../cli/index.js';

function createTempSandbox(prefix = 'agent-commons-test-'): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeSkill(skillsRoot: string, name: string, content = `# Skill ${name}\n`): string {
  const dir = path.join(skillsRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), content, 'utf8');
  return dir;
}

describe('Agent Commons - Intensive Hardening & Security Test Suite', () => {
  let sandboxDir: string;

  beforeEach(() => {
    sandboxDir = createTempSandbox();
  });

  afterEach(() => {
    if (fs.existsSync(sandboxDir)) {
      removePhysicalDirectorySafe(sandboxDir);
    }
  });

  describe('1. Agent Detection (All 17 Environments & Virgin Environment)', () => {
    it('handles a completely virgin environment gracefully (doctor, list, sync)', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      const detected = detectAgents(ctx);
      assert.equal(detected.length, 17);
      assert.equal(detected.filter((a) => a.installed).length, 0);

      const doc = runDoctor(ctx);
      assert.equal(doc.healthy, true);
      assert.equal(doc.centralSkillsCount, 0);
      assert.equal(doc.centralMcpStatus, 'missing');

      const list = runList(ctx);
      assert.equal(list.centralSkills.length, 0);
      assert.equal(list.centralMcpServers.length, 0);
      assert.equal(list.backups.length, 0);

      const sync = runSync(ctx);
      assert.equal(sync.errors.length, 0);
      assert.equal(sync.snapshotId, null);
    });

    it('detects all 17 registered agents when their directories exist', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });

      for (const def of AGENT_REGISTRY) {
        const firstDetectPath = def.detectPaths(ctx)[0]!;
        if (firstDetectPath.endsWith('.json')) {
          fs.mkdirSync(path.dirname(firstDetectPath), { recursive: true });
          fs.writeFileSync(firstDetectPath, '{}', 'utf8');
        } else {
          fs.mkdirSync(firstDetectPath, { recursive: true });
        }
      }

      const detected = detectAgents(ctx);
      assert.equal(detected.length, 17);
      for (const agent of detected) {
        assert.equal(
          agent.installed,
          true,
          `Expected agent "${agent.definition.id}" to be detected`
        );
      }
    });

    it('supports filtering detection by agent ID', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      fs.mkdirSync(path.join(sandboxDir, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(sandboxDir, '.codex'), { recursive: true });

      const filtered = detectAgents(ctx, ['codex']);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0]?.definition.id, 'codex');
      assert.equal(filtered[0]?.installed, true);
    });

    it('resolves cross-platform AppData / LocalShare paths for win32, darwin, and linux', () => {
      const winCtx = createEnvironmentContext({ homeDir: sandboxDir, platform: 'win32' });
      const macCtx = createEnvironmentContext({ homeDir: sandboxDir, platform: 'darwin' });
      const linCtx = createEnvironmentContext({ homeDir: sandboxDir, platform: 'linux' });

      assert.ok(winCtx.localAppDataDir.endsWith(path.join('AppData', 'Local')));
      assert.ok(macCtx.localAppDataDir.endsWith(path.join('Library', 'Application Support')));
      assert.ok(linCtx.localAppDataDir.endsWith(path.join('.local', 'share')));
    });
  });

  describe('2. Safe NTFS Junctions & Symlinks Engine', () => {
    it('creates directory link and detaches it without touching target contents', () => {
      const targetDir = path.join(sandboxDir, 'central-skill');
      const nestedFile = path.join(targetDir, 'SKILL.md');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(nestedFile, '# Important Skill Data', 'utf8');

      const linkPath = path.join(sandboxDir, 'agent', 'skills', 'central-skill');
      createDirectoryLink(linkPath, targetDir);

      const inspected = inspectPath(linkPath);
      assert.equal(inspected.state, 'link');
      assert.equal(inspected.targetExists, true);
      assert.equal(
        fs.readFileSync(path.join(linkPath, 'SKILL.md'), 'utf8'),
        '# Important Skill Data'
      );

      detachLinkSafe(linkPath);

      assert.equal(inspectPath(linkPath).state, 'missing');
      assert.equal(inspectPath(targetDir).state, 'directory');
      assert.equal(fs.readFileSync(nestedFile, 'utf8'), '# Important Skill Data');
    });

    it('refuses to call detachLinkSafe on a physical directory or file', () => {
      const physDir = path.join(sandboxDir, 'real-dir');
      fs.mkdirSync(physDir, { recursive: true });

      assert.throws(() => detachLinkSafe(physDir), /Safety violation/);
    });

    it('removePhysicalDirectorySafe detaches nested links instead of traversing them', () => {
      const externalTarget = path.join(sandboxDir, 'external-protected');
      const protectedFile = path.join(externalTarget, 'DO_NOT_DELETE.txt');
      fs.mkdirSync(externalTarget, { recursive: true });
      fs.writeFileSync(protectedFile, 'precious data', 'utf8');

      const containerDir = path.join(sandboxDir, 'container');
      const innerLink = path.join(containerDir, 'nested-link');
      fs.mkdirSync(containerDir, { recursive: true });
      createDirectoryLink(innerLink, externalTarget);

      removePhysicalDirectorySafe(containerDir);

      assert.equal(inspectPath(containerDir).state, 'missing');
      assert.equal(inspectPath(externalTarget).state, 'directory');
      assert.equal(fs.readFileSync(protectedFile, 'utf8'), 'precious data');
    });
  });

  describe('3. Paths with Spaces, Parentheses & Special Characters', () => {
    it('synchronizes skills and MCP configs when home path contains spaces and special characters', () => {
      const specialHome = path.join(sandboxDir, 'User Name (Dev & QA) [2026]');
      fs.mkdirSync(specialHome, { recursive: true });

      const ctx = createEnvironmentContext({ homeDir: specialHome });
      writeSkill(ctx.centralSkillsDir, 'special-path-skill', '# Works with spaces');
      fs.writeFileSync(
        ctx.centralMcpPath,
        JSON.stringify({
          mcpServers: {
            'local-tool': {
              command: 'node',
              args: ['C:\\Program Files\\My Tool (x64)\\server.js']
            }
          }
        }),
        'utf8'
      );

      fs.mkdirSync(path.join(specialHome, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(specialHome, '.codex'), { recursive: true });

      const sync1 = runSync(ctx);
      assert.equal(sync1.errors.length, 0);
      assert.equal(
        inspectPath(path.join(specialHome, '.claude', 'skills', 'special-path-skill')).state,
        'link'
      );

      // Second sync verifies path comparison works cleanly with spaces/special chars
      const sync2 = runSync(ctx);
      assert.equal(
        sync2.skillResults.every((r) => r.action === 'already-synced'),
        true
      );
      assert.equal(
        sync2.mcpResults.every((r) => r.action === 'unchanged'),
        true
      );
    });
  });

  describe('4. Idempotent Skills Synchronization & Conflict Handling', () => {
    it('synchronizes skills across all 17 agents and is strictly idempotent across 3 consecutive runs', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'alpha-skill', '# Alpha');
      writeSkill(ctx.centralSkillsDir, 'beta-skill', '# Beta');

      for (const def of AGENT_REGISTRY) {
        const detectPath = def.detectPaths(ctx)[0]!;
        if (detectPath.endsWith('.json')) {
          fs.mkdirSync(path.dirname(detectPath), { recursive: true });
          fs.writeFileSync(detectPath, '{}', 'utf8');
        } else {
          fs.mkdirSync(detectPath, { recursive: true });
        }
      }

      // Run 1: creates 34 links (17 agents * 2 skills)
      const report1 = runSync(ctx);
      assert.equal(report1.errors.length, 0);
      assert.equal(
        report1.skillResults.filter((r) => r.action === 'created-link').length,
        34
      );

      // Run 2 & Run 3: 100% already-synced, no redundant snapshots
      const report2 = runSync(ctx);
      assert.equal(report2.snapshotId, null);
      assert.equal(
        report2.skillResults.filter((r) => r.action === 'already-synced').length,
        34
      );

      const report3 = runSync(ctx);
      assert.equal(report3.snapshotId, null);
      assert.equal(
        report3.skillResults.filter((r) => r.action === 'already-synced').length,
        34
      );
    });

    it('replaces identical physical skill folders with links, but preserves diverged folders as conflicts unless --force', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'same-skill', '# Identical Content');
      writeSkill(ctx.centralSkillsDir, 'diverged-skill', '# Central Version');

      const claudeSkillsDir = path.join(sandboxDir, '.claude', 'skills');
      writeSkill(claudeSkillsDir, 'same-skill', '# Identical Content');
      writeSkill(claudeSkillsDir, 'diverged-skill', '# Local Custom Modified Version');

      const report1 = runSync(ctx);
      const sameRes = report1.skillResults.find((r) => r.skillName === 'same-skill');
      const divRes = report1.skillResults.find((r) => r.skillName === 'diverged-skill');

      assert.equal(sameRes?.action, 'replaced-identical-copy');
      assert.equal(inspectPath(path.join(claudeSkillsDir, 'same-skill')).state, 'link');

      assert.equal(divRes?.action, 'conflict-skipped');
      assert.equal(inspectPath(path.join(claudeSkillsDir, 'diverged-skill')).state, 'directory');
      assert.equal(
        fs.readFileSync(path.join(claudeSkillsDir, 'diverged-skill', 'SKILL.md'), 'utf8'),
        '# Local Custom Modified Version'
      );

      const report2 = runSync(ctx, { force: true });
      const divResForced = report2.skillResults.find((r) => r.skillName === 'diverged-skill');
      assert.equal(divResForced?.action, 'replaced-forced');
      assert.equal(inspectPath(path.join(claudeSkillsDir, 'diverged-skill')).state, 'link');
      assert.ok(report2.snapshotId);
    });

    it('preserves local-only orphan skills by default and adopts them when --adopt is passed', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'core-skill', '# Core');

      const codexSkillsDir = path.join(sandboxDir, '.codex', 'skills');
      writeSkill(codexSkillsDir, 'unique-codex-skill', '# Unique Local Skill');

      const report1 = runSync(ctx);
      const unmanaged = report1.skillResults.find((r) => r.skillName === 'unique-codex-skill');
      assert.equal(unmanaged?.action, 'unmanaged-local');
      assert.equal(inspectPath(path.join(codexSkillsDir, 'unique-codex-skill')).state, 'directory');

      const report2 = runSync(ctx, { adopt: true });
      const adopted = report2.skillResults.find(
        (r) => r.skillName === 'unique-codex-skill' && r.action === 'adopted-to-central'
      );
      assert.ok(adopted);
      assert.equal(
        inspectPath(path.join(ctx.centralSkillsDir, 'unique-codex-skill')).state,
        'directory'
      );
      assert.equal(inspectPath(path.join(codexSkillsDir, 'unique-codex-skill')).state, 'link');
    });

    it('repairs both misdirected links and broken (dangling) links', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'misdirected', '# Central Misdirected');
      writeSkill(ctx.centralSkillsDir, 'dangling', '# Central Dangling');

      const wrongTarget = writeSkill(path.join(sandboxDir, 'wrong'), 'misdirected', '# Wrong');
      const deletedTarget = writeSkill(path.join(sandboxDir, 'temp-deleted'), 'dangling', '# Gone');

      const cursorSkillsDir = path.join(sandboxDir, '.cursor', 'skills');
      fs.mkdirSync(cursorSkillsDir, { recursive: true });

      const misdirectedLink = path.join(cursorSkillsDir, 'misdirected');
      const danglingLink = path.join(cursorSkillsDir, 'dangling');

      createDirectoryLink(misdirectedLink, wrongTarget, ctx.platform);
      createDirectoryLink(danglingLink, deletedTarget, ctx.platform);

      // Delete target of danglingLink so it becomes a broken junction/symlink
      removePhysicalDirectorySafe(deletedTarget);
      assert.equal(inspectPath(danglingLink).state, 'link');
      assert.equal(inspectPath(danglingLink).targetExists, false);

      // Doctor detects broken link and misdirected link
      const docBefore = runDoctor(ctx);
      assert.equal(docBefore.healthy, false);
      assert.ok(docBefore.issues.some((i) => i.includes('Broken skill link')));

      // Sync repairs both
      const report = runSync(ctx);
      assert.equal(
        report.skillResults.find((r) => r.skillName === 'misdirected')?.action,
        'repaired-link'
      );
      assert.equal(
        report.skillResults.find((r) => r.skillName === 'dangling')?.action,
        'repaired-link'
      );

      const docAfter = runDoctor(ctx);
      assert.equal(docAfter.healthy, true);
    });
  });

  describe('5. Non-Destructive MCP Merging (JSON, JSONC, TOML & Multiline/Comment Edge Cases)', () => {
    it('merges MCP servers into Standard JSON, OpenCode JSONC, and Codex TOML with inline comments & multiline arrays', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      fs.mkdirSync(ctx.commonsDir, { recursive: true });

      const centralManifest = {
        mcpServers: {
          serena: {
            type: 'stdio',
            command: 'uvx',
            args: ['serena', 'start-mcp-server', '--context', 'ide'],
            startupTimeoutSec: 120,
            toolTimeoutSec: 180,
            agentOverrides: {
              'claude-code': {
                args: ['serena', 'start-mcp-server', '--context', 'claude-code']
              },
              codex: {
                args: ['serena', 'start-mcp-server', '--context', 'codex']
              }
            }
          },
          'context-mode': {
            type: 'stdio',
            command: 'context-mode',
            args: [],
            env: {
              CTX_TOKEN: '${CTX_SECRET_ENV}'
            }
          }
        }
      };
      fs.writeFileSync(ctx.centralMcpPath, JSON.stringify(centralManifest, null, 2), 'utf8');

      // 1. Existing Claude Code config
      fs.mkdirSync(path.join(sandboxDir, '.claude'), { recursive: true });
      const claudeConfigPath = path.join(sandboxDir, '.claude.json');
      fs.writeFileSync(
        claudeConfigPath,
        JSON.stringify(
          {
            theme: 'dark',
            permissions: { defaultMode: 'auto' },
            mcpServers: {
              'existing-custom': {
                command: 'node',
                args: ['custom.js']
              }
            }
          },
          null,
          2
        ),
        'utf8'
      );

      // 2. Existing OpenCode JSONC config
      const opencodeDir = path.join(sandboxDir, '.config', 'opencode');
      fs.mkdirSync(opencodeDir, { recursive: true });
      const opencodeConfigPath = path.join(opencodeDir, 'opencode.jsonc');
      fs.writeFileSync(
        opencodeConfigPath,
        `{
          // OpenCode configuration with comments
          "$schema": "https://opencode.ai/config.json",
          "model": "claude-sonnet",
          /* Block comment */
          "mcp": {
            "legacy-tool": {
              "type": "local",
              "command": ["legacy"],
              "enabled": true,
            },
          },
        }`,
        'utf8'
      );

      // 3. Existing Codex config.toml with multiline array and inline # comments
      const codexDir = path.join(sandboxDir, '.codex');
      fs.mkdirSync(codexDir, { recursive: true });
      const codexConfigPath = path.join(codexDir, 'config.toml');
      fs.writeFileSync(
        codexConfigPath,
        `model = "gpt-5" # main model

[mcp_servers.node_repl] # built-in repl
command = "node_repl.exe"
args = [
  "--flag",
  "https://example.com#anchor" # URL with # inside string
]
startup_timeout_sec = 60 # timeout comment

[projects."demo_workspace"]
trust_level = "trusted"
`,
        'utf8'
      );

      const report = runSync(ctx);
      assert.equal(report.errors.length, 0);

      // Verify Codex TOML kept existing multiline server with # anchor and added new ones
      const updatedTomlRaw = fs.readFileSync(codexConfigPath, 'utf8');
      const tomlServers = parseCodexTomlMcpServers(updatedTomlRaw);
      assert.deepEqual(tomlServers.get('node_repl')?.args, [
        '--flag',
        'https://example.com#anchor'
      ]);
      assert.deepEqual(tomlServers.get('serena')?.args, [
        'serena',
        'start-mcp-server',
        '--context',
        'codex'
      ]);
      assert.deepEqual(tomlServers.get('context-mode')?.env, {
        CTX_TOKEN: '${CTX_SECRET_ENV}'
      });
    });

    it('preserves conflicting existing MCP server definitions unless --force is passed', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      fs.mkdirSync(ctx.commonsDir, { recursive: true });
      fs.writeFileSync(
        ctx.centralMcpPath,
        JSON.stringify({
          mcpServers: {
            myserver: { command: 'new-binary', args: ['--v2'] }
          }
        }),
        'utf8'
      );

      const cursorDir = path.join(sandboxDir, '.cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      const cursorMcpPath = path.join(cursorDir, 'mcp.json');
      fs.writeFileSync(
        cursorMcpPath,
        JSON.stringify({
          mcpServers: {
            myserver: { command: 'old-binary', args: ['--v1'] }
          }
        }),
        'utf8'
      );

      const r1 = runSync(ctx);
      assert.equal(r1.mcpResults[0]?.action, 'conflict-preserved');
      const after1 = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf8'));
      assert.equal(after1.mcpServers.myserver.command, 'old-binary');

      const r2 = runSync(ctx, { force: true });
      assert.equal(r2.mcpResults[0]?.action, 'updated-forced');
      const after2 = JSON.parse(fs.readFileSync(cursorMcpPath, 'utf8'));
      assert.equal(after2.mcpServers.myserver.command, 'new-binary');
    });
  });

  describe('6. Corrupted Configurations Handling', () => {
    it('never overwrites corrupted JSON or TOML files and reports them accurately', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      fs.mkdirSync(ctx.commonsDir, { recursive: true });
      fs.writeFileSync(
        ctx.centralMcpPath,
        JSON.stringify({
          mcpServers: {
            serena: { command: 'uvx', args: ['serena'] }
          }
        }),
        'utf8'
      );

      const cursorDir = path.join(sandboxDir, '.cursor');
      fs.mkdirSync(cursorDir, { recursive: true });
      const badJsonPath = path.join(cursorDir, 'mcp.json');
      const badJsonContent = '{ "mcpServers": { broken json ';
      fs.writeFileSync(badJsonPath, badJsonContent, 'utf8');

      const codexDir = path.join(sandboxDir, '.codex');
      fs.mkdirSync(codexDir, { recursive: true });
      const badTomlPath = path.join(codexDir, 'config.toml');
      const badTomlContent = '[mcp_servers.unclosed_header\ncommand = "x"';
      fs.writeFileSync(badTomlPath, badTomlContent, 'utf8');

      const syncReport = runSync(ctx);
      const cursorRes = syncReport.mcpResults.find((r) => r.agentId === 'cursor');
      const codexRes = syncReport.mcpResults.find((r) => r.agentId === 'codex');

      assert.equal(cursorRes?.action, 'corrupted-config');
      assert.equal(codexRes?.action, 'corrupted-config');

      assert.equal(fs.readFileSync(badJsonPath, 'utf8'), badJsonContent);
      assert.equal(fs.readFileSync(badTomlPath, 'utf8'), badTomlContent);

      const doc = runDoctor(ctx);
      assert.equal(doc.healthy, false);
    });
  });

  describe('7. Backup, Restore & Transactional Rollback on Interruption/Failure', () => {
    it('creates snapshots and restores links, physical folders, and MCP configs accurately', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'skill-one', '# Central Skill One');
      fs.writeFileSync(
        ctx.centralMcpPath,
        JSON.stringify({ mcpServers: { s1: { command: 'cmd1' } } }),
        'utf8'
      );

      const claudeDir = path.join(sandboxDir, '.claude');
      const claudeSkills = path.join(claudeDir, 'skills');
      fs.mkdirSync(claudeSkills, { recursive: true });
      writeSkill(claudeSkills, 'skill-one', '# Original Local Diverged Skill');

      const claudeMcp = path.join(sandboxDir, '.claude.json');
      fs.writeFileSync(claudeMcp, JSON.stringify({ theme: 'light' }), 'utf8');

      const manualSnap = createFullBackup(ctx, 'manual');
      assert.ok(manualSnap.id.startsWith('snapshot-'));

      runSync(ctx, { force: true });
      assert.equal(inspectPath(path.join(claudeSkills, 'skill-one')).state, 'link');
      assert.ok(JSON.parse(fs.readFileSync(claudeMcp, 'utf8')).mcpServers?.s1);

      restoreBackup(ctx, manualSnap.id);

      assert.equal(inspectPath(path.join(claudeSkills, 'skill-one')).state, 'directory');
      assert.equal(
        fs.readFileSync(path.join(claudeSkills, 'skill-one', 'SKILL.md'), 'utf8'),
        '# Original Local Diverged Skill'
      );
      assert.equal(
        fs.readFileSync(path.join(ctx.centralSkillsDir, 'skill-one', 'SKILL.md'), 'utf8'),
        '# Central Skill One'
      );
      assert.deepEqual(JSON.parse(fs.readFileSync(claudeMcp, 'utf8')), { theme: 'light' });

      const allBackups = listBackups(ctx);
      assert.equal(allBackups.length, 2);
    });

    it('rolls back automatically if a permission error or interruption occurs mid-sync', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, '01-good-skill', '# Good');
      writeSkill(ctx.centralSkillsDir, '02-fail-skill', '# Fail');

      const claudeSkills = path.join(sandboxDir, '.claude', 'skills');
      fs.mkdirSync(claudeSkills, { recursive: true });

      const origSymlink = fs.symlinkSync;
      let calls = 0;
      fs.symlinkSync = ((
        target: fs.PathLike,
        pathLike: fs.PathLike,
        type?: fs.symlink.Type | null
      ) => {
        calls++;
        if (calls === 2) {
          const err = new Error('EACCES: permission denied creating link') as NodeJS.ErrnoException;
          err.code = 'EACCES';
          throw err;
        }
        return origSymlink(target, pathLike, type);
      }) as typeof fs.symlinkSync;

      try {
        const report = runSync(ctx);
        assert.equal(report.rolledBack, true);
        assert.ok(report.errors.length > 0);
        assert.equal(inspectPath(path.join(claudeSkills, '01-good-skill')).state, 'missing');
      } finally {
        fs.symlinkSync = origSymlink;
      }
    });
  });

  describe('8. Security: Malicious Symlink Following, Boundary Enforcement & Secret Scrubbing', () => {
    it('refuses to traverse or write inside an agent skills directory that is itself a symlink/junction', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'central-skill', '# Central');

      // External directory that must NOT be polluted
      const externalDir = path.join(sandboxDir, 'external-target');
      fs.mkdirSync(externalDir, { recursive: true });

      // Make .claude/skills itself a link pointing to externalDir
      const claudeDir = path.join(sandboxDir, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      createDirectoryLink(path.join(claudeDir, 'skills'), externalDir, ctx.platform);

      const report = runSync(ctx);
      const claudeItem = report.skillResults.find((r) => r.agentId === 'claude-code');
      assert.equal(claudeItem?.action, 'conflict-skipped');
      assert.equal(inspectPath(path.join(externalDir, 'central-skill')).state, 'missing');
    });

    it('refuses to overwrite an MCP configuration file that is a symlink pointing outside', () => {
      const externalFile = path.join(sandboxDir, 'sensitive-external.json');
      fs.writeFileSync(externalFile, '{"secret":"do-not-touch"}', 'utf8');

      // Test writeFileAtomicSync against a directory link at target path
      const fakeTargetDir = path.join(sandboxDir, 'fake-dir');
      fs.mkdirSync(fakeTargetDir, { recursive: true });
      const linkedPath = path.join(sandboxDir, 'linked-config.json');
      createDirectoryLink(linkedPath, fakeTargetDir);

      assert.throws(() => writeFileAtomicSync(linkedPath, '{}'), /Security violation/);
      assert.equal(fs.readFileSync(externalFile, 'utf8'), '{"secret":"do-not-touch"}');
    });

    it('rejects backup restore if a tampered manifest points outside homeDir/localAppDataDir', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      const outsideDir = createTempSandbox('agent-commons-outside-');
      const outsideVictim = path.join(outsideDir, 'victim.txt');
      fs.writeFileSync(outsideVictim, 'must survive', 'utf8');

      try {
        const snapId = 'snapshot-20261029-999999-tamper';
        const snapDir = path.join(ctx.backupsDir, snapId);
        fs.mkdirSync(snapDir, { recursive: true });
        fs.writeFileSync(
          path.join(snapDir, 'manifest.json'),
          JSON.stringify({
            id: snapId,
            version: 1,
            createdAt: new Date().toISOString(),
            reason: 'manual',
            platform: ctx.platform,
            entries: [
              {
                agentId: 'claude-code',
                kind: 'mcp-config',
                originalPath: outsideVictim,
                stateBefore: 'missing'
              }
            ]
          }),
          'utf8'
        );

        assert.throws(() => restoreBackup(ctx, snapId), /Security violation/);
        assert.equal(fs.readFileSync(outsideVictim, 'utf8'), 'must survive');
      } finally {
        removePhysicalDirectorySafe(outsideDir);
      }
    });

    it('redacts tokens, API keys, passwords, JWTs, and DB credentials while keeping ${ENV_VAR} syntax', () => {
      const dummyJwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'abc123456'].join('.');
      const dummySk = 'sk-proj-' + '1234567890abcdefghij';
      const dummyGhp = 'ghp_' + '0'.repeat(32);
      const dummyAkia = 'AKIA' + 'IOSFODNN7EXAMPLE';
      const dummyAnt = 'sk-ant-' + '1234567890abcdef';

      const raw = [
        `Authorization: Bearer ${dummyJwt}`,
        `OPENAI_API_KEY=${dummySk}`,
        `GITHUB_TOKEN="${dummyGhp}"`,
        `AWS_KEY=${dummyAkia}`,
        'DB=postgres://admin:SuperSecretPass123!@db.internal:5432/prod',
        'SAFE_VAR=${MY_ENV_SECRET}'
      ].join('\n');

      const scrubbed = redactSecrets(raw);
      assert.equal(containsRawSecret(scrubbed), false);
      assert.ok(!scrubbed.includes(dummySk));
      assert.ok(!scrubbed.includes(dummyGhp));
      assert.ok(!scrubbed.includes(dummyAkia));
      assert.ok(!scrubbed.includes('SuperSecretPass123!'));
      assert.ok(scrubbed.includes('${MY_ENV_SECRET}'));

      const obj = {
        apiKey: dummyAnt,
        envRef: '${ANTHROPIC_API_KEY}',
        nested: {
          client_secret: 'my-raw-secret-value'
        }
      };
      const scrubbedObj = redactObjectSecrets(obj);
      assert.equal(scrubbedObj.apiKey, '[REDACTED]');
      assert.equal(scrubbedObj.envRef, '${ANTHROPIC_API_KEY}');
      assert.equal(scrubbedObj.nested.client_secret, '[REDACTED]');
    });

    it('rejects path traversal and unsafe identifiers', () => {
      assert.equal(isValidIdentifier('valid-skill_1.0'), true);
      assert.equal(isValidIdentifier('../escape'), false);
      assert.equal(isValidIdentifier('nested/skill'), false);
      assert.equal(isValidIdentifier('..'), false);
      assert.equal(isValidIdentifier(''), false);

      assert.throws(
        () => assertSafeSubpath('/home/user/.agents/skills', '/home/user/.claude/skills'),
        /traversal rejected/
      );
    });
  });

  describe('9. CLI End-to-End Workflow (--dry-run, sync, list, doctor, backup, restore)', () => {
    it('executes all CLI commands cleanly against an isolated --home directory', () => {
      const ctx = createEnvironmentContext({ homeDir: sandboxDir });
      writeSkill(ctx.centralSkillsDir, 'cli-skill', '# CLI Skill');
      fs.mkdirSync(path.join(sandboxDir, '.claude'), { recursive: true });

      const dryCode = runCli(['sync', '--dry-run', '--home', sandboxDir, '--json']);
      assert.equal(dryCode, 0);
      assert.equal(
        inspectPath(path.join(sandboxDir, '.claude', 'skills', 'cli-skill')).state,
        'missing'
      );

      const syncCode = runCli(['sync', '--home', sandboxDir, '--json']);
      assert.equal(syncCode, 0);
      assert.equal(
        inspectPath(path.join(sandboxDir, '.claude', 'skills', 'cli-skill')).state,
        'link'
      );

      const docCode = runCli(['doctor', '--home', sandboxDir, '--json']);
      assert.equal(docCode, 0);

      const listCode = runCli(['list', '--home', sandboxDir, '--json']);
      assert.equal(listCode, 0);

      const backupCode = runCli(['backup', '--home', sandboxDir, '--json']);
      assert.equal(backupCode, 0);

      const restoreCode = runCli(['restore', '--home', sandboxDir, '--json']);
      assert.equal(restoreCode, 0);
    });
  });
});
