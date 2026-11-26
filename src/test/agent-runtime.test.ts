import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { describe, it } from 'node:test';
import { MissionStore, MissionRunner, DEFAULT_LIMITS, type ModelClient, type ModelTurn, type ToolExecutor, type ToolRequest } from '../runtime/mission.js';
import { WorkspaceTools } from '../runtime/workspace.js';
import { OpenAICompatibleModel } from '../runtime/provider.js';

const fixture = () => {
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'commons-runtime-'));
  const root=path.join(base,'project'); fs.mkdirSync(root); fs.mkdirSync(path.join(root,'.git'));
  fs.writeFileSync(path.join(root,'a.ts'),'export const x = 1;\n');
  return {base,root,store:new MissionStore(path.join(base,'missions')),cleanup:()=>fs.rmSync(base,{recursive:true,force:true})};
};
const sequence=(turns:ModelTurn[]):ModelClient => ({next:async()=>turns.shift()??{text:'No action'}});
const request=(name:ToolRequest['name'],args:Record<string,unknown>={}):ModelTurn=>({call:{name,arguments:args}});
const shortLimits={...DEFAULT_LIMITS,maxSteps:12,maxIdleSteps:3,maxDurationMs:120_000};

describe('bounded local agent runtime',()=>{
  it('refuses hallucinated completion without tool evidence',async()=>{
    const f=fixture();try{
      const state=f.store.create('Analyze this code');
      const r=await new MissionRunner(f.store,sequence([{finish:'Everything works'}]),new WorkspaceTools(f.root,false,false),shortLimits).run(state);
      assert.equal(r.status,'blocked');assert.match(r.reason,/without verified inspection evidence/);
    }finally{f.cleanup();}
  });
  it('interrupts repeated identical tool calls without executing them twice',async()=>{
    const f=fixture();try{
      const tool=new WorkspaceTools(f.root,false,false);const state=f.store.create('Read the code');
      const turns=[request('read_file',{path:'a.ts'}),request('read_file',{path:'a.ts'}),{finish:'Read'}];
      const r=await new MissionRunner(f.store,sequence(turns),tool,shortLimits).run(state);
      assert.equal(r.status,'blocked');assert.equal(r.calls,1);assert.match(r.reason,/Repeated identical/);
    }finally{f.cleanup();}
  });
  it('does not declare changed code complete before a real test',async()=>{
    const f=fixture();try{
      const state=f.store.create('Fix code');
      const turns=[request('read_file',{path:'a.ts'}),request('write_file',{path:'a.ts',content:'export const x = 2;\n'}),{finish:'Fixed'}];
      const r=await new MissionRunner(f.store,sequence(turns),new WorkspaceTools(f.root,true,false),shortLimits).run(state);
      assert.equal(r.status,'partial');assert.equal(r.changed,true);assert.equal(r.tested,false);
      assert.match(fs.readFileSync(path.join(f.root,'a.ts'),'utf8'),/x = 2/);
    }finally{f.cleanup();}
  });
  it('blocks traversal, .env, symlinks and writes without approval',async()=>{
    const f=fixture();try{
      const readonly=new WorkspaceTools(f.root,false,false);
      assert.equal((await readonly.execute({name:'write_file',arguments:{path:'a.ts',content:'x'}})).ok,false);
      const tool=new WorkspaceTools(f.root,true,false);
      for(const name of ['../other','.env','src/../../other','.git/config']){
        assert.equal((await tool.execute({name:'read_file',arguments:{path:name}})).ok,false,name);
      }
      const outer=path.join(f.base,'outside');fs.writeFileSync(outer,'private');
      try {fs.symlinkSync(outer,path.join(f.root,'linked'));assert.equal((await tool.execute({name:'read_file',arguments:{path:'linked'}})).ok,false);}catch(err){if(process.platform!=='win32')throw err;}
    }finally{f.cleanup();}
  });
  it('re-checks OS-canonical names so Windows 8.3 aliases cannot reach .git or .env',async(t)=>{
    const f=fixture();try{
      fs.mkdirSync(path.join(f.root,'.git','hooks'));fs.writeFileSync(path.join(f.root,'.env'),'TOKEN=private\n');
      const aliasOf=(name:string)=>{
        if(process.platform!=='win32')return null;
        for(let i=1;i<=4;i++){
          const alias=name.replace(/^\./,'').toUpperCase().slice(0,6)+'~'+i;
          try{if(path.basename(fs.realpathSync.native(path.join(f.root,alias)))===name)return alias;}catch{/* alias absent */}
        }
        return null;
      };
      const git=aliasOf('.git'),env=aliasOf('.env');
      if(!git&&!env){t.skip('8.3 short names are not generated on this volume');return;}
      const tool=new WorkspaceTools(f.root,true,false);
      if(git){
        for(const p of [git,`${git}/config`,`${git}/hooks`])
          assert.equal((await tool.execute({name:p.endsWith('hooks')||p===git?'list_files':'read_file',arguments:{path:p}})).ok,false,p);
        const w=await tool.execute({name:'write_file',arguments:{path:`${git}/hooks/pre-commit`,content:'#!/bin/sh\nexit 1\n'}});
        assert.equal(w.ok,false);assert.equal(w.output,'Protected path');
        assert.equal(fs.existsSync(path.join(f.root,'.git','hooks','pre-commit')),false);
      }
      if(env){
        const r=await tool.execute({name:'read_file',arguments:{path:env}});
        assert.equal(r.ok,false);assert.doesNotMatch(r.output,/private|TOKEN/);
      }
    }finally{f.cleanup();}
  });
  it('reports filesystem failures without absolute private paths',async()=>{
    const f=fixture();try{
      const tool=new WorkspaceTools(f.root,true,false);
      const missing=await tool.execute({name:'read_file',arguments:{path:'missing/file.ts'}});
      assert.equal(missing.ok,false);assert.equal(missing.output,'Path not found');
      const dir=await tool.execute({name:'list_files',arguments:{path:'nope'}});
      assert.equal(dir.output,'Path not found');
      const parent=await tool.execute({name:'write_file',arguments:{path:'absent/new.ts',content:'x'}});
      assert.equal(parent.ok,false);
      for(const r of [missing,dir,parent])assert.ok(!r.output.includes(f.base)&&!r.output.includes(os.tmpdir()),r.output);
      const created=await tool.execute({name:'write_file',arguments:{path:'new.ts',content:'export {};\n'}});
      assert.equal(created.ok,true);assert.equal(fs.readFileSync(path.join(f.root,'new.ts'),'utf8'),'export {};\n');
    }finally{f.cleanup();}
  });
  it('keeps checkpoint compact and resumes with prior evidence',async()=>{
    const f=fixture();try{
      const state=f.store.create('Summarize code');
      const first=await new MissionRunner(f.store,sequence([request('read_file',{path:'a.ts'})]),new WorkspaceTools(f.root,false,false),{...shortLimits,maxSteps:1}).run(state);
      assert.equal(first.status,'blocked');assert.equal(first.evidence,1);
      const loaded=f.store.load(first.id);
      const second=await new MissionRunner(f.store,sequence([{finish:'Code summary with evidence'}]),new WorkspaceTools(f.root,false,false),shortLimits).run(loaded);
      assert.equal(second.status,'completed');assert.equal(second.evidence,1);
      const saved=fs.readFileSync(path.join(f.base,'missions',state.id+'.json'),'utf8');
      assert.ok(!saved.includes('export const x = 1'));
    }finally{f.cleanup();}
  });
  it('escalates once on observable repetition, then stops',async()=>{
    const f=fixture();try{
      let calls=0;
      const local:ModelClient={next:async()=>{calls++;return calls===3 ? {finish:'Inspection complete'} : request('read_file',{path:'a.ts'});}};
      const cloud=sequence([{text:'Consider summarizing the inspected file.'}]);
      const s=await new MissionRunner(f.store,local,new WorkspaceTools(f.root,false,false),{...shortLimits,maxCloudCalls:1},cloud).run(f.store.create('Read and report'));
      assert.equal(s.status,'completed');assert.equal(s.cloudCalls,1);
      // Cloud advice does not execute workspace tools: the local model finishes.
      assert.equal(calls,3);
    }finally{f.cleanup();}
  });
  it('uses advisory cloud once, then returns execution to local and hides source by default',async()=>{
    const f=fixture();try{
      let localCalls=0, adviceCalls=0;
      const local:ModelClient={next:async({observations})=>{
        localCalls++;
        if(localCalls<=2)return request('read_file',{path:'a.ts'});
        assert.ok(observations.some(s=>s.includes('Cloud advice (untrusted')));
        return {finish:'Completed locally using an inspected file'};
      }};
      const cloud:ModelClient={
        next:async()=>{throw new Error('Cloud must not act as tool executor');},
        advise:async({observations})=>{
          adviceCalls++;
          assert.equal(observations.some(x=>x.includes('export const x')),false);
          return {text:'Try a different local verification strategy',tokens:25};
        }
      };
      const r=await new MissionRunner(f.store,local,new WorkspaceTools(f.root,false,false),
        shortLimits,cloud,false).run(f.store.create('Inspect safely'));
      assert.equal(r.status,'completed');
      assert.equal(r.calls,1);assert.equal(r.cloudCalls,1);
      assert.equal(r.steps,4);assert.equal(r.tokens,25);
      assert.equal(localCalls,3);assert.equal(adviceCalls,1);
      const checkpoint=fs.readFileSync(path.join(f.base,'missions',r.id+'.json'),'utf8');
      assert.equal(checkpoint.includes('Try a different local verification strategy'),false);
    }finally{f.cleanup();}
  });
  it('gets an actual HTTP advisory response without offering cloud any execution tools',async()=>{
    let requests=0;
    const server=http.createServer(async(req,res)=>{
      let body='';for await(const part of req)body+=part.toString();
      const input=JSON.parse(body) as {tools?:unknown;messages:{content:string}[]};
      requests++;
      assert.equal(input.tools,undefined);
      assert.match(input.messages[0]!.content,/read-only second-opinion/);
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({choices:[{message:{content:'Inspect local test output before retrying.'}}],usage:{total_tokens:17}}));
    });
    try{
      await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
      const address=server.address();assert.ok(address&&typeof address!=='string');
      const model=new OpenAICompatibleModel({url:`http://127.0.0.1:${address.port}/v1/chat/completions`,model:'test-cloud',apiKey:'test-key'});
      const result=await model.advise({goal:'Fix a bug',observations:['A test failed']});
      assert.match(result.text,/Inspect local test output/);assert.equal(result.tokens,17);
      assert.equal(requests,1);
    }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
  it('stops A-B-A file oscillation before reapplying an earlier version',async()=>{
    const f=fixture();try{
      const turns=[request('read_file',{path:'a.ts'}),
        request('write_file',{path:'a.ts',content:'export const x = 2;\n'}),
        request('write_file',{path:'a.ts',content:'export const x = 1;\n'}),
        request('write_file',{path:'a.ts',content:'export const x = 2;\n'})];
      // The third write is rejected: unlike identical-call detection, each prior write changed the workspace.
      const r=await new MissionRunner(f.store,sequence(turns),new WorkspaceTools(f.root,true,false),shortLimits).run(f.store.create('Fix code'));
      assert.equal(r.status,'blocked');assert.match(r.reason,/oscillation detected/);
      assert.equal(r.calls,3);assert.equal(r.steps,4);
      assert.match(fs.readFileSync(path.join(f.root,'a.ts'),'utf8'),/x = 1/);
      const checkpoint=fs.readFileSync(path.join(f.base,'missions',r.id+'.json'),'utf8');
      assert.ok(!checkpoint.includes('export const x'));
      assert.equal(Object.keys(r.writeHistory??{}).length,1);
    }finally{f.cleanup();}
  });
  it('retains oscillation protection after checkpoint resume',async()=>{
    const f=fixture();try{
      const first=await new MissionRunner(f.store,sequence([
        request('read_file',{path:'a.ts'}),
        request('write_file',{path:'a.ts',content:'export const x = 2;\n'}),
        request('write_file',{path:'a.ts',content:'export const x = 1;\n'})
      ]),new WorkspaceTools(f.root,true,false),{...shortLimits,maxSteps:3}).run(f.store.create('Fix code'));
      assert.equal(first.calls,3);
      const resumed=f.store.load(first.id);
      const result=await new MissionRunner(f.store,sequence([
        request('write_file',{path:'a.ts',content:'export const x = 2;\n'})
      ]),new WorkspaceTools(f.root,true,false),shortLimits).run(resumed);
      assert.equal(result.status,'blocked');assert.match(result.reason,/oscillation detected/);
      assert.equal(result.calls,3);
    }finally{f.cleanup();}
  });
  it('allows distinct successive edits to finish after verification',async()=>{
    const f=fixture();try{
      fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({private:true,scripts:{test:'node -e "process.exit(0)"'}}));
      const turns=[request('read_file',{path:'a.ts'}),
        request('write_file',{path:'a.ts',content:'export const x = 2;\n'}),
        request('write_file',{path:'a.ts',content:'export const x = 3;\n'}),
        request('verify',{check:'test'}),{finish:'Verified latest version'}];
      const r=await new MissionRunner(f.store,sequence(turns),new WorkspaceTools(f.root,true,true),shortLimits).run(f.store.create('Fix code'));
      assert.equal(r.status,'completed');assert.equal(r.calls,4);
      assert.equal(r.tested,true);assert.match(fs.readFileSync(path.join(f.root,'a.ts'),'utf8'),/x = 3/);
    }finally{f.cleanup();}
  });
  it('does not confuse distinct case-sensitive Linux files',async()=>{
    if (process.platform === 'win32') return;
    const f=fixture();try{
      fs.writeFileSync(path.join(f.root,'A.ts'),'export const y = 0;\n');
      fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({private:true,scripts:{test:'node -e "process.exit(0)"'}}));
      const turns=[request('read_file',{path:'a.ts'}),
        request('write_file',{path:'A.ts',content:'export const y = 2;\n'}),
        request('write_file',{path:'a.ts',content:'export const x = 3;\n'}),
        request('write_file',{path:'A.ts',content:'export const y = 2;\n'}),
        request('verify',{check:'test'}),{finish:'Both files checked'}];
      const r=await new MissionRunner(f.store,sequence(turns),new WorkspaceTools(f.root,true,true),shortLimits).run(f.store.create('Update both case-sensitive files'));
      assert.equal(r.status,'completed');assert.equal(r.calls,5);
      assert.equal(Object.keys(r.writeHistory??{}).length,2);
    }finally{f.cleanup();}
  });
  it('honors token and step execution budgets',async()=>{
    const f=fixture();try{
      const state=f.store.create('Inspect');
      const model=sequence([{...request('read_file',{path:'a.ts'}),tokens:50}]);
      const r=await new MissionRunner(f.store,model,new WorkspaceTools(f.root,false,false),{...shortLimits,maxTokens:10}).run(state);
      assert.equal(r.status,'blocked');assert.equal(r.calls,0);assert.match(r.reason,/Token budget/);
    }finally{f.cleanup();}
  });
  it('uses an actual local HTTP OpenAI-compatible tool-call flow',async()=>{
    const f=fixture();let turn=0;
    const server=http.createServer(async(req,res)=>{
      assert.equal(req.url,'/v1/chat/completions');
      let body='';for await(const chunk of req)body+=chunk.toString();
      const json=JSON.parse(body) as {model:string;tools:unknown[]};
      assert.equal(json.model,'test-local');assert.ok(json.tools.length>=4);
      const action=turn++===0 ? {name:'read_file',arguments:JSON.stringify({path:'a.ts'})}
        : {name:'finish',arguments:JSON.stringify({summary:'Reviewed source'})};
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({choices:[{message:{tool_calls:[{function:action}]}}],usage:{total_tokens:10}}));
    });
    try {
      await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
      const address=server.address();assert.ok(address&&typeof address!=='string');
      const model=new OpenAICompatibleModel({url:`http://127.0.0.1:${address.port}/v1/chat/completions`,model:'test-local'});
      const result=await new MissionRunner(f.store,model,new WorkspaceTools(f.root,false,false),shortLimits).run(f.store.create('Review source'));
      assert.equal(result.status,'completed');assert.equal(result.calls,1);assert.equal(result.tokens,20);
    }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));f.cleanup();}
  });
  it('runs a permitted project test before completing a code change',async()=>{
    const f=fixture();try{
      fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({private:true,scripts:{test:'node -e "process.exit(0)"'}}));
      const turns=[request('read_file',{path:'a.ts',start_line:1,max_lines:10}),
        request('write_file',{path:'a.ts',content:'export const x = 3;\n'}),
        request('verify',{check:'test'}),{finish:'Code changed and test executed'}];
      const r=await new MissionRunner(f.store,sequence(turns),new WorkspaceTools(f.root,true,true),shortLimits).run(f.store.create('Fix the value'));
      assert.equal(r.status,'completed');assert.equal(r.tested,true);
    }finally{f.cleanup();}
  });
  it('keeps tests opt-in and exposes honest check results',async()=>{
    const f=fixture();try{
      const tool=new WorkspaceTools(f.root,true,false);
      const r=await tool.execute({name:'verify',arguments:{check:'test'}});
      assert.equal(r.ok,false);assert.equal(r.tested,undefined);
    }finally{f.cleanup();}
  });
  it('binds saved missions to the exact checkout',()=>{
    const f=fixture();try{
      const id=new WorkspaceTools(f.root,false,false).workspaceId;
      const other=path.join(f.base,'other');fs.mkdirSync(other);fs.mkdirSync(path.join(other,'.git'));
      const otherId=new WorkspaceTools(other,false,false).workspaceId;
      const state=f.store.create('Work on this checkout',id);
      assert.equal(f.store.load(state.id,id).workspaceId,id);
      assert.throws(()=>f.store.load(state.id,otherId),/another workspace/);
      assert.throws(()=>f.store.load(f.store.create('Legacy mission').id,id),/workspace binding/);
      assert.ok(!fs.readFileSync(path.join(f.base,'missions',state.id+'.json'),'utf8').includes(f.root));
    }finally{f.cleanup();}
  });
  it('resumes after a long pause while retaining cumulative limits',async()=>{
    const f=fixture();try{
      const state=f.store.create('Read after restart');state.startedAt=Date.now()-3600_000;f.store.save(state);
      const resumed=f.store.load(state.id);
      const model=sequence([request('read_file',{path:'a.ts'}),{finish:'Inspected'}]);
      const result=await new MissionRunner(f.store,model,new WorkspaceTools(f.root,false,false),shortLimits).run(resumed);
      assert.equal(result.status,'completed');assert.equal(result.calls,1);
      assert.equal(result.startedAt,state.startedAt);
    }finally{f.cleanup();}
  });
  it('rejects Windows alternate data streams and reserved device aliases',async()=>{
    const f=fixture();try{
      const tool=new WorkspaceTools(f.root,true,false);
      for(const filename of ['a.ts:secret','CON','NUL.txt','src/COM1','LPT1']) {
        const result=await tool.execute({name:'write_file',arguments:{path:filename,content:'unexpected'}});
        assert.equal(result.ok,false,filename);
      }
    }finally{f.cleanup();}
  });
  it('blocks cloud write attempts when source sharing is not approved',async()=>{
    const f=fixture();try{
      const local=sequence([request('read_file',{path:'a.ts'}),request('read_file',{path:'a.ts'})]);
      const cloud=sequence([request('write_file',{path:'a.ts',content:'export const x = 99;\n'})]);
      const state=f.store.create('Fix a bug');
      const result=await new MissionRunner(f.store,local,new WorkspaceTools(f.root,true,false),shortLimits,cloud,false).run(state);
      assert.equal(result.status,'needs_approval');assert.equal(result.cloudCalls,1);
      assert.match(result.reason,/Cloud adviser attempted a workspace tool/);
      assert.match(fs.readFileSync(path.join(f.root,'a.ts'),'utf8'),/x = 1/);
    }finally{f.cleanup();}
  });
});
