/**
 * MCP launch diagnostics.
 *
 * - `inspectLaunchTarget` is read-only: it resolves a server's command on PATH and checks
 *   that an absolute script argument exists, without starting anything (used by `doctor`).
 * - `probeMcpServer` is explicit and active: it starts one configured server, performs the
 *   MCP handshake (`initialize` + `tools/list`), optionally calls one tool, then stops it.
 *   It is only reachable from the `mcp probe` CLI command, never from the web UI.
 *
 * Environment values, arguments and server output are never returned verbatim.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { inspectPath } from '../core/links.js';
import { redactSecrets } from '../security/scrubber.js';
import { parseCodexTomlMcpServers, parseJsoncObject } from '../sync/parsers.js';
import type { DetectedAgent } from '../types.js';

export interface McpLaunchSpec {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  enabled?: boolean;
}

export type LaunchStatus = 'ok' | 'remote' | 'disabled' | 'missing-command' | 'missing-script' | 'invalid';

export interface LaunchInspection {
  status: LaunchStatus;
  /** Resolved executable path (local only); never includes arguments or env values. */
  resolved?: string;
  message: string;
}

const SCRIPT_EXT = /\.(?:c?js|mjs|ts|py)$/i;

function pathExtensions(platform: NodeJS.Platform, env: NodeJS.ProcessEnv): string[] {
  if (platform !== 'win32') return [''];
  const raw = env['PATHEXT'] ?? env['Pathext'] ?? '.COM;.EXE;.BAT;.CMD';
  return raw.split(';').map(e => e.trim().toLowerCase()).filter(Boolean);
}

function envPath(env: NodeJS.ProcessEnv): string {
  return env['PATH'] ?? env['Path'] ?? '';
}

/** Resolves a command the way a client would find it on PATH, without executing it. */
export function resolveCommand(command: string, env: NodeJS.ProcessEnv = process.env,
                               platform: NodeJS.Platform = process.platform): string | null {
  if (!command.trim()) return null;
  const exts = pathExtensions(platform, env);
  const hasExt = platform === 'win32' && exts.includes(path.extname(command).toLowerCase());
  const candidatesFor = (base: string) => (platform !== 'win32' || hasExt) ? [base] : exts.map(e => base + e);
  const isFile = (p: string) => inspectPath(p).state === 'file';
  if (path.isAbsolute(command) || /[\\/]/.test(command)) {
    return candidatesFor(path.resolve(command)).find(isFile) ?? null;
  }
  for (const dir of envPath(env).split(path.delimiter)) {
    if (!dir || !path.isAbsolute(dir.replace(/^"|"$/g, ''))) continue;
    const found = candidatesFor(path.join(dir.replace(/^"|"$/g, ''), command)).find(isFile);
    if (found) return found;
  }
  return null;
}

function missingCommandMessage(command: string): string {
  return path.isAbsolute(command)
    ? `executable "${path.basename(command)}" no longer exists at its configured absolute path (reinstalled or upgraded runtime?)`
    : `command "${path.basename(command)}" not found on PATH`;
}

/** Read-only check that a configured MCP server can at least be located. */
export function inspectLaunchTarget(spec: McpLaunchSpec, env: NodeJS.ProcessEnv = process.env,
                                    platform: NodeJS.Platform = process.platform): LaunchInspection {
  if (spec.enabled === false) return { status: 'disabled', message: 'disabled in configuration' };
  if (spec.url && !spec.command) return { status: 'remote', message: 'remote (HTTP) server, not checked offline' };
  if (!spec.command || typeof spec.command !== 'string') return { status: 'invalid', message: 'no command or url' };
  const resolved = resolveCommand(spec.command, env, platform);
  if (!resolved) {
    return { status: 'missing-command', message: missingCommandMessage(spec.command) };
  }
  for (const arg of spec.args ?? []) {
    if (typeof arg === 'string' && path.isAbsolute(arg) && SCRIPT_EXT.test(arg) && inspectPath(arg).state !== 'file') {
      return { status: 'missing-script', resolved, message: `script "${path.basename(arg)}" does not exist` };
    }
  }
  return { status: 'ok', resolved, message: 'command found' };
}

function asStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every(v => typeof v === 'string') ? value as string[] : undefined;
}

function asStringMap(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === 'string') out[k] = v;
  return out;
}

