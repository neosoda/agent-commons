import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, readPublicCatalog, renderPublicCatalogMarkdown,
  searchPublicCatalog, validatePublicCatalog
} from '../index.js';
import { runCli } from '../cli/index.js';

describe('Public Skill Hub: source attribution, safe filtering and offline behavior', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-hub-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  it('loads strictly reviewed upstream metadata with no duplicate sources', () => {
    const { catalog, categories } = readPublicCatalog();
    assert.equal(catalog.schemaVersion, 1);
    assert.ok(catalog.skills.length > 0);
    assert.ok(categories.length > 0);
    assert.equal(new Set(catalog.skills.map(x => x.id)).size, catalog.skills.length);
    assert.equal(new Set(catalog.skills.map(x => x.source)).size, catalog.skills.length);
    for (const skill of catalog.skills) {
      assert.equal(skill.review.scope, 'source-and-license-only');
      assert.ok(skill.source.startsWith(skill.repository + '/tree/' + skill.ref + '/' + skill.path));
      assert.ok(skill.licenseEvidence.includes(skill.ref));
    }
  });

  it('recognizes known previously inventoried upstream skills with pinned origins', () => {
    const { catalog, categories } = readPublicCatalog();
    for (const id of ['ui-ux-pro-max', 'impeccable', 'video-shotcraft']) {
      const skill = catalog.skills.find(entry => entry.id === id);
      assert.ok(skill, id + ' is missing');
      assert.ok(skill.ref.match(/^[a-f0-9]{40}$/));
      assert.ok(skill.licenseEvidence.includes(skill.ref));
      assert.equal(validatePublicCatalog(catalog, categories).skills.length, catalog.skills.length);
    }
    const root = catalog.skills.find(entry => entry.id === 'video-shotcraft')!;
    assert.equal(root.path, '.');
    assert.equal(root.source, root.repository + '/tree/' + root.ref);
    const unsafe = structuredClone(catalog);
    unsafe.skills.find(entry => entry.id === 'video-shotcraft')!.path = '..';
    assert.throws(() => validatePublicCatalog(unsafe, categories), /Invalid public catalog skill/);
  });

  it('searches the bundled public catalog offline with filters', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const all = searchPublicCatalog(ctx);
    const found = searchPublicCatalog(ctx, { query: 'playwright' });
    assert.ok(found.some(x => x.id === 'webapp-testing'));
    assert.ok(all.length >= found.length);
    assert.ok(searchPublicCatalog(ctx, { category: 'design' }).some(x => x.id === 'frontend-design'));
    assert.ok(searchPublicCatalog(ctx, { source: 'github', license: 'Apache-2.0' }).length > 0);
    assert.equal(searchPublicCatalog(ctx, { query: 'missing-skill-id' }).length, 0);
    assert.equal(all.every(x => x.installed === false), true);
  });

  it('reflects locally installed skills without altering them', () => {
    const dir = path.join(home, '.agents', 'skills', 'skill-creator');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# Skill');
    const before = fs.statSync(path.join(dir, 'SKILL.md')).mtimeMs;
    const found = searchPublicCatalog(createEnvironmentContext({ homeDir: home }), { query: 'skill-creator' });
    assert.equal(found.find(x => x.id === 'skill-creator')?.installed, true);
    assert.equal(fs.statSync(path.join(dir, 'SKILL.md')).mtimeMs, before);
  });

  it('rejects malicious URLs, duplicates, undeclared categories and invented licenses', () => {
    const { catalog, categories } = readPublicCatalog();
    const evil = structuredClone(catalog) as unknown as { skills: Array<Record<string, unknown>> };
    evil.skills[0]!.repository = 'https://user:token@github.com/anthropics/skills';
    assert.throws(() => validatePublicCatalog(evil, categories), /Invalid public catalog skill/);
    const duplicate = structuredClone(catalog);
    duplicate.skills.push(structuredClone(duplicate.skills[0]!));
    assert.throws(() => validatePublicCatalog(duplicate, categories), /Invalid public catalog skill/);
    const wrongCategory = structuredClone(catalog);
    wrongCategory.skills[0]!.category = 'not-a-category';
    assert.throws(() => validatePublicCatalog(wrongCategory, categories), /Invalid public catalog skill/);
    const wrongLicenseSource = structuredClone(catalog);
    wrongLicenseSource.skills[0]!.licenseEvidence = 'https://example.invalid/NOT_A_LICENSE';
    assert.throws(() => validatePublicCatalog(wrongLicenseSource, categories), /Invalid public catalog skill/);
  });

  it('generates a deterministic markdown document matching the public index', () => {
    const expected = renderPublicCatalogMarkdown();
    const file = path.join(process.cwd(), 'docs', 'skills', 'README.md');
    assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), expected);
    assert.ok(expected.includes('The links target upstream files'));
  });

  it('keeps legacy local inventory and blocks third-party install/update', () => {
    const dir = path.join(home, '.agents', 'skills', 'private-local');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '# Local skill');
    const before = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8');
    assert.equal(runCli(['catalog', '--home', home, '--json']), 0);
    assert.equal(runCli(['catalog', 'list', '--home', home, '--json']), 0);
    assert.equal(runCli(['catalog', 'search', 'playwright', '--home', home]), 0);
    assert.equal(runCli(['catalog', 'info', 'skill-creator', '--home', home]), 0);
    assert.equal(runCli(['catalog', 'info', 'does-not-exist', '--home', home]), 1);
    assert.equal(runCli(['catalog', 'install', 'skill-creator', '--home', home]), 1);
    assert.equal(runCli(['catalog', 'update', 'skill-creator', '--home', home]), 1);
    assert.equal(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), before);
  });
});
