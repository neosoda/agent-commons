import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, reviewLocalCatalog, readPublicCatalog, validatePublicCatalog } from '../index.js';
import { runCli } from '../cli/index.js';

describe('Local skill review: private provenance triage', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-review-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  function skill(name: string, license?: string): void {
    const dir = path.join(home, '.agents', 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: ' + name +
      '\ndescription: Example\n' + (license ? 'license: ' + license + '\n' : '') + '---\n# Skill');
  }
  function lock(skills: Record<string, unknown>): void {
    fs.writeFileSync(path.join(home, '.agents', '.skill-lock.json'),
      JSON.stringify({ version: 3, skills }));
  }

  it('keeps incomplete local skill metadata private and never claims verification', () => {
    skill('local-ux');
    skill('test-runner', 'Apache-2.0');
    lock({
      'test-runner': { sourceType: 'github', source: 'example/skills',
        sourceUrl: 'https://github.com/example/skills', skillPath: 'skills/test-runner',
        ref: 'a'.repeat(40) }
    });
    const before = fs.readFileSync(path.join(home, '.agents', 'skills', 'local-ux', 'SKILL.md'), 'utf8');
    const report = reviewLocalCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.visibility, 'private-local-only');
    assert.equal(report.scanned, 2);
    assert.equal(report.missingOrigins, 1);
    assert.equal(report.missingLicenseClaims, 1);
    assert.equal(report.needingMetadata, 1);
    assert.equal(report.awaitingHumanReview, 1);
    assert.equal(report.entries.find(e => e.name === 'local-ux')?.categorySuggestion, 'design');
    assert.deepEqual(report.entries.find(e => e.name === 'test-runner')?.reasons,
      ['upstream-and-license-review-required', 'skill-safety-review-required']);
    assert.equal(fs.readFileSync(path.join(home, '.agents', 'skills', 'local-ux', 'SKILL.md'), 'utf8'), before);
    assert.equal(runCli(['catalog', 'review', '--json', '--home', home]), 0);
  });

  it('detects identical upstream skill references but not distinct paths in one repo', () => {
    skill('security-a', 'MIT'); skill('security-b', 'MIT'); skill('security-c', 'MIT');
    const common = { sourceType: 'github', sourceUrl: 'https://github.com/example/skills', ref: 'b'.repeat(40) };
    lock({
      'security-a': { ...common, skillPath: 'skills/same' },
      'security-b': { ...common, skillPath: 'skills/same' },
      'security-c': { ...common, skillPath: 'skills/different' }
    });
    const report = reviewLocalCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.duplicateReferences, 1);
    assert.equal(report.entries.find(e => e.name === 'security-b')?.duplicateOf, 'security-a');
    assert.equal(report.entries.find(e => e.name === 'security-c')?.duplicateOf, null);
  });

  it('marks mutable references as needing metadata and drops credential-bearing origins', () => {
    skill('private-skill', 'MIT'); skill('unlocked-skill', 'MIT');
    lock({
      'private-skill': { sourceType: 'github',
        sourceUrl: 'https://token:pass@github.com/example/skills?secret=true', skillPath: 'skills/private-skill' },
      'unlocked-skill': { sourceType: 'github',
        sourceUrl: 'https://github.com/example/skills', skillPath: 'skills/unlocked-skill', ref: 'main' }
    });
    const report = reviewLocalCatalog(createEnvironmentContext({ homeDir: home }));
    assert.equal(report.missingOrigins, 1);
    assert.equal(report.entries.find(e => e.name === 'unlocked-skill')?.reasons.includes('unpinned-version'), true);
    assert.equal(JSON.stringify(report).includes('token:pass'), false);
    assert.equal(JSON.stringify(report).includes('secret=true'), false);
  });
});

describe('Public catalog community sources', () => {
  const ref = 'abcdef1234567890abcdef1234567890abcdef12';

  it('accepts pinned multi-vendor repositories, nested skill paths and root licenses', () => {
    const { catalog, categories } = readPublicCatalog();
    const changed = structuredClone(catalog);
    changed.skills[0] = {
      ...changed.skills[0]!,
      id: 'example-skill',
      name: 'Example Skill',
      author: 'Community Dev',
      repository: 'https://github.com/community/agent-skills',
      source: 'https://github.com/community/agent-skills/tree/' + ref + '/packages/skills/example-skill',
      path: 'packages/skills/example-skill',
      ref,
      licenseEvidence: 'https://github.com/community/agent-skills/blob/' + ref + '/LICENSE.md'
    };
    assert.equal(validatePublicCatalog(changed, categories).skills.length, catalog.skills.length);
    const gitlab = structuredClone(changed);
    gitlab.skills[0]!.repository = 'https://gitlab.com/community/skills';
    gitlab.skills[0]!.source = 'https://gitlab.com/community/skills/-/tree/' + ref + '/packages/skills/example-skill';
    gitlab.skills[0]!.licenseEvidence = 'https://gitlab.com/community/skills/-/blob/' + ref + '/LICENSE';
    assert.equal(validatePublicCatalog(gitlab, categories).skills.length, catalog.skills.length);
    const codeberg = structuredClone(changed);
    codeberg.skills[0]!.repository = 'https://codeberg.org/community/skills';
    codeberg.skills[0]!.source = 'https://codeberg.org/community/skills/src/commit/' + ref + '/packages/skills/example-skill';
    codeberg.skills[0]!.licenseEvidence = 'https://codeberg.org/community/skills/src/commit/' + ref + '/LICENSE';
    assert.equal(validatePublicCatalog(codeberg, categories).skills.length, catalog.skills.length);
  });

  it('rejects unpinned license links, unsafe paths and lookalike hosts', () => {
    const { catalog, categories } = readPublicCatalog();
    const bad = structuredClone(catalog);
    bad.skills[0]!.licenseEvidence = 'https://github.com/anthropics/skills/blob/main/LICENSE.txt';
    assert.throws(() => validatePublicCatalog(bad, categories), /Invalid public catalog skill/);
    const traversal = structuredClone(catalog);
    traversal.skills[0]!.path = 'skills/../secret';
    assert.throws(() => validatePublicCatalog(traversal, categories), /Invalid public catalog skill/);
    const fakeHost = structuredClone(catalog);
    fakeHost.skills[0]!.repository = 'https://github.com.attacker.example/anthropics/skills';
    assert.throws(() => validatePublicCatalog(fakeHost, categories), /Invalid public catalog skill/);
  });
});
