import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { runCli, runCliAsync } from '../cli/index.js';
import { runMcpProbe, selectProbeTargets } from '../commands/mcp-probe.js';
import { runDoctor } from '../commands/doctor.js';
import { createEnvironmentContext } from '../core/context.js';
import { mkdtempSafe } from '../core/links.js';
import { estimateSkillMetadataTokens, lintSkillText } from '../core/skill-lint.js';
import { demoServerPath, handleDemoMessage } from '../mcp/demo-server.js';
import { findPackageReferences, processCwd } from '../mcp/extension-manager.js';
import { buildInvocation, inspectLaunchTarget, probeMcpServer, resolveCommand } from '../mcp/health.js';
import type { EnvironmentContext } from '../types.js';

const demo = { command: process.execPath, args: [demoServerPath()] };

describe('MCP launch diagnostics and probe', () => {
  let home: string;
  let ctx: EnvironmentContext;
  beforeEach(() => {
    // Spaces and accents on purpose: the Windows paths users actually have.
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent commons santé '));
    ctx = createEnvironmentContext({ homeDir: home });
  });
  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  it('resolves commands on PATH with PATHEXT and reports missing ones without executing', () => {
    const bin = path.join(home, 'bin dir');
    fs.mkdirSync(bin);
    const exe = path.join(bin, process.platform === 'win32' ? 'fake-tool.CMD' : 'fake-tool');
    fs.writeFileSync(exe, '');
    const env = { PATH: bin, PATHEXT: '.EXE;.CMD' };
    assert.equal(resolveCommand('fake-tool', env)?.toLowerCase(), exe.toLowerCase());
    assert.equal(resolveCommand('absent-tool', env), null);
    assert.equal(inspectLaunchTarget({ command: 'absent-tool' }, env).status, 'missing-command');
    const gone = inspectLaunchTarget({ command: path.join(home, 'old', 'node.exe') }, env);
    assert.equal(gone.status, 'missing-command');
    assert.match(gone.message, /no longer exists/);
    assert.equal(inspectLaunchTarget({ command: process.execPath, args: [path.join(home, 'gone.js')] }).status, 'missing-script');
    assert.equal(inspectLaunchTarget({ url: 'https://example.invalid/mcp' }).status, 'remote');
    assert.equal(inspectLaunchTarget({ command: 'x', enabled: false }).status, 'disabled');
    assert.equal(inspectLaunchTarget(demo).status, 'ok');
  });

  it('completes a real stdio handshake, lists tools and calls one tool', async () => {
    const r = await probeMcpServer(demo, { callTool: 'echo', toolArguments: { text: 'bonjour é' } });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.serverName, 'agent-commons-demo');
    assert.deepEqual(r.tools, ['echo', 'time']);
    assert.equal(r.toolResult, 'bonjour é');
  });

  it('reports crashes, unknown tools and timeouts as failures and stops the process', async () => {
    const crash = await probeMcpServer({ command: process.execPath, args: ['-e', 'console.error("Error: boom");process.exit(3)'] });
    assert.equal(crash.ok, false);
    assert.match(crash.error ?? '', /stopped before answering[\s\S]*boom/);
    const unknown = await probeMcpServer(demo, { callTool: 'delete-everything' });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.stage, 'tools/call');
    const hang = await probeMcpServer({ command: process.execPath, args: ['-e', 'setInterval(()=>{},1000)'] }, { timeoutMs: 400 });
    assert.equal(hang.ok, false);
    assert.match(hang.error ?? '', /Timed out/);
    const missing = await probeMcpServer({ command: 'definitely-not-installed-mcp' });
    assert.equal(missing.stage, 'resolve');
  });

  it('launches Windows batch shims through cmd.exe safely, refusing unsafe arguments', async () => {
    assert.throws(() => buildInvocation('C:\\x\\npx.cmd', ['%PATH%'], 'win32'), /unsafe/);
    assert.throws(() => buildInvocation('C:\\x\\npx.cmd', ['a"b'], 'win32'), /unsafe/);
    const inv = buildInvocation('C:\\x y\\npx.cmd', ['-y', 'pkg & more'], 'win32');
    assert.equal(inv.verbatim, true);
    assert.equal(inv.args.at(-1), '""C:\\x y\\npx.cmd" "-y" "pkg & more""');
    if (process.platform !== 'win32') return;
    const shim = path.join(home, 'shim dir', 'demo-mcp.cmd');
    fs.mkdirSync(path.dirname(shim));
    fs.writeFileSync(shim, `@"${process.execPath}" %*\r\n`);
    const r = await probeMcpServer({ command: shim, args: [demoServerPath()] }, { callTool: 'echo', toolArguments: { text: 'cmd ok' } });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.toolResult, 'cmd ok');
  });

  it('demo server answers the MCP methods it advertises', () => {
    assert.equal((handleDemoMessage({ id: 1, method: 'tools/list' }, '1') as { result: { tools: unknown[] } }).result.tools.length, 2);
    assert.equal(handleDemoMessage({ method: 'notifications/initialized' }, '1'), null);
    assert.equal((handleDemoMessage({ id: 2, method: 'nope' }, '1') as { error: { code: number } }).error.code, -32601);
  });

  it('end to end: demo skill + demo MCP synchronized to a client, then probed through its native config', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ theme: 'dark', mcpServers: { perso: { command: 'node', args: ['x.js'] } } }));
    fs.mkdirSync(path.join(home, '.codex'));
    fs.writeFileSync(path.join(home, '.codex', 'config.toml'), '# mine\nmodel = "m"\n');
    const skill = path.join(ctx.centralSkillsDir, 'demo-bonjour');
    fs.mkdirSync(skill, { recursive: true });
    fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: demo-bonjour\ndescription: Demo skill.\n---\nSay OK.\n');
    fs.writeFileSync(ctx.centralMcpPath, JSON.stringify({ mcpServers: { 'agent-commons-demo': demo } }));
    assert.equal(runCli(['sync', '--home', home, '--json']), 0);
    // Skill is visible to both clients through a link to the central copy.
    for (const dir of [path.join(home, '.claude', 'skills'), path.join(home, '.codex', 'skills')]) {
      assert.match(fs.readFileSync(path.join(dir, 'demo-bonjour', 'SKILL.md'), 'utf8'), /name: demo-bonjour/);
    }
    // Personal settings preserved.
    const claude = JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8'));
    assert.equal(claude.theme, 'dark');
    assert.ok(claude.mcpServers.perso);
    assert.match(fs.readFileSync(path.join(home, '.codex', 'config.toml'), 'utf8'), /# mine[\s\S]*\[mcp_servers\.agent-commons-demo\]/);
    // The synchronized native entries really start and answer.
    for (const agent of ['claude-code', 'codex']) {
      const report = await runMcpProbe(ctx, ['agent-commons-demo'], { agent, callTool: 'echo', toolArguments: { text: agent } });
      assert.equal(report.results[0]?.ok, true, report.results[0]?.error);
      assert.equal(report.results[0]?.toolResult, agent);
    }
    assert.throws(() => selectProbeTargets(ctx, ['absent'], 'claude-code'), /not found/);
    assert.equal(await runCliAsync(['mcp', 'probe', 'agent-commons-demo', '--agent', 'codex', '--call', 'echo', '--arg', 'text=a b', '--home', home]), 0);
    assert.equal(await runCliAsync(['mcp', 'probe', 'absent', '--home', home]), 1);
    // Doctor flags the broken personal entry only when its script is absolute and missing.
    const doc = runDoctor(ctx);
    assert.ok(doc.mcpLaunch.some(m => m.scope === 'claude-code' && m.server === 'agent-commons-demo' && m.status === 'ok'));
    assert.equal(doc.skillLint.length, 0);
  });

  it('doctor warns about MCP entries that cannot start and skills clients reject', () => {
    fs.mkdirSync(path.join(home, '.codex'));
    fs.writeFileSync(path.join(home, '.codex', 'config.toml'),
      `[mcp_servers.stale]\ncommand = ${JSON.stringify(path.join(home, 'old-node', 'node.exe'))}\n`);
    const bad = path.join(ctx.centralSkillsDir, 'broken');
    fs.mkdirSync(bad, { recursive: true });
    fs.writeFileSync(path.join(bad, 'SKILL.md'), '---\nname: broken\ndescription: "  + `$s.Desc +  \\\nother: x\n---\n');
    const doc = runDoctor(ctx);
    assert.ok(doc.warnings.some(w => w.includes('"stale"') && w.includes('no longer exists')), doc.warnings.join('\n'));
    assert.ok(doc.warnings.some(w => w.includes('"broken"')), doc.warnings.join('\n'));
    assert.equal(doc.healthy, true, 'warnings do not mark corrupted state');
  });

  it('flags references before uninstalling a managed MCP package and keeps spawn cwd short', () => {
    const pkg = path.join(ctx.commonsDir, 'mcp-packages', 'filesystem', 'node_modules', 'x', 'index.js');
    fs.mkdirSync(ctx.commonsDir, { recursive: true });
    fs.writeFileSync(ctx.centralMcpPath, JSON.stringify({ mcpServers: { filesystem: { command: process.execPath, args: [pkg, home] } } }));
    fs.mkdirSync(path.join(home, '.claude'));
    fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ mcpServers: { fs: { command: process.execPath, args: [pkg] } } }));
    assert.deepEqual(findPackageReferences(ctx, 'filesystem'), ['Central MCP manifest', 'Claude Code']);
    assert.deepEqual(findPackageReferences(ctx, 'playwright'), []);
    const deep = 'C:\\' + 'd'.repeat(260);
    assert.equal(processCwd(deep, 'win32'), os.tmpdir());
    assert.equal(processCwd('C:\\short', 'win32'), 'C:\\short');
    assert.equal(processCwd('/' + 'd'.repeat(300), 'linux'), '/' + 'd'.repeat(300));
  });
});

