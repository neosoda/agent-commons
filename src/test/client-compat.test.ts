import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { runDoctor } from '../commands/doctor.js';
import { runSync } from '../commands/sync.js';
import { createEnvironmentContext } from '../core/context.js';
import { inspectPath } from '../core/links.js';
import type { EnvironmentContext } from '../types.js';
import { linkDirectory } from './fs-links.js';

function skill(root: string, folder: string, name = folder): string {
  const dir = path.join(root, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${folder} demo.\n---\nBody.\n`);
  return dir;
}

describe('Multi-client compatibility (documented skill and MCP locations)', () => {
  let home: string;
  let ctx: EnvironmentContext;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-clients-'));
    ctx = createEnvironmentContext({ homeDir: home });
  });
  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  it('flags exactly the clients whose docs list ~/.agents/skills and fixes known paths', () => {
    const native = AGENT_REGISTRY.filter(a => a.readsCentralSkills).map(a => a.id).sort();
    assert.deepEqual(native, ['codex', 'cursor', 'gemini-cli', 'opencode', 'windsurf']);
    const byId = new Map(AGENT_REGISTRY.map(a => [a.id, a]));
    assert.equal(byId.get('opencode')!.skillsDir(ctx), path.join(home, '.config', 'opencode', 'skills'));
    assert.equal(byId.get('gemini-config')!.name, 'Antigravity');
    assert.equal(byId.get('gemini-config')!.mcpConfig!.path(ctx), path.join(home, '.gemini', 'config', 'mcp_config.json'));
    assert.equal(byId.get('windsurf')!.mcpConfig!.path(ctx), path.join(home, '.codeium', 'windsurf', 'mcp_config.json'));
    assert.equal(byId.get('copilot-cli')!.mcpConfig!.path(ctx), path.join(home, '.copilot', 'mcp-config.json'));
    assert.equal(byId.get('qwen-code')!.mcpConfig!.path(ctx), path.join(home, '.qwen', 'settings.json'));
  });

  it('does not duplicate central skills for native readers and removes redundant or dangling links', () => {
    const a = skill(ctx.centralSkillsDir, 'alpha');
    skill(ctx.centralSkillsDir, 'beta');
    const gemini = path.join(home, '.gemini', 'skills');
    fs.mkdirSync(gemini, { recursive: true });
    linkDirectory(a, path.join(gemini, 'alpha'));
    const gone = skill(path.join(home, 'tmp'), 'beta');
    linkDirectory(gone, path.join(gemini, 'beta'));
    fs.rmSync(gone, { recursive: true, force: true });
    const own = skill(gemini, 'gemini-only');
    fs.mkdirSync(path.join(home, '.claude'));

    const dry = runSync(ctx, { dryRun: true, skillsOnly: true });
    assert.equal(dry.skillResults.filter(r => r.agentId === 'gemini-cli' && r.action === 'deduplicated').length, 2);
    assert.equal(inspectPath(path.join(gemini, 'alpha')).state, 'link');

    const applied = runSync(ctx, { skillsOnly: true });
    assert.deepEqual(applied.errors, []);
    assert.equal(inspectPath(path.join(gemini, 'alpha')).state, 'missing');
    assert.equal(inspectPath(path.join(gemini, 'beta')).state, 'missing');
    assert.equal(inspectPath(own).state, 'directory', 'client-owned skills are never touched');
    assert.equal(inspectPath(a).state, 'directory', 'central skill intact');
    assert.ok(applied.skillResults.some(r => r.agentId === 'gemini-cli' && r.action === 'native-shared'));
    // Clients that only read their own folder still get links.
    assert.equal(inspectPath(path.join(home, '.claude', 'skills', 'alpha')).state, 'link');
    // Idempotent and the pre-sync snapshot can bring the links back.
    const again = runSync(ctx, { skillsOnly: true });
    assert.equal(again.snapshotId, null);
  });

  it('writes Copilot CLI, Windsurf and Qwen Code MCP entries in their own schemas', () => {
    for (const dir of ['.copilot', path.join('.codeium', 'windsurf'), '.qwen']) fs.mkdirSync(path.join(home, dir), { recursive: true });
    fs.mkdirSync(ctx.commonsDir, { recursive: true });
    fs.writeFileSync(ctx.centralMcpPath, JSON.stringify({ mcpServers: {
      local: { command: 'node', args: ['server.js'], env: { MODE: 'demo' } },
      remote: { url: 'https://example.invalid/mcp' } } }));
    const first = runSync(ctx, { mcpOnly: true });
    assert.deepEqual(first.errors, []);
    const copilot = JSON.parse(fs.readFileSync(path.join(home, '.copilot', 'mcp-config.json'), 'utf8')).mcpServers;
    assert.deepEqual(copilot.local, { type: 'local', command: 'node', args: ['server.js'], env: { MODE: 'demo' }, tools: ['*'] });
    assert.deepEqual(copilot.remote, { type: 'http', url: 'https://example.invalid/mcp', tools: ['*'] });
    const windsurf = JSON.parse(fs.readFileSync(path.join(home, '.codeium', 'windsurf', 'mcp_config.json'), 'utf8')).mcpServers;
    assert.equal(windsurf.local.command, 'node');
    const qwen = JSON.parse(fs.readFileSync(path.join(home, '.qwen', 'settings.json'), 'utf8')).mcpServers;
    assert.equal(qwen.remote.url, 'https://example.invalid/mcp');
    const second = runSync(ctx, { mcpOnly: true });
    assert.ok(second.mcpResults.every(r => r.action === 'unchanged'), JSON.stringify(second.mcpResults));
  });

  it('doctor accepts a client root linked to the central library and reports duplicates and real token cost', () => {
    skill(ctx.centralSkillsDir, 'design-system');
    skill(ctx.centralSkillsDir, 'ecc-design-system', 'design-system');
    fs.mkdirSync(path.join(home, '.gemini', 'config'), { recursive: true });
    linkDirectory(ctx.centralSkillsDir, path.join(home, '.gemini', 'config', 'skills'));
    const codexSkills = path.join(home, '.codex', 'skills');
    fs.mkdirSync(codexSkills, { recursive: true });
    linkDirectory(path.join(ctx.centralSkillsDir, 'design-system'), path.join(codexSkills, 'design-system'));
    const doc = runDoctor(ctx);
    assert.equal(doc.issues.some(i => i.includes('Skills root')), false, doc.issues.join('\n'));
    const antigravity = doc.agents.find(a => a.id === 'gemini-config')!;
    const codex = doc.agents.find(a => a.id === 'codex')!;
    assert.equal(antigravity.readsCentralSkills, true);
    assert.equal(codex.redundantLinksCount, 1);
    assert.equal(codex.skillMetadataTokens, antigravity.skillMetadataTokens);
    assert.ok(doc.warnings.some(w => w.includes('"design-system" is declared by')), doc.warnings.join('\n'));
    const advice = doc.warnings.find(w => w.includes('duplicate skills the client already reads'));
    assert.ok(advice, doc.warnings.join('\n'));
    assert.match(advice!, /sync --skills-only --agent codex"/, 'advice targets only affected clients');
    // A skills root linked to the central library is reported as already shared, never as a conflict.
    fs.mkdirSync(path.join(home, '.claude'));
    const sync = runSync(ctx, { skillsOnly: true, agentFilter: ['gemini-config', 'claude-code'] });
    assert.deepEqual(sync.errors, []);
    assert.ok(sync.skillResults.some(r => r.agentId === 'gemini-config' && r.action === 'native-shared'));
    assert.equal(sync.skillResults.some(r => r.agentId === 'gemini-config' && r.action === 'conflict-skipped'), false);
    assert.equal(inspectPath(path.join(home, '.gemini', 'config', 'skills')).state, 'link');
  });
});
