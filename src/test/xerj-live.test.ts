/**
 * Opt-in REAL integration acceptance: downloads pinned official XERJ executable,
 * starts the actual node and probes its actual stdio MCP server.
 * Never runs during normal npm test; CI runs it in a dedicated isolated job.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {it} from 'node:test';
import {createEnvironmentContext} from '../core/context.js';
import {probeMcpServer} from '../mcp/health.js';
import {applyManagedMcp,previewManagedMcp} from '../mcp/extension-manager.js';
import {indexXerj,previewXerjRoots,saveXerjRoots,searchXerj,
  startXerj,stopXerj,inspectXerj,xerjBinary} from '../mcp/xerj-operations.js';

it('REAL XERJ: verified binary, node, index, search and MCP handshake',
  {skip:process.env['XERJ_LIVE_TESTS']!=='1',timeout:900000},
  async()=>{
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'agent-xerj-live-'));
    const ctx=createEnvironmentContext({homeDir:home});
    const corpus=path.join(home,'public-fixture');fs.mkdirSync(corpus);
    fs.writeFileSync(path.join(corpus,'sample.ts'),
      'export function cranberryTelemetryMarker2026(input: number) { return input * 42; }\n');
    let launched=false;
    try{
      const preview=previewManagedMcp(ctx,'xerj','install');
      await applyManagedMcp(ctx,'xerj','install',preview.revision);
      assert.ok(xerjBinary(ctx));
      const roots=previewXerjRoots(ctx,[corpus]);
      saveXerjRoots(ctx,[corpus],roots.revision);
      await startXerj(ctx);launched=true;
      assert.equal((await inspectXerj(ctx)).healthy,true);
      const indexing=await indexXerj(ctx,corpus);
      assert.equal(indexing.indexed,true);
      const response=await searchXerj(ctx,corpus,'cranberryTelemetryMarker2026');
      assert.match(response.results,/cranberryTelemetryMarker2026/);
      assert.match(response.results,/sample\.ts/);
      const probe=await probeMcpServer({
        command:xerjBinary(ctx)!,args:['mcp','--no-autostart']
      },{timeoutMs:45000,env:{...process.env,XERJ_URL:'http://127.0.0.1:9200',XERJ_NO_AUTOSTART:'1'}});
      assert.equal(probe.ok,true,probe.error);
      assert.ok((probe.tools??[]).some(t=>t==='xerj_search'||t.includes('search')),
        'A real search tool must be advertised by XERJ MCP');
    }finally{
      if(launched)try{stopXerj(ctx)}catch{/* managed process already exited */}
      fs.rmSync(home,{recursive:true,force:true});
    }
  });
