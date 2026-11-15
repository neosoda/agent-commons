import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, it} from 'node:test';
import {createEnvironmentContext} from '../core/context.js';
import {applyManagedMcp, inspectManagedMcps, previewManagedMcp} from '../mcp/extension-manager.js';
import {previewMcpProvision,applyMcpProvision} from '../mcp/extension-provision.js';
import type {EnvironmentContext} from '../types.js';

describe('reviewed MCP extension lifecycle',()=>{
  let ctx:EnvironmentContext;
  let home:string;
  beforeEach(()=>{
    home=fs.mkdtempSync(path.join(os.tmpdir(),'mcp-manager-'));
    ctx=createEnvironmentContext({homeDir:home});
  });
  afterEach(()=>fs.rmSync(home,{recursive:true,force:true}));

  const fakeRun=async (_command:string,args:string[],cwd:string)=>{
    if(args.includes('--prefix')){
      const pos=args.indexOf('--prefix');
      const stage=args[pos+1]!;
      const pkg=args[args.length-1]!;
      const rel=pkg.startsWith('@playwright/')?
        path.join('node_modules','@playwright','mcp','cli.js'):
        path.join('node_modules','@modelcontextprotocol','server-filesystem','dist','index.js');
      const target=path.join(stage,rel);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.writeFileSync(target,'// fake reviewed MCP entry\n');
      return;
    }
    if(args[0]==='venv'){
      fs.mkdirSync(path.join(args[1]!,process.platform==='win32'?'Scripts':'bin'),{recursive:true});
      return;
    }
    if(args[0]==='pip'){
      const id=args[args.length-1]!.includes('fetch')?'fetch':'git';
      const folder=path.join(cwd,'venv',process.platform==='win32'?'Scripts':'bin');
      fs.writeFileSync(path.join(folder,'mcp-server-'+id+(process.platform==='win32'?'.exe':'')),'stub');
    }
  };
  it('installs a pinned package in isolation and uninstalls via explicit revision',async()=>{
    const first=inspectManagedMcps(ctx).items.find(x=>x.id==='playwright')!;
    assert.equal(first.managed,false);
    const preview=previewManagedMcp(ctx,'playwright','install');
    assert.equal(preview.packageName,'@playwright/mcp');
    assert.equal(preview.affectsNativeClients,false);
    const result=await applyManagedMcp(ctx,'playwright','install',preview.revision,fakeRun);
    assert.equal(result.applied,true);
    const installed=inspectManagedMcps(ctx).items.find(x=>x.id==='playwright')!;
    assert.equal(installed.healthy,true);
    assert.equal(installed.installedVersion,preview.reviewedVersion);
    await assert.rejects(applyManagedMcp(ctx,'playwright','install',preview.revision,fakeRun));
    const remove=previewManagedMcp(ctx,'playwright','uninstall');
    await applyManagedMcp(ctx,'playwright','uninstall',remove.revision,fakeRun);
    assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='playwright')?.managed,false);
  });
  it('keeps native MCP configuration byte-for-byte unchanged',async()=>{
    fs.mkdirSync(ctx.commonsDir,{recursive:true});
    const original='{\n  "mcpServers": {"playwright":{"command":"custom-command","args":[]}}\n}\n';
    fs.writeFileSync(ctx.centralMcpPath,original);
    const p=previewManagedMcp(ctx,'playwright','install');
    await applyManagedMcp(ctx,'playwright','install',p.revision,fakeRun);
    const d=previewManagedMcp(ctx,'playwright','uninstall');
    await applyManagedMcp(ctx,'playwright','uninstall',d.revision,fakeRun);
    assert.equal(fs.readFileSync(ctx.centralMcpPath,'utf8'),original);
  });
  it('repairs a missing reviewed entry point without executing package scripts',async()=>{
    const p=previewManagedMcp(ctx,'filesystem','install');
    await applyManagedMcp(ctx,'filesystem','install',p.revision,fakeRun);
    const script=path.join(ctx.commonsDir,'mcp-packages','filesystem',
      'node_modules','@modelcontextprotocol','server-filesystem','dist','index.js');
    fs.unlinkSync(script);
    assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='filesystem')?.healthy,false);
    const repair=previewManagedMcp(ctx,'filesystem','repair');
    await applyManagedMcp(ctx,'filesystem','repair',repair.revision,fakeRun);
    assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='filesystem')?.healthy,true);
  });
  it('installs pinned Python wheels into isolated uv environments',async()=>{
    const p=previewManagedMcp(ctx,'fetch','install');
    assert.equal(p.manager,'uv');
    await applyManagedMcp(ctx,'fetch','install',p.revision,fakeRun);
    assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='fetch')?.healthy,true);
  });
  it('preserves an existing installation when a package-manager operation fails',async()=>{
    const p=previewManagedMcp(ctx,'playwright','install');
    await assert.rejects(applyManagedMcp(ctx,'playwright','install',p.revision,async()=>{throw Error('failed');}));
    assert.equal(inspectManagedMcps(ctx).items.find(x=>x.id==='playwright')?.managed,false);
    const items=fs.readdirSync(path.join(ctx.commonsDir,'mcp-packages'));
    assert.equal(items.some(x=>x.startsWith('.stage-')),false);
  });
  it('preserves unmanaged directories and rejects unreviewed packages',async()=>{
    const folder=path.join(ctx.commonsDir,'mcp-packages','playwright');
    fs.mkdirSync(folder,{recursive:true});
    assert.throws(()=>previewManagedMcp(ctx,'playwright','install'),/already exists/);
    assert.equal(fs.existsSync(folder),true);
    assert.throws(()=>previewManagedMcp(ctx,'osint','install'),/manual installation/);
  });
  it('rejects malformed receipts and linked installation directories',()=>{
    fs.mkdirSync(ctx.commonsDir,{recursive:true});
    fs.writeFileSync(path.join(ctx.commonsDir,'mcp-installations.json'),'{');
    assert.throws(()=>inspectManagedMcps(ctx));
    fs.unlinkSync(path.join(ctx.commonsDir,'mcp-installations.json'));
    const ext=fs.mkdtempSync(path.join(os.tmpdir(),'mcp-linktarget-'));
    try{
      fs.mkdirSync(path.join(ctx.commonsDir,'mcp-packages'));
      fs.symlinkSync(ext,path.join(ctx.commonsDir,'mcp-packages','playwright'),'dir');
      assert.throws(()=>previewManagedMcp(ctx,'playwright','install'),/already exists/);
    }finally{fs.rmSync(ext,{recursive:true,force:true});}
  });
  it('provisions an installed reviewed package only for selected native clients',async()=>{
    fs.mkdirSync(path.join(home,'.codex'));
    const p=previewManagedMcp(ctx,'playwright','install');
    await applyManagedMcp(ctx,'playwright','install',p.revision,fakeRun);
    const proposed=previewMcpProvision(ctx,'playwright',['codex'],[]);
    assert.equal(proposed.clientCount,1);
    assert.equal(proposed.plan.after?.agents[0],'codex');
    const saved=applyMcpProvision(ctx,'playwright',['codex'],[],proposed.plan.expectedRevision);
    assert.equal(saved.plan.changed,true);
    assert.match(fs.readFileSync(ctx.centralMcpPath,'utf8'),/"playwright"/);
    assert.throws(()=>previewMcpProvision(ctx,'playwright',['codex'],[]),/already exists/);
  });
  it('enforces explicit physical filesystem roots and installed agents',async()=>{
    fs.mkdirSync(path.join(home,'.codex'));
    const p=previewManagedMcp(ctx,'filesystem','install');
    await applyManagedMcp(ctx,'filesystem','install',p.revision,fakeRun);
    assert.throws(()=>previewMcpProvision(ctx,'filesystem',['codex'],[]),/requires explicitly/);
    assert.throws(()=>previewMcpProvision(ctx,'filesystem',['not-an-agent'],[home]),/installed MCP clients/);
    assert.throws(()=>previewMcpProvision(ctx,'filesystem',['codex'],[path.parse(home).root]),/non-root/);
    const valid=previewMcpProvision(ctx,'filesystem',['codex'],[home]);
    assert.equal(valid.directoryCount,1);
  });
});
