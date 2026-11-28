import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { MissionQueue } from '../runtime/queue.js';
import { LocalQueueWorker } from '../runtime/worker.js';
import { MissionStore } from '../runtime/mission.js';

const hash = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
const owner = 'a'.repeat(24);
function fixture() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-queue-'));
  const dir = path.join(base, '.agents');
  const store = new MissionStore(path.join(dir, 'missions'));
  const workspace = path.join(base, 'project'); fs.mkdirSync(workspace);
  const workspaceId = hash(workspace);
  const queue = new MissionQueue(dir);
  const add = (priority = 5, runAt = Date.now(), model = 'test-local') => {
    const state = store.create('Inspect the repository', workspaceId);
    const id = queue.add({
      missionId: state.id, workspace, workspaceId, model,
      allowWrite: false, allowTests: false, allowMcp: [],
      priority, runAt
    });
    return { id, state };
  };
  return { base, dir, store, workspaceId, queue, add,
    close: () => { queue.close(); fs.rmSync(base, { recursive: true, force: true }); } };
}
describe('P4 persistent queue and worker', () => {
  it('drains worker claims transactionally while allowing new missions and existing leases', () => {
    const f = fixture();
    const admin = new DatabaseSync(path.join(f.dir, 'queue.sqlite'));
    try {
      const first = f.add(8, 0);
      assert.equal(f.queue.claim(owner)?.id, first.id);
      admin.exec('BEGIN IMMEDIATE');
      admin.prepare("INSERT INTO worker_maintenance(name,enabled) VALUES('default',1) ON CONFLICT(name) DO UPDATE SET enabled=excluded.enabled").run();
      admin.exec('COMMIT');
      assert.equal(f.queue.heartbeat(owner, first.id), true, 'active mission remains healthy during drain');
      const later = f.add(5, 0);
      f.queue.finish(owner, first.id, 'completed');
      f.queue.release(owner);
      assert.equal(f.queue.claim('b'.repeat(24)), null, 'drain prevents new claims');
      assert.equal(f.queue.get(later.id).status, 'queued', 'producers continue to enqueue during drain');
      admin.prepare("UPDATE worker_maintenance SET enabled=0 WHERE name='default'").run();
      assert.equal(f.queue.claim('b'.repeat(24))?.id, later.id, 'processing resumes after drain');
    } finally { admin.close(); f.close(); }
  });

  it('persists durable queue and selects only due jobs by priority', () => {
    const f = fixture(); try {
      const later = f.add(9, Date.now() + 60000);
      const low = f.add(1);
      const high = f.add(8);
      assert.equal(f.queue.list().length, 3);
      assert.equal(f.queue.claim(owner)?.id, high.id);
      f.queue.finish(owner, high.id, 'completed');
      f.queue.release(owner);
      assert.equal(f.queue.claim(owner)?.id, low.id);
      f.queue.finish(owner, low.id, 'completed');
      f.queue.release(owner);
      assert.equal(f.queue.claim(owner), null);
      f.queue.release(owner);
      assert.equal(f.queue.get(later.id).status, 'queued');
      const other = new MissionQueue(f.dir);
      assert.equal(other.list().length, 3, 'queue survives a new SQLite process connection');
      other.close();
    } finally { f.close(); }
  });
  it('records worker liveness while idle and during lease heartbeats', async () => {
    const f = fixture();
    try {
      assert.equal(f.queue.workerSeenAt(), null);
      const worker = new LocalQueueWorker(f.queue, async () => 'completed');
      assert.equal(await worker.tick(1_000_000), false, 'idle poll claims nothing');
      assert.equal(f.queue.workerSeenAt(), 1_000_000, 'an idle worker is still visible');
      const { listMissionViews, WORKER_STALE_MS } = await import('../web/mission-api.js');
      const { createEnvironmentContext } = await import('../core/context.js');
      const ctx = createEnvironmentContext({ homeDir: f.base });
      assert.equal(listMissionViews(ctx, 1_000_000 + WORKER_STALE_MS).worker.running, true);
      assert.equal(listMissionViews(ctx, 1_000_001 + WORKER_STALE_MS).worker.running, false);
      const { id } = f.add(5, 0);
      assert.ok(f.queue.claim(owner, 30000, 2_000_000));
      assert.equal(f.queue.heartbeat(owner, id, 2_005_000), true);
      assert.equal(f.queue.workerSeenAt(), 2_005_000, 'a long mission keeps the worker visible');
    } finally { f.close(); }
  });
  it('prevents a second worker from claiming the active slot', () => {
    const f = fixture(); try {
      f.add();
      assert.ok(f.queue.claim(owner));
      assert.equal(f.queue.claim('b'.repeat(24)), null);
      assert.equal(f.queue.heartbeat(owner, f.queue.list()[0]!.id), true);
      assert.equal(f.queue.heartbeat('b'.repeat(24), f.queue.list()[0]!.id), false);
      f.queue.release(owner);
    } finally { f.close(); }
  });
  it('refuses to renew an expired lease and quarantines it at the deadline', () => {
    const f = fixture(); try {
      const job = f.add(5, 0);
      const now = 2_000_000;
      assert.ok(f.queue.claim(owner, 10000, now));
      assert.equal(f.queue.heartbeat(owner, job.id, now + 10000, 10000), false);
      assert.equal(f.queue.get(job.id).leaseUntil, now + 10000);
      assert.equal(f.queue.claim('b'.repeat(24), 10000, now + 10000), null);
      assert.equal(f.queue.get(job.id).status, 'needs_review');
    } finally { f.close(); }
  });
  it('rejects completion by an expired owner before another worker claims it', () => {
    const f = fixture(); try {
      const job = f.add(5, 0);
      assert.ok(f.queue.claim(owner, 10000, Date.now() - 20000));
      assert.throws(() => f.queue.finish(owner, job.id, 'completed'), /ownership lost/);
      assert.throws(() => f.queue.waitForModel(owner, job.id), /ownership lost/);
      assert.equal(f.queue.get(job.id).status, 'running');
    } finally { f.close(); }
  });
  it('does not renew the global lock for the wrong job', () => {
    const f = fixture(); try {
      const job = f.add(5, 0);
      assert.ok(f.queue.claim(owner, 10000, 2_000_000));
      assert.equal(f.queue.heartbeat(owner, 'f'.repeat(24), 2_005_000, 10000), false);
      assert.equal(f.queue.get(job.id).leaseUntil, 2_010_000);
      assert.equal(f.queue.claim('b'.repeat(24), 10000, 2_010_000), null);
      assert.equal(f.queue.get(job.id).status, 'needs_review');
    } finally { f.close(); }
  });
  it('quarantines stale running jobs instead of replaying unknown side effects', () => {
    const f = fixture(); try {
      const job = f.add();
      const current = Date.now();
      assert.equal(f.queue.claim(owner, 10000, current)?.id, job.id);
      assert.equal(f.queue.claim('b'.repeat(24), 10000, current + 20000), null);
      assert.equal(f.queue.get(job.id).status, 'needs_review');
      assert.throws(() => f.queue.requeue(job.id, f.workspaceId, true), /Reconcile/);
      f.queue.requeue(job.id, f.workspaceId, false);
      assert.equal(f.queue.get(job.id).status, 'queued');
    } finally { f.close(); }
  });
  it('runs a single queued mission and records structured events without source contents', async () => {
    const f = fixture(); try {
      const job = f.add();
      let calls = 0;
      const log = path.join(f.dir, 'events.jsonl');
      const worker = new LocalQueueWorker(f.queue, async entry => {
        calls++;
        assert.equal(entry.missionId, job.state.id);
        return 'completed';
      }, log);
      assert.equal(await worker.tick(), true);
      assert.equal(calls, 1);
      assert.equal(f.queue.get(job.id).status, 'completed');
      assert.equal(await worker.tick(), false);
      const entries = fs.readFileSync(log, 'utf8').trim().split('\n').map(x => JSON.parse(x) as { event: string });
      assert.deepEqual(entries.map(x => x.event), ['started', 'finished']);
      assert.ok(!fs.readFileSync(log, 'utf8').includes('Inspect the repository'));
    } finally { f.close(); }
  });
  it('retains explicit advisory permissions in the existing queue format', () => {
    const f = fixture(); try {
      const state = f.store.create('Consult only after local stagnation', f.workspaceId);
      const original = f.queue.list();
      assert.equal(original.length, 0);
      const id = f.queue.add({
        missionId: state.id, workspace: path.join(f.base, 'project'), workspaceId: f.workspaceId,
        model: 'local', allowWrite: false, allowTests: false, allowMcp: [],
        delegate: 'codex', allowCloudSource: false, priority: 5, runAt: Date.now()
      });
      const queued = f.queue.get(id);
      assert.equal(queued.delegate, 'codex');
      assert.equal(queued.allowCloudSource, false);
      assert.equal(queued.status, 'queued');
      const forbidden = f.store.create('Reject unknown delegates', f.workspaceId);
      assert.throws(() => f.queue.add({
        missionId: forbidden.id, workspace: path.join(f.base, 'project'), workspaceId: f.workspaceId,
        model: 'local', allowWrite: false, allowTests: false, allowMcp: [],
        delegate: 'unapproved', priority: 5, runAt: Date.now()
      }), /Invalid durable/);
    } finally { f.close(); }
  });

  it('preserves workspace binding and refuses automatic retry of completed jobs', () => {
    const f = fixture(); try {
      const job = f.add();
      assert.throws(() => f.queue.cancel(job.id, hash('wrong')), /another workspace/);
      f.queue.cancel(job.id, f.workspaceId);
      assert.equal(f.queue.get(job.id).status, 'cancelled');
      assert.throws(() => f.queue.requeue(job.id, f.workspaceId), /cannot be requeued/);
    } finally { f.close(); }
  });
});
