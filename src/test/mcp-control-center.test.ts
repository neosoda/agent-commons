import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { detectAgents } from '../agents/detector.js';
import { runSync } from '../commands/sync.js';
import { inspectMcpControlCenter, previewMcpProfile, saveMcpProfile,
  readMcpProfiles, runMcpProfileSync } from '../mcp/control-center.js';

function fixture(fn: (home: string) => void) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(),'commons-mcp-v040-'));
  try { fn(home); } finally { fs.rmSync(home,{recursive:true,force:true}); }
}
function prepare(home: string, central: Record<string,unknown>, native: string) {
  fs.mkdirSync(path.join(home,'.agents'),{recursive:true});
  fs.mkdirSync(path.join(home,'.lmstudio'),{recursive:true});
  fs.writeFileSync(path.join(home,'.agents','mcp.json'),JSON.stringify({mcpServers:central}));
  fs.writeFileSync(path.join(home,'.lmstudio','mcp.json'),native);
}
const server = (command: string) => ({command,args:['--version']});

describe('MCP Control Center synthetic-only regression',()=>{
  it('recognizes LM Studio in every supported platform using its native MCP file',()=>{
    fixture(home=>{
      for(const platform of ['win32','linux','darwin'] as NodeJS.Platform[]){
        const ctx=createEnvironmentContext({homeDir:home,platform});
        fs.mkdirSync(path.join(home,'.lmstudio'),{recursive:true});
        const found=detectAgents(ctx,['lm-studio'])[0]!;
        assert.equal(found.installed,true);
        assert.equal(found.mcpFormat,'standard-json');
        assert.equal(found.definition.skillsSupported,false);
        assert.equal(found.mcpConfigPath,path.join(home,'.lmstudio','mcp.json'));
      }
    });
  });
  it('adds only profile-selected MCP servers and preserves untracked native config',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      const original={theme:'keep',mcpServers:{native:{command:'my-command',env:{TOKEN:'private-local-value'}}}};
      prepare(home,{playwright:server('node'),fetch:server('uvx'),filesystem:server('node')},
        JSON.stringify(original,null,2));
      const preview=runMcpProfileSync(ctx,'osint',['lm-studio'],true);
      assert.equal(preview.errors.length,0);
      assert.equal(preview.mcpResults.filter(r=>r.action==='added').length,2);
      assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home,'.lmstudio','mcp.json'),'utf8')),original);
      const applied=runMcpProfileSync(ctx,'osint',['lm-studio'],false);
      assert.equal(applied.errors.length,0);
      const native=JSON.parse(fs.readFileSync(path.join(home,'.lmstudio','mcp.json'),'utf8'));
      assert.equal(native.theme,'keep');
      assert.equal(native.mcpServers.native.env.TOKEN,'private-local-value');
      assert.ok(native.mcpServers.playwright);
      assert.ok(native.mcpServers.fetch);
      assert.equal(native.mcpServers.filesystem,undefined);
      assert.ok(applied.snapshotId);
    });
  });
  it('preserves malformed LM Studio JSON without overwriting it',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      prepare(home,{playwright:server('node')},'{invalid json');
      const report=runMcpProfileSync(ctx,'osint',['lm-studio'],false);
      assert.ok(report.mcpResults.some(r=>r.action==='corrupted-config'));
      assert.equal(fs.readFileSync(path.join(home,'.lmstudio','mcp.json'),'utf8'),'{invalid json');
    });
  });
  it('blocks OSINT and privileged Docker gateway in one custom profile',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      prepare(home,{fetch:server('uvx'),'docker-mcp-gateway':server('docker')},'{"mcpServers":{}}');
      assert.throws(()=>previewMcpProfile(ctx,'unsafe',
        {servers:['fetch','docker-mcp-gateway'],agents:['lm-studio']}),/Cannot combine/);
      assert.equal(readMcpProfiles(ctx).data.version,1);
    });
  });
  it('checks custom profile revisions and rejects missing central servers',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      prepare(home,{playwright:server('node')},'{"mcpServers":{}}');
      const request={servers:['playwright'],agents:['lm-studio']};
      const plan=previewMcpProfile(ctx,'browser',request);
      saveMcpProfile(ctx,'browser',request,plan.revision);
      assert.deepEqual(readMcpProfiles(ctx).data.profiles.browser?.servers,['playwright']);
      assert.throws(()=>saveMcpProfile(ctx,'browser',request,plan.revision),/changed since preview/);
      assert.throws(()=>previewMcpProfile(ctx,'bad',{servers:['does-not-exist'],agents:['lm-studio']}),/unconfigured/);
    });
  });
  it('reports inventory without returning private command, env or paths',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      prepare(home,{playwright:{command:'secret-executable',env:{TOKEN:'sensitive-123'}}},
        '{"mcpServers":{"foreign":{"command":"hidden-command","env":{"PASS":"hidden-value"}}}}');
      const overview=inspectMcpControlCenter(ctx);
      assert.equal(overview.catalog.length,8);
      assert.equal(overview.clients.find(a=>a.id==='lm-studio')?.status,'valid');
      const output=JSON.stringify(overview);
      for(const value of [home,'secret-executable','sensitive-123','hidden-command','hidden-value']){
        assert.equal(output.includes(value),false);
      }
    });
  });
  it('does not create LM Studio skills during full synchronization',()=>{
    fixture(home=>{
      const ctx=createEnvironmentContext({homeDir:home});
      prepare(home,{playwright:server('node')},'{"mcpServers":{}}');
      fs.mkdirSync(path.join(home,'.agents','skills','test-skill'),{recursive:true});
      fs.writeFileSync(path.join(home,'.agents','skills','test-skill','SKILL.md'),'# Safe');
      const report=runSync(ctx,{agentFilter:['lm-studio']});
      assert.equal(report.errors.length,0);
      assert.equal(report.skillResults.length,0);
      assert.equal(fs.existsSync(path.join(home,'.lmstudio','skills')),false);
    });
  });
});
