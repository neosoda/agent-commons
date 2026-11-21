import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext, readPublicCatalog, previewCatalogInstall, installCatalogSkill, verifyCatalogSkills, routeSmartSkills, loadSkill } from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

const root = path.join(process.cwd(), 'skills', 'ux-psychology');
const filenames = ['SKILL.md','references/audit-workflow.md','references/patterns.md','references/principles.md','references/sources.md'];
const files = new Map(filenames.map(name => [name, fs.readFileSync(path.join(root, name))]));
const sha = (bytes: Buffer): string => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const mock: FetchJson = async url => {
  if (url.includes('/git/trees/')) return { truncated: false, tree: [
    ...[...files].map(([name, data]) => ({
      path: 'skills/ux-psychology/' + name, type: 'blob', mode: '100644', sha: sha(data), size: data.length
    }))
  ] };
  if (url.includes('/git/blobs/')) {
    const bytes = [...files.values()].find(data => url.endsWith(sha(data)));
    assert.ok(bytes, 'unknown blob requested');
    return { sha: sha(bytes), size: bytes.length, encoding: 'base64', content: bytes.toString('base64') };
  }
  throw new Error('Unexpected GitHub URL');
};

describe('original Laws of UX psychology skill', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-ux-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  it('covers all 30 source-index topics with bounded, credited and lazily linked resources', () => {
    const entry = readPublicCatalog().catalog.skills.find(x => x.id === 'ux-psychology');
    assert.ok(entry);
    assert.equal(entry.repository, 'https://github.com/neosoda/agent-commons');
    assert.equal(entry.path, 'skills/ux-psychology');
    assert.match(entry.ref, /^[a-f0-9]{40}$/);
    assert.equal(entry.license, 'MIT');
    assert.equal(entry.licenseEvidence, entry.repository + '/blob/' + entry.ref + '/LICENSE');
    assert.deepEqual(new Set(entry.installPaths), new Set(filenames));
    assert.deepEqual(entry.dependencies, []);
    assert.match(files.get('SKILL.md')!.toString(), /^---\nname: ux-psychology\n/);
    const guide = files.get('references/principles.md')!.toString();
    assert.equal((guide.match(/^## \d{2}\./gm) ?? []).length, 30);
    assert.match(files.get('references/sources.md')!.toString(), /Jon Yablonski/);
    assert.match(files.get('references/sources.md')!.toString(), /Lionel Nolhac/);
    assert.ok(!filenames.some(name => /\.(?:sh|js|py|exe)$/.test(name)));
  });

  it('only discovers metadata; preview does not install; explicit approval installs and loads targeted resources', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const routed = routeSmartSkills(ctx, 'ux-psychology audit ergonomie');
    assert.deepEqual(routed.loaded, []);
    assert.ok(routed.absent.some(x => x.id === 'ux-psychology'));
    assert.equal(fs.existsSync(ctx.commonsDir), false);

    const preview = await previewCatalogInstall(ctx, 'ux-psychology', mock);
    assert.deepEqual(new Set(preview.files.map(file => file.relativePath)), new Set(filenames));
    assert.equal(preview.installed, false);
    assert.equal(fs.existsSync(ctx.centralSkillsDir), false);

    const denied = await installCatalogSkill(ctx, 'ux-psychology', { fetchJson: mock });
    assert.equal(denied.installed, false);
    const installed = await installCatalogSkill(ctx, 'ux-psychology', { yes: true, fetchJson: mock });
    assert.equal(installed.installed, true);
    assert.match(loadSkill(ctx, 'ux-psychology').content, /Chargement progressif/);
    assert.match(loadSkill(ctx, 'ux-psychology', 'references/principles.md').content, /Loi de Hick/);
    assert.match(loadSkill(ctx, 'ux-psychology', 'references/audit-workflow.md').content, /Audit UX/);
    assert.equal(verifyCatalogSkills(ctx, 'ux-psychology').healthy, true);
  });
});
