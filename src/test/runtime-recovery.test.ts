import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { MissionStore, MissionRunner, DEFAULT_LIMITS } from '../runtime/mission.js';
import { OpenAICompatibleModel } from '../runtime/provider.js';
import { MissionQueue } from '../runtime/queue.js';
import { LocalQueueWorker } from '../runtime/worker.js';
import { WorkspaceTools } from '../runtime/workspace.js';

it('persists a mission across model outage and worker restart without replaying an inspection', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-recovery-'));
  const workspace = path.join(base, 'project');
  fs.mkdirSync(workspace); fs.mkdirSync(path.join(workspace, '.git'));
  fs.writeFileSync(path.join(workspace, 'file.txt'), 'verified content');
  const tools = new WorkspaceTools(workspace, false, false);
  const store = new MissionStore(path.join(base, 'state', 'missions'));
  const state = store.create('Inspect file and report', tools.workspaceId);
  let request = 0;
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += String(chunk);
    const body = JSON.parse(raw) as { tools: Array<{ function: { name: string } }>; messages: Array<{ content: string }> };
    assert.equal(req.headers.authorization, 'Bearer test-token');
    assert.ok(body.tools.some(item => item.function.name === 'mcp_call'));
    assert.match(body.messages[1]!.content, /approved\/read/);
    request++;
    if (request === 2) { res.writeHead(503); res.end(); return; }
    const call = request === 1 ? { name: 'read_file', arguments: JSON.stringify({ path: 'file.txt' }) } :
      { name: 'finish', arguments: JSON.stringify({ summary: 'Inspection completed' }) };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: call }] } }], usage: { total_tokens: 12 } }));
  });
  let queue: MissionQueue | undefined;
  try {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const model = new OpenAICompatibleModel({ url: `http://127.0.0.1:${address.port}/v1/chat/completions`, model: 'fixture', apiKey: 'test-token' });
    queue = new MissionQueue(path.join(base, 'state'));
    const id = queue.add({ missionId: state.id, workspace, workspaceId: tools.workspaceId, model: 'fixture',
      allowWrite: false, allowTests: false, allowMcp: ['approved/read'], priority: 5, runAt: 0 });
    const run = async () => new MissionRunner(store, model, tools, DEFAULT_LIMITS, undefined, false,
      { skillIds: ['selected-skill'], guidance: 'Selected skill guidance', mcpTools: ['approved/read'] })
      .run(store.load(state.id, tools.workspaceId)).then(result => result.status);
    await new LocalQueueWorker(queue, run).tick();
    const waiting = queue.get(id);
    assert.equal(waiting.status, 'waiting_for_model');
    assert.equal(store.load(state.id).calls, 1);
    assert.equal(store.load(state.id).tokens, 12);
    assert.equal(store.load(state.id).modelUnavailableCount, 1);
    assert.equal(store.load(state.id).steps, 1);
    queue.close();
    queue = new MissionQueue(path.join(base, 'state'));
    assert.equal(await new LocalQueueWorker(queue, run).tick(waiting.runAt), true);
    const result = store.load(state.id, tools.workspaceId);
    assert.equal(queue.get(id).status, 'completed');
    assert.equal(result.status, 'completed');
    assert.equal(result.calls, 1);
    assert.equal(result.tokens, 24);
    assert.deepEqual(result.skillIds, ['selected-skill']);
    assert.equal(request, 3);
  } finally {
    queue?.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
    fs.rmSync(base, { recursive: true, force: true });
  }
});

it('requires authenticated TLS for remote providers and rejects credentials in URLs', () => {
  assert.throws(() => new OpenAICompatibleModel({ url: 'http://192.0.2.1/v1/chat/completions', model: 'x', apiKey: 'x' }), /HTTPS/);
  assert.throws(() => new OpenAICompatibleModel({ url: 'https://192.0.2.1/v1/chat/completions', model: 'x' }), /authentication/);
  assert.throws(() => new OpenAICompatibleModel({ url: 'https://user:pass@example.test/v1/chat/completions', model: 'x', apiKey: 'x' }), /Invalid/);
});


it('resumes a checkpoint after the runner process is killed between model turns', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-process-'));
  const root = path.join(base, 'project');
  fs.mkdirSync(root); fs.mkdirSync(path.join(root, '.git'));
  fs.writeFileSync(path.join(root, 'file.txt'), 'evidence');
  const workspace = new WorkspaceTools(root, false, false);
  const store = new MissionStore(path.join(base, 'missions'));
  const state = store.create('Inspect and report', workspace.workspaceId);
  const missionModule = new URL('../runtime/mission.js', import.meta.url).href;
  const workspaceModule = new URL('../runtime/workspace.js', import.meta.url).href;
  const program = `
    import { MissionStore, MissionRunner } from ${JSON.stringify(missionModule)};
    import { WorkspaceTools } from ${JSON.stringify(workspaceModule)};
    const [base, root, id, mode] = process.argv.slice(1);
    const tools = new WorkspaceTools(root, false, false);
    const store = new MissionStore(base);
    let turns = 0;
    const model = { next: async () => {
      if (mode === 'resume') return { finish: 'Inspection completed' };
      if (++turns === 1) return { call: { name: 'read_file', arguments: { path: 'file.txt' } } };
      process.send('checkpointed');
      return await new Promise(() => {});
    }};
    const result = await new MissionRunner(store, model, tools).run(store.load(id, tools.workspaceId));
    process.send({ status: result.status });
  `;
  try {
    const first = spawn(process.execPath, ['--input-type=module', '-e', program, store.base, root, state.id, 'first'],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const event = await new Promise<unknown>((resolve, reject) => {
      first.once('message', resolve); first.once('error', reject);
      first.once('exit', () => reject(new Error('Runner exited before checkpoint')));
    });
    assert.equal(event, 'checkpointed');
    const stopped = new Promise<void>(resolve => first.once('exit', () => resolve()));
    first.kill(); await stopped;
    assert.equal(store.load(state.id, workspace.workspaceId).calls, 1);
    const second = spawn(process.execPath, ['--input-type=module', '-e', program, store.base, root, state.id, 'resume'],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    const resumed = await new Promise<unknown>((resolve, reject) => {
      second.once('message', resolve); second.once('error', reject);
      second.once('exit', () => reject(new Error('Runner exited before resume')));
    });
    assert.deepEqual(resumed, { status: 'completed' });
    await new Promise<void>(resolve => second.once('exit', () => resolve()));
    assert.equal(store.load(state.id).calls, 1);
  } finally { fs.rmSync(base, { recursive: true, force: true }); }
});
