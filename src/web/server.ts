import crypto from 'node:crypto';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { spawn } from 'node:child_process';
import { runList } from '../commands/list.js';
import { runDoctor } from '../commands/doctor.js';
import { runSync } from '../commands/sync.js';
import { readPublicCatalog, searchPublicCatalog } from '../commands/public-catalog.js';
import { verifyCatalogSkills } from '../commands/skill-verify.js';
import { installCatalogSkill, updateCatalogSkill, uninstallCatalogSkill, previewCatalogInstall, previewCatalogUpdate, previewCatalogUninstall } from '../commands/skill-install.js';
import { readSavedProfiles, saveAgentProfile, clearAgentProfile, runSavedProfilesSync } from '../commands/saved-profiles.js';
import { createFullBackup, listBackups, restoreBackup } from '../core/backup.js';
import { createEnvironmentContext } from '../core/context.js';
import { redactSecrets } from '../security/scrubber.js';
import type { EnvironmentContext, SyncReport } from '../types.js';
import { renderWebUi } from './ui.js';

const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SNAPSHOT = /^snapshot-\d{8}-\d{6}-[a-f0-9]{6}$/;
const MAX_BODY = 16 * 1024;
type JsonValue = Record<string, unknown>;
export interface WebOptions {
  context?: EnvironmentContext;
  port?: number;
  openBrowser?: boolean;
}
export interface WebInstance {
  server: http.Server;
  url: string;
  close(): Promise<void>;
}
function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function object(value: unknown): value is JsonValue {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function checkedId(value: unknown): string {
  if (typeof value !== 'string' || !IDENTIFIER.test(value) || value.length > 100) {
    throw new Error('Invalid skill or agent identifier.');
  }
  return value;
}
function checkedSnapshot(value: unknown): string {
  if (typeof value !== 'string' || !SNAPSHOT.test(value)) {
    throw new Error('Invalid snapshot identifier.');
  }
  return value;
}
function checkedList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 512 ||
      !value.every(id => typeof id === 'string' && id.length <= 100 && IDENTIFIER.test(id))) {
    throw new Error('Invalid profile selection.');
  }
  return value as string[];
}
function requireApproval(body: JsonValue): void {
  if (body.approved !== true) throw new Error('Explicit approval is required.');
}
async function readJson(req: IncomingMessage): Promise<JsonValue> {
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw new Error('Only application/json is accepted.');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += bytes.length;
    if (size > MAX_BODY) {
      throw new Error('Request body too large.');
    }
    chunks.push(bytes);
  }
  let data: unknown;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
  catch { throw new Error('Malformed JSON request.'); }
  if (!object(data)) throw new Error('Expected a JSON object.');
  return data;
}
function summarize(report: SyncReport): object {
  return {
    dryRun: report.dryRun, snapshotId: report.snapshotId, rolledBack: report.rolledBack,
    detectedAgentsCount: report.detectedAgentsCount,
    skillResults: report.skillResults.map(x => ({
      agentId: x.agentId, skillName: x.skillName, action: x.action
    })),
    mcpResults: report.mcpResults.map(x => ({
      agentId: x.agentId, serverName: x.serverName, action: x.action
    })),
    errors: report.errors.map(redactSecrets)
  };
}
function safeState(ctx: EnvironmentContext): unknown {
  const warnings: string[] = [];
  let profiles: ReturnType<typeof readSavedProfiles> = { version: 1, profiles: {} };
  let integrity: ReturnType<typeof verifyCatalogSkills> = { healthy: false, scanned: 0, results: [] };
  try { profiles = readSavedProfiles(ctx); }
  catch (err) { warnings.push('Profiles unavailable: ' + redactSecrets((err as Error).message)); }
  try { integrity = verifyCatalogSkills(ctx); }
  catch (err) { warnings.push('Integrity unavailable: ' + redactSecrets((err as Error).message)); }
  const inventory = runList(ctx);
  // Intentionally omit local filesystem paths, MCP credentials and complete native configs.
  return {
    inventory: {
      centralSkills: inventory.centralSkills,
      centralMcpServers: inventory.centralMcpServers,
      agents: inventory.agents,
      backups: inventory.backups
    },
    catalog: searchPublicCatalog(ctx).map(skill => ({
      id: skill.id, name: skill.name, description: skill.description,
      author: skill.author, category: skill.category, tags: skill.tags,
      source: skill.source, license: skill.license,
      licenseEvidence: skill.licenseEvidence, ref: skill.ref,
      lifecycle: skill.lifecycle ?? 'active', installed: skill.installed
    })),
    categories: readPublicCatalog().categories,
    profiles, integrity, warnings
  };
}
function openLocalBrowser(url: string): void {
  const platform = process.platform;
  const command = platform === 'win32' ? 'rundll32.exe' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { stdio: 'ignore', detached: true, windowsHide: true });
  child.on('error', () => { /* Headless environments can open the printed URL manually. */ });
  child.unref();
}

