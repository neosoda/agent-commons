/**
 * Safe local MCP manifest editor. Never returns command arguments, URLs or env values
 * to the browser. Existing entries can only be changed via routing fields; secret
 * values and vendor extensions stay byte-for-byte intact via JSONC AST edits.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { applyEdits, modify, parseTree, type Node } from 'jsonc-parser';
import { detectAgents } from '../agents/detector.js';
import { SnapshotSession, restoreBackup } from '../core/backup.js';
import { inspectPath, writeFileAtomicSync } from '../core/links.js';
import { isValidIdentifier } from '../security/validator.js';
import { detectJsoncStyle, parseJsoncObject } from '../sync/parsers.js';
import type { EnvironmentContext, McpServerSpec } from '../types.js';

type Dict = Record<string, unknown>;
export type EditorOperation = 'create' | 'configure' | 'delete';
export interface McpEditorRequest {
  operation: EditorOperation;
  name: string;
  spec?: unknown;
  routing?: unknown;
  expectedRevision?: string;
}
export interface McpEditorServer {
  name: string;
  transport: string;
  enabled: boolean;
  argsCount: number;
  envKeyCount: number;
  agents: string[];
  excludeAgents: string[];
  hasOverrides: boolean;
}
export interface McpEditorOverview {
  revision: string;
  servers: McpEditorServer[];
  agents: Array<{id: string; name: string; installed: boolean}>;
}
export interface McpEditorPlan {
  operation: EditorOperation;
  name: string;
  expectedRevision: string;
  changed: boolean;
  before: McpEditorServer | null;
  after: McpEditorServer | null;
}
const MAX_CONFIG = 256 * 1024;
const REVISION = /^[a-f0-9]{64}$/;
function obj(value: unknown): value is Dict {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function ident(id: unknown): string {
  if (typeof id !== 'string' || !isValidIdentifier(id) ||
    id === '__proto__' || id === 'constructor' || id === 'prototype') {
    throw new Error('Invalid MCP server identifier.');
  }
  return id;
}
function stringArray(value: unknown, allowed: Set<string>): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50 ||
      !value.every(id => typeof id === 'string' && allowed.has(id)) ||
      new Set(value).size !== value.length) {
    throw new Error('Invalid or duplicate agent selection.');
  }
  return value as string[];
}
function checkedRouting(value: unknown, ctx: EnvironmentContext): Pick<McpServerSpec,'agents'|'excludeAgents'|'enabled'> {
  if (!obj(value) || Object.keys(value).some(k => !['agents','excludeAgents','enabled'].includes(k))) {
    throw new Error('Only agent routing and enabled status may be edited.');
  }
  if (value['enabled'] !== undefined && typeof value['enabled'] !== 'boolean') {
    throw new Error('Invalid enabled status.');
  }
  const agents = new Set(detectAgents(ctx).map(a => a.definition.id));
  const include = stringArray(value['agents'], agents);
  const exclude = stringArray(value['excludeAgents'], agents);
  if (include.some(x => exclude.includes(x))) throw new Error('An agent cannot be both included and excluded.');
  return { agents: include, excludeAgents: exclude, enabled: value['enabled'] !== false };
}
function checkedSpec(value: unknown, ctx: EnvironmentContext): McpServerSpec {
  if (!obj(value)) throw new Error('Invalid MCP configuration.');
  if (Object.keys(value).some(k => !['type','command','args','url','env','agents','excludeAgents','enabled'].includes(k))) {
    throw new Error('Unsupported MCP configuration field.');
  }
  const routing = checkedRouting({
    agents: value['agents'], excludeAgents: value['excludeAgents'], enabled: value['enabled']
  },ctx);
  const type = value['type'];
  if (!['stdio','http','sse'].includes(type as string)) throw new Error('Choose stdio, http or sse transport.');
  let command: string | undefined;
  let args: string[] | undefined;
  let url: string | undefined;
  if (type === 'stdio') {
    if (typeof value['command'] !== 'string' || !value['command'].trim() || value['command'].length > 300 ||
        value['url'] !== undefined) throw new Error('stdio requires a command and no URL.');
    command = value['command'];
    if (!Array.isArray(value['args']) || value['args'].length > 30 ||
      !value['args'].every(arg => typeof arg === 'string' && arg.length <= 500)) {
      throw new Error('Invalid command arguments.');
    }
    args = value['args'] as string[];
  } else {
    if (typeof value['url'] !== 'string' || value['url'].length > 2000 ||
        value['command'] !== undefined || value['args'] !== undefined) {
      throw new Error('Remote MCP requires a URL and no command arguments.');
    }
    const parsed = new URL(value['url']);
    if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.search || parsed.hash) throw new Error('Use an HTTP(S) URL without embedded credentials, query or fragments.');
    url = parsed.toString();
  }
  const env: Record<string,string> = Object.create(null) as Record<string,string>;
  if (value['env'] !== undefined) {
    if (!obj(value['env']) || Object.keys(value['env']).length > 30) throw new Error('Invalid environment variables.');
    for (const [key,val] of Object.entries(value['env'])) {
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,99}$/.test(key) ||
        typeof val !== 'string' || !/^\$\{[A-Z_][A-Z0-9_]*\}$/.test(val)) {
        throw new Error('Only environment-variable references are accepted. Never paste plaintext secrets.');
      }
      env[key] = val;
    }
  }
  return { type: type as 'stdio'|'http'|'sse', ...(command ? {command,args} : {url}),
    ...(Object.keys(env).length ? {env} : {}), ...routing };
}
function describe(name: string, value: unknown): McpEditorServer {
  const s = value as McpServerSpec;
  return {name, transport: s.type ?? (s.url ? 'http' : 'stdio'),
    enabled:s.enabled !== false, argsCount:Array.isArray(s.args)?s.args.length:0,
    envKeyCount:obj(s.env)?Object.keys(s.env).length:0,
    agents:Array.isArray(s.agents)?s.agents.filter(v => typeof v === 'string'):[],
    excludeAgents:Array.isArray(s.excludeAgents)?s.excludeAgents.filter(v=>typeof v==='string'):[],
    hasOverrides:!!s.agentOverrides && Object.keys(s.agentOverrides).length>0};
}
/**
 * JSON.parse accepts duplicate keys (last wins), while JSONC edits can target
 * a different occurrence. Reject ambiguous objects before any edit.
 */
