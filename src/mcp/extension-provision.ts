/**
 * Explicitly register an installed, reviewed MCP package in the shared manifest.
 * Client configuration is handled by a separate, previewed synchronization.
 */
import fs from 'node:fs';
import path from 'node:path';
import {detectAgents} from '../agents/detector.js';
import {inspectPath} from '../core/links.js';
import {previewMcpEdit, applyMcpEdit} from '../web/mcp-editor.js';
import type {EnvironmentContext, McpServerSpec} from '../types.js';
import {inspectManagedMcps} from './extension-manager.js';
import {findExistingXerj} from './xerj-binary.js';

const supported=new Set(['playwright','filesystem','fetch','git','xerj']);
function inspectScope(ctx:EnvironmentContext,value:string):string {
  if(typeof value!=='string' || !path.isAbsolute(value) || value.length>450)
    throw new Error('Choose absolute local MCP directories.');
  const resolved=path.resolve(value);
  if(path.parse(resolved).root===resolved || inspectPath(resolved).state!=='directory')
    throw new Error('Choose existing, non-root, physical MCP directories.');
  if(ctx.platform==='win32'&&resolved.startsWith('\\\\'))
    throw new Error('Network MCP directories require manual configuration.');
  return resolved;
}
function specFor(ctx:EnvironmentContext,id:string,agents:string[],requestedRoots:string[]):McpServerSpec {
  if(!supported.has(id))throw new Error('MCP requires manual client provisioning.');
  const status=inspectManagedMcps(ctx).items.find(x=>x.id===id);
  if(!(status?.managed && status.healthy) && !(id==='xerj'&&findExistingXerj(ctx.platform)))
    throw new Error('Install a healthy reviewed MCP package first.');
  if(!Array.isArray(agents) || !agents.length || agents.length>20 || !agents.every(x=>typeof x==='string') ||
     new Set(agents).size!==agents.length)throw new Error('Choose at least one compatible MCP client.');
  const detected=detectAgents(ctx).filter(x=>x.installed&&x.mcpFormat);
  const eligible=new Set(detected.map(x=>x.definition.id));
  if(agents.some(a=>!eligible.has(a)))throw new Error('Choose installed MCP clients only.');
  if(!Array.isArray(requestedRoots)||requestedRoots.length>5 ||
     !requestedRoots.every(x=>typeof x==='string'))throw new Error('Invalid MCP directory selection.');
  if(!['filesystem','git'].includes(id) && requestedRoots.length)
    throw new Error('This MCP does not need directory access.');
  if(['filesystem','git'].includes(id) &&
     (requestedRoots.length<1 || (id==='git'&&requestedRoots.length!==1)))
    throw new Error('This MCP requires explicitly selected directories.');
  const roots=requestedRoots.map(x=>inspectScope(ctx,x));
  if(new Set(roots).size!==roots.length)throw new Error('Duplicate MCP directory.');
  const prefix=path.join(ctx.commonsDir,'mcp-packages',id);
  const bin=ctx.platform==='win32'?'Scripts':'bin';
  const exe=path.join(prefix,'venv',bin,'mcp-server-'+id+(ctx.platform==='win32'?'.exe':''));
  let command:string,args:string[];
  if(id==='xerj'){
    command=status?.healthy?path.join(prefix,ctx.platform==='win32'?'xerj.exe':'xerj'):
      findExistingXerj(ctx.platform)!;
    args=['mcp','--no-autostart'];
  }else if(id==='playwright'){
    command=process.execPath;
    args=[path.join(prefix,'node_modules','@playwright','mcp','cli.js'),'--browser','chromium'];
  }else if(id==='filesystem'){
    command=process.execPath;
    args=[path.join(prefix,'node_modules','@modelcontextprotocol','server-filesystem','dist','index.js'),...roots];
  }else{
    command=exe;
    args=id==='git'?['--repository',roots[0]!]:[];
  }
  if(inspectPath(id==='playwright'||id==='filesystem'?args[0]!:command).state!=='file')
    throw new Error('Managed MCP binary is missing.');
  return {type:'stdio',command,args,agents,excludeAgents:[],enabled:true};
}
export function previewMcpProvision(ctx:EnvironmentContext,id:string,agents:string[],roots:string[]){
  const spec=specFor(ctx,id,agents,roots);
  const plan=previewMcpEdit(ctx,{operation:'create',name:id,spec});
  return {plan,clientCount:agents.length,directoryCount:roots.length,id,
    requiresSeparateSync:true};
}
export function applyMcpProvision(ctx:EnvironmentContext,id:string,agents:string[],roots:string[],revision:string){
  const spec=specFor(ctx,id,agents,roots);
  return applyMcpEdit(ctx,{operation:'create',name:id,spec,expectedRevision:revision});
}
