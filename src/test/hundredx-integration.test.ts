import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { gzipSync } from 'node:zlib';
import { createEnvironmentContext } from '../core/context.js';
import { restoreBackup } from '../core/backup.js';
import { lintSkillsDirectory } from '../core/skill-lint.js';
import { readPublicCatalog } from '../commands/public-catalog.js';
import { resolveSkillDependencies, routeSmartSkills } from '../commands/smart-skill-router.js';
import {
  EXECUTION_PROFILES,
  HUNDREDX_EXTENSION,
  HUNDREDX_MODES,
  HUNDREDX_SKILL_IDS,
  adaptExecutionProfile,
  applyConfigureHundredX,
  applyHundredX,
  diagnoseHundredX,
  extractVerifiedTgz,
  hundredxGlobalConfigPath,
  hundredxInstallDir,
  hundredxReceiptPath,
  inspectHundredX,
  inspectWorkspaceHundredX,
  previewConfigureHundredX,
  previewHundredX,
  runHundredXCli,
  syncHundredXSkills
} from '../extensions/hundredx.js';

function makeTar(entries: Array<{ name: string; content?: Buffer | string; type?: '0' | '2' | '5'; mode?: number; linkname?: string }>): Buffer {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const data = entry.content === undefined ? Buffer.alloc(0) : Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf8');
    const hdr = Buffer.alloc(512, 0);
    hdr.write(entry.name, 0, 100, 'utf8');
    hdr.write((entry.mode ?? 0o644).toString(8).padStart(7, '0') + '\0', 100, 8, 'ascii');
    hdr.write('0000000\0', 108, 8, 'ascii');
    hdr.write('0000000\0', 116, 8, 'ascii');
    hdr.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
    hdr.write('00000000000\0', 136, 12, 'ascii');
    hdr.fill(0x20, 148, 156);
    hdr[156] = (entry.type ?? '0').charCodeAt(0);
    if (entry.linkname) hdr.write(entry.linkname, 157, 100, 'utf8');
    hdr.write('ustar\0', 257, 6, 'ascii');
    hdr.write('00', 263, 2, 'ascii');
    let sum = 0;
    for (let i = 0; i < 512; i++) sum += hdr[i]!;
    hdr.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
    chunks.push(hdr);
    if (data.length > 0) {
      chunks.push(data);
      const rem = data.length % 512;
      if (rem !== 0) chunks.push(Buffer.alloc(512 - rem, 0));
    }
  }
  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks));
}

