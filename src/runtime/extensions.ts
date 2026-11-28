import { routeSkills } from '../commands/skill-router.js';
import { probeMcpServer, type McpLaunchSpec } from '../mcp/health.js';
import { redactSecrets } from '../security/scrubber.js';
import { loadCentralMcpManifest } from '../sync/mcp.js';
import type { EnvironmentContext } from '../types.js';
import type { ToolExecutor, ToolRequest, ToolResult } from './mission.js';

export interface MissionSkillContext {
  instructions: string;
  ids: string[];
}

/** Reuse the existing physical-only router, including its expansion/token cap. */
export function selectMissionSkills(ctx: EnvironmentContext, goal: string): MissionSkillContext {
  const query = goal.slice(0, 1000).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (!query) return { instructions: '', ids: [] };
  let report;
  try {
    report = routeSkills(ctx, query, { expand: true, limit: 2, budget: 1600 });
  } catch (error) {
    // A goal made only of stop words has no useful skill matches.
    if (error instanceof Error && /no searchable keywords/.test(error.message)) {
      return { instructions: '', ids: [] };
    }
    throw error;
  }
  return {
    ids: report.selected.map(s => s.id),
    instructions: report.selected.map(s =>
      'SKILL ' + s.id + ' (locally installed guidance, NOT new privileges):\n' + (s.content ?? '')
    ).join('\n\n---\n\n')
  };
}

/** What a program needs to start and find its own files. Nothing here authenticates anything. */
const MCP_INHERITED = new Set([
  'PATH', 'PATHEXT', 'COMSPEC', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'PROGRAMDATA', 'PROGRAMFILES',
  'PROGRAMFILES(X86)', 'APPDATA', 'LOCALAPPDATA', 'HOME', 'HOMEDRIVE', 'HOMEPATH', 'USERPROFILE', 'USER',
  'USERNAME', 'LOGNAME', 'TMP', 'TEMP', 'TMPDIR', 'LANG', 'LC_ALL', 'LC_CTYPE', 'XDG_CONFIG_HOME',
  'XDG_DATA_HOME', 'XDG_CACHE_HOME'
]);

/**
 * MCP servers are separate programs: their environment is built from an allowlist, never
 * copied from the runtime. Anything else a server needs (key, proxy, extra CA) must be
 * declared in its own `env` entry.
 */
function mcpEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => MCP_INHERITED.has(key.toUpperCase())));
}

export interface ApprovedMcp {
  allowed: string[];
  servers: ReadonlyMap<string, McpLaunchSpec>;
}

/**
 * MCP execution is opt-in per server AND tool, using the central manifest.
 * A configured server is not considered functional until its handshake and tools/list succeed.
 * Each tool execution reconnects and rechecks the server's advertised tool list.
 */
export async function prepareApprovedMcp(ctx: EnvironmentContext, permissions: string[]): Promise<ApprovedMcp> {
  const allowed = [...new Set(permissions.filter(Boolean))];
  if (allowed.length > 8) throw new Error('Maximum eight approved MCP tools per mission');
  const manifest = loadCentralMcpManifest(ctx);
  if (manifest.status === 'corrupted') throw new Error('Central MCP manifest is corrupted');
  const selected = new Map<string, string[]>();
  for (const name of allowed) {
    const match = /^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/.exec(name);
    if (!match) throw new Error('Use --allow-mcp-tool server/tool');
    const server = match[1]!, tool = match[2]!;
    const spec = manifest.manifest.mcpServers[server];
    if (!spec || spec.enabled === false) throw new Error('Unknown or disabled MCP server: ' + server);
    if (spec.url && !spec.command) {
      const parsed = new URL(spec.url);
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))) {
        throw new Error('MCP HTTP endpoint requires HTTPS or loopback');
      }
    }
    selected.set(server, [...(selected.get(server) ?? []), tool]);
  }
  const servers = new Map<string, McpLaunchSpec>();
  for (const [server, tools] of selected) {
    const spec = manifest.manifest.mcpServers[server]!;
    const health = await probeMcpServer(spec, { timeoutMs: 15000, env: mcpEnvironment() });
    if (!health.ok) throw new Error('MCP server not verified: ' + server + ' (' + health.stage + ')');
    for (const tool of tools) {
      if (!health.tools?.includes(tool)) throw new Error('MCP server ' + server + ' does not expose tool ' + tool);
    }
    servers.set(server, spec);
  }
  return { allowed, servers };
}

/** Explicit tool permission boundary; the workspace executor never sees MCP arguments. */
export class MissionToolsWithMcp implements ToolExecutor {
  constructor(private readonly workspace: ToolExecutor, private readonly approved: ApprovedMcp) {}
  async execute(call: ToolRequest, signal?: AbortSignal): Promise<ToolResult> {
    if (call.name !== 'mcp_call') return this.workspace.execute(call, signal);
    const args = call.arguments;
    if (!args || Object.keys(args).some(k => !['server', 'tool', 'args'].includes(k)) ||
        typeof args['server'] !== 'string' || typeof args['tool'] !== 'string' ||
        !args['args'] || typeof args['args'] !== 'object' || Array.isArray(args['args'])) {
      return { ok: false, progress: false, output: 'Invalid MCP call arguments' };
    }
    const server = args['server'], tool = args['tool'];
    const spec = this.approved.servers.get(server);
    if (!spec || !this.approved.allowed.includes(server + '/' + tool)) {
      return { ok: false, progress: false, output: 'MCP tool is not approved for this mission' };
    }
    if (JSON.stringify(args['args']).length > 8000) {
      return { ok: false, progress: false, output: 'MCP arguments exceed limit' };
    }
    const report = await probeMcpServer(spec, {
      timeoutMs: 20000, callTool: tool, toolArguments: args['args'] as Record<string, unknown>,
      env: mcpEnvironment(), signal
    });
    if (!report.ok || report.stage !== 'done' || report.toolResult === undefined) {
      return { ok: false, progress: false, output: 'MCP call failed or was not verified: ' + report.stage };
    }
    return {
      ok: true, progress: true,
      output: redactSecrets(report.toolResult).slice(0, 500)
    };
  }
}