function rejectDuplicateKeys(raw: string): void {
  const root = parseTree(raw.replace(/^\uFEFF/, ''));
  const visit = (node: Node | undefined): void => {
    if (!node) return;
    if (node.type === 'object') {
      const seen = new Set<string>();
      for (const property of node.children ?? []) {
        const key = property.children?.[0]?.value;
        if (typeof key === 'string') {
          if (seen.has(key)) throw new Error('Duplicate JSONC properties are not safe to edit.');
          seen.add(key);
        }
        visit(property.children?.[1]);
      }
    } else {
      for (const child of node.children ?? []) visit(child);
    }
  };
  visit(root);
}
function load(ctx: EnvironmentContext): {revision:string; raw:string; field:'mcpServers'|'servers'; servers:Dict} {
  if (inspectPath(ctx.homeDir).state !== 'directory') throw new Error('Home directory must be physical.');
  if (!['directory','missing'].includes(inspectPath(ctx.commonsDir).state)) throw new Error('Shared MCP directory is linked or invalid.');
  const info = inspectPath(ctx.centralMcpPath);
  if (!['file','missing'].includes(info.state)) throw new Error('Shared MCP file is linked or invalid.');
  if (info.state === 'file' && fs.statSync(ctx.centralMcpPath).size > MAX_CONFIG) {
    throw new Error('Shared MCP file is too large for safe editing.');
  }
  const raw = info.state === 'file' ? fs.readFileSync(ctx.centralMcpPath,'utf8') : '';
  const revision = crypto.createHash('sha256').update(info.state + '\0' + raw).digest('hex');
  const root = raw ? parseJsoncObject(raw) : {};
  if (raw) rejectDuplicateKeys(raw);
  if ('mcpServers' in root && 'servers' in root) {
    throw new Error('Ambiguous manifest: both mcpServers and servers exist.');
  }
  const field = 'servers' in root ? 'servers' : 'mcpServers';
  const servers:unknown = root[field] ?? {};
  if (!obj(servers)) throw new Error('MCP servers must be an object.');
  for (const [name, server] of Object.entries(servers)) {
    ident(name);
    if (!obj(server) || (typeof server['command'] !== 'string' && typeof server['url'] !== 'string')) {
      throw new Error('Existing MCP server configuration is malformed.');
    }
  }
  return {revision,raw,field,servers};
}
export function mcpEditorOverview(ctx: EnvironmentContext): McpEditorOverview {
  const {revision,servers}=load(ctx);
  return {revision,servers:Object.entries(servers).sort(([a],[b])=>a.localeCompare(b)).map(([name,val])=>describe(name,val)),
    agents:detectAgents(ctx).map(a=>({id:a.definition.id,name:a.definition.name,installed:a.installed}))};
}
function prepare(ctx: EnvironmentContext, request:McpEditorRequest): {plan:McpEditorPlan;text:string} {
  const name=ident(request.name);
  const current=load(ctx);
  if (!['create','configure','delete'].includes(request.operation)) throw new Error('Unknown MCP editor action.');
  if (request.expectedRevision !== undefined &&
      (!REVISION.test(request.expectedRevision) || request.expectedRevision !== current.revision)) {
    throw new Error('MCP manifest changed since preview. Refresh and retry.');
  }
  const before = Object.prototype.hasOwnProperty.call(current.servers,name) ?
    describe(name,current.servers[name]) : null;
  if (request.operation === 'create' && before) throw new Error('MCP server already exists.');
  if (request.operation !== 'create' && !before) throw new Error('MCP server does not exist.');
  if (request.operation === 'delete' && (request.spec !== undefined || request.routing !== undefined)) {
    throw new Error('Delete does not accept replacement fields.');
  }
  if (request.operation === 'configure' && request.spec !== undefined) {
    throw new Error('Existing commands and secrets cannot be replaced in the routing editor.');
  }
  const value = request.operation === 'create' ? checkedSpec(request.spec,ctx) :
    request.operation === 'configure' ? checkedRouting(request.routing,ctx) : undefined;
  const after = request.operation === 'delete' ? null :
    request.operation === 'create' ? describe(name,value) :
    describe(name,{...(current.servers[name] as McpServerSpec),...value});
  const old = current.raw || '{\n  "mcpServers": {}\n}\n';
  const style = detectJsoncStyle(old);
  let text = style.body;
  const settings={formattingOptions:{insertSpaces:!style.indentUnit.includes('\t'),
    tabSize:style.indentUnit.includes('\t')?2:style.indentUnit.length,
    eol:style.eol}};
  if (request.operation === 'create' || request.operation === 'delete') {
    text=applyEdits(text,modify(text,[current.field,name],value,settings));
  } else {
    // Edit only these leaf keys. Preserve comments, unknown fields and secret values.
    for(const key of ['agents','excludeAgents','enabled'] as const) {
      text=applyEdits(text,modify(text,[current.field,name,key],value?.[key],settings));
    }
  }
  const rendered=(style.hasBom?'\uFEFF':'')+text;
  // Validate the resulting syntax and re-run manifest validation on the next overview.
  parseJsoncObject(rendered);
  return {plan:{operation:request.operation,name,expectedRevision:current.revision,
    changed:rendered!==current.raw,before,after},text:rendered};
}
export function previewMcpEdit(ctx:EnvironmentContext,request:McpEditorRequest):McpEditorPlan {
  return prepare(ctx,request).plan;
}
export function applyMcpEdit(ctx:EnvironmentContext,request:McpEditorRequest):{plan:McpEditorPlan;snapshotId:string|null} {
  if (!request.expectedRevision || !REVISION.test(request.expectedRevision)) {
    throw new Error('A valid preview revision is required to apply.');
  }
  const prepared=prepare(ctx,request);
  if (!prepared.plan.changed) return {plan:prepared.plan,snapshotId:null};
  const snapshot=new SnapshotSession(ctx,'manual');
  snapshot.recordPathBeforeModify('commons','mcp-config',ctx.centralMcpPath);
  const manifest=snapshot.commitManifest();
  try {
    if (load(ctx).revision!==request.expectedRevision) {
      throw new Error('MCP manifest changed during the backup. Refresh and retry.');
    }
    writeFileAtomicSync(ctx.centralMcpPath,prepared.text);
    const verify=load(ctx);
    if (request.operation==='delete' ? (prepared.plan.name in verify.servers) :
      !(prepared.plan.name in verify.servers)) {
      throw new Error('MCP editor post-write validation failed.');
    }
  } catch(error) {
    try {restoreBackup(ctx,manifest.id);} catch(rollback) {
      throw new Error('MCP save failed and rollback failed. Recover using snapshot '+manifest.id+'.',{cause:rollback});
    }
    throw error;
  }
  return {plan:prepared.plan,snapshotId:manifest.id};
}
