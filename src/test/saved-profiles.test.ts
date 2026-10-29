import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, inspectPath, readSavedProfiles,
  saveAgentProfile, clearAgentProfile, runSavedProfilesSync
} from '../index.js';
import { runCli } from '../cli/index.js';

describe('Persistent agent skill profiles: local config and safe opt-in sync', () => {
  let home: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-saved-profile-'));
    fs.mkdirSync(path.join(home, '.codex'));
    fs.mkdirSync(path.join(home, '.claude'));
  });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const ctx = () => createEnvironmentContext({ homeDir: home });
  const config = () => path.join(home, '.agents', 'agent-profiles.json');
  function addSkill(id: string): void {
    const dir = path.join(home, '.agents', 'skills', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# ' + id);
  }

  it('saves multiple agents and categories without touching native agent configuration', () => {
    const mcp = path.join(home, '.codex', 'config.toml');
    fs.writeFileSync(mcp, '# preserve private MCP\n');
    assert.equal(runCli(['profiles', 'set', 'codex', '--skill', 'skill-creator',
      '--profile', 'design', '--home', home]), 0);
    assert.equal(runCli(['profiles', 'set', 'claude-code', '--skill', 'frontend-design',
      '--home', home]), 0);
    const parsed = readSavedProfiles(ctx());
    assert.deepEqual(parsed.profiles['codex'], {
      skills: ['skill-creator'], categories: ['design']
    });
    assert.deepEqual(parsed.profiles['claude-code'], {
      skills: ['frontend-design'], categories: []
    });
    assert.equal(fs.readFileSync(mcp, 'utf8'), '# preserve private MCP\n');
    assert.equal(runCli(['profiles', 'show', 'codex', '--home', home]), 0);
    assert.equal(runCli(['profiles', 'list', '--home', home, '--json']), 0);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills')).state, 'missing');
  });

  it('dry run previews separate choices for installed agents; apply only requested skills', () => {
    addSkill('skill-creator');
    addSkill('frontend-design');
    addSkill('webapp-testing');
    saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] });
    saveAgentProfile(ctx(), 'claude-code', { categories: ['design'] });
    const dry = runSavedProfilesSync(ctx(), { dryRun: true });
    assert.deepEqual(dry.errors, []);
    assert.equal(dry.mcpResults.length, 0);
    assert.ok(dry.skillResults.some(r => r.agentId === 'codex' && r.skillName === 'skill-creator'));
    assert.ok(dry.skillResults.some(r => r.agentId === 'claude-code' && r.skillName === 'frontend-design'));
    assert.equal(dry.skillResults.some(r => r.agentId === 'codex' && r.skillName === 'frontend-design'), false);
    assert.equal(dry.skillResults.some(r => r.agentId === 'claude-code' && r.skillName === 'skill-creator'), false);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'missing');

    assert.equal(runCli(['sync', '--saved-profiles', '--dry-run', '--home', home]), 0);
    assert.equal(runCli(['sync', '--saved-profiles', '--home', home]), 0);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'link');
    assert.equal(inspectPath(path.join(home, '.claude', 'skills', 'frontend-design')).state, 'link');
    assert.equal(inspectPath(path.join(home, '.claude', 'skills', 'webapp-testing')).state, 'missing');
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'frontend-design')).state, 'missing');
  });

  it('rejects missing skills for all agents before modifying any agent', () => {
    addSkill('skill-creator');
    saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] });
    saveAgentProfile(ctx(), 'claude-code', { skills: ['not-installed'] });
    assert.throws(() => runSavedProfilesSync(ctx()), /missing central skills/);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'missing');
    assert.equal(inspectPath(path.join(home, '.claude', 'skills', 'not-installed')).state, 'missing');
  });

  it('unknown category, agent or empty selection never overwrite local config', () => {
    saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] });
    const before = fs.readFileSync(config(), 'utf8');
    assert.throws(() => saveAgentProfile(ctx(), 'unknown-agent', { skills: ['x'] }), /Unknown agent/);
    assert.throws(() => saveAgentProfile(ctx(), 'codex', { categories: ['fake-category'] }), /Invalid saved profile/);
    assert.throws(() => saveAgentProfile(ctx(), 'codex', { categories: [] }), /selection/);
    assert.equal(fs.readFileSync(config(), 'utf8'), before);
  });

  it('refuses corrupted and symlinked profile files instead of resetting them', () => {
    const file = config();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '{"version":1,"profiles":{"codex":{"skills":["../../etc"],"categories":[]}}}');
    assert.throws(() => readSavedProfiles(ctx()), /Invalid saved profile/);
    const previous = fs.readFileSync(file, 'utf8');
    assert.throws(() => saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] }), /Invalid saved profile/);
    assert.equal(fs.readFileSync(file, 'utf8'), previous);
  });

  it('clearing a profile does not remove any already installed skill link', () => {
    addSkill('skill-creator');
    saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] });
    assert.equal(runCli(['sync', '--saved-profiles', '--agent', 'codex', '--home', home]), 0);
    const link = path.join(home, '.codex', 'skills', 'skill-creator');
    assert.equal(inspectPath(link).state, 'link');
    assert.equal(runCli(['profiles', 'clear', 'codex', '--home', home]), 0);
    assert.equal(readSavedProfiles(ctx()).profiles['codex'], undefined);
    assert.equal(inspectPath(link).state, 'link');
    assert.equal(runCli(['sync', '--saved-profiles', '--home', home]), 1);
  });

  it('rejects ambiguous flags and allows targeting one stored agent', () => {
    addSkill('skill-creator'); addSkill('frontend-design');
    saveAgentProfile(ctx(), 'codex', { skills: ['skill-creator'] });
    saveAgentProfile(ctx(), 'claude-code', { skills: ['frontend-design'] });
    assert.equal(runCli(['sync', '--saved-profiles', '--profile', 'design', '--home', home]), 1);
    assert.equal(runCli(['sync', '--saved-profiles', '--force', '--home', home]), 1);
    assert.equal(runCli(['sync', '--saved-profiles', '--adopt', '--home', home]), 1);
    assert.equal(runCli(['sync', '--saved-profiles', '--agent', 'unknown-agent', '--home', home]), 1);
    assert.equal(runCli(['sync', '--saved-profiles', '--agent', 'codex', '--home', home]), 0);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'skill-creator')).state, 'link');
    assert.equal(inspectPath(path.join(home, '.claude', 'skills', 'frontend-design')).state, 'missing');
  });
});
