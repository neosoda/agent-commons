import crypto from 'node:crypto';
import path from 'node:path';
import { probeMcpServer, type McpLaunchSpec } from '../mcp/health.js';
import { redactSecrets } from '../security/scrubber.js';
import { loadCentralMcpManifest } from '../sync/mcp.js';
import type { EnvironmentContext } from '../types.js';
import type { ToolExecutor, ToolRequest, ToolResult } from './mission.js';
import { WorkspaceTools } from './workspace.js';

/**
 * `mcp:<server>/w-<12 hex>` names a workspace held by a remote executor (DEV01), reached
 * through a server of the central MCP manifest. The mission loop, its budgets, its
 * changed/tested gate and its checkpoints stay here; the executor only performs the four
 * workspace tools inside its own sandbox. The workspace is opened beforehand by the
 * orchestrator, never by the model, and the model cannot name another one.
 */
export const REMOTE_WORKSPACE = /^mcp:([a-zA-Z0-9._-]{1,64})\/(w-[a-f0-9]{12})$/;
const TOOLS = new Set(['list_files', 'read_file', 'write_file', 'verify']);
const MAX_OUTPUT = 12_000;
const MAX_ARGUMENTS = 80_000;

export const isRemoteWorkspace = (value: string): boolean => REMOTE_WORKSPACE.test(value);

/** What a program needs to start; the executor's credentials are declared in its manifest entry. */
const INHERITED = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'HOME', 'USERPROFILE', 'TMP', 'TEMP', 'TMPDIR', 'LANG']);
const launchEnvironment = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(Object.entries(env).filter(([key]) => INHERITED.has(key.toUpperCase())));

interface RemoteAnswer { ok: boolean; output: string; changed?: boolean; tested?: boolean; passed?: boolean; revision?: number }

function parseAnswer(text: string | undefined): RemoteAnswer | undefined {
  if (text === undefined) return undefined;
  try {
    const value = JSON.parse(text) as Record<string, unknown>;
    if (typeof value['ok'] !== 'boolean' || typeof value['output'] !== 'string') return undefined;
    for (const key of ['changed', 'tested', 'passed']) {
      if (value[key] !== undefined && typeof value[key] !== 'boolean') return undefined;
    }
    if (value['revision'] !== undefined && !Number.isSafeInteger(value['revision'])) return undefined;
    return value as unknown as RemoteAnswer;
  } catch { return undefined; }
}

export class RemoteWorkspaceTools implements ToolExecutor {
  readonly workspaceId: string;
  private readonly workspace: string;
  private readonly seen = new Set<string>();
  constructor(private readonly spec: McpLaunchSpec, readonly label: string, private readonly allowWrites: boolean,
    private readonly allowTests: boolean, private readonly env: NodeJS.ProcessEnv = process.env) {
    const match = REMOTE_WORKSPACE.exec(label);
    if (!match) throw new Error('Invalid remote workspace');
    if (!spec.command || spec.url) throw new Error('A remote workspace needs a stdio executor');
    this.workspace = match[2]!;
    this.workspaceId = crypto.createHash('sha256').update(label).digest('hex');
  }

  async execute(call: ToolRequest, signal?: AbortSignal): Promise<ToolResult> {
    const a = call.arguments;
    if (!a || typeof a !== 'object' || Array.isArray(a)) return { ok: false, progress: false, output: 'Invalid tool arguments' };
    if (!TOOLS.has(call.name)) return { ok: false, progress: false, output: 'Unknown tool' };
    // The executor is told which workspace by this adapter only.
    if (Object.prototype.hasOwnProperty.call(a, 'workspace')) return { ok: false, progress: false, output: 'Unexpected argument' };
    if (call.name === 'write_file' && !this.allowWrites) return { ok: false, progress: false, output: 'Writes require --allow-write' };
    if (call.name === 'verify' && a['check'] !== 'diff' && !this.allowTests) {
      return { ok: false, progress: false, output: 'Project scripts require --allow-tests' };
    }
    if (JSON.stringify(a).length > MAX_ARGUMENTS) return { ok: false, progress: false, output: 'Tool arguments exceed limit' };
    if (signal?.aborted) return { ok: false, progress: false, output: 'Interrupted before dispatch' };
    const report = await probeMcpServer(this.spec, {
      timeoutMs: call.name === 'verify' ? 300_000 : 45_000, callTool: 'workspace_' + call.name,
      toolArguments: { ...a, workspace: this.workspace }, env: launchEnvironment(this.env), signal,
      resultLimit: MAX_OUTPUT + 4000
    });
    const answer = report.ok && report.stage === 'done' ? parseAnswer(report.toolResult) : undefined;
    // No answer: for a write or a check the outcome is unknown, and the runner reconciles it.
    if (!answer) return { ok: false, progress: false, output: 'Remote workspace unavailable or answer unreadable (' + report.stage + ')' };
    const output = redactSecrets(answer.output).slice(0, MAX_OUTPUT);
    const revision = answer.revision ?? 0;
    let progress = false;
    if (answer.ok) {
      if (call.name === 'write_file') progress = answer.changed === true;
      else {
        const key = call.name === 'verify' ? `verify:${String(a['check'])}:${revision}`
          : `${call.name}:${JSON.stringify(a)}:${revision}:${crypto.createHash('sha256').update(output).digest('hex')}`;
        progress = (call.name !== 'verify' || answer.passed === true) && !this.seen.has(key);
        this.seen.add(key);
      }
    }
    return { ok: answer.ok, progress, output, changed: answer.changed === true,
      tested: call.name === 'verify' && a['check'] === 'test' && answer.tested === true };
  }
}

export interface OpenedWorkspace { tools: ToolExecutor & { workspaceId: string }; label: string; remote: boolean }

/** A local physical checkout, or a remote workspace whose executor is in the central manifest. */
export function openWorkspace(ctx: EnvironmentContext, value: string, allowWrite: boolean, allowTests: boolean): OpenedWorkspace {
  const match = REMOTE_WORKSPACE.exec(value);
  if (!match) {
    const label = path.resolve(value);
    return { tools: new WorkspaceTools(label, allowWrite, allowTests), label, remote: false };
  }
  const manifest = loadCentralMcpManifest(ctx);
  if (manifest.status === 'corrupted') throw new Error('Central MCP manifest is corrupted');
  const spec = manifest.manifest.mcpServers[match[1]!];
  if (!spec || spec.enabled === false) throw new Error('Unknown or disabled remote executor: ' + match[1]);
  return { tools: new RemoteWorkspaceTools(spec, value, allowWrite, allowTests), label: value, remote: true };
}
