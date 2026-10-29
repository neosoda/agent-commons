import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { createEnvironmentContext, installCatalogSkill, verifyCatalogSkills } from '../index.js';
import { runCli } from '../cli/index.js';
import type { FetchJson } from '../commands/skill-install.js';

describe('catalog verify: strictly offline read-only integrity audit', () => {
  let home: string;
  const payload = Buffer.from('---\nname: skill-creator\n---\n# Skill Creator\n');
  const sha = crypto.createHash('sha1').update('blob ' + payload.length + '\0').update(payload).digest('hex');
  const fetchJson: FetchJson = async url => {
    if (url.includes('/git/trees/')) return {
      truncated: false, tree: [{
        path: 'skills/skill-creator/SKILL.md', type: 'blob',
        mode: '100644', sha, size: payload.length
      }]
    };
    if (url.includes('/git/blobs/')) return {
      sha, size: payload.length, encoding: 'base64', content: payload.toString('base64')
    };
    throw new Error('Unexpected network request');
  };
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-verify-')); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  async function install() {
    const ctx = createEnvironmentContext({ homeDir: home });
    await installCatalogSkill(ctx, 'skill-creator', { yes: true, fetchJson });
    const target = path.join(ctx.centralSkillsDir, 'skill-creator');
    return { ctx, target, receipt: path.join(target, '.agent-commons-source.json') };
  }

  it('verifies exact Git blobs offline and keeps installed bytes unchanged', async () => {
    const { ctx, target, receipt } = await install();
    const before = fs.readFileSync(receipt);
    const report = verifyCatalogSkills(ctx);
    assert.equal(report.healthy, true);
    assert.deepEqual(report.results.map(r => r.skill), ['skill-creator']);
    assert.equal(report.results[0]!.status, 'intact');
    assert.equal(report.results[0]!.checkedFiles, 1);
    assert.equal(runCli(['catalog', 'verify', 'skill-creator', '--home', home, '--json']), 0);
    assert.equal(fs.readFileSync(receipt).equals(before), true);
    assert.equal(fs.readFileSync(path.join(target, 'SKILL.md')).equals(payload), true);
  });

  it('detects modified and missing tracked files with nonzero exit code', async () => {
    const { ctx, target } = await install();
    const tracked = path.join(target, 'SKILL.md');
    fs.writeFileSync(tracked, '# edited');
    const altered = verifyCatalogSkills(ctx, 'skill-creator');
    assert.equal(altered.healthy, false);
    assert.equal(altered.results[0]!.status, 'modified');
    assert.equal(altered.results[0]!.issues[0]!.path, 'SKILL.md');
    assert.equal(runCli(['catalog', 'verify', 'skill-creator', '--home', home]), 1);
    fs.unlinkSync(tracked);
    assert.equal(verifyCatalogSkills(ctx, 'skill-creator').results[0]!.status, 'missing');
  });

  it('detects untracked files and unexpected nested directories', async () => {
    const { ctx, target } = await install();
    fs.writeFileSync(path.join(target, 'private-notes.txt'), 'secret data');
    const report = verifyCatalogSkills(ctx);
    assert.equal(report.results[0]!.status, 'untracked');
    assert.ok(report.results[0]!.issues.every(item => item.path !== 'private-notes.txt'));
    fs.unlinkSync(path.join(target, 'private-notes.txt'));
    fs.mkdirSync(path.join(target, 'extras'));
    fs.writeFileSync(path.join(target, 'extras', 'extra.txt'), 'mine');
    assert.equal(verifyCatalogSkills(ctx).results[0]!.status, 'untracked');
    assert.equal(fs.readFileSync(path.join(target, 'extras', 'extra.txt'), 'utf8'), 'mine');
  });

  it('rejects forged receipts, malformed hashes and case-insensitive duplicates', async () => {
    const { ctx, receipt } = await install();
    const original = fs.readFileSync(receipt, 'utf8');
    const data = JSON.parse(original);
    data.repository = 'https://github.com/attacker/evil';
    fs.writeFileSync(receipt, JSON.stringify(data));
    assert.equal(verifyCatalogSkills(ctx).results[0]!.status, 'unsafe');
    fs.writeFileSync(receipt, original);
    data.repository = JSON.parse(original).repository;
    data.files.push({ path: 'skill.md', gitBlobSha1: sha });
    fs.writeFileSync(receipt, JSON.stringify(data));
    assert.equal(verifyCatalogSkills(ctx).results[0]!.status, 'unsafe');
    fs.writeFileSync(receipt, original);
    data.files = [{ path: '../outside', gitBlobSha1: sha }];
    fs.writeFileSync(receipt, JSON.stringify(data));
    assert.equal(verifyCatalogSkills(ctx).results[0]!.status, 'unsafe');
  });

  it('marks unmanaged and absent explicitly requested skills without mutating them', async () => {
    const { ctx, target, receipt } = await install();
    fs.unlinkSync(receipt);
    assert.equal(verifyCatalogSkills(ctx, 'skill-creator').results[0]!.status, 'unmanaged');
    assert.equal(verifyCatalogSkills(ctx, 'skill-creator').healthy, false);
    assert.equal(fs.existsSync(target), true);
    const other = path.join(ctx.centralSkillsDir, 'locally-created');
    fs.mkdirSync(other);
    assert.equal(verifyCatalogSkills(ctx, 'locally-created').results[0]!.status, 'unmanaged');
    assert.equal(verifyCatalogSkills(ctx, 'no-such-skill').results[0]!.status, 'missing');
    assert.throws(() => verifyCatalogSkills(ctx, '../not-valid'), /identifier/);
  });

  it('flags nested links/junctions and refuses linked skill roots', async () => {
    const { ctx, target } = await install();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-verify-outside-'));
    try {
      fs.symlinkSync(outside, path.join(target, 'linked'),
        process.platform === 'win32' ? 'junction' : 'dir');
      assert.equal(verifyCatalogSkills(ctx).results[0]!.status, 'unsafe');
      assert.equal(fs.existsSync(outside), true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
    fs.rmSync(target, { recursive: true, force: true });
    fs.symlinkSync(outside, target, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(verifyCatalogSkills(ctx, 'skill-creator').results[0]!.status, 'unsafe');
  });

  it('rejects write-inducing and unrelated CLI flags', async () => {
    await install();
    assert.equal(runCli(['catalog', 'verify', '--yes', '--home', home]), 1);
    assert.equal(runCli(['catalog', 'verify', '--force', '--home', home]), 1);
    assert.equal(runCli(['catalog', 'verify', '--profile', 'design', '--home', home]), 1);
  });
});