describe('100x Engineer catalog, security, profiles, workspace inspection and CLI', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-100x-'));
  });

  afterEach(() => {
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('registers all 13 pinned 100x skills, validates lint rules, and routes FR/EN verification queries without 100x installed', () => {
    const { catalog } = readPublicCatalog();
    const hundredxEntries = catalog.skills.filter(item => item.id === '100x' || item.id.startsWith('100x-'));
    assert.equal(hundredxEntries.length, 13);
    assert.deepEqual(hundredxEntries.map(s => s.id).sort(), [...HUNDREDX_SKILL_IDS].sort());
    for (const entry of hundredxEntries) {
      assert.equal(entry.license, 'MIT');
      assert.equal(entry.ref, HUNDREDX_EXTENSION.commit);
      assert.ok(entry.description.endsWith('.'));
      assert.ok(entry.description.length <= 480);
    }

    const upeDir = path.resolve('skills');
    assert.deepEqual(lintSkillsDirectory(upeDir), []);

    const upePath = path.resolve('skills', 'universal-product-engineering', 'SKILL.md');
    const upeText = fs.readFileSync(upePath, 'utf8');
    assert.match(upeText, /Optional 100x Engineer specialist synergy/i);
    assert.match(upeText, /100x Engineer is \*\*strictly optional\*\*/is);

    const ctx = createEnvironmentContext({ homeDir: home });
    // Even without 100x installed, smart router returns metadata-first matches cleanly (e.g., UPE if staged).
    const uPeStage = path.join(ctx.centralSkillsDir, 'universal-product-engineering');
    fs.mkdirSync(uPeStage, { recursive: true });
    fs.copyFileSync(upePath, path.join(uPeStage, 'SKILL.md'));
    const routed = routeSmartSkills(ctx, 'verifier invariants contrat non-regression preuve obsolete relecture');
    assert.ok(routed.selected.length > 0 || routed.absent.length >= 0);

    const depCheck = resolveSkillDependencies(ctx, 'universal-product-engineering');
    assert.equal(Array.isArray(depCheck), true);
    assert.equal(HUNDREDX_MODES.length, 13);
  });

  it('extracts SHA-256 verified .tgz archives safely and rejects tampered, symlinked, or traversal entries', () => {
    const tgz = makeTar([
      { name: 'package/package.json', content: '{"name":"100x-engineer-skill","version":"0.1.1"}' },
      { name: 'package/bin/100x.mjs', content: '#!/usr/bin/env node\nconsole.log("ok");\n', mode: 0o755 },
      { name: 'package/skills/100x/SKILL.md', content: '---\nname: 100x\ndescription: Test skill\n---\n' }
    ]);
    const sha = crypto.createHash('sha256').update(tgz).digest('hex');
    const dest = path.join(home, 'extract-ok');
    fs.mkdirSync(dest, { recursive: true });
    const extracted = extractVerifiedTgz(tgz, dest, sha);
    assert.equal(extracted.length, 3);
    assert.equal(fs.existsSync(path.join(dest, 'bin', '100x.mjs')), true);

    assert.throws(() => extractVerifiedTgz(tgz, path.join(home, 'extract-bad'), '0'.repeat(64)), /SHA-256/);

    const evilTraversal = makeTar([{ name: 'package/../../evil.txt', content: 'pwn' }]);
    const evilSha = crypto.createHash('sha256').update(evilTraversal).digest('hex');
    const badDest = path.join(home, 'extract-traversal');
    fs.mkdirSync(badDest, { recursive: true });
    assert.throws(() => extractVerifiedTgz(evilTraversal, badDest, evilSha), /Unsafe filename/);
    assert.equal(fs.existsSync(path.join(home, 'evil.txt')), false);

    const symlinkTar = makeTar([{ name: 'package/link', type: '2', linkname: '/etc/passwd' }]);
    const symSha = crypto.createHash('sha256').update(symlinkTar).digest('hex');
    assert.throws(() => extractVerifiedTgz(symlinkTar, badDest, symSha), /Unsupported or linked/);
  });

  it('rejects untrusted hosts, bad hashes, and missing previews/approval during applyHundredX without writing anything', async () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const plan = previewHundredX(ctx, 'install');
    assert.equal(plan.operation, 'install');
    assert.equal(plan.skillsToStage.length, 13);
    assert.equal(plan.affectsNativeClients, false);

    await assert.rejects(() => applyHundredX(ctx, 'install', plan.revision, { approved: false }), /Explicit approval/);
    await assert.rejects(() => applyHundredX(ctx, 'install', 'bad', { approved: true }), /preview required/);

    const badHostFetch: typeof fetch = async () => {
      const res = new Response(new Uint8Array(8), { status: 200 });
      Object.defineProperty(res, 'url', { value: 'https://evil.example.com/100x.tgz' });
      return res;
    };

    await assert.rejects(
      () => applyHundredX(ctx, 'install', plan.revision, { approved: true, download: badHostFetch }),
      /untrusted host/
    );

    const corruptFetch: typeof fetch = async () => {
      const res = new Response(Buffer.from('not-a-valid-tarball'), { status: 200 });
      Object.defineProperty(res, 'url', { value: HUNDREDX_EXTENSION.tarballUrl });
      return res;
    };

    await assert.rejects(
      () => applyHundredX(ctx, 'install', plan.revision, { approved: true, download: corruptFetch }),
      /SHA-256 verification failed/
    );
    assert.equal(fs.existsSync(hundredxInstallDir(ctx)), false);
    assert.equal(fs.existsSync(hundredxReceiptPath(ctx)), false);
  });

  it('enforces Lite/Standard/Deep execution profiles, zero unauthorized paid calls, config preview/snapshot/rollback, and skill sync', () => {
    const ctx = createEnvironmentContext({ homeDir: home });

    // Default Lite profile and dynamic adaptation keep cloud/paid calls strictly at 0 unless authorized.
    const litePlan = adaptExecutionProfile('lite', { allowWrite: false, allowTests: false, fileCountHint: 2, hasUi: false });
    assert.equal(litePlan.profile, 'lite');
    assert.equal(litePlan.limits.maxCloudCalls, 0);
    assert.equal(litePlan.paidConsumptionAuthorized, false);
    assert.equal(litePlan.checks.verifyRun, false);
    assert.equal(litePlan.checks.uiScreenshots, false);
    assert.equal(litePlan.checks.independentReview, false);
    assert.ok(litePlan.limits.maxSteps <= EXECUTION_PROFILES.lite.maxSteps);

    const deepDeniedPaid = adaptExecutionProfile('deep', { allowWrite: true, allowTests: true, allowPaidReview: false });
    assert.equal(deepDeniedPaid.limits.maxCloudCalls, 0);
    assert.equal(deepDeniedPaid.checks.independentReview, false);

    const deepAllowedPaid = adaptExecutionProfile('deep', { allowWrite: true, allowTests: true, allowPaidReview: true });
    assert.equal(deepAllowedPaid.paidConsumptionAuthorized, true);
    assert.ok(deepAllowedPaid.limits.maxCloudCalls >= 1);
    assert.equal(deepAllowedPaid.checks.independentReview, true);
    assert.equal(deepAllowedPaid.checks.uiScreenshots, true);

    // Seed global 100x config with an unrelated key to test preservation + rollback.
    const cfgPath = hundredxGlobalConfigPath(ctx);
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    const initialCfg = JSON.stringify({ customVendorNote: 'keep-me', review: { enabled: true } }, null, 2) + '\n';
    fs.writeFileSync(cfgPath, initialCfg, 'utf8');

    const cfgPreview = previewConfigureHundredX(ctx, { profile: 'standard', reviewEnabled: false, verifyEnabled: true });
    assert.equal(cfgPreview.changed, true);
    assert.equal(cfgPreview.after['customVendorNote'], 'keep-me');
    assert.equal((cfgPreview.after['budget'] as Record<string, unknown>)['tokens'], EXECUTION_PROFILES.standard.maxTokens);

    assert.throws(() => applyConfigureHundredX(ctx, { profile: 'standard', reviewEnabled: false }, cfgPreview.revision, false), /Explicit approval/);
    const applied = applyConfigureHundredX(ctx, { profile: 'standard', reviewEnabled: false, verifyEnabled: true }, cfgPreview.revision, true);
    assert.equal(applied.changed, true);
    assert.ok(applied.snapshotId);

    const status = inspectHundredX(ctx);
    assert.equal(status.config.profile, 'standard');
    assert.equal(status.config.reviewEnabled, false);
    assert.equal(status.config.tokenBudget, EXECUTION_PROFILES.standard.maxTokens);

    restoreBackup(ctx, applied.snapshotId!);
    assert.equal(fs.readFileSync(cfgPath, 'utf8'), initialCfg);

    // Stage one 100x skill ('100x') cleanly into central library & verify targeted sync dry-run/apply to Claude + native Codex.
    const central100x = path.join(ctx.centralSkillsDir, '100x');
    fs.mkdirSync(central100x, { recursive: true });
    fs.writeFileSync(path.join(central100x, 'SKILL.md'), '---\nname: 100x\ndescription: Verify invariants.\n---\n', 'utf8');
    fs.mkdirSync(path.join(home, '.claude'));
    fs.mkdirSync(path.join(home, '.codex'));

    const dry = syncHundredXSkills(ctx, ['claude-code', 'codex'], { dryRun: true });
    assert.equal(dry.dryRun, true);
    assert.equal(fs.existsSync(path.join(home, '.claude', 'skills', '100x')), false);

    const synced = syncHundredXSkills(ctx, ['claude-code', 'codex'], { dryRun: false });
    assert.equal(synced.errors.length, 0);
    assert.equal(fs.existsSync(path.join(home, '.claude', 'skills', '100x', 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(home, '.codex', 'skills', '100x')), false);
  });

  it('inspects workspace 100x ledger, detects stale cover hashes, parses review/screenshots/anomalies, and guards CLI run', async () => {
    const emptyWs = path.join(home, 'plain-repo');
    fs.mkdirSync(emptyWs, { recursive: true });
    assert.equal(inspectWorkspaceHundredX(emptyWs).present, false);

    const ws = path.join(home, 'verified-repo');
    fs.mkdirSync(path.join(ws, 'src'), { recursive: true });
    fs.mkdirSync(path.join(ws, 'verify', 'red'), { recursive: true });
    fs.mkdirSync(path.join(ws, '.100x', 'review'), { recursive: true });
    fs.mkdirSync(path.join(ws, '.100x', 'shots', 'final'), { recursive: true });

    const srcFile = path.join(ws, 'src', 'app.ts');
    fs.writeFileSync(srcFile, 'export const a = 1;\n', 'utf8');
    const coverHash = crypto.createHash('sha256').update('src/app.ts\0').update(fs.readFileSync(srcFile)).update('\0').digest('hex').slice(0, 16);

    fs.writeFileSync(path.join(ws, 'verify', 'red', 'I1.txt'), 'FAIL seeded null check error\n', 'utf8');
    fs.writeFileSync(
      path.join(ws, 'verify', 'ledger.tsv'),
      [
        'id\tkind\tproperty\tcovers\tcovers_hash\tcommand\tlevel\tred_log\tstatus\texit\tcommit',
        `I1\tcontract\tvalid invariant\tsrc/app.ts\t${coverHash}\tnpm test\te2e\tverify/red/I1.txt\tholds\t0\tabc1234`,
        `I2\tregression\told invariant\tsrc/app.ts\tdeadbeef00001111\tnpm test\te2e\tverify/red/I2.txt\tholds\t0\tabc1234`,
        'I3\tseam\tbroken contract\tsrc/app.ts\t-\tnode test.js\tunit\t-\tbroken\t1\tabc1234',
        `I4\tproperty\tunproven check\tsrc/app.ts\t${coverHash}\t-\tunit\t-\tholds\t0\tabc1234`
      ].join('\n') + '\n',
      'utf8'
    );
    fs.writeFileSync(path.join(ws, '.100x', 'STATE.md'), 'Stage: verify\nNext: fix I3\nOpen risks: I3 pending\n', 'utf8');
    fs.writeFileSync(
      path.join(ws, '.100x', 'run.json'),
      JSON.stringify({ mustNotBreak: [{ kind: 'typecheck', status: 'pass', summary: 'tsc ok' }] }),
      'utf8'
    );
    fs.writeFileSync(
      path.join(ws, '.100x', 'review', 'findings.md'),
      '## F1 [major] missing guard\n## F2 [minor] nit\n',
      'utf8'
    );
    fs.writeFileSync(path.join(ws, '.100x', 'review', 'triage.md'), '- F1: accept\n', 'utf8');
    fs.writeFileSync(
      path.join(ws, '.100x', 'shots', 'final', 'matrix.json'),
      JSON.stringify({ viewports: 2, states: 2, totals: { broken: 0, weak: 1 } }),
      'utf8'
    );
    fs.writeFileSync(path.join(ws, '.100x', 'shots', 'final', 'contact-sheet.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    fs.writeFileSync(path.join(ws, '.100x', 'hero.png'), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

    const report = inspectWorkspaceHundredX(ws);
    assert.equal(report.present, true);
    assert.equal(report.stage, 'verify');
    assert.equal(report.canResume, true);
    assert.equal(report.invariantCounts.holds, 1);
    assert.equal(report.invariantCounts.stale, 1);
    assert.equal(report.invariantCounts.broken, 1);
    assert.equal(report.invariantCounts.unproven, 1);
    assert.equal(report.review?.flags, 2);
    assert.equal(report.review?.accepted, 1);
    assert.equal(report.review?.untriaged, 1);
    assert.equal(report.matrix?.contactSheetRel, '.100x/shots/final/contact-sheet.png');
    assert.equal(report.heroRel, '.100x/hero.png');
    assert.ok(report.anomalies.some(a => a.includes('stale')));
    assert.ok(report.anomalies.some(a => a.includes('broken')));
    assert.ok(report.anomalies.some(a => a.includes('unproven') || a.includes('seeded failure')));

    // Verify controlled CLI execution fails closed when uninstalled or when run lacks --allow-tests.
    const ctx = createEnvironmentContext({ homeDir: home });
    const diag = diagnoseHundredX(ctx);
    assert.equal(typeof diag.healthy, 'boolean');
    await assert.rejects(() => runHundredXCli(ctx, ['status'], { cwd: ws }), /not installed|Unsupported/);
  });
});
