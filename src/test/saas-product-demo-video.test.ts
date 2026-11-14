import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, readPublicCatalog, searchPublicCatalog,
  previewCatalogInstall, installCatalogSkill, verifyCatalogSkills,
  routeSmartSkills, loadSkill, previewCatalogUninstall
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('SaaS Product Demo Video v2 pinned skill', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-demo-video-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const prefix = 'skills/saas-product-demo-video/';
  const sources = new Map<string, Buffer>([
    ['SKILL.md', Buffer.from('---\nname: saas-product-demo-video\ndescription: Build a SaaS product demo with Remotion.\n---\n# Demo\n')],
    ['references/workflow.md', Buffer.from('# Video workflow\n')],
    ['assets/scaffold/package.json', Buffer.from('{"name":"product-demo-video"}\n')],
    ['scripts/verify-scaffold.sh', Buffer.from('#!/bin/sh\nexit 0\n')]
  ]);
  const hash = (content: Buffer): string => crypto.createHash('sha1')
    .update('blob ' + content.length + '\0').update(content).digest('hex');
  const mockFetch: FetchJson = async url => {
    if (url.includes('/git/trees/')) return {
      truncated: false,
      tree: [...sources].map(([file, content]) => ({
        path: prefix + file, type: 'blob', mode: '100644',
        sha: hash(content), size: content.length
      }))
    };
    if (url.includes('/git/blobs/')) {
      const bytes = [...sources.values()].find(content => url.endsWith(hash(content)));
      if (!bytes) throw new Error('Unexpected blob request');
      return { sha: hash(bytes), size: bytes.length, encoding: 'base64',
        content: bytes.toString('base64') };
    }
    throw new Error('Unexpected upstream URL');
  };

  it('pins the full official v2 skill with the original MIT provenance', () => {
    const skill = readPublicCatalog().catalog.skills.find(item => item.id === 'saas-product-demo-video');
    assert.ok(skill);
    assert.equal(skill.ref, 'c93c00ff44a65eea25ac1bb773a4565c68893ff9');
    assert.equal(skill.path, prefix.slice(0, -1));
    assert.equal(skill.license, 'MIT');
    assert.equal(skill.installPaths, undefined, 'all upstream skill files must be selected');
    assert.ok(skill.licenseEvidence.endsWith(skill.ref + '/LICENSE'));
    const ctx = createEnvironmentContext({ homeDir: home });
    assert.equal(searchPublicCatalog(ctx, { query: 'saas-product-demo-video' })[0]?.installed, false);
  });

  it('previews without writes, installs only after consent and loads instructions on demand', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const preview = await previewCatalogInstall(ctx, 'saas-product-demo-video', mockFetch);
    assert.equal(preview.files.length, sources.size);
    assert.ok(preview.files.some(item => item.relativePath === 'SKILL.md'));
    assert.ok(preview.files.some(item => item.relativePath === 'assets/scaffold/package.json'));
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const notApproved = await installCatalogSkill(ctx, 'saas-product-demo-video', { fetchJson: mockFetch });
    assert.equal(notApproved.installed, false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const approved = await installCatalogSkill(ctx, 'saas-product-demo-video',
      { yes: true, fetchJson: mockFetch });
    assert.equal(approved.installed, true);
    const directory = path.join(ctx.centralSkillsDir, 'saas-product-demo-video');
    assert.equal(fs.readFileSync(path.join(directory, 'assets/scaffold/package.json'), 'utf8'),
      sources.get('assets/scaffold/package.json')!.toString('utf8'));
    const routed = routeSmartSkills(ctx, 'Create a SaaS product demo video in Remotion');
    assert.deepEqual(routed.loaded, []);
    assert.ok(routed.selected.some(item => item.id === 'saas-product-demo-video'));
    assert.match(loadSkill(ctx, 'saas-product-demo-video').content, /Build a SaaS product demo/);
    assert.match(loadSkill(ctx, 'saas-product-demo-video', 'references/workflow.md').content, /Video workflow/);
    assert.equal(verifyCatalogSkills(ctx, 'saas-product-demo-video').healthy, true);
    assert.equal(previewCatalogUninstall(ctx, 'saas-product-demo-video').clean, true);
  });
});