/** Normalizes one MCP server object from any supported JSON/JSONC client schema. */
export function normalizeJsonServer(raw: unknown): McpLaunchSpec {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const s = raw as Record<string, unknown>;
  const spec: McpLaunchSpec = {};
  if (Array.isArray(s['command'])) {
    // OpenCode: command is [program, ...args]
    const parts = asStringArray(s['command']) ?? [];
    spec.command = parts[0];
    spec.args = parts.slice(1);
  } else {
    if (typeof s['command'] === 'string') spec.command = s['command'];
    spec.args = asStringArray(s['args']);
  }
  const url = s['url'] ?? s['httpUrl'] ?? s['serverUrl'];
  if (typeof url === 'string') spec.url = url;
  spec.env = asStringMap(s['env']) ?? asStringMap(s['environment']);
  if (s['enabled'] === false || s['disabled'] === true) spec.enabled = false;
  return spec;
}

/** Reads the MCP servers declared natively by one detected agent (read-only). */
export function readAgentMcpServers(agent: DetectedAgent): Record<string, McpLaunchSpec> {
  if (!agent.mcpConfigPath || !agent.mcpConfigExists || inspectPath(agent.mcpConfigPath).state !== 'file') return {};
  const raw = fs.readFileSync(agent.mcpConfigPath, 'utf8');
  const servers: Record<string, McpLaunchSpec> = {};
  if (agent.mcpFormat === 'codex-toml') {
    for (const [name, s] of parseCodexTomlMcpServers(raw)) {
      servers[name] = { command: s.command, args: s.args, url: s.url, env: s.env, enabled: s.enabled };
    }
    return servers;
  }
  const obj = parseJsoncObject(raw);
  const container = obj[agent.mcpFormat === 'opencode-jsonc' ? 'mcp' : 'mcpServers'];
  if (!container || typeof container !== 'object' || Array.isArray(container)) return servers;
  for (const [name, value] of Object.entries(container as Record<string, unknown>)) servers[name] = normalizeJsonServer(value);
  return servers;
}

