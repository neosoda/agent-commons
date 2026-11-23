/**
 * Reviewed MCP package lifecycle, isolated from the agent-specific MCP configuration.
 * No package or script executes during catalog browsing.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {inspectPath, writeFileAtomicSync} from '../core/links.js';
import {stageXerjBinary} from './xerj-binary.js';
import {MCP_CATALOG} from './catalog.js';
import {readAgentMcpServers,type McpLaunchSpec} from './health.js';
import {detectAgents} from '../agents/detector.js';
import {loadCentralMcpManifest} from '../sync/mcp.js';
import type {EnvironmentContext} from '../types.js';

type Manager = 'npm' | 'uv' | 'binary';
type Operation = 'install' | 'update' | 'repair' | 'uninstall';
interface Receipt {version:string; package:string; manager:Manager; installedAt:string; entrySha256:string}
interface Store {version:1; packages:Record<string,Receipt>}
type Runner = (command:string,args:string[],cwd:string)=>Promise<void>;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const packageRoot = (ctx:EnvironmentContext) => path.join(ctx.commonsDir,'mcp-packages');
const receiptFile = (ctx:EnvironmentContext) => path.join(ctx.commonsDir,'mcp-installations.json');
const hash = (s:string) => crypto.createHash('sha256').update(s).digest('hex');
function binaryHash(file:string):string {
  if(inspectPath(file).state!=='file')return '';
  const size=fs.statSync(file).size;
  if(size>200*1024*1024)return '';
  const fd=fs.openSync(file,'r');
  try{
    const hasher=crypto.createHash('sha256'),chunk=Buffer.allocUnsafe(1024*1024);
    let read=0;
    while((read=fs.readSync(fd,chunk,0,chunk.length,null))>0)hasher.update(chunk.subarray(0,read));
    return hasher.digest('hex');
  }finally{fs.closeSync(fd)}
}
const stateOf = (p:string) => inspectPath(p).state;
const physical = (p:string) => ['missing','directory'].includes(stateOf(p));

function paths(ctx:EnvironmentContext):void {
  if (stateOf(ctx.homeDir)!=='directory' || !physical(ctx.commonsDir) ||
      !physical(packageRoot(ctx)) || !['missing','file'].includes(stateOf(receiptFile(ctx)))) {
    throw new Error('Unsafe MCP package store.');
  }
}
function read(ctx:EnvironmentContext):{raw:string;store:Store} {
  paths(ctx);
  const file = receiptFile(ctx);
  const raw = stateOf(file)==='file' ? fs.readFileSync(file,'utf8') : '';
  if(raw.length>128*1024)throw new Error('Invalid managed MCP receipt.');
  const data:unknown = raw ? JSON.parse(raw) : {version:1,packages:{}};
  if(!data || typeof data!=='object' || Array.isArray(data) ||
     (data as Store).version!==1 || typeof (data as Store).packages!=='object' ||
     !(data as Store).packages || Array.isArray((data as Store).packages))
    throw new Error('Invalid managed MCP receipt.');
  const store=data as Store;
  if(Object.entries(store.packages).length>100)throw new Error('Invalid managed MCP receipt.');
  for(const [id,r] of Object.entries(store.packages)){
    if(!ID.test(id) || !r || typeof r!=='object' ||
       !['npm','uv','binary'].includes(r.manager) || typeof r.version!=='string' ||
       typeof r.package!=='string' || typeof r.installedAt!=='string' ||
       typeof r.entrySha256!=='string' || !/^[a-f0-9]{64}$/.test(r.entrySha256))
      throw new Error('Invalid managed MCP receipt.');
  }
  return {raw,store};
}
function entry(ctx:EnvironmentContext,id:string):string {
  if(!ID.test(id) || !MCP_CATALOG.some(m=>m.id===id))throw new Error('Unknown reviewed MCP package.');
  return path.join(packageRoot(ctx),id);
}
function runnerCommand(ctx:EnvironmentContext,manager:Manager):{command:string;args:string[]} {
  if(manager==='uv')return {command:'uv',args:[]};
  if(ctx.platform!=='win32')return {command:'npm',args:[]};
  // The Windows portable bundle ships Node, but not necessarily npm. Also look
  // for npm beside a separate Node installation on PATH, without invoking a shell.
  const directories=[path.dirname(process.execPath),...(process.env['PATH']??'').split(path.delimiter)];
  const npmCli=directories.filter(dir=>path.isAbsolute(dir)).map(dir=>path.join(dir,'node_modules','npm','bin','npm-cli.js'))
    .find(candidate=>inspectPath(candidate).state==='file');
  if(!npmCli)throw new Error('Node.js npm CLI is required to install this MCP.');
  return {command:process.execPath,args:[npmCli]};
}
// CreateProcess rejects a working directory longer than MAX_PATH (ENOENT), even
// when long paths are enabled. npm/uv receive absolute --prefix/--python targets,
// so a short temporary working directory is equivalent for deep home folders.
export function processCwd(cwd:string,platform:NodeJS.Platform=process.platform):string {
  return platform==='win32'&&path.resolve(cwd).length>=248?os.tmpdir():cwd;
}
const run:Runner = (command,args,cwd)=>new Promise((resolve,reject)=>{
  const child=spawn(command,args,{cwd:processCwd(cwd),shell:false,windowsHide:true,stdio:['ignore','ignore','ignore']});
  const timer=setTimeout(()=>{child.kill();reject(new Error('MCP package installation timed out.'));},180000);
  child.once('error',()=>{clearTimeout(timer);reject(new Error('Required MCP package manager is unavailable.'));});
  child.once('close',code=>{clearTimeout(timer);if(code===0)resolve();else reject(new Error('MCP package manager failed.'));});
});
function recipe(id:string){
  const item=MCP_CATALOG.find(x=>x.id===id);
  if(!item || !item.packageName || !item.version ||
     !['reviewed-npm','reviewed-uv','reviewed-binary'].includes(item.installation) ||
     !/^[0-9][0-9A-Za-z.+-]*$/.test(item.version))throw new Error('MCP requires manual installation or upstream review.');
  return {item,manager:(item.installation==='reviewed-npm'?'npm':item.installation==='reviewed-uv'?'uv':'binary') as Manager,
    version:item.version,packageName:item.packageName};
}
function program(ctx:EnvironmentContext,id:string,base:string,manager:Manager):string {
  if(manager==='binary'){
    if(id!=='xerj')throw new Error('No vetted MCP binary entry point.');
    return path.join(base,ctx.platform==='win32'?'xerj.exe':'xerj');
  }
  if(manager==='uv'){
    const bin=ctx.platform==='win32'?'Scripts':'bin';
    const name=ctx.platform==='win32'?id+'.exe':'mcp-server-'+id;
    // Fetch and Git are the only curated uv packages.
    return path.join(base,'venv',bin,ctx.platform==='win32'?'mcp-server-'+id+'.exe':name);
  }
  if(id==='playwright')return path.join(base,'node_modules','@playwright','mcp','cli.js');
  if(id==='filesystem')return path.join(base,'node_modules','@modelcontextprotocol','server-filesystem','dist','index.js');
  throw new Error('No vetted MCP package entry point.');
}
export function inspectManagedMcps(ctx:EnvironmentContext){
  const {raw,store}=read(ctx);
  return {revision:hash(raw),items:MCP_CATALOG.map(item=>{
    const installed=store.packages[item.id]??null;
    const target=entry(ctx,item.id),folder=stateOf(target);
    const managed=installed!==null;
    const expected=managed?program(ctx,item.id,target,installed.manager):'';
    const healthy=managed&&folder==='directory'&&binaryHash(expected)===installed.entrySha256;
    return {id:item.id,manager:installed?.manager??null,installedVersion:installed?.version??null,
      reviewedVersion:item.version,managed,healthy,unmanaged:!managed&&folder!=='missing',
      updateAvailable:healthy&&!!item.version&&item.version!==installed?.version,
      canInstall:['reviewed-npm','reviewed-uv','reviewed-binary'].includes(item.installation),
      risk:item.risk,configured:false};
  })};
}
/**
 * Lists the configurations (central manifest, native clients) whose command or arguments point
 * inside this managed package folder, so an uninstall can warn about entries it would break.
 * Read-only; returns labels only, never commands, arguments or environment values.
 */
