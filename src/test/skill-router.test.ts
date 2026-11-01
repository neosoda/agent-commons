import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, routeSkills, saveAgentProfile } from '../index.js';
import { runCli } from '../cli/index.js';

describe('Offline token-conscious skill routing', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-route-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });
  const ctx = () => createEnvironmentContext({ homeDir: home });

  function add(id: string, description: string, extra = ''): void {
    const dir = path.join(home, '.agents', 'skills', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'),
      '---\nname: ' + id + '\ndescription: ' + description + '\n---\n# ' + id + '\n' + extra);
  }

  it('selects only relevant metadata by default without writing agent files', () => {
    add('security-review', 'Review security vulnerabilities in application code');
    add('frontend-design', 'Design user interfaces and layouts');
    const before = fs.readdirSync(path.join(home, '.agents', 'skills')).sort();
    const result = routeSkills(ctx(), 'audit security vulnerabilities', { budget: 400 });
    assert.equal(result.scanned, 2);
    assert.deepEqual(result.selected.map(item => item.id), ['security-review']);
    assert.equal(result.selected[0]?.content, undefined);
    assert.ok(result.estimatedTokens <= 400);
    assert.deepEqual(fs.readdirSync(path.join(home, '.agents', 'skills')).sort(), before);
    assert.equal(fs.existsSync(path.join(home, '.codex')), false);
  });

  it('does not invent a match and handles tight budgets without partial content', () => {
    add('security-review', 'Review security vulnerabilities', 'A'.repeat(4000));
    assert.equal(routeSkills(ctx(), 'photography workflow').selected.length, 0);
    const result = routeSkills(ctx(), 'security review', { expand: true, budget: 128 });
    assert.equal(result.selected.length, 0);
    assert.equal(result.skippedForBudget, 1);
    const preview = routeSkills(ctx(), 'security review', { budget: 128 });
    assert.equal(preview.selected.length, 1);
    assert.equal(preview.selected[0]?.content, undefined);
  });

  it('expands explicitly within budget, never executes skill content', () => {
    add('security-review', 'Review security vulnerabilities', 'Never run this line.\n');
    const report = routeSkills(ctx(), 'security review', { expand: true, budget: 1000 });
    assert.equal(report.expanded, true);
    assert.ok(report.selected[0]?.content?.includes('Never run this line.'));
    assert.ok(report.estimatedTokens <= report.budget);
  });

  it('uses existing saved profiles as a strict allowlist when agent is chosen', () => {
    add('security-review', 'Review security vulnerabilities');
    add('frontend-design', 'Design user interfaces');
    fs.mkdirSync(path.join(home, '.codex'));
    saveAgentProfile(ctx(), 'codex', { skills: ['frontend-design'] });
    assert.equal(routeSkills(ctx(), 'security review', { agent: 'codex' }).matching, 0);
    assert.deepEqual(routeSkills(ctx(), 'design interfaces', { agent: 'codex' })
      .selected.map(item => item.id), ['frontend-design']);
    assert.equal(fs.existsSync(path.join(home, '.codex', 'skills')), false);
  });

  it('ignores linked skill directories and linked SKILL.md files', () => {
    const outside = path.join(home, 'outside');
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'SKILL.md'), 'description: security review');
    const skills = path.join(home, '.agents', 'skills');
    fs.mkdirSync(skills, { recursive: true });
    fs.symlinkSync(outside, path.join(skills, 'security-link'), 'dir');
    const physical = path.join(skills, 'security-file-link');
    fs.mkdirSync(physical);
    fs.symlinkSync(path.join(outside, 'SKILL.md'), path.join(physical, 'SKILL.md'));
    assert.equal(routeSkills(ctx(), 'security review').scanned, 0);
  });

  it('validates unsafe parameters and CLI routing is opt-in', () => {
    add('security-review', 'Review security vulnerabilities');
    assert.throws(() => routeSkills(ctx(), 'security', { budget: 0 }), /Token budget/);
    assert.throws(() => routeSkills(ctx(), 'security', { limit: 30 }), /Skill limit/);
    assert.throws(() => routeSkills(ctx(), 'security', { agent: 'unknown' }), /Unknown agent/);
    assert.throws(() => routeSkills(ctx(), 'the and pour'), /no searchable keywords/);
    assert.equal(runCli(['context', 'security review', '--budget', '300', '--home', home]), 0);
    assert.equal(runCli(['context', 'security', '--budget', 'not-a-number', '--home', home]), 1);
  });
});
