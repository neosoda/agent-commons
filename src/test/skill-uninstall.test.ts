import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, installCatalogSkill,
  uninstallCatalogSkill, previewCatalogUninstall,
  restoreBackup
} from '../index.js';
import { runCli } from '../cli/index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('Managed skill removal: offline, non-destructive, restorable', () => {
  let home: string;
  const payload = Buffer.from('---\nname: skill-creator\n---\n# Skill Creator\n');
  const sha = crypto.createHash('sha1').update('blob ' + payload.length + '\0')
    .update(payload).digest('hex');
  const fetchJson: FetchJson = async url => {
    if (url.includes('/git/trees/')) {
      return { truncated: false, tree: [
        { path: 'skills/skill-creator/SKILL.md', type: 'blob', mode: '100644',
          sha, size: payload.length }
      ] };
    }
    if (url.includes('/git/blobs/')) {
      return { sha, size: payload.length, encoding: 'base64', content: payload.toString('base64') };
    }
    throw Error('Unexpected URL');
  };
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-uninstall-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  async function install(): Promise<ReturnType<typeof createEnvironmentContext>> {
    const ctx = createEnvironmentContext({ homeDir: home });
    await installCatalogSkill(ctx, 'skill-creator', { yes: true, fetchJson });
    return ctx;
  }

  it('previews managed files and requires --yes; no filesystem mutation for preview', async () => {
    const ctx = await install();
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const before = fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8');
    const p = previewCatalogUninstall(ctx, 'skill-creator');
    assert.equal(p.clean, true);
    assert.deepEqual(p.files, ['SKILL.md']);
    assert.equal(p.totalBytes, payload.length);
    const output = uninstallCatalogSkill(ctx, 'skill-creator');
    assert.equal(output.removed, false);
    assert.equal(output.snapshotId, null);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), before);
    assert.equal(runCli(['catalog', 'uninstall', 'skill-creator', '--home', home]), 0);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), before);
  });

  it('uninstalls an intact skill with a snapshot that can restore it', async () => {
    const ctx = await install();
    const result = uninstallCatalogSkill(ctx, 'skill-creator', { yes: true });
    assert.equal(result.removed, true);
    assert.ok(result.snapshotId);
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    assert.equal(fs.existsSync(target), false);
    restoreBackup(ctx, result.snapshotId!);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'), payload.toString());
    assert.equal(previewCatalogUninstall(ctx, 'skill-creator').clean, true);
  });

  it('refuses modified tracked files, unknown files and nested extra directories', async () => {
    const ctx = await install();
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const file = path.join(target, 'SKILL.md');
    fs.writeFileSync(file, '# my changes');
    assert.throws(() => uninstallCatalogSkill(ctx, 'skill-creator', { yes: true }), /modified/);
    fs.writeFileSync(file, payload);
    fs.writeFileSync(path.join(target, 'notes-private.txt'), 'important');
    assert.throws(() => uninstallCatalogSkill(ctx, 'skill-creator', { yes: true }), /untracked/);
    fs.unlinkSync(path.join(target, 'notes-private.txt'));
    fs.mkdirSync(path.join(target, 'new-directory'));
    assert.throws(() => uninstallCatalogSkill(ctx, 'skill-creator', { yes: true }), /unexpected directory/);
    assert.equal(fs.readFileSync(file, 'utf8'), payload.toString());
  });

  it('refuses missing/forged management receipts, links and invalid identifiers', async () => {
    const ctx = await install();
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const receipt = path.join(target, '.agent-commons-source.json');
    const data = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    data.repository = 'https://github.com/attacker/evil';
    fs.writeFileSync(receipt, JSON.stringify(data));
    assert.throws(() => previewCatalogUninstall(ctx, 'skill-creator'), /provenance/);
    assert.throws(() => previewCatalogUninstall(ctx, '../private'), /identifier/);
    fs.unlinkSync(receipt);
    assert.throws(() => previewCatalogUninstall(ctx, 'skill-creator'), /receipt/);
    assert.equal(fs.existsSync(target), true);
  });

  it('refuses to break links from other installed coding agents', async () => {
    const ctx = await install();
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const agentDir = path.join(home, '.codex');
    const skillDir = path.join(agentDir, 'skills');
    fs.mkdirSync(skillDir, { recursive: true });
    const link = path.join(skillDir, 'skill-creator');
    fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => uninstallCatalogSkill(ctx, 'skill-creator', { yes: true }), /linked to an installed agent/);
    assert.equal(fs.existsSync(path.join(target, 'SKILL.md')), true);
    assert.equal(fs.existsSync(link), true);
  });

  it('rejects nested symlinks and cannot delete an unmanaged directory', async () => {
    const ctx = await install();
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-safe-other-'));
    try {
      fs.symlinkSync(outside, path.join(target, 'custom-link'),
        process.platform === 'win32' ? 'junction' : 'dir');
      assert.throws(() => previewCatalogUninstall(ctx, 'skill-creator'), /link/);
      assert.equal(fs.existsSync(outside), true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
    const unmanaged = path.join(ctx.centralSkillsDir, 'important-local');
    fs.mkdirSync(unmanaged);
    fs.writeFileSync(path.join(unmanaged, 'SKILL.md'), '# important');
    assert.throws(() => uninstallCatalogSkill(ctx, 'important-local', { yes: true }), /receipt/);
    assert.equal(fs.readFileSync(path.join(unmanaged, 'SKILL.md'), 'utf8'), '# important');
  });
});
