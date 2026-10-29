import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, runCatalog, runCli } from '../index.js';

describe('Source-attributed skill catalog (read-only)', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-catalog-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  function addSkill(name: string, markdown: string): void {
    const dir = path.join(home, '.agents', 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), markdown);
  }
  function writeLock(skills: Record<string, unknown>): void {
    const dir = path.join(home, '.agents');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '.skill-lock.json'), JSON.stringify({ version: 3, skills }));
  }

  it('reports remote provenance from the existing Vercel v3 lock, without treating licenses as verified', () => {
    addSkill('great-skill', '---\nname: great-skill\ndescription: Test\nlicense: MIT\n---\nHello');
    writeLock({ 'great-skill': { sourceType: 'github', source: 'example/agents', sourceUrl: 'https://github.com/example/agents', skillPath: 'skills/great-skill', ref: 'v1.0' } });
    const report = runCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.count, 1);
    assert.equal(report.attributed, 1);
    assert.equal(report.skills[0]?.sourceUrl, 'https://github.com/example/agents');
    assert.equal(report.skills[0]?.declaredLicense, 'MIT');
    assert.equal(report.skills[0]?.reviewStatus, 'unverified');
  });

  it('never invents sources or licenses for untracked local skills', () => {
    addSkill('local', '# Local-only');
    const report = runCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.unattributed, 1);
    assert.equal(report.skills[0]?.sourceUrl, null);
    assert.equal(report.skills[0]?.declaredLicense, null);
  });

  it('rejects credential-bearing URLs and filesystem sources from catalog output', () => {
    addSkill('bad-url', '# Bad');
    addSkill('local-path', '# Local');
    writeLock({
      'bad-url': { sourceType: 'github', sourceUrl: 'https://token:secret@github.com/private/skill?token=secret' },
      'local-path': { sourceType: 'local', source: 'C:\\Users\\Somebody\\.agents\\skills' }
    });
    const report = runCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.attributed, 0);
    assert.equal(JSON.stringify(report).includes('secret'), false);
    assert.equal(JSON.stringify(report).includes('Somebody'), false);
  });

  it('handles malformed lock data safely, without changing existing files', () => {
    addSkill('safe-skill', '# Safe');
    const lock = path.join(home, '.agents', '.skill-lock.json');
    fs.writeFileSync(lock, '{invalid:');
    const before = fs.readFileSync(lock, 'utf8');
    const report = runCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.unattributed, 1);
    assert.equal(report.warnings.length, 1);
    assert.equal(fs.readFileSync(lock, 'utf8'), before);
  });

  it('exposes catalog in CLI without modifying the shared library', () => {
    addSkill('demo', '# Demo');
    const file = path.join(home, '.agents', 'skills', 'demo', 'SKILL.md');
    const before = fs.statSync(file).mtimeMs;
    assert.equal(runCli(['catalog', '--home', home]), 0);
    assert.equal(runCli(['catalog', '--home', home, '--json']), 0);
    assert.equal(fs.statSync(file).mtimeMs, before);
  });
});