export function findPackageReferences(ctx:EnvironmentContext,id:string):string[] {
  const folder=path.resolve(entry(ctx,id)).toLowerCase();
  const inside=(spec:McpLaunchSpec)=>[spec.command??'',...(spec.args??[])]
    .some(v=>typeof v==='string'&&path.isAbsolute(v)&&(path.resolve(v).toLowerCase()+path.sep).startsWith(folder+path.sep));
  const labels:string[]=[];
  const central=loadCentralMcpManifest(ctx);
  if(central.status==='valid'&&Object.values(central.manifest.mcpServers).some(inside))labels.push('Central MCP manifest');
  for(const agent of detectAgents(ctx)){
    if(!agent.installed)continue;
    try{ if(Object.values(readAgentMcpServers(agent)).some(inside))labels.push(agent.definition.name); }
    catch{ /* corrupted configs are reported by doctor */ }
  }
  return labels;
}
export function previewManagedMcp(ctx:EnvironmentContext,id:string,operation:Operation){
  const {raw,store}=read(ctx);
  const target=entry(ctx,id);
  const previous=store.packages[id]??null;
  const recipeData=recipe(id);
  const folder=stateOf(target);
  const entryHash=previous&&folder==='directory'?binaryHash(program(ctx,id,target,previous.manager)):'';
  if(!['install','update','repair','uninstall'].includes(operation))throw new Error('Unknown MCP package operation.');
  if(operation==='install'&&(previous||folder!=='missing'))throw new Error('MCP package already exists.');
  if(operation!=='install'&&!previous)throw new Error('MCP package is not managed by Agent Commons.');
  if(previous && folder!=='directory' && operation!=='repair' && operation!=='uninstall')
    throw new Error('Managed MCP package folder is missing or unsafe.');
  if(folder==='link'||folder==='file')throw new Error('Unsafe managed MCP package path.');
  if(operation==='update'&&previous?.version===recipeData.version)throw new Error('MCP package is already at reviewed version.');
  return {id,operation,manager:recipeData.manager,packageName:recipeData.packageName,
    previousVersion:previous?.version??null,reviewedVersion:recipeData.version,
    revision:hash(raw+'\0'+folder+'\0'+entryHash+'\0'+(previous?.version??'')),
    risk:recipeData.item.risk,requirements:recipeData.item.requirements,
    // Package installation alone never edits or launches native MCP clients.
    affectsNativeClients:false,
    referencedBy:operation==='uninstall'?findPackageReferences(ctx,id):[]};
}
export async function applyManagedMcp(ctx:EnvironmentContext,id:string,operation:Operation,
                                      expectedRevision:string,execute:Runner=run){
  if(!/^[a-f0-9]{64}$/.test(expectedRevision))throw new Error('MCP package preview required.');
  const plan=previewManagedMcp(ctx,id,operation);
  if(plan.revision!==expectedRevision)throw new Error('MCP package changed since preview.');
  const {store}=read(ctx);
  const root=packageRoot(ctx);
  if(stateOf(ctx.commonsDir)==='missing')fs.mkdirSync(ctx.commonsDir);
  if(stateOf(root)==='missing')fs.mkdirSync(root);
  paths(ctx);
  const destination=entry(ctx,id);
  const stage=path.join(root,'.stage-'+id+'-'+crypto.randomBytes(6).toString('hex'));
  const backup=path.join(root,'.rollback-'+id+'-'+crypto.randomBytes(6).toString('hex'));
  let moved=false,placed=false;
  try {
    if(operation!=='uninstall'){
      fs.mkdirSync(stage,{recursive:false});
      const r=recipe(id);
      if(r.manager==='binary'){
        await stageXerjBinary(stage,ctx.platform);
      }else if(r.manager==='npm'){
        const command=runnerCommand(ctx,r.manager);
        await execute(command.command,[...command.args,'install','--prefix',stage,
          '--ignore-scripts','--no-audit','--no-fund','--save-exact',
          r.packageName+'@'+r.version],stage);
      }else{
        const command=runnerCommand(ctx,r.manager);
        const venv=path.join(stage,'venv');
        await execute(command.command,['venv',venv],stage);
        const python=path.join(venv,ctx.platform==='win32'?'Scripts':'bin',
          ctx.platform==='win32'?'python.exe':'python');
        await execute(command.command,['pip','install','--python',python,'--only-binary',':all:',
          r.packageName+'=='+r.version],stage);
      }
      if(stateOf(program(ctx,id,stage,r.manager))!=='file')
        throw new Error('Reviewed MCP entry point not present after installation.');
    }
    // Recheck after the network operation: never clobber a concurrent change.
    if(previewManagedMcp(ctx,id,operation).revision!==expectedRevision)
      throw new Error('MCP package changed since preview.');
    if(stateOf(destination)==='directory'){fs.renameSync(destination,backup);moved=true;}
    if(operation!=='uninstall'){fs.renameSync(stage,destination);placed=true;
      const recipeData=recipe(id);
      store.packages[id]={version:recipeData.version,package:recipeData.packageName,
        manager:recipeData.manager,installedAt:new Date().toISOString(),
        entrySha256:binaryHash(program(ctx,id,destination,recipeData.manager))};
    }else delete store.packages[id];
    writeFileAtomicSync(receiptFile(ctx),JSON.stringify(store,null,2)+'\n');
    if(moved){try{fs.rmSync(backup,{recursive:true,force:true})}catch{/* Recovery files remain on disk. */}}
    return {applied:true,id,operation,version:store.packages[id]?.version??null};
  }catch(err){
    if(placed && stateOf(destination)==='directory')fs.rmSync(destination,{recursive:true,force:true});
    if(moved&&stateOf(backup)==='directory')fs.renameSync(backup,destination);
    throw err;
  }finally{
    if(stateOf(stage)==='directory')fs.rmSync(stage,{recursive:true,force:true});
  }
}