export interface ProbeOptions {
  timeoutMs?: number;
  callTool?: string;
  toolArguments?: Record<string, unknown>;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

export interface ProbeResult {
  ok: boolean;
  /** Reachable but needs credentials the probe deliberately does not use: not verified, not failed. */
  authRequired?: boolean;
  stage: 'resolve' | 'spawn' | 'initialize' | 'tools/list' | 'tools/call' | 'done';
  transport: 'stdio' | 'http';
  durationMs: number;
  serverName?: string;
  serverVersion?: string;
  protocolVersion?: string;
  tools?: string[];
  toolResult?: string;
  error?: string;
}

const PROTOCOL_VERSION = '2025-06-18';
const CLIENT_INFO = { name: 'agent-commons-probe', version: '1' };
const CMD_UNSAFE = /["%!^\r\n]/;

/**
 * Builds a spawn invocation without a shell. Windows batch shims (npx.cmd, uvx.cmd…) cannot be
 * spawned directly, so they run through `cmd.exe /d /s /c` with every argument quoted; arguments
 * containing cmd metacharacters that quoting cannot neutralize are refused instead of escaped.
 */
export function buildInvocation(resolved: string, args: string[], platform: NodeJS.Platform = process.platform):
  { file: string; args: string[]; verbatim: boolean } {
  if (platform === 'win32' && /\.(?:cmd|bat)$/i.test(resolved)) {
    const parts = [resolved, ...args];
    const bad = parts.find(p => CMD_UNSAFE.test(p));
    if (bad !== undefined) throw new Error('Argument contains characters unsafe for a Windows batch launcher.');
    const line = parts.map(p => `"${p}"`).join(' ');
    return { file: process.env['ComSpec'] ?? 'cmd.exe', args: ['/d', '/s', '/c', `"${line}"`], verbatim: true };
  }
  return { file: resolved, args, verbatim: false };
}

function killTree(pid: number | undefined, platform: NodeJS.Platform): void {
  if (!pid) return;
  try {
    if (platform === 'win32') spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch { /* already exited */ }
}

function summarizeToolResult(result: unknown): string {
  const content = (result as { content?: Array<{ type?: string; text?: string }> } | undefined)?.content;
  const text = Array.isArray(content) ? content.filter(c => c?.type === 'text').map(c => c.text ?? '').join('\n') : '';
  return redactSecrets((text || JSON.stringify(result ?? null)).slice(0, 500));
}

/** Starts one stdio MCP server, completes the MCP handshake, lists tools and stops it. */
export async function probeMcpServer(spec: McpLaunchSpec, options: ProbeOptions = {}): Promise<ProbeResult> {
  const started = Date.now();
  const platform = options.platform ?? process.platform;
  const timeoutMs = options.timeoutMs ?? 20000;
  const env = { ...(options.env ?? process.env), ...(spec.env ?? {}) };
  if (spec.url && !spec.command) return probeHttpServer(spec.url, options, started);
  const done = (r: Omit<ProbeResult, 'durationMs' | 'transport'>): ProbeResult =>
    ({ transport: 'stdio', durationMs: Date.now() - started, ...r });
  if (!spec.command) return done({ ok: false, stage: 'resolve', error: 'No command configured.' });
  const resolved = resolveCommand(spec.command, env, platform);
  if (!resolved) return done({ ok: false, stage: 'resolve', error: missingCommandMessage(spec.command) + '.' });

  let invocation: ReturnType<typeof buildInvocation>;
  try { invocation = buildInvocation(resolved, spec.args ?? [], platform); }
  catch (err) { return done({ ok: false, stage: 'spawn', error: (err as Error).message }); }

  const child = spawn(invocation.file, invocation.args, {
    env, shell: false, windowsHide: true, windowsVerbatimArguments: invocation.verbatim,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  let stderrTail = '';
  child.stderr.on('data', (d: Buffer) => { stderrTail = (stderrTail + d.toString('utf8')).slice(-4000); });

  const pending = new Map<number, (msg: Record<string, unknown>) => void>();
  let buffer = '';
  child.stdout.on('data', (d: Buffer) => {
    buffer += d.toString('utf8');
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as Record<string, unknown>;
        if (typeof msg['id'] === 'number' && pending.has(msg['id'])) {
          pending.get(msg['id'])!(msg);
          pending.delete(msg['id']);
        }
      } catch { /* non-protocol output on stdout is ignored */ }
    }
  });

  let exited: string | null = null;
  const exitPromise = new Promise<void>(resolve => {
    child.once('error', err => { exited = (err as NodeJS.ErrnoException).code ?? 'spawn error'; resolve(); });
    child.once('exit', code => { exited = `exited with code ${code}`; resolve(); });
  });

  let nextId = 1;
  const request = (method: string, params: unknown): Promise<Record<string, unknown>> => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, resolve);
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', err => { if (err) reject(err); });
    });
  };
  const deadline = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs} ms.`)), timeoutMs);
    t.unref();
  });
  const exitedEarly = exitPromise.then(() => { throw new Error(`Server stopped before answering (${exited}).`); });
  const step = <T>(p: Promise<T>) => Promise.race([p, deadline, exitedEarly]);

  let stage: ProbeResult['stage'] = 'initialize';
  try {
    const init = await step(request('initialize', {
      protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO
    }));
    if (init['error']) throw new Error('initialize rejected: ' + JSON.stringify(init['error']).slice(0, 200));
    const result = (init['result'] ?? {}) as { protocolVersion?: string; serverInfo?: { name?: string; version?: string } };
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    stage = 'tools/list';
    const list = await step(request('tools/list', {}));
    if (list['error']) throw new Error('tools/list rejected: ' + JSON.stringify(list['error']).slice(0, 200));
    const tools = (((list['result'] ?? {}) as { tools?: Array<{ name?: string }> }).tools ?? [])
      .map(t => String(t.name ?? '')).filter(Boolean);
    let toolResult: string | undefined;
    if (options.callTool) {
      stage = 'tools/call';
      if (!tools.includes(options.callTool)) throw new Error(`Tool "${options.callTool}" is not exposed by this server.`);
      const call = await step(request('tools/call', { name: options.callTool, arguments: options.toolArguments ?? {} }));
      if (call['error']) throw new Error('tools/call rejected: ' + JSON.stringify(call['error']).slice(0, 200));
      const callResult = call['result'] as { isError?: boolean } | undefined;
      toolResult = summarizeToolResult(callResult);
      if (callResult?.isError) throw new Error('Tool reported an error: ' + toolResult);
    }
    return done({
      ok: true, stage: 'done', serverName: result.serverInfo?.name, serverVersion: result.serverInfo?.version,
      protocolVersion: result.protocolVersion, tools, toolResult
    });
  } catch (err) {
    const errLines = stderrTail.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const key = errLines.find(l => /error|cannot|not found|denied|ENOENT|EACCES/i.test(l)) ?? errLines.at(-1);
    const hint = key ? ' Server stderr: ' + key.slice(0, 240) : '';
    return done({ ok: false, stage, error: redactSecrets(((err as Error).message + hint).slice(0, 800)) });
  } finally {
    try { child.stdin.end(); } catch { /* ignore */ }
    if (exited === null) killTree(child.pid, platform);
  }
}

async function readJsonRpc(res: Response): Promise<Record<string, unknown>> {
  const type = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (type.includes('text/event-stream')) {
    const data = text.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim());
    for (const d of data) { try { return JSON.parse(d) as Record<string, unknown>; } catch { /* next */ } }
    throw new Error('No JSON-RPC message in event stream.');
  }
  return JSON.parse(text) as Record<string, unknown>;
}

/** Streamable HTTP probe without credentials: reports authentication requirements honestly. */
async function probeHttpServer(url: string, options: ProbeOptions, started: number): Promise<ProbeResult> {
  const done = (r: Omit<ProbeResult, 'durationMs' | 'transport'>): ProbeResult =>
    ({ transport: 'http', durationMs: Date.now() - started, ...r });
  const timeoutMs = options.timeoutMs ?? 20000;
  const headers: Record<string, string> = {
    'content-type': 'application/json', accept: 'application/json, text/event-stream'
  };
  let session: string | null = null;
  let stage: ProbeResult['stage'] = 'initialize';
  const post = (body: unknown, extra: Record<string, string> = {}) =>
    fetch(url, { method: 'POST', headers: { ...headers, ...extra },
      body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
  try {
    const res = await post({ jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: CLIENT_INFO } });
    if (res.status === 401 || res.status === 403) {
      return done({ ok: false, authRequired: true, stage, error: 'MCP HTTP authentication is required; no credentials were sent.' });
    }
    if (!res.ok) return done({ ok: false, stage, error: 'HTTP ' + res.status });
    const init = await readJsonRpc(res);
    if (init['error']) return done({ ok: false, stage, error: 'MCP initialize rejected' });
    const result = (init['result'] ?? {}) as { protocolVersion?: string; serverInfo?: { name?: string; version?: string } };
    session = res.headers.get('mcp-session-id');
    const extra: Record<string, string> = {
      'mcp-protocol-version': result.protocolVersion ?? PROTOCOL_VERSION,
      ...(session ? { 'mcp-session-id': session } : {})
    };
    // Notifications receive 202/no JSON-RPC result.
    const notify = await post({ jsonrpc: '2.0', method: 'notifications/initialized' }, extra);
    await notify.body?.cancel();
    if (!notify.ok) return done({ ok: false, stage, error: 'MCP initialization notification rejected' });
    stage = 'tools/list';
    const listRes = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, extra);
    if (!listRes.ok) return done({ ok: false, stage, error: 'HTTP ' + listRes.status });
    const list = await readJsonRpc(listRes);
    if (list['error']) return done({ ok: false, stage, error: 'MCP tools/list rejected' });
    const tools = (((list['result'] ?? {}) as { tools?: Array<{ name?: string }> }).tools ?? [])
      .map(t => String(t.name ?? '')).filter(Boolean);
    let toolResult: string | undefined;
    if (options.callTool) {
      stage = 'tools/call';
      if (!tools.includes(options.callTool)) {
        return done({ ok: false, stage, error: 'Requested tool is not advertised by this MCP server' });
      }
      const callRes = await post({ jsonrpc: '2.0', id: 3, method: 'tools/call',
        params: { name: options.callTool, arguments: options.toolArguments ?? {} } }, extra);
      if (callRes.status === 401 || callRes.status === 403) {
        return done({ ok: false, authRequired: true, stage, error: 'MCP HTTP tool requires authentication' });
      }
      if (!callRes.ok) return done({ ok: false, stage, error: 'HTTP ' + callRes.status });
      const call = await readJsonRpc(callRes);
      if (call['error']) return done({ ok: false, stage, error: 'MCP tools/call rejected' });
      const output = call['result'] as { isError?: boolean } | undefined;
      if (output?.isError) return done({ ok: false, stage, error: 'MCP tool reported a failure' });
      toolResult = summarizeToolResult(output);
    }
    return done({ ok: true, stage: 'done', serverName: result.serverInfo?.name,
      serverVersion: result.serverInfo?.version, protocolVersion: result.protocolVersion, tools, toolResult });
  } catch (err) {
    return done({ ok: false, stage, error: redactSecrets((err as Error).message).slice(0, 300) });
  } finally {
    if (session) {
      // Close the server-side session even if a tool or list operation failed.
      await fetch(url, { method: 'DELETE', headers: { 'mcp-session-id': session },
        signal: AbortSignal.timeout(1500) }).then(r => r.body?.cancel()).catch(() => undefined);
    }
  }
}
