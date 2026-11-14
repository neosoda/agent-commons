import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, discoverSkills, rankSkills, routeSmartSkills,
  loadSkill, loadSkills, resolveSkillDependencies, readSkillRouterConfig,
  saveAgentProfile } from '../index.js';
import { runCli } from '../cli/index.js';

describe('Smart Skill Router (offline and progressive)', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-smart-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });
  const ctx = () => createEnvironmentContext({ homeDir: home });

  function add(id: string, description: string): string {
    const dir = path.join(home, '.agents', 'skills', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'),
      '---\nname: ' + id + '\ndescription: ' + description + '\n---\n# Skill\nStay inside allowed scope.\n');
    return dir;
  }

  it('discovers metadata without loading instructions or installing public catalog references', () => {
    add('security-review', 'Review security code vulnerabilities');
    add('frontend-design', 'Design user interfaces');
    const all = discoverSkills(ctx());
    assert.equal(all.some(item => item.id === 'security-review' && item.installed), true);
    assert.equal(all.some(item => item.id === 'chief-of-staff' && !item.installed), true);
    const report = routeSmartSkills(ctx(), 'Audite la sécurité de mon application');
    assert.equal(report.selected.some(item => item.id === 'security-review'), true);
    assert.equal(report.loaded.length, 0);
    assert.equal(report.selected[0]?.description.includes('Stay inside'), false);
    assert.equal(fs.existsSync(path.join(home, '.codex')), false);
  });

  it('returns no selections for greetings and exposes absent references without installing them', () => {
    assert.deepEqual(routeSmartSkills(ctx(), 'Bonjour').selected, []);
    const absent = routeSmartSkills(ctx(), 'Chief of Staff orchestrate agent');
    assert.equal(absent.selected.length, 0);
    assert.ok(absent.absent.some(s => s.id === 'chief-of-staff'));
    assert.equal(fs.existsSync(path.join(home, '.agents', 'skills')), false);
  });

  it('loads one local SKILL.md explicitly and bounds its estimated tokens', () => {
    const dir = add('security-review', 'Security code review');
    fs.mkdirSync(path.join(dir, 'references'));
    fs.writeFileSync(path.join(dir, 'references', 'checklist.md'), 'checklist\n');
    assert.ok(loadSkill(ctx(), 'security-review').content.includes('Stay inside'));
    assert.equal(loadSkill(ctx(), 'security-review', 'references/checklist.md').resource,
      'references/checklist.md');
    assert.throws(() => loadSkill(ctx(), 'security-review', '../elsewhere'), /Unsafe/);
    assert.throws(() => loadSkill(ctx(), 'uninstalled'), /absent/);
    fs.writeFileSync(path.join(dir, 'references', 'large.md'), 'A'.repeat(30000));
    assert.throws(() => loadSkill(ctx(), 'security-review', 'references/large.md', 128), /budget/);
    assert.throws(() => loadSkills(ctx(), ['security-review', 'security-review']), /duplicate/);
    assert.throws(() => loadSkills(ctx(), ['a', 'b', 'c', 'd']), /Too many/);
  });

  it('does not follow skill links or internal resource links', () => {
    const outside = path.join(home, 'outside.md');
    fs.writeFileSync(outside, 'private text');
    const dir = add('security-review', 'Security code review');
    fs.symlinkSync(outside, path.join(dir, 'linked.md'));
    assert.throws(() => loadSkill(ctx(), 'security-review', 'linked.md'), /Linked/);
    const root = path.join(home, '.agents', 'skills', 'linked-skill');
    fs.symlinkSync(dir, root, 'dir');
    assert.throws(() => loadSkill(ctx(), 'linked-skill'), /absent/);
  });

  it('honors profile allowlists, manual mode and a configuration budget', () => {
    add('security-review', 'Security review vulnerabilities');
    add('frontend-design', 'Design user interfaces');
    fs.mkdirSync(path.join(home, '.codex'));
    saveAgentProfile(ctx(), 'codex', { skills: ['frontend-design'] });
    assert.equal(routeSmartSkills(ctx(), 'security review', { agent: 'codex' }).selected.length, 0);
    const filename = path.join(home, '.agents', 'skill-router.json');
    fs.writeFileSync(filename, JSON.stringify({
      mode: 'manual', maxSelectedSkills: 1, maxSkillContextTokens: 500
    }));
    assert.equal(readSkillRouterConfig(ctx()).mode, 'manual');
    assert.equal(routeSmartSkills(ctx(), 'security review').selected.length, 0);
    assert.deepEqual(routeSmartSkills(ctx(), 'security review', {
      manualSelection: ['security-review']
    }).selected.map(item => item.id), ['security-review']);
    assert.equal(routeSmartSkills(ctx(), 'security review').budget, 500);
    fs.writeFileSync(filename, JSON.stringify({ autoInstall: true }));
    assert.throws(() => routeSmartSkills(ctx(), 'security review'), /unsafe/);
  });

  it('reports declared dependencies without recursion-based loading', () => {
    const deps = resolveSkillDependencies(ctx(), 'chief-of-staff');
    assert.ok(deps.some(dep => dep.id === 'retro' && dep.status === 'absent'));
    assert.equal(deps.length <= 32, true);
    assert.deepEqual(rankSkills('Bonjour', discoverSkills(ctx())), []);
  });

  it('supports CLI route/load JSON without any native agent changes', () => {
    add('security-review', 'Review security vulnerabilities');
    assert.equal(runCli(['skills', 'route', 'security review', '--json', '--home', home]), 0);
    assert.equal(runCli(['skills', 'load', 'security-review', '--home', home]), 0);
    assert.equal(runCli(['skills', 'deps', 'chief-of-staff', '--home', home]), 0);
    assert.equal(runCli(['skills', 'load', 'not-installed', '--home', home]), 1);
  });
});
