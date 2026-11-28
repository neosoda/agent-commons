import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { probeMcpServer } from '../mcp/health.js';
import { MissionRunner, MissionStore, DEFAULT_LIMITS, type ModelClient, type ToolExecutor,
  type ToolResult } from '../runtime/mission.js';
import { MissionQueue } from '../runtime/queue.js';
import { LocalQueueWorker } from '../runtime/worker.js';
import { WorkspaceTools } from '../runtime/workspace.js';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const workspaceId = crypto.createHash('sha256').update('containment').digest('hex');

function temporary() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-contain-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }) };
}

/** A grandchild that ignores SIGTERM and keeps appending: the effect that must stop. */
function writeEffect(dir: string): { script: string; log: string } {
  const log = path.join(dir, 'effect.log');
  const script = path.join(dir, 'effect.mjs');
  fs.writeFileSync(script, `
    import fs from 'node:fs';
    process.on('SIGTERM', () => {});
    setInterval(() => fs.appendFileSync(${JSON.stringify(log)}, 'x'), 50);
    setTimeout(() => process.exit(0), 60000);`);
  return { script, log };
}

async function waitFor(condition: () => boolean, ms = 15000): Promise<void> {
  const end = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > end) throw new Error('condition not reached');
    await sleep(50);
  }
}

async function assertEffectStopped(log: string): Promise<void> {
  await sleep(300);
  const size = fs.statSync(log).size;
  await sleep(600);
  assert.equal(fs.statSync(log).size, size, 'the grandchild is still producing effects');
}

const writeCall = { call: { name: 'write_file' as const, arguments: { path: 'a.txt', content: 'x' } } };
const oneWrite: ModelClient = { next: async () => writeCall };

/** An effectful tool that only returns once it is told to stop. */
function hangingTool() {
  const seen = { dispatched: 0, aborted: false };
  const tools: ToolExecutor = {
    execute: (_call, signal) => new Promise<ToolResult>(resolve => {
      seen.dispatched++;
      const end = () => { seen.aborted = true; resolve({ ok: false, progress: false, output: 'stopped' }); };
      if (signal?.aborted) end(); else signal?.addEventListener('abort', end, { once: true });
    })
  };
  return { seen, tools };
}

