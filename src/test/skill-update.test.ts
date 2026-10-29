import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, installCatalogSkill, previewCatalogUpdate,
  updateCatalogSkill, listCatalogOutdated, restoreBackup, listBackups
} from '../index.js';
import { runCli } from '../cli/index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('Pinned managed updates: offline status, preview, integrity and recovery', () => {
  let home: string;
  const oldCommit = '0123456789abcdef0123456789abcdef01234567';
  const oldContent = Buffer.from('---\nname: skill-creator\n---\n# Old\n');
  const newContent = Buffer.from('---\nname: skill-creator\n---\n# New\n');
  const readme = Buffer.from('# Changes\n');
  function gitHash(bytes: Buffer): string {
    return crypto.createHash('sha1').update('blob ' + bytes.length + '\0')
      .update(bytes).digest('hex');
  }
  const oldHash = gitHash(oldContent);
  const newHash = gitHash(newContent);
  const readmeHash = gitHash(readme);

  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-update-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  const initialFetch: FetchJson = async url => {
    if (url.includes('/git/trees/')) return { truncated: false, tree: [
      { path: 'skills/skill-creator/SKILL.md', type: 'blob', mode: '100644',
        sha: oldHash, size: oldContent.length }
    ] };
    if (url.includes('/git/blobs/')) return {
      sha: oldHash, size: oldContent.length,
      encoding: 'base64', content: oldContent.toString('base64')
    };
    throw new Error('Unexpected mock request');
  };

  const upgradedFetch: FetchJson = async url => {
    if (url.includes('/git/trees/')) return { truncated: false, tree: [
      { path: 'skills/skill-creator/SKILL.md', type: 'blob', mode: '100644',
        sha: newHash, size: newContent.length },
      { path: 'skills/skill-creator/README.md', type: 'blob', mode: '100644',
        sha: readmeHash, size: readme.length }
    ] };
    if (url.includes('/git/blobs/' + newHash)) return {
      sha: newHash, size: newContent.length,
      encoding: 'base64', content: newContent.toString('base64')
    };
    if (url.includes('/git/blobs/' + readmeHash)) return {
      sha: readmeHash, size: readme.length,
      encoding: 'base64', content: readme.toString('base64')
    };
    throw new Error('Unexpected mock request');
  };

  async function installStale() {
    const ctx = createEnvironmentContext({ homeDir: home });
    await installCatalogSkill(ctx, 'skill-creator', { yes: true, fetchJson: initialFetch });
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const receiptFile = path.join(target, '.agent-commons-source.json');
    const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    receipt.commit = oldCommit;
    receipt.source = receipt.repository + '/tree/' + oldCommit + '/skills/skill-creator';
    fs.writeFileSync(receiptFile, JSON.stringify(receipt, null, 2));
    return { ctx, target, receiptFile };
  }

  it('identifies managed stale revisions offline, including current entries', async () => {
    const { ctx } = await installStale();
    const statuses = listCatalogOutdated(ctx);
    const skill = statuses.find(x => x.skill === 'skill-creator');
    assert.equal(skill?.installedCommit, oldCommit);
    assert.equal(skill?.status, 'outdated');
    assert.equal(runCli(['catalog', 'outdated', '--home', home]), 0);
    assert.equal(runCli(['catalog', 'outdated', '--home', home, '--json']), 0);
    assert.equal(runCli(['catalog', 'outdated', 'bad', '--home', home]), 1);
  });

  it('previews a pinned update with file additions and changes without writes', async () => {
    const { ctx, target } = await installStale();
    const original = fs.readFileSync(path.join(target, 'SKILL.md'));
    const baseline = listBackups(ctx).length;
    const preview = await previewCatalogUpdate(ctx, 'skill-creator', upgradedFetch);
    assert.equal(preview.previousCommit, oldCommit);
    assert.equal(preview.changed.includes('SKILL.md'), true);
    assert.equal(preview.added.includes('README.md'), true);
    assert.deepEqual(preview.removed, []);
    const dry = await updateCatalogSkill(ctx, 'skill-creator', { fetchJson: upgradedFetch });
    assert.equal(dry.updated, false);
    assert.equal(listBackups(ctx).length, baseline);
    assert.deepEqual(fs.readFileSync(path.join(target, 'SKILL.md')), original);
    assert.equal(fs.existsSync(path.join(target, 'README.md')), false);
  });

  it('updates with explicit approval and restores the original pinned revision', async () => {
    const { ctx, target, receiptFile } = await installStale();
    const result = await updateCatalogSkill(ctx, 'skill-creator', {
      yes: true, fetchJson: upgradedFetch
    });
    assert.equal(result.updated, true);
    assert.ok(result.snapshotId);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), newContent.toString());
    assert.equal(fs.readFileSync(path.join(target, 'README.md'), 'utf8'), readme.toString());
    const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
    assert.equal(receipt.commit, result.preview.proposedCommit);
    assert.equal(listCatalogOutdated(ctx).find(x => x.skill === 'skill-creator')?.status, 'current');
    await assert.rejects(() => previewCatalogUpdate(ctx, 'skill-creator', upgradedFetch),
      /already matches/);

    restoreBackup(ctx, result.snapshotId!);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), oldContent.toString());
    assert.equal(fs.existsSync(path.join(target, 'README.md')), false);
    assert.equal(JSON.parse(fs.readFileSync(receiptFile, 'utf8')).commit, oldCommit);
    assert.equal(listCatalogOutdated(ctx).find(x => x.skill === 'skill-creator')?.status, 'outdated');
  });

  it('refuses user modifications and untracked files before fetching remote data', async () => {
    const { ctx, target } = await installStale();
    let networkCalls = 0;
    const forbidden: FetchJson = async () => {
      networkCalls++; throw new Error('Should not contact network');
    };
    const file = path.join(target, 'SKILL.md');
    fs.writeFileSync(file, '# Modified locally');
    await assert.rejects(() => previewCatalogUpdate(ctx, 'skill-creator', forbidden), /modified/);
    fs.writeFileSync(file, oldContent);
    fs.writeFileSync(path.join(target, 'PRIVATE.txt'), 'do not delete');
    await assert.rejects(() => updateCatalogSkill(ctx, 'skill-creator', { yes: true, fetchJson: forbidden }),
      /untracked/);
    assert.equal(networkCalls, 0);
    assert.equal(fs.readFileSync(path.join(target, 'PRIVATE.txt'), 'utf8'), 'do not delete');
  });

  it('rejects corrupted blob content, preserves old revision and clears staging', async () => {
    const { ctx, target } = await installStale();
    const corrupted: FetchJson = async url => {
      if (url.includes('/git/trees/')) return upgradedFetch(url);
      if (url.includes('/git/blobs/')) return { sha: newHash, size: newContent.length,
        encoding: 'base64', content: Buffer.from('bad').toString('base64') };
      throw new Error('Bad mock');
    };
    const baseline = listBackups(ctx).length;
    await assert.rejects(() => updateCatalogSkill(ctx, 'skill-creator',
      { yes: true, fetchJson: corrupted }), /size mismatch|hash mismatch/);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), oldContent.toString());
    assert.equal(listBackups(ctx).length, baseline);
    assert.equal(fs.readdirSync(ctx.commonsDir).some(x => x.startsWith('.agent-commons-stage-')), false);
  });

  it('refuses to replace a skill still linked into a coding agent', async () => {
    const { ctx, target } = await installStale();
    const agentSkills = path.join(home, '.codex', 'skills');
    fs.mkdirSync(agentSkills, { recursive: true });
    fs.symlinkSync(target, path.join(agentSkills, 'skill-creator'),
      process.platform === 'win32' ? 'junction' : 'dir');
    let networkCalls = 0;
    await assert.rejects(() => previewCatalogUpdate(ctx, 'skill-creator',
      async () => { networkCalls++; throw new Error('Should not fetch'); }),
      /linked to an installed agent/);
    assert.equal(networkCalls, 0);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), oldContent.toString());
  });

  it('rejects update of an already current catalog skill', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    await installCatalogSkill(ctx, 'skill-creator', { yes: true, fetchJson: initialFetch });
    let called = 0;
    await assert.rejects(() => previewCatalogUpdate(ctx, 'skill-creator',
      async () => { called++; return {}; }), /already matches/);
    assert.equal(called, 0);
  });
});
