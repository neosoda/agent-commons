import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
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
