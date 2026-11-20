import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, readPublicCatalog, searchPublicCatalog,
  previewCatalogInstall, installCatalogSkill, verifyCatalogSkills,
  loadSkill, previewCatalogUninstall, routeSmartSkills
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('Motion Educator catalog integration', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-motion-educator-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const files = new Map<string, Buffer>([
    ['SKILL.md', Buffer.from('---\nname: motion-educator\ndescription: Illustrated educational video and 3D rendering.\n---\n# Motion Educator\n')],
    ['package.json', Buffer.from('{"name":"motion-educator","private":true}\n')],
    ['references/storyboard.md', Buffer.from('# Drawn storyboard\n')],
    ['kit/tools/new.mjs', Buffer.from('export const scaffold = true;\n')],
    ['kit/engine/motion.js', Buffer.from('export const timeline = true;\n')],
    ['examples/large.mp4', Buffer.from('excluded')],
    ['docs/media/large.webp', Buffer.from('excluded')]
  ]);
  const hash = (value: Buffer): string => crypto.createHash('sha1')
    .update('blob ' + value.length + '\0').update(value).digest('hex');
  const mock: FetchJson = async url => {
    if (url.includes('/git/trees/')) return {
      truncated: false, tree: [...files].map(([file, bytes]) => ({
        path: file, type: 'blob', mode: '100644', sha: hash(bytes), size: bytes.length
      }))
    };
    if (url.includes('/git/blobs/')) {
      const bytes = [...files.values()].find(value => url.endsWith(hash(value)));
      assert.ok(bytes);
      return { sha: hash(bytes), size: bytes.length, encoding: 'base64', content: bytes.toString('base64') };
    }
    throw new Error('Unexpected GitHub test URL');
  };

  it('pins MIT provenance and only required engine files', () => {
    const skill = readPublicCatalog().catalog.skills.find(s => s.id === 'motion-educator');
    assert.ok(skill);
    assert.equal(skill.ref, 'c7914463f915e628f41270eae4e77de6a23460e1');
    assert.equal(skill.path, '.');
    assert.equal(skill.source, skill.repository + '/tree/' + skill.ref);
    assert.equal(skill.license, 'MIT');
    assert.deepEqual(skill.installPaths, ['SKILL.md', 'package.json', 'references', 'kit']);
    assert.ok(skill.licenseEvidence.endsWith('/' + skill.ref + '/LICENSE'));
    assert.equal(searchPublicCatalog(createEnvironmentContext({ homeDir: home }), { query: 'motion-educator' })[0]?.installed, false);
  });

  it('previews safely, requires consent, excludes media and loads lazily', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const preview = await previewCatalogInstall(ctx, 'motion-educator', mock);
    assert.equal(preview.files.length, 5);
    assert.equal(preview.files.some(file => file.relativePath.startsWith('examples/')), false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const denied = await installCatalogSkill(ctx, 'motion-educator', { fetchJson: mock });
    assert.equal(denied.installed, false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const installed = await installCatalogSkill(ctx, 'motion-educator', { yes: true, fetchJson: mock });
    assert.equal(installed.installed, true);
    const dir = path.join(ctx.centralSkillsDir, 'motion-educator');
    assert.equal(fs.existsSync(path.join(dir, 'examples', 'large.mp4')), false);
    assert.ok(fs.existsSync(path.join(dir, 'kit', 'engine', 'motion.js')));
    assert.match(loadSkill(ctx, 'motion-educator').content, /Illustrated educational/);
    assert.match(loadSkill(ctx, 'motion-educator', 'references/storyboard.md').content, /Drawn storyboard/);
    assert.deepEqual(routeSmartSkills(ctx, 'Create an educational animation').loaded, []);
    assert.equal(verifyCatalogSkills(ctx, 'motion-educator').healthy, true);
    assert.equal(previewCatalogUninstall(ctx, 'motion-educator').clean, true);
  });
});
