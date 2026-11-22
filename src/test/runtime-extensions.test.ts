import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { demoServerPath } from '../mcp/demo-server.js';
import { MissionStore, MissionRunner, DEFAULT_LIMITS, type ModelClient, type ToolRequest } from '../runtime/mission.js';
import { selectMissionSkills, prepareApprovedMcp, MissionToolsWithMcp } from '../runtime/extensions.js';
import { OpenAICompatibleModel } from '../runtime/provider.js';
import { WorkspaceTools } from '../runtime/workspace.js';

function fixture() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ext-'));
  const project = path.join(home, 'project');
  fs.mkdirSync(path.join(project, '.git'), { recursive: true });
  fs.writeFileSync(path.join(project, 'a.ts'), 'export const number = 42;\n');
  const ctx = createEnvironmentContext({ homeDir: home });
  const dir = path.join(ctx.centralSkillsDir, 'security-review');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'),
    '---\nname: security-review\ndescription: Review code security vulnerabilities\n---\n# Check input validation\n');
  const manifest = { mcpServers: { demo: { command: process.execPath, args: [demoServerPath()] } } };
  fs.writeFileSync(ctx.centralMcpPath, JSON.stringify(manifest));
  return {
    home, project, ctx,
    store: new MissionStore(path.join(home, 'missions')),
    cleanup: () => fs.rmSync(home, { recursive: true, force: true })
  };
}

const call = (name: ToolRequest['name'], args: Record<string, unknown>) => ({ call: { name, arguments: args } });
const limits = { ...DEFAULT_LIMITS, maxSteps: 9, maxDurationMs: 60000 };

describe('P1 mission skills and real MCP execution', () => {
  it('selects only relevant installed physical skills, within a bounded context', () => {
    const f = fixture(); try {
      const selected = selectMissionSkills(f.ctx, 'Review code security vulnerabilities');
      assert.deepEqual(selected.ids, ['security-review']);
      assert.match(selected.instructions, /Check input validation/);
      const unrelated = selectMissionSkills(f.ctx, 'Design colorful illustrations');
      assert.deepEqual(unrelated.ids, []);
      assert.equal(fs.existsSync(path.join(f.home, '.codex')), false);
    } finally { f.cleanup(); }
  });

  it('requires explicit per-tool approval and a successful real MCP handshake', async () => {
    const f = fixture(); try {
      const approved = await prepareApprovedMcp(f.ctx, ['demo/echo']);
      assert.deepEqual(approved.allowed, ['demo/echo']);
      const runner = new MissionToolsWithMcp(new WorkspaceTools(f.project, false, false), approved);
      const result = await runner.execute(call('mcp_call', { server: 'demo', tool: 'echo', args: { text: 'MCP works' } }).call);
      assert.equal(result.ok, true);
      assert.match(result.output, /MCP works/);
      const denied = await runner.execute(call('mcp_call', { server: 'demo', tool: 'time', args: {} }).call);
      assert.equal(denied.ok, false);
      assert.match(denied.output, /not approved/);
    } finally { f.cleanup(); }
  });

  it('refuses unconfigured or unavailable MCP tools before running a mission', async () => {
    const f = fixture(); try {
      await assert.rejects(prepareApprovedMcp(f.ctx, ['missing/echo']), /Unknown or disabled/);
      await assert.rejects(prepareApprovedMcp(f.ctx, ['demo/unknown']), /does not expose/);
      await assert.rejects(prepareApprovedMcp(f.ctx, ['demo/echo/extra']), /server\/tool/);
      const empty = await prepareApprovedMcp(f.ctx, []);
      assert.deepEqual(empty.allowed, []);
      assert.equal(empty.servers.size, 0);
    } finally { f.cleanup(); }
  });

  it('completes a mission with an installed skill and a real MCP process, with checkpoint evidence', async () => {
    const f = fixture(); try {
      const skills = selectMissionSkills(f.ctx, 'Review code security vulnerabilities');
      const approved = await prepareApprovedMcp(f.ctx, ['demo/echo']);
      const sequence = [
        call('read_file', { path: 'a.ts' }),
        call('mcp_call', { server: 'demo', tool: 'echo', args: { text: 'verified' } }),
        { finish: 'Inspected file and verified MCP call' }
      ];
      const local: ModelClient = {
        next: async (input) => {
          assert.match(input.guidance ?? '', /Check input validation/);
          assert.deepEqual(input.mcpTools, ['demo/echo']);
          return sequence.shift() ?? { text: 'No action' };
        }
      };
      const result = await new MissionRunner(
        f.store, local,
        new MissionToolsWithMcp(new WorkspaceTools(f.project, false, false), approved),
        limits, undefined, false,
        { guidance: skills.instructions, skillIds: skills.ids, mcpTools: approved.allowed }
      ).run(f.store.create('Review code security vulnerabilities'));
      assert.equal(result.status, 'completed');
      assert.equal(result.mcpCalls, 1);
      assert.deepEqual(result.skillIds, ['security-review']);
      assert.ok(result.observations.some(x => x.includes('mcp_call: ok')));
      const checkpoint = fs.readFileSync(path.join(f.home, 'missions', result.id + '.json'), 'utf8');
      assert.equal(checkpoint.includes('export const number'), false);
      assert.equal(checkpoint.includes('MCP works'), false);
    } finally { f.cleanup(); }
  });

  it('offers MCP only when authorized in OpenAI-compatible model requests', async () => {
    const seen: Array<{ tools: Array<{function:{name:string}}>; messages: Array<{content:string}> }> = [];
    const server = http.createServer(async (req, res) => {
      let body = ''; for await (const part of req) body += part.toString();
      const payload = JSON.parse(body) as typeof seen[number]; seen.push(payload);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { tool_calls: [{
        function: { name: 'mcp_call', arguments: JSON.stringify({ server: 'demo', tool: 'echo', args: { text: 'ok' } }) }
      }] } }] }));
    });
    try {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      const address = server.address(); assert.ok(address && typeof address !== 'string');
      const model = new OpenAICompatibleModel({ url: 'http://127.0.0.1:' + address.port + '/v1/chat/completions', model: 'local-test' });
      const unauthorized = await model.next({ goal: 'Test', observations: [] });
      assert.equal(unauthorized.call, undefined);
      const authorized = await model.next({
        goal: 'Test', observations: [], guidance: 'Follow selected skill',
        mcpTools: ['demo/echo']
      });
      assert.equal(authorized.call?.name, 'mcp_call');
      assert.equal(seen[0]!.tools.some(t => t.function.name === 'mcp_call'), false);
      assert.equal(seen[1]!.tools.some(t => t.function.name === 'mcp_call'), true);
      assert.ok(seen[1]!.messages.some(m => m.content.includes('Follow selected skill')));
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
