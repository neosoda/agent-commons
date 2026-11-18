import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { runDoctor } from '../commands/doctor.js';
import { alignCatalogSkillNames, alignSkillNameContent, installCatalogSkill, type FetchJson } from '../commands/skill-install.js';
import { verifyCatalogSkills } from '../commands/skill-verify.js';
import { readPublicCatalog } from '../commands/public-catalog.js';
import { createEnvironmentContext } from '../core/context.js';
import type { EnvironmentContext } from '../types.js';

const blob = (b: Buffer) => crypto.createHash('sha1').update('blob ' + b.length + '\0').update(b).digest('hex');
const upstream = Buffer.from('---\nname: design-system\ndescription: "Generate a design system: tokens."\n---\n# Design System\n');

function mockFetch(): FetchJson {
  const sha = blob(upstream);
  return async (url: string) => {
    if (url.includes('/git/trees/')) {
      return { truncated: false, tree: [
        { path: 'skills/design-system/SKILL.md', type: 'blob', mode: '100644', sha, size: upstream.length }] };
    }
    if (url.includes('/git/blobs/')) return { sha, size: upstream.length, encoding: 'base64', content: upstream.toString('base64') };
    throw new Error('Unexpected mock URL ' + url);
  };
}

describe('Catalog skill name alignment (namespaced ids such as ecc-design-system)', () => {
  let home: string;
  let ctx: EnvironmentContext;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'ac-align-'));
    ctx = createEnvironmentContext({ homeDir: home });
  });
  afterEach(() => fs.rmSync(home, { recursive: true, force: true }));

  it('rewrites only the frontmatter name line and leaves aligned skills untouched', () => {
    const out = alignSkillNameContent(Buffer.from('---\r\nname: "design-system"\r\ndescription: x name: y\r\n---\r\nname: body\r\n'), 'ecc-design-system');
    assert.equal(out?.from, 'design-system');
    assert.equal(out?.content.toString(), '---\r\nname: ecc-design-system\r\ndescription: x name: y\r\n---\r\nname: body\r\n');
    assert.equal(alignSkillNameContent(Buffer.from('---\nname: ecc-design-system\n---\n'), 'ecc-design-system'), null);
    assert.equal(alignSkillNameContent(Buffer.from('no frontmatter'), 'x'), null);
  });

  it('installs a namespaced catalog skill under its catalog id and stays verifiable', async () => {
    assert.ok(readPublicCatalog().catalog.skills.some(s => s.id === 'ecc-design-system' && s.path === 'skills/design-system'));
    await installCatalogSkill(ctx, 'ecc-design-system', { yes: true, fetchJson: mockFetch() });
    const dir = path.join(ctx.centralSkillsDir, 'ecc-design-system');
    assert.match(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), /^---\nname: ecc-design-system\n/);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, '.agent-commons-source.json'), 'utf8'));
    assert.equal(receipt.files[0].upstreamGitBlobSha1, blob(upstream));
    assert.equal(receipt.files[0].nameAlignedFrom, 'design-system');
    assert.equal(verifyCatalogSkills(ctx, 'ecc-design-system').results[0]!.status, 'intact');
  });

  it('migrates an intact legacy install offline, with snapshot, and skips modified copies', () => {
    const dir = path.join(ctx.centralSkillsDir, 'ecc-design-system');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), upstream);
    const entry = readPublicCatalog().catalog.skills.find(s => s.id === 'ecc-design-system')!;
    fs.writeFileSync(path.join(dir, '.agent-commons-source.json'), JSON.stringify({
      schemaVersion: 1, skill: 'ecc-design-system', repository: entry.repository,
      source: entry.repository + '/tree/' + entry.ref + '/' + entry.path, commit: entry.ref,
      managedBy: 'agent-commons', files: [{ path: 'SKILL.md', gitBlobSha1: blob(upstream) }] }));
    const own = path.join(ctx.centralSkillsDir, 'design-system');
    fs.mkdirSync(own);
    fs.writeFileSync(path.join(own, 'SKILL.md'), '---\nname: design-system\ndescription: Personal.\n---\n');
    assert.ok(runDoctor(ctx).warnings.some(w => w.includes('catalog align-names')));

    const preview = alignCatalogSkillNames(ctx);
    assert.deepEqual(preview.items.map(i => i.status), ['would-align']);
    assert.match(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), /name: design-system/);

    const applied = alignCatalogSkillNames(ctx, { yes: true });
    assert.ok(applied.snapshotId);
    assert.match(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), /name: ecc-design-system/);
    assert.equal(verifyCatalogSkills(ctx, 'ecc-design-system').results[0]!.status, 'intact');
    assert.equal(runDoctor(ctx).warnings.some(w => w.includes('is declared by')), false);
    assert.deepEqual(alignCatalogSkillNames(ctx).items, [], 'idempotent');

    // A locally modified managed copy is never rewritten.
    fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: other\n---\nedited\n');
    assert.deepEqual(alignCatalogSkillNames(ctx, { yes: true }).items.map(i => i.status), ['skipped']);
    assert.match(fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8'), /edited/);
  });
});
