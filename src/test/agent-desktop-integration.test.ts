import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { readPublicCatalog } from '../commands/public-catalog.js';
import { MCP_CATALOG, MCP_PRESETS } from '../mcp/catalog.js';
import { inspectMcpControlCenter, previewMcpProfile, runMcpProfileSync } from '../mcp/control-center.js';

describe('Agent Desktop opt-in integration', () => {
  it('pins the audited upstream source and its license', () => {
    const {catalog} = readPublicCatalog();
    const skill = catalog.skills.find(s => s.id === 'agent-desktop');
    assert.ok(skill);
    assert.equal(skill.ref, '8ffecc1d3d088727f8d84baf4dde0224aab2e8ad');
    assert.equal(skill.path, 'skills/agent-desktop');
    assert.equal(skill.license, 'Apache-2.0');
    assert.ok(skill.licenseEvidence.endsWith(skill.ref + '/LICENSE'));
    assert.ok(skill.source.endsWith(skill.ref + '/skills/agent-desktop'));
    assert.equal(skill.installPaths, undefined);
  });

  it('registers a manual-only critical MCP and dedicated opt-in preset', () => {
    const e = MCP_CATALOG.find(s => s.id === 'agent-desktop');
    assert.ok(e);
    assert.equal(e.installation,'manual');
    assert.equal(e.risk,'critical');
    assert.deepEqual(e.example,{command:'agent-desktop',args:['mcp']});
    assert.deepEqual(MCP_PRESETS['desktop-control'],['agent-desktop']);
    assert.equal(MCP_PRESETS.development?.includes('agent-desktop'),false);
  });

  it('keeps native clients unchanged in preview, guards untrusted-tool mixing and selectively syncs', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(),'commons-agent-desktop-'));
    try {
      fs.mkdirSync(path.join(home,'.agents'),{recursive:true});
      fs.mkdirSync(path.join(home,'.lmstudio'),{recursive:true});
      const nativePath = path.join(home,'.lmstudio','mcp.json');
      fs.writeFileSync(path.join(home,'.agents','mcp.json'),JSON.stringify({mcpServers:{
        'agent-desktop':{command:'agent-desktop',args:['mcp']},
        fetch:{command:'uvx',args:['fetch']}
      }}));
      const native = {mcpServers:{other:{command:'existing-tool',env:{PRIVATE:'never-expose'}}},theme:'keep'};
      fs.writeFileSync(nativePath,JSON.stringify(native));
      const ctx = createEnvironmentContext({homeDir:home});
      assert.throws(() => previewMcpProfile(ctx,'unsafe',{
        servers:['agent-desktop','fetch'],agents:['lm-studio']
      }),/Cannot combine untrusted OSINT/);
      const overview = inspectMcpControlCenter(ctx);
      const publicJson = JSON.stringify(overview);
      assert.equal(publicJson.includes('never-expose'),false);
      assert.equal(publicJson.includes('existing-tool'),false);
      assert.equal(overview.catalog.find(e=>e.id==='agent-desktop')?.configured,true);
      const plan = runMcpProfileSync(ctx,'desktop-control',['lm-studio'],true);
      assert.equal(plan.errors.length,0);
      assert.equal(JSON.parse(fs.readFileSync(nativePath,'utf8')).mcpServers['agent-desktop'],undefined);
      const report = runMcpProfileSync(ctx,'desktop-control',['lm-studio'],false);
      assert.equal(report.errors.length,0);
      const got = JSON.parse(fs.readFileSync(nativePath,'utf8'));
      assert.equal(got.theme,'keep');
      assert.deepEqual(got.mcpServers.other,native.mcpServers.other);
      assert.deepEqual(got.mcpServers['agent-desktop'],{command:'agent-desktop',args:['mcp']});
      assert.equal(got.mcpServers.fetch,undefined);
    } finally {
      fs.rmSync(home,{recursive:true,force:true});
    }
  });
});