/**
 * Local-only app: binds to 127.0.0.1, rejects foreign Host / Origin headers,
 * uses a random per-process CSRF token, no CORS, no external assets and no telemetry.
 */
export async function startWebServer(options: WebOptions = {}): Promise<WebInstance> {
  const port = options.port ?? 4173;
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid web port.');
  const ctx = options.context ?? createEnvironmentContext();
  const csrf = crypto.randomBytes(32).toString('hex');
  const nonce = crypto.randomBytes(18).toString('base64');
  let mutating = false;
  let origin = '';
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy',
      "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; " +
      "script-src 'nonce-" + nonce + "'; style-src 'nonce-" + nonce + "'; connect-src 'self'; img-src 'self' data:");
    try {
      const host = req.headers.host;
      const actualPort = (server.address() as { port: number } | null)?.port ?? port;
      if (host !== '127.0.0.1:' + actualPort && host !== 'localhost:' + actualPort) {
        json(res, 403, { error: 'Invalid local Host.' }); return;
      }
      const base = 'http://' + host;
      const suppliedOrigin = req.headers.origin;
      if (suppliedOrigin && suppliedOrigin !== base) {
        json(res, 403, { error: 'Cross-origin requests are blocked.' }); return;
      }
      if (req.headers['sec-fetch-site'] === 'cross-site') {
        json(res, 403, { error: 'Cross-site requests are blocked.' }); return;
      }
      const path = new URL(req.url ?? '/', base);
      if (req.method === 'GET' && path.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderWebUi(nonce, csrf));
        return;
      }
      if (req.method === 'GET' && path.pathname === '/api/state') {
        json(res, 200, safeState(ctx)); return;
      }
      if (req.method === 'GET' && path.pathname === '/api/doctor') {
        const doctor = runDoctor(ctx);
        // Do not expose native configuration paths or filesystem errors over HTTP.
        const issues: string[] = [];
        if (!doctor.linkCapabilityVerified) issues.push('Filesystem link capability check failed.');
        if (doctor.centralMcpStatus === 'corrupted') issues.push('Shared MCP manifest is invalid.');
        for (const agent of doctor.agents.filter(agent => agent.installed)) {
          if (agent.brokenLinksCount) issues.push(agent.name + ': ' + agent.brokenLinksCount + ' broken skill links.');
          if (agent.conflictSkillsCount) issues.push(agent.name + ': ' + agent.conflictSkillsCount + ' skill conflicts.');
          if (agent.mcpStatus === 'corrupted') issues.push(agent.name + ': MCP configuration is invalid.');
        }
        json(res, 200, { healthy: doctor.healthy && issues.length === 0,
          linkStrategy: doctor.linkStrategy, linkCapabilityVerified: doctor.linkCapabilityVerified,
          centralMcpStatus: doctor.centralMcpStatus,
          agents: doctor.agents.map(agent => ({ id: agent.id, name: agent.name,
            installed: agent.installed, brokenLinksCount: agent.brokenLinksCount,
            conflictSkillsCount: agent.conflictSkillsCount, mcpStatus: agent.mcpStatus })),
          issues }); return;
      }
      if (req.method === 'GET' && path.pathname === '/api/preview') {
        const id = checkedId(path.searchParams.get('id'));
        const op = path.searchParams.get('op');
        const preview = op === 'install' ? await previewCatalogInstall(ctx, id) :
          op === 'update' ? await previewCatalogUpdate(ctx, id) :
          op === 'uninstall' ? previewCatalogUninstall(ctx, id) : null;
        if (!preview) { json(res, 400, { error: 'Unknown preview action.' }); return; }
        // Never expose local absolute target paths in API responses.
        const { target: _target, ...publicPreview } = preview;
        json(res, 200, { preview: publicPreview }); return;
      }
      if (req.method !== 'POST' || path.pathname !== '/api/action') {
        json(res, 404, { error: 'Not found.' }); return;
      }
      if (req.headers['x-agent-commons-csrf'] !== csrf) {
        json(res, 403, { error: 'Missing or invalid CSRF token.' }); return;
      }
      if (mutating) { json(res, 409, { error: 'An operation is already running.' }); return; }
      mutating = true;
      try {
        const body = await readJson(req);
        const action = body.action;
        if (action === 'install' || action === 'update' || action === 'uninstall') {
          requireApproval(body);
          const id = checkedId(body.id);
          const result = action === 'install' ? await installCatalogSkill(ctx, id, { yes: true }) :
            action === 'update' ? await updateCatalogSkill(ctx, id, { yes: true }) :
            uninstallCatalogSkill(ctx, id, { yes: true });
          const snapshotId = result.snapshotId;
          json(res, 200, { applied: true, snapshotId }); return;
        }
        if (action === 'profile-save') {
          requireApproval(body);
          const result = saveAgentProfile(ctx, checkedId(body.agent),
            { skills: checkedList(body.skills), categories: checkedList(body.categories) });
          json(res, 200, { saved: true, profiles: result.profiles }); return;
        }
        if (action === 'profile-clear') {
          requireApproval(body);
          clearAgentProfile(ctx, checkedId(body.agent));
          json(res, 200, { cleared: true }); return;
        }
        if (action === 'sync-preview' || action === 'sync-apply') {
          if (action === 'sync-apply') requireApproval(body);
          const preflight = runSavedProfilesSync(ctx, { dryRun: true });
          if (action === 'sync-preview') { json(res, 200, summarize(preflight)); return; }
          if (preflight.errors.length) throw new Error('Sync preview reported errors; refusing to apply.');
          json(res, 200, summarize(runSavedProfilesSync(ctx, { dryRun: false })));
          return;
        }
        if (action === 'sync-all-preview' || action === 'sync-all-apply') {
          if (action === 'sync-all-apply') requireApproval(body);
          const preflight = runSync(ctx, { dryRun: true });
          if (action === 'sync-all-preview') { json(res, 200, summarize(preflight)); return; }
          if (preflight.errors.length) throw new Error('Full sync preview reported errors; refusing to apply.');
          json(res, 200, summarize(runSync(ctx, { dryRun: false }))); return;
        }
        if (action === 'backup') {
          requireApproval(body);
          const backup = createFullBackup(ctx, 'manual');
          json(res, 200, { id: backup.id }); return;
        }
        if (action === 'restore') {
          requireApproval(body);
          const id = checkedSnapshot(body.snapshot);
          if (!listBackups(ctx).some(snapshot => snapshot.id === id)) {
            throw new Error('Snapshot does not exist.');
          }
          const restored = restoreBackup(ctx, id);
          json(res, 200, { restored: true, id: restored.id }); return;
        }
        json(res, 400, { error: 'Unsupported action.' });
      } finally { mutating = false; }
    } catch (err) {
      // No paths, tokens or user data are logged by the web server.
      const reason = redactSecrets((err as Error).message);
      if (!res.headersSent) json(res, 400, { error: reason });
      else res.end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Failed to obtain local server address.');
  origin = 'http://127.0.0.1:' + address.port;
  if (options.openBrowser) openLocalBrowser(origin);
  return {
    server, url: origin,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(err => err ? reject(err) : resolve());
    })
  };
}