describe('Windows long paths', () => {
  it('creates temporary staging folders and restores snapshots beyond MAX_PATH', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-long-'));
    try {
      let home = root;
      while (home.length < 250) home = path.join(home, 'dossier très long é');
      fs.mkdirSync(home, { recursive: true });
      const staged = mkdtempSafe(path.join(home, '.agent-commons-restore-'));
      assert.ok(staged.length > 260 || process.platform !== 'win32');
      assert.equal(fs.statSync(staged).isDirectory(), true);
      assert.ok(!staged.startsWith('\\\\?\\'));
      fs.mkdirSync(path.join(home, '.codex'));
      const cfg = path.join(home, '.codex', 'config.toml');
      fs.writeFileSync(cfg, '# perso\n');
      assert.equal(runCli(['backup', '--home', home, '--json']), 0);
      fs.writeFileSync(cfg, '# changed\n');
      assert.equal(runCli(['restore', '--home', home, '--json']), 0);
      assert.equal(fs.readFileSync(cfg, 'utf8'), '# perso\n');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('SKILL.md frontmatter lint', () => {
  const ok = (desc: string) => lintSkillText('demo', `---\nname: demo\ndescription: ${desc}\n---\nbody`);
  it('accepts valid plain, quoted, escaped and block descriptions', () => {
    assert.deepEqual(ok('Plain text.').errors, []);
    assert.deepEqual(ok("'It''s fine: really'").errors, []);
    assert.deepEqual(ok('"Escaped \\" quote"').errors, []);
    assert.deepEqual(ok('>\n  Folded\n  text').errors, []);
    assert.deepEqual(ok('"multi\n  line"').errors, []);
  });
  it('estimates only the metadata clients load, not SKILL.md bodies', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-meta-'));
    try {
      fs.mkdirSync(path.join(root, 'a'));
      const bom = String.fromCharCode(0xfeff);
      fs.writeFileSync(path.join(root, 'a', 'SKILL.md'),
        [bom + '---', 'name: a', 'description: ' + 'x'.repeat(400), '---', 'body '.repeat(5000)].join('\n'));
      const tokens = estimateSkillMetadataTokens(root);
      assert.ok(tokens > 90 && tokens < 130, String(tokens));
      assert.equal(estimateSkillMetadataTokens(path.join(root, 'absent')), 0);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
  });
  it('rejects what clients reject and separates naming advisories', () => {
    assert.match(ok('Broken: colon').errors.join(), /unquoted/);
    assert.match(ok('"unterminated').errors.join(), /unterminated/);
    assert.match(ok('"closed" trailing').errors.join(), /after closing quote/);
    assert.match(ok('x'.repeat(1025)).errors.join(), /1025 characters/);
    assert.deepEqual(lintSkillText('demo', 'no frontmatter').errors.length, 1);
    assert.match(lintSkillText('demo', '---\nname: demo\n---').errors.join(), /missing "description"/);
    const advisory = lintSkillText('folder', '---\nname: Other Name\ndescription: d\n---');
    assert.deepEqual(advisory.errors, []);
    assert.equal(advisory.advisories.length, 1);
  });
});
