import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { DelegatedCliAdvisor, loadDelegate } from '../runtime/delegate.js';
import { MissionRunner, MissionStore, DEFAULT_LIMITS, type ModelClient } from '../runtime/mission.js';
import { WorkspaceTools } from '../runtime/workspace.js';

function fixture(body?: string) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-delegates-'));
  const ctx = createEnvironmentContext({ homeDir: home });
  fs.mkdirSync(ctx.commonsDir, { recursive: true });
  const script = path.join(home, 'advisor.js');
  fs.writeFileSync(script, body ?? [
    "let input='';",
    "process.stdin.on('data',c=>input+=c.toString());",
    "process.stdin.on('end',()=>process.stdout.write('Inspect the failing assertion before retrying.'));"
  ].join('\n'));
  const config = {
    version: 1, delegates: { codex: {
      command: process.execPath, args: [script], readOnlyAdvice: true, timeoutMs: 5000
    } }
  };
  fs.writeFileSync(path.join(ctx.commonsDir, 'delegates.json'), JSON.stringify(config));
  const repo = path.join(home, 'repo'); fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  fs.writeFileSync(path.join(repo, 'a.ts'), 'const answer = 42;');
  return { ctx, home, repo, config, cleanup: () => fs.rmSync(home, { recursive: true, force: true }) };
}
describe('P6 explicit local-first multi-CLI advice', () => {
  it('requires an approved manifest, recognized client and real executable', () => {
    const f = fixture(); try {
      const spec = loadDelegate(f.ctx, 'codex');
      assert.equal(spec.readOnlyAdvice, true);
      assert.equal(spec.command, process.execPath);
      assert.throws(() => loadDelegate(f.ctx, 'unknown'), /Unsupported/);
      fs.writeFileSync(path.join(f.ctx.commonsDir, 'delegates.json'),
        JSON.stringify({ version: 1, delegates: { codex: { command: 'node', args: [] } } }));
      assert.throws(() => loadDelegate(f.ctx, 'codex'), /explicitly configured/);
    } finally { f.cleanup(); }
  });
  it('runs a real isolated advisory subprocess without fabricating token usage', async () => {
    const f = fixture(); try {
      const cli = new DelegatedCliAdvisor('codex', loadDelegate(f.ctx, 'codex'));
      const result = await cli.advise({ goal: 'Explain assertion failure', observations: ['Test failed'] });
      assert.match(result.text, /Inspect the failing assertion/);
      assert.equal(result.tokens, undefined);
      await assert.rejects(cli.next(), /cannot execute local mission steps/);
      await assert.rejects(cli.advise({
        goal: 'Explain ' + String.fromCharCode(96).repeat(3) + ' private code',
        observations: []
      }), /private source/);
    } finally { f.cleanup(); }
  });
  it('consults CLI once after local stagnation and returns control to the local model', async () => {
    const f = fixture(); try {
      const workspace = new WorkspaceTools(f.repo, false, false);
      const store = new MissionStore(path.join(f.home, 'missions'));
      const scripted = [
        { call: { name: 'list_files' as const, arguments: {} } },
        { text: 'Unable to proceed' }, { text: 'Still stuck' },
        { text: 'Third consecutive unproductive turn' },
        { finish: 'Re-examined the issue after advice' }
      ];
      let localCalls = 0;
      const model: ModelClient = { next: async () => { localCalls++; return scripted.shift() ?? { finish: 'done' }; } };
      const advisor = new DelegatedCliAdvisor('codex', loadDelegate(f.ctx, 'codex'));
      const result = await new MissionRunner(
        store, model, workspace,
        { ...DEFAULT_LIMITS, maxSteps: 10, maxCloudCalls: 1 },
        advisor
      ).run(store.create('Inspect failing assertion', workspace.workspaceId));
      assert.equal(result.status, 'completed');
      assert.equal(result.cloudCalls, 1);
      assert.equal(localCalls, 5);
      assert.ok(result.observations.some(x => x.startsWith('Cloud advice received; sha256=')));
      assert.ok(!result.observations.some(x => x.includes('Inspect the failing assertion before retrying')));
    } finally { f.cleanup(); }
  });
  it('times out a hung adviser instead of running indefinitely', async () => {
    const f = fixture('setInterval(()=>{},1000);\n'); try {
      const spec = { ...loadDelegate(f.ctx, 'codex'), timeoutMs: 1000 };
      const cli = new DelegatedCliAdvisor('codex', spec);
      await assert.rejects(cli.advise({ goal: 'Plan a test', observations: [] }), /timeout/);
    } finally { f.cleanup(); }
  });
});
