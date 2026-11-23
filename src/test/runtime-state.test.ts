import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { MissionRunner, MissionStore, DEFAULT_LIMITS, type ModelClient, type ToolExecutor } from '../runtime/mission.js';
import { WorkspaceTools } from '../runtime/workspace.js';

const limits = { ...DEFAULT_LIMITS, maxSteps: 10, maxDurationMs: 60000 };
function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-state-'));
  const root = path.join(home, 'project'); fs.mkdirSync(path.join(root, '.git'), { recursive: true });
  fs.writeFileSync(path.join(root, 'a.ts'), 'export const a = 1;\n');
  const workspace = new WorkspaceTools(root, true, false);
  const store = new MissionStore(path.join(home, 'missions'));
  return { home, root, workspace, store, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

describe('P2 persistent lifecycle and interrupted side effects', () => {
  it('persists a real local plan once, but does not count it as completion evidence', async () => {
    const f = fixture(); try {
      let planned = 0;
      const model: ModelClient = {
        plan: async () => { planned++; return { steps: ['Inspect the file', 'Verify results'], tokens: 15 }; },
        next: async () => ({ finish: 'All done' })
      };
      const state = f.store.create('Review code', f.workspace.workspaceId);
      assert.equal(state.status, 'queued');
      const first = await new MissionRunner(f.store, model, f.workspace, limits, undefined, false, { plan: true }).run(state);
      assert.equal(first.status, 'blocked');
      assert.deepEqual(first.plan, ['Inspect the file', 'Verify results']);
      assert.equal(first.tokens, 15);
      assert.equal(planned, 1);
      const second = await new MissionRunner(f.store, model, f.workspace, limits, undefined, false, { plan: true })
        .run(f.store.load(state.id, f.workspace.workspaceId));
      assert.equal(second.status, 'blocked');
      assert.equal(planned, 1, 'plan is reused across resumptions');
    } finally { f.cleanup(); }
  });

  it('cooperatively pauses and resumes while retaining verified inspection', async () => {
    const f = fixture(); try {
      const state = f.store.create('Inspect code', f.workspace.workspaceId);
      let calls = 0;
      const model: ModelClient = { next: async () => {
        calls++;
        if (calls === 1) {
          f.store.requestControl(state.id, f.workspace.workspaceId, 'pause');
          return { call: { name: 'read_file', arguments: { path: 'a.ts' } } };
        }
        return { finish: 'Inspected' };
      } };
      const paused = await new MissionRunner(f.store, model, f.workspace, limits).run(state);
      assert.equal(paused.status, 'paused');
      assert.equal(paused.calls, 1);
      assert.equal(paused.evidence, 1);
      assert.equal(f.store.readControl(state.id), null);
      const resumed = await new MissionRunner(f.store, model, f.workspace, limits)
        .run(f.store.load(state.id, f.workspace.workspaceId));
      assert.equal(resumed.status, 'completed');
      assert.equal(resumed.calls, 1);
    } finally { f.cleanup(); }
  });

  it('honors cancellation before executing any action', async () => {
    const f = fixture(); try {
      const state = f.store.create('Inspect code', f.workspace.workspaceId);
      f.store.requestControl(state.id, f.workspace.workspaceId, 'cancel');
      let called = false;
      const model: ModelClient = { next: async () => { called = true; return { finish: 'done' }; } };
      const result = await new MissionRunner(f.store, model, f.workspace, limits).run(state);
      assert.equal(result.status, 'cancelled');
      assert.equal(called, false);
      const again = await new MissionRunner(f.store, model, f.workspace, limits)
        .run(f.store.load(state.id, f.workspace.workspaceId));
      assert.equal(again.status, 'cancelled');
    } finally { f.cleanup(); }
  });

  it('never replays a write with an uncertain crash outcome without operator reconciliation', async () => {
    const f = fixture(); try {
      const state = f.store.create('Modify file', f.workspace.workspaceId);
      let writes = 0;
      const unsafe: ToolExecutor = { execute: async (call) => {
        if (call.name === 'write_file') {
          writes++;
          fs.writeFileSync(path.join(f.root, 'a.ts'), 'export const a = 2;\n');
          throw new Error('Simulated crash after write');
        }
        return f.workspace.execute(call);
      } };
      const turns = [
        { call: { name: 'read_file' as const, arguments: { path: 'a.ts' } } },
        { call: { name: 'write_file' as const, arguments: { path: 'a.ts', content: 'export const a = 2;\n' } } }
      ];
      const model: ModelClient = { next: async () => turns.shift() ?? { finish: 'done' } };
      const first = await new MissionRunner(f.store, model, unsafe, limits).run(state);
      assert.equal(first.status, 'needs_approval');
      assert.equal(first.pendingAction?.name, 'write_file');
      assert.equal(writes, 1);
      const resumed = await new MissionRunner(f.store, model, unsafe, limits)
        .run(f.store.load(state.id, f.workspace.workspaceId));
      assert.equal(resumed.status, 'needs_approval');
      assert.equal(writes, 1, 'uncertain write cannot replay automatically');
      const reconciled = f.store.acknowledgePending(state.id, f.workspace.workspaceId);
      assert.equal(reconciled.pendingAction, undefined);
      assert.equal(reconciled.changed, true);
      assert.equal(reconciled.tested, false);
      const final = await new MissionRunner(f.store, model, unsafe, limits).run(reconciled);
      assert.equal(final.status, 'partial', 'reconciled edit still requires a successful test');
    } finally { f.cleanup(); }
  });

  it('does not execute a queued write after cancellation arrives during model inference', async () => {
    const f = fixture(); try {
      const state = f.store.create('Cancel before the model can write', f.workspace.workspaceId);
      let executed = 0;
      const tools: ToolExecutor = { execute: async request => {
        executed++;
        return f.workspace.execute(request);
      } };
      const model: ModelClient = { next: async () => {
        f.store.requestControl(state.id, f.workspace.workspaceId, 'cancel');
        return { call: { name: 'write_file', arguments: { path: 'a.ts', content: 'export const a = 99;\n' } } };
      } };
      const result = await new MissionRunner(f.store, model, tools, limits).run(state);
      assert.equal(result.status, 'cancelled');
      assert.equal(result.calls, 0, 'an action returned after cancellation must not count or execute');
      assert.equal(result.pendingAction, undefined);
      assert.equal(executed, 0);
      assert.equal(f.store.load(state.id, f.workspace.workspaceId).status, 'cancelled');
      assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 1;\n');
    } finally { f.cleanup(); }
  });

  it('pauses before a late model write and resumes from the clean checkpoint', async () => {
    const f = fixture(); try {
      const state = f.store.create('Pause before the model can write', f.workspace.workspaceId);
      let turns = 0;
      const model: ModelClient = { next: async () => {
        turns++;
        if (turns === 1) {
          f.store.requestControl(state.id, f.workspace.workspaceId, 'pause');
          return { call: { name: 'write_file', arguments: { path: 'a.ts', content: 'export const a = 99;\n' } } };
        }
        if (turns === 2) return { call: { name: 'read_file', arguments: { path: 'a.ts' } } };
        return { finish: 'Inspected after resumption' };
      } };
      const paused = await new MissionRunner(f.store, model, f.workspace, limits).run(state);
      assert.equal(paused.status, 'paused');
      assert.equal(paused.calls, 0);
      assert.equal(paused.pendingAction, undefined);
      assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 1;\n');
      const resumed = await new MissionRunner(f.store, model, f.workspace, limits)
        .run(f.store.load(state.id, f.workspace.workspaceId));
      assert.equal(resumed.status, 'completed');
      assert.equal(resumed.calls, 1);
      assert.equal(resumed.inspected, true);
      assert.equal(fs.readFileSync(path.join(f.root, 'a.ts'), 'utf8'), 'export const a = 1;\n');
    } finally { f.cleanup(); }
  });
});
