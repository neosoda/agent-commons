import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, readPublicCatalog, previewCatalogInstall,
  installCatalogSkill, verifyCatalogSkills, routeSmartSkills, loadSkill
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

const DOJO_SKILLS = [
  'add-captions', 'add-music', 'add-transitions', 'add-voiceover',
  'analyze-footage', 'create-short', 'create-video', 'find-footage',
  'generate-clip', 'generate-image', 'remotion-production', 'review-video',
  'setup-guide', 'setup', 'transcribe'
];
const hash = (bytes: Buffer): string => crypto.createHash('sha1')
  .update('blob ' + bytes.length + '\0').update(bytes).digest('hex');

function mockedSource(prefix: string, files: Map<string, Buffer>): FetchJson {
  return async url => {
    if (url.includes('/git/trees/')) return {
      truncated: false,
      tree: [
        ...(prefix ? [{ path: '.mcp.json', type: 'blob', mode: '100644', size: 2, sha: 'f'.repeat(40) }] : []),
        ...[...files].map(([name, bytes]) => ({
          path: prefix + name, type: 'blob', mode: '100644', sha: hash(bytes), size: bytes.length
        }))
      ]
    };
    if (url.includes('/git/blobs/')) {
      const bytes = [...files.values()].find(value => url.endsWith(hash(value)));
      assert.ok(bytes);
      return { sha: hash(bytes), size: bytes.length, encoding: 'base64', content: bytes.toString('base64') };
    }
    throw new Error('Unexpected GitHub test URL');
  };
}

describe('video skill sources: pinned, opt-in and lazy', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-video-skills-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  it('registers all 16 MIT source paths without duplicate IDs', () => {
    const { catalog } = readPublicCatalog();
    const video = catalog.skills.filter(s =>
      s.repository.includes('ninjasweb/video-engine-skill') ||
      s.repository.includes('DojoCodingLabs/remotion-superpowers'));
    assert.equal(catalog.skills.length, 199);
    assert.equal(video.length, 16);
    const engine = video.find(s => s.id === 'video-engine');
    assert.ok(engine);
    assert.equal(engine.path, '.');
    assert.equal(engine.ref, 'cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5');
    assert.equal(engine.installPaths, undefined);
    for (const id of DOJO_SKILLS) {
      const entry = video.find(s => s.id === id);
      assert.ok(entry, id);
      assert.equal(entry.path, 'skills/' + id);
      assert.equal(entry.ref, '970efd2d2f4ce2492231a31ee684c2ead883f4bc');
      assert.equal(entry.license, 'MIT');
      assert.ok(entry.licenseEvidence.endsWith(entry.ref + '/LICENSE'));
      assert.equal(entry.entrypoint, undefined);
      assert.equal(entry.installPaths, undefined);
    }
  });

  it('Video Engine preview has no writes; installation and reference loads are explicit', async () => {
    const files = new Map<string, Buffer>([
      ['SKILL.md', Buffer.from('---\nname: video-engine\ndescription: Audio first narrated Remotion videos.\n---\n# Pipeline\n')],
      ['references/voice-and-alignment.md', Buffer.from('# Voice timing\n')]
    ]);
    const ctx = createEnvironmentContext({ homeDir: home });
    const mocked = mockedSource('', files);
    const preview = await previewCatalogInstall(ctx, 'video-engine', mocked);
    assert.equal(preview.files.length, 2);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const denied = await installCatalogSkill(ctx, 'video-engine', { fetchJson: mocked });
    assert.equal(denied.installed, false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const installed = await installCatalogSkill(ctx, 'video-engine', { yes: true, fetchJson: mocked });
    assert.equal(installed.installed, true);
    const routed = routeSmartSkills(ctx, 'Narrated Remotion video with audio alignment');
    assert.deepEqual(routed.loaded, []);
    assert.ok(routed.selected.some(s => s.id === 'video-engine'));
    assert.match(loadSkill(ctx, 'video-engine').content, /Audio first narrated/);
    assert.match(loadSkill(ctx, 'video-engine', 'references/voice-and-alignment.md').content, /Voice timing/);
    assert.equal(verifyCatalogSkills(ctx, 'video-engine').healthy, true);
  });

  it('selects only the requested Dojo skill subtree, including its local rules', async () => {
    const files = new Map<string, Buffer>([
      ['SKILL.md', Buffer.from('---\nname: remotion-production\ndescription: Remotion media production.\n---\n# Production\n')],
      ['rules/production-pipeline.md', Buffer.from('# Pipeline rules\n')]
    ]);
    const ctx = createEnvironmentContext({ homeDir: home });
    const mocked = mockedSource('skills/remotion-production/', files);
    const preview = await previewCatalogInstall(ctx, 'remotion-production', mocked);
    assert.deepEqual(preview.files.map(f => f.relativePath), ['SKILL.md', 'rules/production-pipeline.md']);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const installed = await installCatalogSkill(ctx, 'remotion-production', { yes: true, fetchJson: mocked });
    assert.equal(installed.installed, true);
    const text = loadSkill(ctx, 'remotion-production', 'rules/production-pipeline.md').content;
    assert.match(text, /Pipeline rules/);
    assert.equal(verifyCatalogSkills(ctx, 'remotion-production').healthy, true);
    assert.equal(fs.existsSync(path.join(ctx.centralSkillsDir, 'remotion-production', '.mcp.json')), false);
  });
});
