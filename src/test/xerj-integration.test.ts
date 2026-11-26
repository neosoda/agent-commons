import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe,it} from 'node:test';
import {createEnvironmentContext} from '../core/context.js';
import {restoreBackup} from '../core/backup.js';
import {MCP_CATALOG,MCP_PRESETS} from '../mcp/catalog.js';
import {inspectManagedMcps,previewManagedMcp} from '../mcp/extension-manager.js';
import {previewMcpProvision,applyMcpProvision} from '../mcp/extension-provision.js';
import {loadCentralMcpManifest} from '../sync/mcp.js';
import {inspectXerjRoots,previewXerjRoots,saveXerjRoots} from '../mcp/xerj-operations.js';
import {stageXerjBinary,xerjArtifact} from '../mcp/xerj-binary.js';

describe('XERJ local integration (synthetic; no actual XERJ binary used)',()=>{
  it('registers XERJ as an optional pinned reviewed binary without downloading on browse',()=>{
    const entry=MCP_CATALOG.find(e=>e.id==='xerj');
    assert.equal(entry?.license?.includes('Apache-2.0'),true);
    assert.equal(entry?.installation,'reviewed-binary');
    assert.equal(entry?.transport,'stdio');
    assert.deepEqual(MCP_PRESETS['knowledge'],['xerj']);
    assert.match(xerjArtifact('linux','x64').url,/v1\.0\.0-rc\.104/);
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'xerj-catalog-'));
    try{
      const ctx=createEnvironmentContext({homeDir:home});
      assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='xerj')?.managed,false);
      const plan=previewManagedMcp(ctx,'xerj','install');
      assert.equal(plan.manager,'binary');
      assert.equal(plan.affectsNativeClients,false);
      assert.equal(fs.existsSync(path.join(ctx.commonsDir,'mcp-packages','xerj')),false);
    }finally{fs.rmSync(home,{recursive:true,force:true})}
  });
  it('rejects an archive whose pinned SHA-256 does not match, without writing executable',async()=>{
    const folder=fs.mkdtempSync(path.join(os.tmpdir(),'xerj-bad-download-'));
    try{
      const response=async()=>new Response(Buffer.from('malicious-binary'),{status:200});
      await assert.rejects(stageXerjBinary(folder,'linux','x64',response as typeof fetch),/SHA-256/);
      assert.deepEqual(fs.readdirSync(folder),[]);
    }finally{fs.rmSync(folder,{recursive:true,force:true})}
  });
  it('rejects unsupported platforms rather than guessing a binary',()=>{
    assert.throws(()=>xerjArtifact('freebsd','x64'),/No reviewed XERJ/);
  });
  it('persists explicit physical project roots with versioned preview and restorable snapshot',()=>{
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'xerj-roots-'));
    try{
      const ctx=createEnvironmentContext({homeDir:home});
      const a=path.join(home,'project-a'),b=path.join(home,'project-b');
      fs.mkdirSync(a);fs.mkdirSync(b);
      assert.throws(()=>previewXerjRoots(ctx,[home]),/private|home/i);
      assert.throws(()=>previewXerjRoots(ctx,[os.tmpdir()]),/private|home/i);
      assert.throws(()=>previewXerjRoots(ctx,[path.join(home,'missing')]),/existing physical/);
      if(process.platform==='win32'){
        // Same directories under another spelling must stay protected on case-insensitive NTFS.
        fs.mkdirSync(path.join(ctx.commonsDir,'skills'),{recursive:true});
        assert.throws(()=>previewXerjRoots(ctx,[home.toUpperCase()]),/private|home/i);
        assert.throws(()=>previewXerjRoots(ctx,[path.join(home.toUpperCase(),'.AGENTS','skills')]),/private|home/i);
      }
      const p=previewXerjRoots(ctx,[a]);
      const written=saveXerjRoots(ctx,[a],p.revision);
      assert.equal(written.changed,true);
      assert.deepEqual(inspectXerjRoots(ctx).roots,[a]);
      assert.throws(()=>saveXerjRoots(ctx,[b],p.revision),/changed since preview/);
      const p2=previewXerjRoots(ctx,[a,b]);
      saveXerjRoots(ctx,[a,b],p2.revision);
      assert.deepEqual(inspectXerjRoots(ctx).roots,[a,b]);
      assert.ok(written.snapshotId);
      restoreBackup(ctx,written.snapshotId!);
      assert.deepEqual(inspectXerjRoots(ctx).roots,[]);
    }finally{fs.rmSync(home,{recursive:true,force:true})}
  });
  it('provisions an existing local XERJ binary through central MCP only for selected clients',()=>{
    const home=fs.mkdtempSync(path.join(os.tmpdir(),'xerj-provision-'));
    const old=process.env['PATH'];
    try{
      const ctx=createEnvironmentContext({homeDir:home});
      const folder=path.join(home,'bin');fs.mkdirSync(folder);
      const exe=path.join(folder,process.platform==='win32'?'xerj.exe':'xerj');
      fs.writeFileSync(exe,'synthetic placeholder; deliberately not executed');
      fs.mkdirSync(path.join(home,'.codex'));
      process.env['PATH']=folder+path.delimiter+(old??'');
      const preview=previewMcpProvision(ctx,'xerj',['codex'],[]);
      assert.equal(preview.clientCount,1);
      assert.equal(preview.requiresSeparateSync,true);
      const result=applyMcpProvision(ctx,'xerj',['codex'],[],preview.plan.expectedRevision);
      assert.equal(result.plan.changed,true);
      const central=loadCentralMcpManifest(ctx);
      assert.equal(central.status,'valid');
      const spec=central.manifest.mcpServers['xerj']!;
      assert.equal(spec.type,'stdio');
      assert.equal(spec.command,exe);
      assert.deepEqual(spec.args,['mcp','--no-autostart']);
      assert.deepEqual(spec.agents,['codex']);
      assert.ok(!fs.existsSync(path.join(home,'.codex','config.toml')));
    }finally{
      process.env['PATH']=old;
      fs.rmSync(home,{recursive:true,force:true});
    }
  });
});
