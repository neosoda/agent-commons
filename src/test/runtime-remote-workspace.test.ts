import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { DEFAULT_LIMITS, MissionRunner, MissionStore, type ModelClient, type ToolRequest } from '../runtime/mission.js';
import { MissionQueue } from '../runtime/queue.js';
import { RemoteWorkspaceTools, openWorkspace } from '../runtime/remote-workspace.js';

/**
 * A stand-in for the DEV01 executor: same tool names and answer shape, files kept in
 * FAKE_ROOT, a "test" that passes when calc.js returns a + b. It records the workspace
 * it was told to use, so the binding can be checked.
 */
const FAKE_EXECUTOR = `
import fs from 'node:fs'; import path from 'node:path'; import readline from 'node:readline';
const root = process.env.FAKE_ROOT; const statePath = path.join(root, 'state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { revision: 0, workspaces: [] };
const save = () => fs.writeFileSync(statePath, JSON.stringify(state));
const answer = (result) => ({ content: [{ type: 'text', text: JSON.stringify({ ...result, revision: state.revision }) }], isError: false });
function tool(name, args) {
  state.workspaces.push(args.workspace); save();
  const file = (p) => path.join(root, 'tree', p);
  if (name === 'workspace_list_files') return answer({ ok: true, output: fs.readdirSync(file(args.path || '')).map(n => 'file ' + n).join('\\n') });
  if (name === 'workspace_read_file') return answer({ ok: true, output: fs.readFileSync(file(args.path), 'utf8') });
  if (name === 'workspace_write_file') {
    if (!args.path.startsWith('src/')) return answer({ ok: false, output: 'Path is outside the writable scope of this repository' });
    fs.writeFileSync(file(args.path), args.content); state.revision++; save();
    return answer({ ok: true, changed: true, output: 'Workspace file changed (not committed)' });
  }
  if (name === 'workspace_verify') {
    if (args.check === 'diff') return answer({ ok: true, passed: true, output: 'diff: passed' });
    const passed = fs.readFileSync(file('src/calc.js'), 'utf8').includes('a + b');
    return answer({ ok: true, passed, tested: passed, output: passed ? 'test: passed' : 'test: failed (exit 1)\\n' + 'x'.repeat(900) });
  }
}
const names = ['workspace_list_files', 'workspace_read_file', 'workspace_write_file', 'workspace_verify'];
readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line); if (m.id === undefined) return;
  const result = m.method === 'initialize' ? { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'fake', version: '1' } }
    : m.method === 'tools/list' ? { tools: names.map(name => ({ name, inputSchema: { type: 'object' } })) }
    : tool(m.params.name, m.params.arguments);
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result }) + '\\n');
});`;

const LABEL = 'mcp:dev01-exec/w-0123456789ab';

