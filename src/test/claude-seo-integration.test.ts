import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, readPublicCatalog, previewCatalogInstall, installCatalogSkill, loadSkill, verifyCatalogSkills, routeSmartSkills } from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

const pin = '5d7d85ef32ade08dd4265cb678af8357ca6e6098';
const entry = () => {
  const skill = readPublicCatalog().catalog.skills.find(s => s.id === 'claude-seo');
  assert.ok(skill?.installPaths);
  return skill;
};
const blob = Buffer.from('# Original pinned SEO reference\n');
const sha = crypto.createHash('sha1').update('blob ' + blob.length + '\0').update(blob).digest('hex');
function fixture(): FetchJson {
  const paths = [...new Set(entry().installPaths!.map(p =>
    p === 'LICENSE' || p.endsWith('.md') ? p : p.startsWith('skills/') ? p + '/SKILL.md' : p + '/sample.json'))];
  paths.push('skills/seo/references/quality-gates.md', 'scripts/runtime.py', 'hooks/hooks.json', 'agents/seo-content.md', 'extensions/firecrawl/install.sh', 'skills/seo-flow/SKILL.md', '.claude-plugin/plugin.json');
  return async url => {
    if (url.includes('/git/trees/')) {
      assert.ok(url.includes(pin));
      return { truncated: false, tree: paths.map(p => ({ path: p, type: 'blob', mode: '100644', sha, size: blob.length })) };
    }
    if (url.includes('/git/blobs/')) return { sha, size: blob.length, encoding: 'base64', content: blob.toString('base64') };
    throw new Error('Unexpected upstream URL');
  };
}

describe('Claude SEO curated pinned reference library', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-seo-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });
  it('pins the upstream source, license and 23 workflow directories', () => {
    const s = entry();
    assert.equal(s.ref, pin);
    assert.equal(s.repository, 'https://github.com/AgricIDaniel/claude-seo');
    assert.equal(s.license, 'MIT');
    assert.equal(s.entrypoint, 'skills/seo/SKILL.md');
    assert.equal(s.installPaths!.filter(p => /^skills\/[^/]+$/.test(p)).length, 23);
    assert.ok(s.installPaths!.includes('LICENSE'));
  });
  it('previews without writes, excludes runtime files, and installs only with approval', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const fetchJson = fixture();
    const preview = await previewCatalogInstall(ctx, 'claude-seo', fetchJson);
    assert.equal(preview.commit, pin);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    assert.ok(preview.files.some(f => f.relativePath === 'SKILL.md'));
    assert.ok(preview.files.some(f => f.relativePath === 'skills/seo/references/quality-gates.md'));
    assert.ok(preview.files.every(f => !/^(scripts|hooks|agents|extensions|\.claude-plugin|skills\/seo-flow)\//.test(f.relativePath)));
    assert.equal((await installCatalogSkill(ctx, 'claude-seo', { fetchJson })).installed, false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    assert.equal((await installCatalogSkill(ctx, 'claude-seo', { fetchJson, yes: true })).installed, true);
    assert.match(loadSkill(ctx, 'claude-seo').content, /not the Claude Code plugin/);
    assert.match(loadSkill(ctx, 'claude-seo').content, /Never load all 23 workflows/);
    assert.equal(loadSkill(ctx, 'claude-seo', 'skills/seo/references/quality-gates.md').content, blob.toString());
    assert.equal(verifyCatalogSkills(ctx, 'claude-seo').healthy, true);
    assert.deepEqual(routeSmartSkills(ctx, 'claude-seo technical SEO GEO audit').loaded, []);
  });
});
