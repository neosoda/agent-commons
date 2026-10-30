import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { parseJsoncObject } from '../sync/parsers.js';
import { applyMcpEdit, mcpEditorOverview, previewMcpEdit } from '../web/mcp-editor.js';

describe('Safe central MCP editor', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-mcp-editor-')); });
  afterEach(() => { fs.rmSync(home, { force: true, recursive: true }); });

  it('creates a server only after preview, writes snapshot and never exposes secrets', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    assert.equal(mcpEditorOverview(ctx).servers.length, 0);
    const request = { operation: 'create' as const, name: 'demo-mcp',
      spec: { type:'stdio', command:'npx', args:['-y','sample-package'],
        env:{KEY:'$'+'{PRIVATE_TOKEN}'}, enabled:true, agents:['codex'] } };
    const preview = previewMcpEdit(ctx, request);
    assert.equal(preview.changed,true);
    assert.equal(preview.after?.argsCount,2);
    assert.equal(JSON.stringify(preview).includes('PRIVATE_TOKEN'),false);
    assert.equal(fs.existsSync(ctx.centralMcpPath),false);
    assert.throws(() => applyMcpEdit(ctx,request), /preview revision/i);
    const applied = applyMcpEdit(ctx,{...request,expectedRevision:preview.expectedRevision});
    assert.ok(applied.snapshotId);
    assert.match(fs.readFileSync(ctx.centralMcpPath,'utf8'),/PRIVATE_TOKEN/);
    assert.equal(JSON.stringify(mcpEditorOverview(ctx)).includes('PRIVATE_TOKEN'),false);
    assert.throws(() => applyMcpEdit(ctx,{...request,expectedRevision:preview.expectedRevision}),/changed since preview/i);
  });

  it('preserves JSONC comments, private values and unrelated extensions when changing routing',()=>{
    const ctx=createEnvironmentContext({homeDir:home});fs.mkdirSync(ctx.commonsDir);
    const raw='{\r\n  // comment to preserve\r\n  "mcpServers": {\r\n    "demo": {"command":"npx", "args":["run"], "env":{"API_KEY":"protected"}, "custom":{"x":12}}\r\n  },\r\n  "unrelated": {"keep":true}\r\n}\r\n';
    fs.writeFileSync(ctx.centralMcpPath,raw);
    const request={operation:'configure' as const,name:'demo',
      routing:{agents:['codex'],excludeAgents:['gemini-cli'],enabled:false}};
    const preview=previewMcpEdit(ctx,request);
    assert.equal(JSON.stringify(preview).includes('protected'),false);
    const result=applyMcpEdit(ctx,{...request,expectedRevision:preview.expectedRevision});
    assert.ok(result.snapshotId);
    const updated=fs.readFileSync(ctx.centralMcpPath,'utf8');
    assert.ok(updated.includes('comment to preserve'));
    const parsed=parseJsoncObject(updated);
    const server=(parsed['mcpServers'] as Record<string,Record<string,unknown>>)['demo']!;
    assert.deepEqual(server['args'],['run']);
    assert.deepEqual(server['env'],{API_KEY:'protected'});
    assert.deepEqual(server['custom'],{x:12});
    assert.deepEqual(parsed['unrelated'],{keep:true});
    assert.deepEqual(server['agents'],['codex']);
    assert.deepEqual(server['excludeAgents'],['gemini-cli']);
    assert.equal(updated.includes('\r\n'),true);
    assert.equal(mcpEditorOverview(ctx).servers[0]?.enabled,false);
  });

  it('rejects credentials, unsafe identifiers, invalid agents and invalid manifest paths',()=>{
    const ctx=createEnvironmentContext({homeDir:home});
    const base={operation:'create' as const,name:'remote',spec:{type:'http',url:'https://example.test/mcp'}};
    for(const bad of [
      {...base,spec:{type:'http',url:'https://u:password@example.test/mcp'}},
      {...base,spec:{type:'http',url:'https://example.test/mcp?token=x'}},
      {...base,name:'__proto__'},
      {operation:'create' as const,name:'mcp',spec:{type:'stdio',command:'npx',args:[],env:{SECRET:'literal-secret'}}},
      {operation:'create' as const,name:'mcp',spec:{type:'stdio',command:'npx',args:[],agents:['not-an-agent']}}
    ])assert.throws(()=>previewMcpEdit(ctx,bad));
    fs.mkdirSync(ctx.commonsDir);
    fs.writeFileSync(ctx.centralMcpPath,'{"mcpServers":{}, "servers":{}}');
    assert.throws(()=>mcpEditorOverview(ctx),/Ambiguous/);
    fs.writeFileSync(ctx.centralMcpPath,'{"mcpServers": {"x": {}}}');
    assert.throws(()=>mcpEditorOverview(ctx),/malformed/);
    fs.unlinkSync(ctx.centralMcpPath);fs.mkdirSync(ctx.centralMcpPath);
    assert.throws(()=>mcpEditorOverview(ctx),/linked or invalid/);
  });

  it('fails closed on duplicate JSONC keys, including hidden nested duplicates', () => {
    const ctx = createEnvironmentContext({homeDir:home});
    fs.mkdirSync(ctx.commonsDir);
    for (const raw of [
      '{"mcpServers":{"demo":{"command":"npx"},"demo":{"command":"node"}}}',
      '{"mcpServers":{"demo":{"command":"npx","command":"node"}}}',
      '{"mcpServers":{"demo":{"command":"npx","env":{"TOKEN":"first","TOKEN":"second"}}}}',
      '{"mcpServers":{"demo":{"command":"npx"}},"mcpServers":{}}'
    ]) {
      fs.writeFileSync(ctx.centralMcpPath, raw);
      assert.throws(() => mcpEditorOverview(ctx), /Duplicate JSONC properties/);
      assert.throws(() => previewMcpEdit(ctx, {operation:'delete',name:'demo'}), /Duplicate JSONC properties/);
      assert.equal(fs.readFileSync(ctx.centralMcpPath, 'utf8'),raw);
    }
  });

  it('deletes only the named server with a recoverable snapshot',()=>{
    const ctx=createEnvironmentContext({homeDir:home});fs.mkdirSync(ctx.commonsDir);
    fs.writeFileSync(ctx.centralMcpPath,'{"mcpServers":{"remove":{"command":"npx"},"keep":{"command":"python"}},"other":{"value":99}}');
    const request={operation:'delete' as const,name:'remove'};
    const preview=previewMcpEdit(ctx,request);
    assert.equal(preview.after,null);
    const result=applyMcpEdit(ctx,{...request,expectedRevision:preview.expectedRevision});
    assert.ok(result.snapshotId);
    const updated=fs.readFileSync(ctx.centralMcpPath,'utf8');
    assert.doesNotMatch(updated,/"remove"/);assert.match(updated,/"keep"/);assert.deepEqual(parseJsoncObject(updated)['other'],{value:99});
  });
});