function fixture(serverCommand?: { command: string; args: string[] }) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-remote-'));
  const root = path.join(home, 'remote');
  fs.mkdirSync(path.join(root, 'tree', 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tree', 'src', 'calc.js'), 'export const add = (a, b) => a - b;\n');
  const script = path.join(home, 'fake-executor.mjs');
  fs.writeFileSync(script, FAKE_EXECUTOR);
  const ctx = createEnvironmentContext({ homeDir: home });
  const spec = serverCommand ?? { command: process.execPath, args: [script] };
  fs.mkdirSync(path.dirname(ctx.centralMcpPath), { recursive: true });
  fs.writeFileSync(ctx.centralMcpPath, JSON.stringify({ mcpServers: { 'dev01-exec': { ...spec, env: { FAKE_ROOT: root } } } }));
  const remoteState = () => JSON.parse(fs.readFileSync(path.join(root, 'state.json'), 'utf8')) as { revision: number; workspaces: string[] };
  return { home, root, ctx, remoteState, store: new MissionStore(path.join(home, 'missions')),
    cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}

const call = (name: ToolRequest['name'], args: Record<string, unknown>) => ({ call: { name, arguments: args } });
const scripted = (turns: Array<Record<string, unknown>>): ModelClient => ({ next: async () => turns.shift() ?? { finish: 'done' } });
const limits = { ...DEFAULT_LIMITS, maxSteps: 12, maxDurationMs: 60000 };

describe('remote workspaces held by an executor such as DEV01', () => {
  it('resolves local paths and remote labels, and refuses unknown executors', () => {
    const f = fixture(); try {
      const remote = openWorkspace(f.ctx, LABEL, true, true);
      assert.equal(remote.remote, true);
      assert.equal(remote.label, LABEL);
      assert.match(remote.tools.workspaceId, /^[a-f0-9]{64}$/);
      assert.throws(() => openWorkspace(f.ctx, 'mcp:other/w-0123456789ab', true, true), /Unknown or disabled remote executor/);
      // Anything that is not exactly a remote label is a local path, which must be a checkout.
      assert.throws(() => openWorkspace(f.ctx, 'mcp:dev01-exec/w-0123456789ab/../x', true, true));
      assert.throws(() => new RemoteWorkspaceTools({ url: 'https://x' }, LABEL, true, true), /stdio executor/);
    } finally { f.cleanup(); }
  });

  it('binds every call to its workspace and keeps permission checks local', async () => {
    const f = fixture(); try {
      const readOnly = openWorkspace(f.ctx, LABEL, false, false).tools;
      const write = await readOnly.execute({ name: 'write_file', arguments: { path: 'src/calc.js', content: 'x' } });
      assert.deepEqual([write.ok, write.output], [false, 'Writes require --allow-write']);
      const test = await readOnly.execute({ name: 'verify', arguments: { check: 'test' } });
      assert.equal(test.output, 'Project scripts require --allow-tests');
      const redirected = await readOnly.execute({ name: 'read_file', arguments: { path: 'src/calc.js', workspace: 'w-ffffffffffff' } });
      assert.deepEqual([redirected.ok, redirected.output], [false, 'Unexpected argument']);
      const unknown = await readOnly.execute({ name: 'mcp_call' as ToolRequest['name'], arguments: {} });
      assert.equal(unknown.ok, false);
      const read = await readOnly.execute({ name: 'read_file', arguments: { path: 'src/calc.js' } });
      assert.equal(read.ok, true);
      assert.deepEqual(f.remoteState().workspaces, ['w-0123456789ab']);
    } finally { f.cleanup(); }
  });

  it('keeps outputs longer than the 500 characters of an ordinary MCP call', async () => {
    const f = fixture(); try {
      const tools = openWorkspace(f.ctx, LABEL, true, true).tools;
      const failed = await tools.execute({ name: 'verify', arguments: { check: 'test' } });
      assert.equal(failed.ok, true);
      assert.equal(failed.tested, false);
      assert.equal(failed.progress, false);
      assert.ok(failed.output.length > 800);
    } finally { f.cleanup(); }
  });

  it('completes a mission only after a passing test on the remote tree', async () => {
    const f = fixture(); try {
      const tools = openWorkspace(f.ctx, LABEL, true, true).tools;
      const model = scripted([
        call('list_files', { path: 'src' }),
        call('read_file', { path: 'src/calc.js' }),
        call('verify', { check: 'test' }),
        call('write_file', { path: 'src/calc.js', content: 'export const add = (a, b) => a + b;\n' }),
        call('verify', { check: 'test' }),
        { finish: 'Fixed add and the test passes' }
      ]);
      const state = f.store.create('Fix add in src/calc.js', tools.workspaceId);
      const result = await new MissionRunner(f.store, model, tools, limits).run(state);
      assert.equal(result.status, 'completed', result.reason);
      assert.equal(result.changed, true);
      assert.equal(result.tested, true);
      assert.equal(f.remoteState().revision, 1);
    } finally { f.cleanup(); }
  });

  it('reports a change without a passing test as partial', async () => {
    const f = fixture(); try {
      const tools = openWorkspace(f.ctx, LABEL, true, true).tools;
      const model = scripted([
        call('read_file', { path: 'src/calc.js' }),
        call('write_file', { path: 'src/calc.js', content: 'export const add = (a, b) => a * b;\n' }),
        call('verify', { check: 'test' }),
        { finish: 'Done' }
      ]);
      const result = await new MissionRunner(f.store, model, tools, limits).run(f.store.create('Fix add', tools.workspaceId));
      assert.equal(result.status, 'partial');
    } finally { f.cleanup(); }
  });

  it('stops for reconciliation when the executor cannot be reached during a write', async () => {
    const f = fixture({ command: process.execPath, args: ['-e', 'process.exit(3)'] }); try {
      const tools = openWorkspace(f.ctx, LABEL, true, true).tools;
      const unreachable = await tools.execute({ name: 'read_file', arguments: { path: 'src/calc.js' } });
      assert.equal(unreachable.ok, false);
      assert.match(unreachable.output, /unavailable/);
      const model = scripted([call('write_file', { path: 'src/calc.js', content: 'x' })]);
      const result = await new MissionRunner(f.store, model, tools, limits).run(f.store.create('Fix add', tools.workspaceId));
      assert.equal(result.status, 'needs_approval');
      assert.ok(result.pendingAction);
    } finally { f.cleanup(); }
  });

  it('queues remote workspaces and still refuses other non-absolute names', () => {
    const f = fixture(); try {
      const queue = new MissionQueue(path.join(f.home, '.agents'));
      try {
        const tools = openWorkspace(f.ctx, LABEL, true, true).tools;
        const state = f.store.create('Fix add', tools.workspaceId);
        const entry = { missionId: state.id, workspaceId: tools.workspaceId, model: 'm', allowWrite: true,
          allowTests: true, allowMcp: [], priority: 5, runAt: Date.now() };
        const id = queue.add({ ...entry, workspace: LABEL });
        assert.equal(queue.get(id).workspace, LABEL);
        for (const workspace of ['relative/path', 'mcp:dev01-exec/../etc', 'mcp:dev01-exec/w-xyz']) {
          const other = f.store.create('Other', tools.workspaceId);
          assert.throws(() => queue.add({ ...entry, missionId: other.id, workspace }));
        }
      } finally { queue.close(); }
    } finally { f.cleanup(); }
  });
});
