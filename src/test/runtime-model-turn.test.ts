import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { DEFAULT_LIMITS, MissionRunner, MissionStore, describeCall, type ModelClient } from '../runtime/mission.js';
import { OpenAICompatibleModel } from '../runtime/provider.js';
import { WorkspaceTools } from '../runtime/workspace.js';

async function serve(message: Record<string, unknown>) {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message }], usage: { total_tokens: 7 } }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  return { model: new OpenAICompatibleModel({ url: `http://127.0.0.1:${port}/v1/chat/completions`, model: 'm' }),
    close: () => new Promise(resolve => server.close(resolve)) };
}

const fn = (name: string, args: unknown) => ({ function: { name, arguments: JSON.stringify(args) } });

describe('model turns for small local models', () => {
  it('runs only the first of several proposed tool calls', async () => {
    const s = await serve({ tool_calls: [fn('read_file', { path: 'a.ts' }), fn('read_file', { path: 'b.ts' })] });
    try {
      const turn = await s.model.next({ goal: 'g', observations: [] });
      assert.deepEqual(turn.call, { name: 'read_file', arguments: { path: 'a.ts' } });
    } finally { await s.close(); }
  });

  it('still refuses an empty tool call list and invalid arguments', async () => {
    for (const message of [{ tool_calls: [], content: 'thinking' }, { tool_calls: [{ function: { name: 'read_file', arguments: '{' } }] }]) {
      const s = await serve(message);
      try { assert.equal((await s.model.next({ goal: 'g', observations: [] })).call, undefined); }
      finally { await s.close(); }
    }
  });

  it('names each call in the history the model sees, without written content', async () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-turn-'));
    try {
      const project = path.join(home, 'project');
      fs.mkdirSync(path.join(project, '.git'), { recursive: true });
      fs.writeFileSync(path.join(project, 'a.ts'), 'export const a = 1;\n');
      const seen: string[][] = [];
      const turns = [
        { call: { name: 'read_file' as const, arguments: { path: 'a.ts' } } },
        { call: { name: 'write_file' as const, arguments: { path: 'a.ts', content: 'SECRET_BODY = 2;\n' } } },
        { finish: 'done' }
      ];
      const model: ModelClient = { next: async (input) => { seen.push(input.observations); return turns.shift()!; } };
      const store = new MissionStore(path.join(home, 'missions'));
      const tools = new WorkspaceTools(project, true, false);
      await new MissionRunner(store, model, tools, { ...DEFAULT_LIMITS, maxSteps: 5 }).run(store.create('Edit a.ts', tools.workspaceId));
      const history = seen.at(-1)!.join('\n');
      assert.match(history, /read_file \{"path":"a\.ts"\}: ok/);
      assert.match(history, /write_file \{"path":"a\.ts","content":"<17 bytes>"\}: ok/);
      assert.equal(history.includes('SECRET_BODY'), false);
    } finally { fs.rmSync(home, { recursive: true, force: true }); }
  });

  it('bounds the description of a call', () => {
    assert.equal(describeCall('read_file', { path: 'x'.repeat(500) }).length, 200);
    assert.equal(describeCall('verify', undefined), '{}');
  });
});
