import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, installCatalogSkill, previewCatalogInstall,
  readPublicCatalog, routeSmartSkills, loadSkill, verifyCatalogSkills,
  previewCatalogUninstall
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('Grim Prompter pinned nested library', () => {
  let home: string;
  const blob = Buffer.from('# Original upstream prompt; never execute this\n');
  const sha = crypto.createHash('sha1').update('blob ' + blob.length + '\0')
    .update(blob).digest('hex');
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'grim-commons-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const entry = () => {
    const skill = readPublicCatalog().catalog.skills.find(x => x.id === 'threat-model');
    assert.ok(skill?.entrypoint);
    assert.ok(skill.installPaths);
    return skill;
  };
  function fixture(extra = 170): FetchJson {
    const skill = entry();
    const sample = skill.installPaths!.map(item => item.includes('.') || item.includes('/')
      ? item : item + '/sample.md');
    // Nested entrypoint is included, along with every selected root or folder.
    const files = [...sample, ...Array.from({ length: extra }, (_, i) =>
      'quick/fixture-' + String(i).padStart(3, '0') + '.md')];
    return async url => {
      if (url.includes('/git/trees/')) return {
        truncated: false,
        tree: files.map(file => ({ path: file, type: 'blob', mode: '100644',
          sha, size: blob.length }))
      };
      if (url.includes('/git/blobs/')) return {
        sha, size: blob.length, encoding: 'base64', content: blob.toString('base64')
      };
      throw new Error('Unexpected upstream request');
    };
  }

  it('previews without filesystem changes and generates only a root bridge', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const preview = await previewCatalogInstall(ctx, 'threat-model', fixture());
    assert.ok(preview.files.length > 150);
    assert.ok(preview.files.some(x => x.relativePath === 'SKILL.md'));
    assert.ok(preview.files.some(x => x.relativePath === 'skills/threat-model/SKILL.md'));
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const route = routeSmartSkills(ctx, 'Threat model my MCP API with STRIDE');
    assert.deepEqual(route.loaded, []);
    assert.ok(route.absent.some(item => item.id === 'threat-model'));
  });

  it('stages the upstream layout intact and supports explicit on-demand loading', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const result = await installCatalogSkill(ctx, 'threat-model', {
      yes: true, fetchJson: fixture(15)
    });
    assert.equal(result.installed, true);
    const target = path.join(ctx.centralSkillsDir, 'threat-model');
    assert.equal(fs.readFileSync(path.join(target, 'skills/threat-model/SKILL.md'), 'utf8'),
      blob.toString('utf8'));
    const entry = loadSkill(ctx, 'threat-model');
    assert.match(entry.content, /native on-demand entrypoint/);
    assert.match(entry.content, /read the original upstream/);
    assert.equal(loadSkill(ctx, 'threat-model', 'runbook.md').content, blob.toString('utf8'));
    assert.ok(fs.existsSync(path.join(target, 'quick/sample.md')));
    assert.equal(verifyCatalogSkills(ctx, 'threat-model').healthy, true);
    assert.equal(previewCatalogUninstall(ctx, 'threat-model').clean, true);
    const route = routeSmartSkills(ctx, 'Threat model my MCP API');
    assert.deepEqual(route.loaded, []);
    assert.ok(route.selected.some(item => item.id === 'threat-model'));
  });

  it('rejects oversized nested source trees before creating any files', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    await assert.rejects(() => previewCatalogInstall(ctx, 'threat-model', fixture(420)),
      /exceeds safe installation limits/);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
  });
});
