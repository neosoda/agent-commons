import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, installCatalogSkill, previewCatalogInstall,
  listBackups, readPublicCatalog
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('Pinned GitHub installer: inspect-before-consent, no overwrite, integrity', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-install-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const skillContent = Buffer.from('---\nname: skill-creator\n---\n# Skill Creator\n');
  const sha = crypto.createHash('sha1').update('blob ' + skillContent.length + '\0')
    .update(skillContent).digest('hex');

  function mockFetch(opts: { tampered?: boolean; extra?: Record<string, unknown> } = {}): FetchJson {
    return async (url: string): Promise<unknown> => {
      if (url.includes('/git/trees/')) {
        return {
          truncated: false,
          tree: [
            { path: 'skills/skill-creator/SKILL.md', type: 'blob', mode: '100644',
              sha, size: skillContent.length },
            { path: 'skills/other/SKILL.md', type: 'blob', mode: '100644',
              sha, size: skillContent.length },
            ...(opts.extra ? [opts.extra] : [])
          ]
        };
      }
      if (url.includes('/git/blobs/')) {
        return { sha, size: skillContent.length, encoding: 'base64',
          content: Buffer.from(opts.tampered ? 'not actual source' : skillContent).toString('base64') };
      }
      throw new Error('Unexpected mock URL');
    };
  }

  it('previews exact pinned files without creating any directories or files', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const preview = await previewCatalogInstall(ctx, 'skill-creator', mockFetch());
    assert.deepEqual(preview.files.map(x => x.relativePath), ['SKILL.md']);
    assert.equal(preview.commit.length, 40);
    assert.equal(preview.totalBytes, skillContent.length);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
    const notApproved = await installCatalogSkill(ctx, 'skill-creator', { fetchJson: mockFetch() });
    assert.equal(notApproved.installed, false);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
  });

  it('requires explicit approval and installs only a new skill after creating a snapshot', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const result = await installCatalogSkill(ctx, 'skill-creator',
      { yes: true, fetchJson: mockFetch() });
    assert.equal(result.installed, true);
    assert.ok(result.snapshotId);
    assert.equal(listBackups(ctx).length, 1);
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), skillContent.toString());
    const receipt = JSON.parse(fs.readFileSync(path.join(target, '.agent-commons-source.json'), 'utf8'));
    assert.equal(receipt.commit, result.preview.commit);
    assert.equal(receipt.files[0].gitBlobSha1, sha);
    await assert.rejects(() => previewCatalogInstall(ctx, 'skill-creator', mockFetch()), /already exists/);
  });

  it('does not mutate a physical existing skill or junction', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), 'MY PRIVATE SKILL');
    await assert.rejects(() => installCatalogSkill(ctx, 'skill-creator',
      { yes: true, fetchJson: mockFetch() }), /already exists/);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), 'MY PRIVATE SKILL');
    assert.equal(listBackups(ctx).length, 0);
  });

  it('rejects symlinks, traversal paths and a missing SKILL.md before writes', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    await assert.rejects(() => previewCatalogInstall(ctx, 'skill-creator', mockFetch({
      extra: { path: 'skills/skill-creator/linked', type: 'blob', mode: '120000', sha, size: 12 }
    })), /linked entry/);
    await assert.rejects(() => previewCatalogInstall(ctx, 'skill-creator', mockFetch({
      extra: { path: 'skills/skill-creator/..\/outside', type: 'blob', mode: '100644', sha, size: 1 }
    })), /Unsafe path/);
    assert.equal(fs.existsSync(ctx.commonsDir), false);
  });

  it('refuses tampered downloaded bytes and removes the temporary installation', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    await assert.rejects(() => installCatalogSkill(ctx, 'skill-creator',
      { yes: true, fetchJson: mockFetch({ tampered: true }) }), /size mismatch|hash mismatch/);
    assert.equal(fs.existsSync(path.join(ctx.centralSkillsDir, 'skill-creator')), false);
    if (fs.existsSync(ctx.commonsDir)) {
      assert.equal(fs.readdirSync(ctx.commonsDir).some(name => name.startsWith('.agent-commons-stage-')), false);
    }
    assert.equal(listBackups(ctx).length, 0);
  });

  it('rejects archived catalog entries without contacting upstream', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const old = readPublicCatalog().catalog.skills.find(x => x.lifecycle === 'archived');
    assert.ok(old, 'test requires one historical skill');
    let called = false;
    await assert.rejects(() => previewCatalogInstall(ctx, old.id, async () => {
      called = true; throw new Error('Should not reach network');
    }), /Archived skill/);
    assert.equal(called, false);
  });
});
