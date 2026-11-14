/**
 * Local-first MCP inventory and profile allowlists.
 * No tool execution, package installation or native-config mutation on discovery.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { detectAgents } from '../agents/detector.js';
import { inspectPath, writeFileAtomicSync } from '../core/links.js';
import { SnapshotSession, restoreBackup } from '../core/backup.js';
import { loadCentralMcpManifest, inspectAgentMcpConfig } from '../sync/mcp.js';
import { runSync } from '../commands/sync.js';
import type { EnvironmentContext, SyncReport } from '../types.js';
import { MCP_CATALOG, MCP_PRESETS } from './catalog.js';

const VALID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WEB = new Set(['fetch','web-search','osint']);
const PRIVILEGED = new Set(['docker-mcp-gateway']);
const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
export interface McpProfile { servers: string[]; agents: string[] }
export interface McpProfiles { version: 1; profiles: Record<string,McpProfile> }
export interface McpProfilesState { revision: string; data: McpProfiles }

const fileAt = (ctx: EnvironmentContext) => path.join(ctx.commonsDir, 'mcp-profiles.json');
function checkPaths(ctx: EnvironmentContext): void {
  if (inspectPath(ctx.homeDir).state !== 'directory' ||
      !['missing','directory'].includes(inspectPath(ctx.commonsDir).state) ||
      !['missing','file'].includes(inspectPath(fileAt(ctx)).state)) {
    throw new Error('Unsafe MCP profile path.');
  }
}
function rawProfileFile(ctx: EnvironmentContext): string {
  checkPaths(ctx);
  if (inspectPath(fileAt(ctx)).state === 'missing') return '';
  if (fs.lstatSync(fileAt(ctx)).size > 128 * 1024) throw new Error('MCP profile file too large.');
  return fs.readFileSync(fileAt(ctx),'utf8');
}
const hash = (content: string) => crypto.createHash('sha256').update(content || 'missing').digest('hex');
function validate(ctx: EnvironmentContext, item: unknown): McpProfile {
  if (!isObject(item) || Object.keys(item).sort().join(',') !== 'agents,servers' ||
      !Array.isArray(item['agents']) || !Array.isArray(item['servers'])) {
    throw new Error('Invalid MCP profile.');
  }
  const agents = item['agents'] as unknown[];
  const servers = item['servers'] as unknown[];
  const allowed = new Set(detectAgents(ctx).filter(a => a.mcpFormat).map(a => a.definition.id));
  if (!agents.length || !servers.length || agents.length > allowed.size || servers.length > 32 ||
      !agents.every(x => typeof x === 'string' && allowed.has(x)) ||
      !servers.every(x => typeof x === 'string' && VALID.test(x)) ||
      new Set(agents).size !== agents.length || new Set(servers).size !== servers.length) {
    throw new Error('Invalid MCP profile selection.');
  }
  if (servers.some(x => WEB.has(x as string)) && servers.some(x => PRIVILEGED.has(x as string))) {
    throw new Error('Cannot combine untrusted OSINT and sensitive infrastructure MCP.');
  }
  return { agents: (agents as string[]).slice().sort(), servers: (servers as string[]).slice().sort() };
}
export function readMcpProfiles(ctx: EnvironmentContext): McpProfilesState {
  const raw = rawProfileFile(ctx);
  const data: unknown = raw ? JSON.parse(raw) : {version:1,profiles:{}};
  if (!isObject(data) || data['version'] !== 1 ||
      !isObject(data['profiles']) || Object.keys(data).sort().join(',') !== 'profiles,version' ||
      Object.keys(data['profiles']).length > 30) throw new Error('Invalid MCP profile file.');
  const profiles: Record<string,McpProfile> = Object.create(null) as Record<string,McpProfile>;
  for (const [name,item] of Object.entries(data['profiles'])) {
    if (!VALID.test(name) || name.length > 64 || Object.hasOwn(MCP_PRESETS,name)) {
      throw new Error('Invalid custom MCP profile name.');
    }
    profiles[name] = validate(ctx,item);
  }
  return { revision: hash(raw), data: {version:1,profiles} };
}
export function previewMcpProfile(ctx: EnvironmentContext, name: string, value: unknown,
                                  expectedRevision?: string) {
  if (!VALID.test(name) || name.length > 64 || Object.hasOwn(MCP_PRESETS,name)) {
    throw new Error('Invalid custom MCP profile name.');
  }
  const current = readMcpProfiles(ctx);
  if (expectedRevision && current.revision !== expectedRevision) {
    throw new Error('MCP profile changed since preview.');
  }
  const profile = validate(ctx,value);
  const central = loadCentralMcpManifest(ctx);
  if (central.status === 'corrupted') throw new Error('Central MCP configuration is invalid.');
  if (profile.servers.some(server => !Object.hasOwn(central.manifest.mcpServers,server))) {
    throw new Error('MCP profile references unconfigured server.');
  }
  const before = current.data.profiles[name] ?? null;
  return { name, profile, before, revision: current.revision,
    changed: JSON.stringify(profile) !== JSON.stringify(before) };
}
/** Save through the existing recoverable snapshot path. */
function persistMcpProfiles(ctx: EnvironmentContext, data: McpProfiles, expectedRevision: string): string {
  const session = new SnapshotSession(ctx, 'manual');
  session.recordPathBeforeModify('commons', 'mcp-profile', fileAt(ctx));
  const snapshot = session.commitManifest();
  try {
    if (readMcpProfiles(ctx).revision !== expectedRevision) {
      throw new Error('MCP profile changed since preview.');
    }
    writeFileAtomicSync(fileAt(ctx), JSON.stringify(data, null, 2) + '\n');
    readMcpProfiles(ctx); // Validate the saved file before treating it as committed.
  } catch (error) {
    try { restoreBackup(ctx, snapshot.id); }
    catch (rollback) {
      throw new Error('MCP profile save failed and snapshot restore is incomplete.', {cause: rollback});
    }
    throw error;
  }
  return snapshot.id;
}
export function saveMcpProfile(ctx: EnvironmentContext,name: string,value: unknown,
                               expectedRevision: string) {
  if (!/^[a-f0-9]{64}$/.test(expectedRevision)) throw new Error('MCP profile preview required.');
  const plan = previewMcpProfile(ctx,name,value,expectedRevision);
  if (!plan.changed) return {...plan, snapshotId:null};
  const updated = readMcpProfiles(ctx);
  if (updated.revision !== expectedRevision) throw new Error('MCP profile changed since preview.');
  updated.data.profiles[name] = plan.profile;
  if (inspectPath(ctx.commonsDir).state === 'missing') fs.mkdirSync(ctx.commonsDir);
  checkPaths(ctx);
  const snapshotId = persistMcpProfiles(ctx, updated.data, expectedRevision);
  return {...plan, snapshotId};
}
export function deleteMcpProfile(ctx: EnvironmentContext,name: string,expectedRevision: string) {
  if (!VALID.test(name) || Object.hasOwn(MCP_PRESETS,name)) throw new Error('Invalid custom MCP profile name.');
  const state = readMcpProfiles(ctx);
  if (state.revision !== expectedRevision) throw new Error('MCP profile changed since preview.');
  if (!Object.hasOwn(state.data.profiles,name)) throw new Error('Unknown MCP profile.');
  delete state.data.profiles[name];
  return { snapshotId: persistMcpProfiles(ctx, state.data, expectedRevision) };
}
export function inspectMcpControlCenter(ctx: EnvironmentContext) {
  const agents = detectAgents(ctx);
  const central = loadCentralMcpManifest(ctx);
  const profiles = readMcpProfiles(ctx);
  const clients = agents.filter(a=>a.mcpFormat).map(a=>{
    const report=inspectAgentMcpConfig(a);
    return {id:a.definition.id,name:a.definition.name,installed:a.installed,
      status:report.status,servers:report.serverNames,format:a.mcpFormat};
  });
  const counts = new Map<string,number>();
  for (const client of clients.filter(x=>x.installed)) {
    for (const server of client.servers) counts.set(server,(counts.get(server)??0)+1);
  }
  const catalog = MCP_CATALOG.map(({example,...entry})=>({
    ...entry,
    configured:Object.hasOwn(central.manifest.mcpServers,entry.id),
    detected:clients.some(client=>client.installed&&client.servers.includes(entry.id))
  }));
  return {catalog,clients,profiles,presets:MCP_PRESETS,centralStatus:central.status,
    centralNames:Object.keys(central.manifest.mcpServers).sort(),
    sharedNames:[...counts].filter(([,n])=>n>1).map(([name,count])=>({name,count})),
    unmanaged:clients.map(client=>({id:client.id,servers:client.servers.filter(x=>!Object.hasOwn(central.manifest.mcpServers,x))}))};
}
export function runMcpProfileSync(ctx: EnvironmentContext,name: string,
                                  targetAgents: string[],dryRun: boolean): SyncReport {
  const preset = MCP_PRESETS[name];
  const custom = readMcpProfiles(ctx).data.profiles[name];
  if (!preset && !custom) throw new Error('Unknown MCP profile.');
  const profile = validate(ctx,preset ? {servers:[...preset],agents:targetAgents} : custom);
  const installed = detectAgents(ctx,profile.agents);
  if (installed.some(a => inspectAgentMcpConfig(a).status === 'corrupted')) {
    throw new Error('Selected MCP client configuration is invalid.');
  }
  if (installed.length!==profile.agents.length || installed.some(a=>!a.installed||!a.mcpFormat)) {
    throw new Error('MCP profile targets unavailable clients.');
  }
  const central = loadCentralMcpManifest(ctx);
  if (central.status !== 'valid') throw new Error('Central MCP configuration is invalid.');
  const available = profile.servers.filter(id=>Object.hasOwn(central.manifest.mcpServers,id));
  if (!available.length) throw new Error('No configured MCP servers match this profile.');
  const selection = Object.fromEntries(profile.agents.map(id=>[id,available])) as Record<string,string[]>;
  return runSync(ctx,{agentFilter:profile.agents,mcpOnly:true,mcpServerFilterByAgent:selection,dryRun});
}
