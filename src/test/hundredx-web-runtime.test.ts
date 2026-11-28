import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { EXECUTION_PROFILES } from '../extensions/hundredx.js';
import { MissionQueue } from '../runtime/queue.js';
import { MissionStore } from '../runtime/mission.js';
import { LocalQueueWorker } from '../runtime/worker.js';
import { WorkspaceTools } from '../runtime/workspace.js';
import { startWebServer, type WebInstance } from '../web/server.js';
import { renderWebUi } from '../web/ui.js';

describe('100x Engineer Web UI, Mission Control artifacts, and runtime queue profiles', () => {
  let home: string;
  let instance: WebInstance;
  let csrf: string;

  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-100x-web-'));
    instance = await startWebServer({
      context: createEnvironmentContext({ homeDir: home }),
      port: 0,
      openBrowser: false
    });
    const html = await (await fetch(instance.url)).text();
    csrf = html.match(/name="csrf-token" content="([0-9a-f]+)"/)?.[1] ?? '';
    assert.match(csrf, /^[0-9a-f]{64}$/);
  });

  afterEach(async () => {
    await instance.close();
    fs.rmSync(home, { recursive: true, force: true });
  });

  async function post(body: object) {
    return fetch(instance.url + '/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-agent-commons-csrf': csrf },
      body: JSON.stringify(body)
    });
  }

  it('ships valid client JavaScript, 100x panel markup, profile selector, and FR translations', () => {
    const html = renderWebUi('0123456789abcdef', 'fedcba9876543210');
    assert.match(html, /id="hundredx-panel"/);
    assert.match(html, /id="mission-profile"/);
    assert.match(html, /value="lite" selected/);
    assert.match(html, /renderMission100x/);
    assert.match(html, /Profil d’exécution/);

    const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
    assert.ok(scriptMatches.length >= 1);
    for (const match of scriptMatches) {
      assert.doesNotThrow(() => new vm.Script(match[1]!));
    }
  });

  it('exposes /api/100x, requires preview & approval for configuration, and protects private paths', async () => {
    const statusRes = await fetch(instance.url + '/api/100x');
    assert.equal(statusRes.status, 200);
    const statusText = await statusRes.text();
    assert.equal(statusText.includes(home), false, 'API must never leak private home path');
    const statusBody = JSON.parse(statusText) as {
      extension: { modes: unknown[]; config: { profile: string } };
      profiles: Array<{ id: string }>;
    };
    assert.equal(statusBody.extension.modes.length, 13);
    assert.deepEqual(
      statusBody.profiles.map(p => p.id),
      ['lite', 'standard', 'deep']
    );

    const previewRes = await fetch(instance.url + '/api/100x-preview?op=install&skills=1');
    assert.equal(previewRes.status, 200);
    const previewJson = (await previewRes.json()) as { plan: { revision: string; skillsToStage: string[] } };
    assert.equal(previewJson.plan.skillsToStage.length, 13);

    // Reject install without approval
    const deniedApply = await post({
      action: '100x-apply',
      operation: 'install',
      expectedRevision: previewJson.plan.revision,
      approved: false
    });
    assert.equal(deniedApply.status, 400);

    // Reject invalid profile
    const invalidCfg = await post({ action: '100x-configure-preview', profile: 'extreme' });
    assert.equal(invalidCfg.status, 400);

    // Full preview -> apply flow for configuring 100x profile
    const cfgPreviewRes = await post({
      action: '100x-configure-preview',
      profile: 'deep',
      reviewEnabled: false,
      verifyEnabled: true
    });
    assert.equal(cfgPreviewRes.status, 200);
    const cfgPreview = (await cfgPreviewRes.json()) as { plan: { revision: string; changed: boolean } };
    assert.equal(cfgPreview.plan.changed, true);

    const missingConsent = await post({
      action: '100x-configure-apply',
      profile: 'deep',
      reviewEnabled: false,
      verifyEnabled: true,
      expectedRevision: cfgPreview.plan.revision
    });
    assert.equal(missingConsent.status, 400);

    const cfgApplyRes = await post({
      action: '100x-configure-apply',
      profile: 'deep',
      reviewEnabled: false,
      verifyEnabled: true,
      expectedRevision: cfgPreview.plan.revision,
      approved: true
    });
    assert.equal(cfgApplyRes.status, 200);

    const updated = (await (await fetch(instance.url + '/api/100x')).json()) as {
      extension: { config: { profile: string; reviewEnabled: boolean; verifyEnabled: boolean } };
    };
    assert.equal(updated.extension.config.profile, 'deep');
    assert.equal(updated.extension.config.reviewEnabled, false);
    assert.equal(updated.extension.config.verifyEnabled, true);
  });

  it('tracks mission profiles, 100x workspace verification state, and safely serves PNG proof artifacts', async () => {
    const repo = path.join(home, 'mission-proof-repo');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(path.join(repo, '.100x', 'shots', 'final'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.100x', 'STATE.md'), 'Stage: polish\nNext: ship\n', 'utf8');
    fs.writeFileSync(
      path.join(repo, '.100x', 'finished.json'),
      JSON.stringify({ verdict: 'ship', why: 'all checks passed' }),
      'utf8'
    );
    const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    fs.writeFileSync(path.join(repo, '.100x', 'hero.png'), pngBytes);
    fs.writeFileSync(path.join(repo, 'secret.txt'), 'top-secret-file');

    const badProfile = await post({
      action: 'mission-enqueue',
      workspace: repo,
      goal: 'Inspect repo',
      model: 'local-test',
      profile: 'invalid',
      approved: true
    });
    assert.equal(badProfile.status, 400);

    const enqueue = await post({
      action: 'mission-enqueue',
      workspace: repo,
      goal: 'Verify formal invariants and capture proof',
      model: 'local-test',
      profile: 'standard',
      priority: 6,
      delayMinutes: 0,
      allowWrite: false,
      allowTests: false,
      approved: true
    });
    assert.equal(enqueue.status, 200);
    const queued = (await enqueue.json()) as { id: string; profile: string };
    assert.equal(queued.profile, 'standard');

    const listRes = await fetch(instance.url + '/api/missions');
    assert.equal(listRes.status, 200);
    const listText = await listRes.text();
    assert.equal(listText.includes(home), false, 'Missions API must not leak workspace home path');
    const listData = JSON.parse(listText) as {
      jobs: Array<{
        id: string;
        profile: string;
        limits: { maxTokens: number; maxCloudCalls: number };
        hundredx: { present: boolean; stage: string; verdict: string; heroRel: string };
      }>;
    };
    const job = listData.jobs.find(j => j.id === queued.id);
    assert.ok(job);
    assert.equal(job.profile, 'standard');
    assert.equal(job.limits.maxTokens, EXECUTION_PROFILES.standard.maxTokens);
    assert.equal(job.limits.maxCloudCalls, 0);
    assert.equal(job.hundredx.present, true);
    assert.equal(job.hundredx.stage, 'polish');
    assert.equal(job.hundredx.verdict, 'ship');
    assert.equal(job.hundredx.heroRel, '.100x/hero.png');

    // Valid PNG artifact serving
    const heroRes = await fetch(
      instance.url + `/api/mission-artifact?jobId=${encodeURIComponent(job.id)}&path=${encodeURIComponent('.100x/hero.png')}`
    );
    assert.equal(heroRes.status, 200);
    assert.equal(heroRes.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await heroRes.arrayBuffer()), pngBytes);

    // Reject path traversal & non-proof files
    const traversalRes = await fetch(
      instance.url + `/api/mission-artifact?jobId=${encodeURIComponent(job.id)}&path=${encodeURIComponent('../secret.txt')}`
    );
    assert.equal(traversalRes.status, 400);
    const rootFileRes = await fetch(
      instance.url + `/api/mission-artifact?jobId=${encodeURIComponent(job.id)}&path=${encodeURIComponent('.100x/STATE.md')}`
    );
    assert.equal(rootFileRes.status, 400);
  });

  it('persists queue profiles, runs without 100x, and enforces explicit review before resuming interrupted jobs', async () => {
    const commonsDir = path.join(home, '.agents');
    const repo = path.join(home, 'runtime-no-100x');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    const wsTools = new WorkspaceTools(repo, false, false);
    const store = new MissionStore(path.join(commonsDir, 'missions'));
    const queue = new MissionQueue(commonsDir);
    try {
      const state = store.create('Run analysis cleanly without 100x installed', wsTools.workspaceId);
      state.profile = 'deep';
      state.pendingAction = { name: 'write_file', digest: 'abc123' };
      store.save(state);

      const jobId = queue.add({
        missionId: state.id,
        workspace: repo,
        workspaceId: wsTools.workspaceId,
        model: 'local-test',
        profile: 'deep',
        allowWrite: false,
        allowTests: false,
        allowMcp: [],
        priority: 5,
        runAt: Date.now()
      });

      let executedProfile: string | undefined;
      const worker = new LocalQueueWorker(queue, async claimed => {
        executedProfile = claimed.profile;
        return 'partial';
      });
      assert.equal(await worker.tick(), true);
      assert.equal(executedProfile, 'deep');
      assert.equal(queue.get(jobId).status, 'partial');

      // Requeuing an interrupted mission with a pending side-effect requires operator acknowledgement flag.
      assert.throws(() => queue.requeue(jobId, wsTools.workspaceId, Boolean(state.pendingAction)), /reconcile|pending/i);
      queue.requeue(jobId, wsTools.workspaceId, false);
      assert.equal(queue.get(jobId).status, 'queued');
    } finally {
      queue.close();
    }
  });
});
