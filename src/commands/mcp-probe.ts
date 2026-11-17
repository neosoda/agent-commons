import { detectAgents } from '../agents/detector.js';
import { demoServerPath, DEMO_SERVER_NAME } from '../mcp/demo-server.js';
import { probeMcpServer, readAgentMcpServers, type McpLaunchSpec, type ProbeResult } from '../mcp/health.js';
import { loadCentralMcpManifest } from '../sync/mcp.js';
import type { EnvironmentContext } from '../types.js';

export interface ProbeTarget { scope: string; server: string; spec: McpLaunchSpec }

export interface McpProbeReport {
  scope: string;
  results: Array<{ server: string } & ProbeResult>;
}

/**
 * Collects the servers to probe: the central manifest by default, or one agent's native config.
 * `names` restricts the selection; unknown names are an error rather than a silent no-op.
 */
export function selectProbeTargets(ctx: EnvironmentContext, names: string[], agentId?: string): ProbeTarget[] {
  let servers: Record<string, McpLaunchSpec>;
  let scope: string;
  if (agentId) {
    const agent = detectAgents(ctx, [agentId])[0];
    if (!agent) throw new Error(`Unknown agent "${agentId}".`);
    if (!agent.installed) throw new Error(`Agent "${agentId}" is not installed in this home.`);
    servers = readAgentMcpServers(agent);
    scope = agentId;
  } else {
    const loaded = loadCentralMcpManifest(ctx);
    if (loaded.status === 'corrupted') throw new Error('Central MCP manifest is corrupted; run "agent-commons doctor".');
    servers = loaded.manifest.mcpServers;
    scope = 'central';
  }
  const unknown = names.filter(n => !(n in servers));
  if (unknown.length) throw new Error(`MCP server(s) not found in ${scope}: ${unknown.join(', ')}.`);
  return Object.entries(servers)
    .filter(([name, spec]) => (names.length === 0 || names.includes(name)) && spec.enabled !== false)
    .map(([server, spec]) => ({ scope, server, spec }));
}

export async function runMcpProbe(ctx: EnvironmentContext, names: string[], options: {
  agent?: string; timeoutMs?: number; callTool?: string; toolArguments?: Record<string, unknown>;
}): Promise<McpProbeReport> {
  const targets = selectProbeTargets(ctx, names, options.agent);
  if (options.callTool && targets.length !== 1) throw new Error('--call requires exactly one server name.');
  const results: McpProbeReport['results'] = [];
  for (const t of targets) {
    // Sequential on purpose: one third-party process at a time, each stopped before the next.
    results.push({ server: t.server, ...(await probeMcpServer(t.spec, {
      timeoutMs: options.timeoutMs, callTool: options.callTool, toolArguments: options.toolArguments
    })) });
  }
  return { scope: targets[0]?.scope ?? (options.agent ?? 'central'), results };
}

/** A ready-to-paste central manifest entry for the bundled demo server. */
export function demoServerConfig(): { mcpServers: Record<string, { command: string; args: string[] }> } {
  return { mcpServers: { [DEMO_SERVER_NAME]: { command: process.execPath, args: [demoServerPath()] } } };
}

export function formatProbe(report: McpProbeReport): string {
  const lines = [`=== MCP probe (${report.scope}) ===`];
  if (report.results.length === 0) lines.push('No enabled MCP server to probe.');
  for (const r of report.results) {
    if (r.ok) {
      const who = [r.serverName, r.serverVersion].filter(Boolean).join(' ');
      lines.push(`  OK   ${r.server} [${r.transport}] ${who ? '(' + who + ') ' : ''}${r.tools?.length ?? 0} tool(s) in ${r.durationMs} ms`);
      if (r.tools?.length) lines.push(`       tools: ${r.tools.slice(0, 12).join(', ')}${r.tools.length > 12 ? ', …' : ''}`);
      if (r.toolResult !== undefined) lines.push(`       call result: ${r.toolResult}`);
    } else if (r.authRequired) {
      lines.push(`  AUTH ${r.server} [${r.transport}] reachable; needs credentials, so tools were NOT verified`);
    } else {
      lines.push(`  FAIL ${r.server} [${r.transport}] at ${r.stage}: ${r.error ?? 'unknown error'}`);
    }
  }
  const failed = countFailures(report);
  const auth = report.results.filter(r => r.authRequired).length;
  if (failed) lines.push(`${failed} server(s) failed. A failing server is not usable by any client.`);
  if (auth) lines.push(`${auth} server(s) need credentials and remain unverified (test them from the client itself).`);
  if (!failed && !auth) lines.push('All probed servers answered the MCP handshake.');
  return lines.join('\n');
}

/** Real failures only: authentication-gated servers are unverified, not broken. */
export function countFailures(report: McpProbeReport): number {
  return report.results.filter(r => !r.ok && !r.authRequired).length;
}
