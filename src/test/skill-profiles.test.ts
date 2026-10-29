import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, inspectPath, runSync } from '../index.js';
import { runCli } from '../cli/index.js';

describe('Selective skill sync: opt-in profile and explicit skill names', () => {
  let home: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-profiles-'));
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
  });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  function addSkill(id: string): void {
    const dir = path.join(home, '.agents', 'skills', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# ' + id);
  }

  it('only links selected skill; MCP and unrelated skill directories remain untouched', () => {
    addSkill('frontend-design');
    addSkill('skill-creator');
    const codex = path.join(home, '.codex');
    const config = path.join(codex, 'config.toml');
    fs.writeFileSync(config, '# Existing private MCP configuration\n');
    const ctx = createEnvironmentContext({ homeDir: home });
    const report = runSync(ctx, { skillFilter: ['frontend-design'], agentFilter: ['codex'] });
    assert.deepEqual(report.errors, []);
    assert.equal(report.mcpResults.length, 0);
    assert.ok(report.skillResults.some(r => r.skillName === 'frontend-design' && r.action === 'created-link'));
    assert.equal(report.skillResults.some(r => r.skillName === 'skill-creator'), false);
    assert.equal(inspectPath(path.join(codex, 'skills', 'frontend-design')).state, 'link');
    assert.equal(inspectPath(path.join(codex, 'skills', 'skill-creator')).state, 'missing');
    assert.equal(fs.readFileSync(config, 'utf8'), '# Existing private MCP configuration\n');
  });

  it('refuses unknown skills before making any changes', () => {
    addSkill('frontend-design');
    const ctx = createEnvironmentContext({ homeDir: home });
    const report = runSync(ctx, { skillFilter: ['frontend-design', 'missing-skill'], agentFilter: ['codex'] });
    assert.ok(report.errors.some(x => x.includes('missing-skill')));
    assert.equal(report.snapshotId, null);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'frontend-design')).state, 'missing');
  });

  it('profile design selects only locally installed skills from public catalog', () => {
    addSkill('frontend-design'); // design profile in the curated public catalog
    addSkill('skill-creator'); // ai-automation, must not be linked
    const target = path.join(home, '.codex', 'skills', 'frontend-design');
    assert.equal(runCli(['sync', '--profile', 'design', '--agent', 'codex', '--home', home, '--dry-run']), 0);
    assert.equal(inspectPath(target).state, 'missing');
    assert.equal(runCli(['sync', '--profile', 'design', '--agent', 'codex', '--home', home]), 0);
    assert.equal(inspectPath(target).state, 'link');
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'missing');
  });

  it('requires a real category and prevents empty or conflicting selections', () => {
    addSkill('skill-creator');
    assert.equal(runCli(['sync', '--profile', 'not-a-category', '--home', home]), 1);
    assert.equal(runCli(['sync', '--profile', 'design', '--home', home]), 1);
    assert.equal(runCli(['sync', '--profile', 'design', '--skill', 'skill-creator', '--home', home]), 1);
    assert.equal(runCli(['sync', '--skill', 'skill-creator', '--mcp-only', '--home', home]), 1);
    assert.equal(runCli(['sync', '--skill', 'skill-creator', '--adopt', '--home', home]), 1);
    assert.equal(fs.existsSync(path.join(home, '.codex', 'skills')), false);
  });

  it('explicit skill selection works through CLI and leaves unrelated skills alone', () => {
    addSkill('frontend-design'); addSkill('skill-creator');
    assert.equal(runCli(['sync', '--skill', 'skill-creator', '--agent', 'codex', '--home', home]), 0);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'link');
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'frontend-design')).state, 'missing');
  });
});