describe('tool containment on lost authority', () => {
  it('stops a running MCP call and its grandchild when aborted', async () => {
    const t = temporary();
    try {
      const effect = writeEffect(t.dir);
      const server = path.join(t.dir, 'server.mjs');
      fs.writeFileSync(server, `
        import { spawn } from 'node:child_process';
        import readline from 'node:readline';
        readline.createInterface({ input: process.stdin }).on('line', line => {
          const m = JSON.parse(line);
          if (m.id === undefined) return;
          if (m.method === 'tools/call') { spawn(process.execPath, [${JSON.stringify(effect.script)}], { stdio: 'ignore' }); return; }
          const result = m.method === 'tools/list' ? { tools: [{ name: 'slow' }] }
            : { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'slow', version: '1' } };
          process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result }) + '\\n');
        });`);
      const abort = new AbortController();
      const pending = probeMcpServer({ command: process.execPath, args: [server] },
        { callTool: 'slow', timeoutMs: 30000, signal: abort.signal });
      await waitFor(() => fs.existsSync(effect.log));
      const started = Date.now();
      abort.abort();
      const report = await pending;
      assert.equal(report.ok, false);
      assert.equal(report.stage, 'tools/call');
      assert.ok(Date.now() - started < 10000, 'abort must not wait for the call timeout');
      await assertEffectStopped(effect.log);
    } finally { t.cleanup(); }
  });

  it('stops a project script and its grandchild when verification is aborted', async () => {
    const t = temporary();
    try {
      fs.mkdirSync(path.join(t.dir, '.git'));
      const effect = writeEffect(t.dir);
      fs.writeFileSync(path.join(t.dir, 'runner.mjs'), `
        import { spawn } from 'node:child_process';
        spawn(process.execPath, [${JSON.stringify(effect.script)}], { stdio: 'inherit' });
        setInterval(() => {}, 1000);`);
      fs.writeFileSync(path.join(t.dir, 'package.json'), JSON.stringify({ scripts: { test: 'node runner.mjs' } }));
      const abort = new AbortController();
      const pending = new WorkspaceTools(t.dir, false, true)
        .execute({ name: 'verify', arguments: { check: 'test' } }, abort.signal);
      await waitFor(() => fs.existsSync(effect.log), 30000);
      const started = Date.now();
      abort.abort();
      const result = await pending;
      assert.equal(result.ok, false);
      assert.ok(Date.now() - started < 15000, 'abort must not wait for the script');
      await assertEffectStopped(effect.log);
    } finally { t.cleanup(); }
  });

  it('refuses to dispatch when authority is already lost', async () => {
    const t = temporary();
    try {
      const store = new MissionStore(t.dir);
      const { seen, tools } = hangingTool();
      const result = await new MissionRunner(store, oneWrite, tools, DEFAULT_LIMITS, undefined, false,
        { control: { authorize: () => false } }).run(store.create('Write once', workspaceId));
      assert.equal(result.status, 'blocked');
      assert.match(result.reason, /before tool dispatch/);
      assert.equal(seen.dispatched, 0);
      assert.equal(result.pendingAction, undefined, 'nothing was started, nothing to reconcile');
    } finally { t.cleanup(); }
  });

  it('interrupts an effectful tool on lost authority and never replays it', async () => {
    const t = temporary();
    try {
      const store = new MissionStore(t.dir);
      const { seen, tools } = hangingTool();
      const revoked = new AbortController();
      const runner = new MissionRunner(store, oneWrite, tools, DEFAULT_LIMITS, undefined, false,
        { control: { signal: revoked.signal } });
      const running = runner.run(store.create('Write once', workspaceId));
      await waitFor(() => seen.dispatched === 1);
      revoked.abort();
      const result = await running;
      assert.equal(seen.aborted, true);
      assert.equal(result.status, 'needs_approval');
      assert.equal(result.pendingAction?.name, 'write_file');
      const resumed = await new MissionRunner(store, oneWrite, tools).run(result);
      assert.equal(resumed.status, 'needs_approval');
      assert.equal(seen.dispatched, 1, 'an uncertain effect is not dispatched again');
    } finally { t.cleanup(); }
  });

  it('cancels a tool that is already running when the operator asks', async () => {
    const t = temporary();
    try {
      const store = new MissionStore(t.dir);
      const { seen, tools } = hangingTool();
      const state = store.create('Write once', workspaceId);
      const running = new MissionRunner(store, oneWrite, tools, DEFAULT_LIMITS, undefined, false,
        { controlPollMs: 25 }).run(state);
      await waitFor(() => seen.dispatched === 1);
      store.requestControl(state.id, workspaceId, 'cancel');
      const result = await running;
      assert.equal(seen.aborted, true);
      assert.equal(result.status, 'cancelled');
      assert.match(result.reason, /must be reconciled/);
      assert.equal(result.pendingAction?.name, 'write_file');
    } finally { t.cleanup(); }
  });

  it('aborts the running mission when the worker loses its queue lease', async () => {
    const t = temporary();
    const queue = new MissionQueue(t.dir);
    try {
      queue.add({ missionId: 'a'.repeat(24), workspace: t.dir, workspaceId, model: 'test-local',
        allowWrite: false, allowTests: false, allowMcp: [], priority: 5, runAt: Date.now() });
      let aborted = false;
      let allowedBefore = false;
      let allowedAfter = true;
      const worker: LocalQueueWorker = new LocalQueueWorker(queue, async (_job, lease) => {
        allowedBefore = lease.authorize!();
        queue.release(worker.owner); // another holder or an expired lease: renewal now fails
        await new Promise<void>(resolve => lease.signal!.addEventListener('abort', () => resolve(), { once: true }));
        aborted = true;
        allowedAfter = lease.authorize!();
        return 'completed';
      }, undefined, 50);
      // The lease heartbeat is unref'd: keep the test process alive while waiting for it.
      const keepAlive = setInterval(() => {}, 100);
      try { await assert.rejects(worker.tick(), /lease lost/); } finally { clearInterval(keepAlive); }
      assert.deepEqual([allowedBefore, aborted, allowedAfter], [true, true, false]);
      assert.notEqual(queue.list()[0]!.status, 'completed', 'a result is never recorded without the lease');
    } finally { queue.close(); t.cleanup(); }
  });
});
