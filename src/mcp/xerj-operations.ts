/**
 * Optional local XERJ operations in the existing MCP Extension Manager.
 * All paths are allowlisted; no automatic indexing, node start or tool activation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,type ChildProcess} from 'node:child_process';
import {detectAgents} from '../agents/detector.js';
import {SnapshotSession,restoreBackup} from '../core/backup.js';
import {inspectPath,writeFileAtomicSync} from '../core/links.js';
import type {EnvironmentContext} from '../types.js';
import {inspectManagedMcps} from './extension-manager.js';
import {findExistingXerj} from './xerj-binary.js';

const NODE_URL='http://127.0.0.1:9200';
const ROOTS_MAX=8;
const REV=/^[a-f0-9]{64}$/;
interface RootsFile {version:1;roots:string[]}
const activeNodes=new Map<string,ChildProcess>();
const rootFile=(ctx:EnvironmentContext)=>path.join(ctx.commonsDir,'xerj-roots.json');
const hash=(x:string)=>crypto.createHash('sha256').update(x).digest('hex');
const isPhysical=(x:string)=>inspectPath(x).state==='directory';
export function xerjBinary(ctx:EnvironmentContext):string|null {
  const status=inspectManagedMcps(ctx).items.find(x=>x.id==='xerj');
  if(status?.healthy){
    return path.join(ctx.commonsDir,'mcp-packages','xerj',ctx.platform==='win32'?'xerj.exe':'xerj');
  }
  return findExistingXerj(ctx.platform);
}
function checkedRoot(ctx:EnvironmentContext,root:string):string {
  if(typeof root!=='string'||root.length>450||!path.isAbsolute(root))throw new Error('Invalid XERJ indexing root.');
  const resolved=path.resolve(root),parsed=path.parse(resolved);
  if(resolved===parsed.root||!isPhysical(resolved))throw new Error('XERJ root must be an existing physical directory.');
  if(ctx.platform==='win32'&&resolved.startsWith('\\\\'))throw new Error('Network XERJ roots are not supported.');
  const forbidden=[ctx.commonsDir,ctx.backupsDir,ctx.homeDir].map(x=>path.resolve(x));
  if(forbidden.some(f=>resolved===f||f.startsWith(resolved+path.sep)||resolved.startsWith(f+path.sep)&&f!==path.resolve(ctx.homeDir)))
    throw new Error('XERJ root would include private Agent Commons data or the home directory.');
  if(resolved.split(path.sep).some(p=>['.ssh','.gnupg','.aws','.config','.git'].includes(p.toLowerCase())))
    throw new Error('Sensitive XERJ roots are not accepted.');
  return resolved;
}
export function inspectXerjRoots(ctx:EnvironmentContext):{revision:string;roots:string[]} {
  const file=rootFile(ctx);
  if(!['missing','file'].includes(inspectPath(file).state))throw new Error('Unsafe XERJ roots file.');
  const raw=inspectPath(file).state==='file'?fs.readFileSync(file,'utf8'):'';
  if(raw.length>16*1024)throw new Error('Oversized XERJ roots file.');
  const data:unknown=raw?JSON.parse(raw):{version:1,roots:[]};
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid XERJ roots configuration.');
  const obj=data as RootsFile;
  if(obj.version!==1||!Array.isArray(obj.roots)||obj.roots.length>ROOTS_MAX||
    obj.roots.some(r=>typeof r!=='string'||r.length>450)||
    new Set(obj.roots).size!==obj.roots.length)throw new Error('Invalid XERJ roots configuration.');
  return {revision:hash(raw),roots:[...obj.roots]};
}
export function previewXerjRoots(ctx:EnvironmentContext,roots:string[],revision?:string) {
  const current=inspectXerjRoots(ctx);
  if(revision&&current.revision!==revision)throw new Error('XERJ roots changed since preview.');
  if(!Array.isArray(roots)||roots.length>ROOTS_MAX)throw new Error('Too many XERJ indexing roots.');
  const validated=roots.map(r=>checkedRoot(ctx,r));
  if(new Set(validated).size!==validated.length)throw new Error('Duplicate XERJ indexing root.');
  return {revision:current.revision,before:current.roots,after:validated,
    changed:JSON.stringify(current.roots)!==JSON.stringify(validated)};
}
export function saveXerjRoots(ctx:EnvironmentContext,roots:string[],revision:string) {
  if(!REV.test(revision))throw new Error('XERJ roots preview required.');
  const plan=previewXerjRoots(ctx,roots,revision);
  if(!plan.changed)return {changed:false,snapshotId:null};
  if(!['missing','directory'].includes(inspectPath(ctx.commonsDir).state))throw new Error('Unsafe XERJ directory.');
  if(inspectPath(ctx.commonsDir).state==='missing')fs.mkdirSync(ctx.commonsDir);
  const session=new SnapshotSession(ctx,'manual');
  session.recordPathBeforeModify('commons','xerj-roots',rootFile(ctx));
  const snap=session.commitManifest();
  try{
    if(inspectXerjRoots(ctx).revision!==revision)throw new Error('XERJ roots changed since preview.');
    writeFileAtomicSync(rootFile(ctx),JSON.stringify({version:1,roots:plan.after},null,2)+'\n');
  }catch(err){
    try{restoreBackup(ctx,snap.id)}catch{throw new Error('XERJ roots update failed; backup needs manual recovery.')}
    throw err;
  }
  return {changed:true,snapshotId:snap.id};
}
function prefix(root:string):string {return 'ac-'+hash(root.toLowerCase()).slice(0,12)}
function selected(ctx:EnvironmentContext,root:string) {
  const allowed=inspectXerjRoots(ctx).roots;
  const checked=checkedRoot(ctx,root);
  if(!allowed.includes(checked))throw new Error('XERJ indexing root is not approved.');
  return {root:checked,prefix:prefix(checked)};
}
async function invoke(ctx:EnvironmentContext,args:string[],timeoutMs=120000) {
  const binary=xerjBinary(ctx);
  if(!binary)throw new Error('XERJ binary is not installed or detectable.');
  return new Promise<{exitCode:number;output:string}>((resolve,reject)=>{
    const child=spawn(binary,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe'],
      env:{...process.env,XERJ_URL:NODE_URL,XERJ_NO_AUTOSTART:'1'}});
    let output='',total=0,finished=false;
    const done=(e?:Error,code?:number)=>{
      if(finished)return;finished=true;clearTimeout(timer);
      if(e)reject(e);else resolve({exitCode:code??1,output:output.slice(0,25000)});
    };
    const timer=setTimeout(()=>{child.kill();done(new Error('XERJ command timed out.'))},timeoutMs);
    for(const stream of [child.stdout,child.stderr])stream?.on('data',(chunk:Buffer)=>{
      total+=chunk.length;
      if(total>150000){child.kill();done(new Error('XERJ output exceeded safe limit.'));return;}
      output+=chunk.toString('utf8');
    });
    child.once('error',()=>done(new Error('XERJ command could not start.')));
    child.once('close',(code)=>done(undefined,code??1));
  });
}
async function health() {
  try {
    const response=await fetch(NODE_URL+'/_cluster/health',{signal:AbortSignal.timeout(2500)});
    if(response.status===401||response.status===403)return {reachable:true,authRequired:true,healthy:false};
    if(!response.ok)return {reachable:true,authRequired:false,healthy:false};
    const body=await response.json() as {status?:string};
    return {reachable:true,authRequired:false,healthy:['green','yellow'].includes(body.status??'')};
  }catch{return {reachable:false,authRequired:false,healthy:false}}
}
export async function inspectXerj(ctx:EnvironmentContext) {
  const packageState=inspectManagedMcps(ctx).items.find(x=>x.id==='xerj');
  const h=await health(),roots=inspectXerjRoots(ctx);
  return {binaryAvailable:!!xerjBinary(ctx),managed:packageState?.managed??false,
    integrityOk:packageState?.healthy??false,running:activeNodes.has(ctx.commonsDir),
    ...h,roots:roots.roots,revision:roots.revision,
    indices: h.healthy?await listXerjIndices():[]};
}
async function listXerjIndices():Promise<string[]> {
  try{
    const response=await fetch(NODE_URL+'/_cat/indices?format=json',{signal:AbortSignal.timeout(2500)});
    if(!response.ok)return [];
    const data=await response.json() as Array<{index?:string}>;
    return Array.isArray(data)?data.map(x=>x.index??'').filter(x=>/^ac-[a-f0-9]{12}-/.test(x)).slice(0,100):[];
  }catch{return []}
}
export async function startXerj(ctx:EnvironmentContext) {
  if((await health()).reachable)throw new Error('A local XERJ endpoint already exists; refusing to take ownership.');
  if(activeNodes.has(ctx.commonsDir))throw new Error('XERJ local process is already managed.');
  const binary=xerjBinary(ctx);
  if(!binary)throw new Error('XERJ binary is not installed or detectable.');
  const data=path.join(ctx.commonsDir,'xerj-node-data');
  if(!['missing','directory'].includes(inspectPath(data).state))throw new Error('Unsafe XERJ data directory.');
  if(!['missing','directory'].includes(inspectPath(ctx.commonsDir).state))throw new Error('Unsafe XERJ directory.');
  fs.mkdirSync(data,{recursive:true});
  const child=spawn(binary,['--insecure','--bind','127.0.0.1','--port','9200','--data-dir',data],
    {shell:false,windowsHide:true,stdio:'ignore',env:{...process.env,XERJ_BIND_ADDRESS:'127.0.0.1'}});
  activeNodes.set(ctx.commonsDir,child);
  child.once('exit',()=>{if(activeNodes.get(ctx.commonsDir)===child)activeNodes.delete(ctx.commonsDir)});
  child.once('error',()=>{if(activeNodes.get(ctx.commonsDir)===child)activeNodes.delete(ctx.commonsDir)});
  for(let i=0;i<25;i++){
    if(child.exitCode!==null)break;
    await new Promise(resolve=>setTimeout(resolve,400));
    if((await health()).healthy)return {started:true};
  }
  activeNodes.delete(ctx.commonsDir);
  child.kill();
  throw new Error('XERJ failed to become healthy on loopback.');
}
export function stopXerj(ctx:EnvironmentContext) {
  const child=activeNodes.get(ctx.commonsDir);
  if(!child)throw new Error('Only a XERJ process started by this web session can be stopped.');
  activeNodes.delete(ctx.commonsDir);
  child.kill('SIGTERM');
  return {stopping:true};
}
export async function indexXerj(ctx:EnvironmentContext,root:string) {
  const entry=selected(ctx,root);
  if(!(await health()).healthy)throw new Error('XERJ node is not healthy.');
  const result=await invoke(ctx,['autoindex',entry.root,'--url',NODE_URL,'--prefix',entry.prefix],600000);
  if(result.exitCode!==0&&result.exitCode!==3)throw new Error('XERJ indexing failed or requires operator approval; see local CLI.');
  return {indexed:true,completedWithJunk:result.exitCode===3,prefix:entry.prefix};
}
export async function searchXerj(ctx:EnvironmentContext,root:string,query:string) {
  const entry=selected(ctx,root);
  if(typeof query!=='string'||query.length<2||query.length>200||/[\x00-\x1f]/.test(query))
    throw new Error('Invalid XERJ search query.');
  if(!(await health()).healthy)throw new Error('XERJ node is not healthy.');
  const result=await invoke(ctx,['search',query,'--prefix',entry.prefix,'--url',NODE_URL],30000);
  if(result.exitCode!==0)throw new Error('XERJ search failed.');
  return {results:result.output.slice(0,12000),empty:!result.output.trim()};
}
export async function removeXerj(ctx:EnvironmentContext,root:string,yes=false) {
  const entry=selected(ctx,root);
  if(!(await health()).healthy)throw new Error('XERJ node is not healthy.');
  const result=await invoke(ctx,['autoindex','remove','--prefix',entry.prefix,'--root',entry.root,'--url',NODE_URL,...(yes?['--yes']:[])],30000);
  if(result.exitCode!==0)throw new Error('XERJ index removal failed.');
  return {removed:yes,preview:yes?undefined:result.output.slice(0,4000)};
}
export function detectedXerjClients(ctx:EnvironmentContext):string[] {
  return detectAgents(ctx).filter(x=>x.installed&&x.mcpFormat).map(x=>x.definition.id);
}
