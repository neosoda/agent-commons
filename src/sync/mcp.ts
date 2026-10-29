import fs from 'node:fs';
import type { SnapshotSession } from '../core/backup.js';
import { inspectPath, writeFileAtomicSync } from '../core/links.js';
import { redactSecrets } from '../security/scrubber.js';
import { isValidIdentifier } from '../security/validator.js';
import type {
  CentralMcpManifest,
  DetectedAgent,
  EnvironmentContext,
  McpServerOverride,
  McpServerSpec,
  McpSyncResultItem,
  SyncOptions
} from '../types.js';
import {
  doesCodexTomlServerMatch,
  parseCodexTomlMcpServers,
  parseJsoncObject,
  upsertCodexTomlServer
} from './parsers.js';

export interface LoadedMcpManifest {
  status: 'missing' | 'valid' | 'corrupted';
  manifest: CentralMcpManifest;
  error?: string;
}

/**
 * Loads and validates the central `~/.agents/mcp.json` declarative manifest.
 */
export function loadCentralMcpManifest(ctx: EnvironmentContext): LoadedMcpManifest {
  const centralInfo = inspectPath(ctx.centralMcpPath);
  if (centralInfo.state === 'missing') {
    return {
      status: 'missing',
      manifest: { mcpServers: {} }
    };
  }
  if (centralInfo.state !== 'file') {
    return {
      status: 'corrupted',
      manifest: { mcpServers: {} },
      error: `Central MCP manifest path is a ${centralInfo.state}, expected regular file.`
    };
  }

  try {
    const raw = fs.readFileSync(ctx.centralMcpPath, 'utf8');
    const obj = parseJsoncObject(raw);
    const rawServers = (obj['mcpServers'] ?? obj['servers'] ?? {}) as unknown;

    if (!rawServers || typeof rawServers !== 'object' || Array.isArray(rawServers)) {
      throw new Error('"mcpServers" field in mcp.json must be an object');
    }

    const mcpServers: Record<string, McpServerSpec> = {};
    for (const [name, val] of Object.entries(rawServers as Record<string, unknown>)) {
      if (!isValidIdentifier(name)) {
        throw new Error(`Invalid MCP server identifier "${name}"`);
      }
      if (!val || typeof val !== 'object' || Array.isArray(val)) {
        throw new Error(`MCP server "${name}" configuration must be an object`);
      }
      const spec = val as McpServerSpec;
      if (!spec.command && !spec.url) {
        throw new Error(`MCP server "${name}" must specify either "command" or "url"`);
      }
      mcpServers[name] = spec;
    }

    return {
      status: 'valid',
      manifest: { mcpServers }
    };
  } catch (err) {
    return {
      status: 'corrupted',
      manifest: { mcpServers: {} },
      error: redactSecrets((err as Error).message)
    };
  }
}

/**
 * Resolves the effective MCP server configuration for a specific agent, applying
 * `agents` / `excludeAgents` filters and `agentOverrides`.
 */
export function resolveServerSpecForAgent(
  spec: McpServerSpec,
  agentId: string
): McpServerOverride | null {
  if (spec.enabled === false) {
    return null;
  }
  if (spec.agents && spec.agents.length > 0 && !spec.agents.includes(agentId)) {
    return null;
  }
  if (spec.excludeAgents && spec.excludeAgents.includes(agentId)) {
    return null;
  }

  const override = spec.agentOverrides?.[agentId] ?? {};
  const merged: McpServerOverride = {
    type: override.type ?? spec.type,
    command: override.command ?? spec.command,
    args: override.args ?? spec.args,
    env: override.env ?? spec.env,
    url: override.url ?? spec.url,
    startupTimeoutSec: override.startupTimeoutSec ?? spec.startupTimeoutSec,
    toolTimeoutSec: override.toolTimeoutSec ?? spec.toolTimeoutSec,
    enabled: override.enabled ?? spec.enabled
  };

  if (merged.enabled === false) {
    return null;
  }
  if (!merged.command && !merged.url) {
    return null;
  }

  return merged;
}

function toStandardJsonEntry(spec: McpServerOverride): Record<string, unknown> {
  const entry: Record<string, unknown> = {};
  if (spec.type) {
    entry['type'] = spec.type;
  }
  if (spec.command) {
    entry['command'] = spec.command;
  }
  if (spec.args) {
    entry['args'] = [...spec.args];
  }
  if (spec.url) {
    entry['url'] = spec.url;
  }
  if (spec.env && Object.keys(spec.env).length > 0) {
    entry['env'] = { ...spec.env };
  } else if (spec.env) {
    entry['env'] = {};
  }
  return entry;
}

function toOpenCodeEntry(spec: McpServerOverride): Record<string, unknown> {
  if (spec.url) {
    const entry: Record<string, unknown> = {
      type: 'remote',
      url: spec.url,
      enabled: spec.enabled ?? true
    };
    if (spec.env && Object.keys(spec.env).length > 0) {
      entry['environment'] = { ...spec.env };
    }
    return entry;
  }

  const cmdArray = [spec.command!, ...(spec.args ?? [])];
  const entry: Record<string, unknown> = {
    type: 'local',
    command: cmdArray,
    enabled: spec.enabled ?? true
  };
  if (spec.env && Object.keys(spec.env).length > 0) {
    entry['environment'] = { ...spec.env };
  }
  return entry;
}

function areJsonEntriesEqual(existing: unknown, desired: Record<string, unknown>): boolean {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
    return false;
  }
  const ex = existing as Record<string, unknown>;

  for (const [k, desiredVal] of Object.entries(desired)) {
    const exVal = ex[k];
    if (JSON.stringify(exVal) !== JSON.stringify(desiredVal)) {
      if (
        (k === 'args' &&
          Array.isArray(desiredVal) &&
          desiredVal.length === 0 &&
          exVal === undefined) ||
        (k === 'env' &&
          typeof desiredVal === 'object' &&
          desiredVal !== null &&
          Object.keys(desiredVal).length === 0 &&
          exVal === undefined)
      ) {
        continue;
      }
      return false;
    }
  }
  return true;
}

/**
 * Inspects an agent's MCP configuration file for `doctor` and `list` commands.
 */
export function inspectAgentMcpConfig(agent: DetectedAgent): {
  status: 'not-supported' | 'missing' | 'valid' | 'corrupted';
  serverNames: string[];
  error?: string;
} {
  if (!agent.mcpConfigPath || !agent.mcpFormat) {
    return { status: 'not-supported', serverNames: [] };
  }
  const pathInfo = inspectPath(agent.mcpConfigPath);
  if (pathInfo.state === 'missing') {
    return { status: 'missing', serverNames: [] };
  }
  if (pathInfo.state !== 'file') {
    return {
      status: 'corrupted',
      serverNames: [],
      error: `MCP config path is a ${pathInfo.state} instead of a regular file`
    };
  }

  try {
    const raw = fs.readFileSync(agent.mcpConfigPath, 'utf8');
    if (agent.mcpFormat === 'codex-toml') {
      const map = parseCodexTomlMcpServers(raw);
      return { status: 'valid', serverNames: [...map.keys()] };
    }

    const obj = parseJsoncObject(raw);
    const rootKey = agent.mcpFormat === 'opencode-jsonc' ? 'mcp' : 'mcpServers';
    const container = obj[rootKey];
    if (container === undefined) {
      return { status: 'valid', serverNames: [] };
    }
    if (!container || typeof container !== 'object' || Array.isArray(container)) {
      throw new Error(`"${rootKey}" must be a JSON object`);
    }
    return {
      status: 'valid',
      serverNames: Object.keys(container as Record<string, unknown>)
    };
  } catch (err) {
    return {
      status: 'corrupted',
      serverNames: [],
      error: redactSecrets((err as Error).message)
    };
  }
}

/**
 * Synchronizes MCP servers from `~/.agents/mcp.json` into all compatible installed agents
 * without destroying existing configurations or exposing secrets.
 */
export function syncMcpForAgents(
  ctx: EnvironmentContext,
  agents: DetectedAgent[],
  options: SyncOptions,
  snapshot: SnapshotSession | null
): McpSyncResultItem[] {
  const results: McpSyncResultItem[] = [];
  const dryRun = Boolean(options.dryRun);
  const force = Boolean(options.force);

  const loaded = loadCentralMcpManifest(ctx);
  if (loaded.status === 'missing') {
    return results;
  }
  if (loaded.status === 'corrupted') {
    results.push({
      agentId: 'commons',
      agentName: 'Agent Commons',
      serverName: '*',
      configPath: ctx.centralMcpPath,
      action: 'corrupted-config',
      message: `Central MCP manifest is corrupted: ${loaded.error ?? 'invalid JSON'}`
    });
    return results;
  }

  const serverEntries = Object.entries(loaded.manifest.mcpServers);
  if (serverEntries.length === 0) {
    return results;
  }

  const installedAgents = agents.filter(
    (a) => a.installed && a.mcpConfigPath !== null && a.mcpFormat !== null
  );

  for (const agent of installedAgents) {
    const configPath = agent.mcpConfigPath!;
    const format = agent.mcpFormat!;

    // Security check: refuse to follow or overwrite symlinked MCP configuration files
    const configInfo = inspectPath(configPath);
    if (configInfo.state === 'link' || configInfo.state === 'directory') {
      results.push({
        agentId: agent.definition.id,
        agentName: agent.definition.name,
        serverName: '*',
        configPath,
        action: 'corrupted-config',
        message: `Refusing to modify "${configPath}": path is a ${configInfo.state} instead of a regular file.`
      });
      continue;
    }

    const desiredForAgent: Array<[string, McpServerOverride]> = [];
    for (const [serverName, spec] of serverEntries) {
      const resolved = resolveServerSpecForAgent(spec, agent.definition.id);
      if (resolved) {
        desiredForAgent.push([serverName, resolved]);
      }
    }

    if (desiredForAgent.length === 0) {
      continue;
    }

    // Handle Codex TOML dialect
    if (format === 'codex-toml') {
      let rawToml = '';
      if (configInfo.state === 'file') {
        try {
          rawToml = fs.readFileSync(configPath, 'utf8');
          parseCodexTomlMcpServers(rawToml);
        } catch (err) {
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName: '*',
            configPath,
            action: 'corrupted-config',
            message: `Corrupted TOML configuration preserved untouched: ${redactSecrets((err as Error).message)}`
          });
          continue;
        }
      }

      const existingMap = rawToml
        ? parseCodexTomlMcpServers(rawToml)
        : new Map<
            string,
            ReturnType<typeof parseCodexTomlMcpServers> extends Map<string, infer V> ? V : never
          >();
      let modifiedToml = rawToml;
      let dirty = false;

      for (const [serverName, resolvedSpec] of desiredForAgent) {
        const existing = existingMap.get(serverName);
        if (!existing) {
          modifiedToml = upsertCodexTomlServer(modifiedToml, serverName, resolvedSpec);
          dirty = true;
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName,
            configPath,
            action: 'added',
            message: dryRun
              ? `[DRY-RUN] Would add [mcp_servers.${serverName}] to TOML config.`
              : `Added [mcp_servers.${serverName}] to TOML config.`
          });
        } else if (doesCodexTomlServerMatch(existing, resolvedSpec)) {
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName,
            configPath,
            action: 'unchanged',
            message: `[mcp_servers.${serverName}] is already up to date.`
          });
        } else if (force) {
          modifiedToml = upsertCodexTomlServer(modifiedToml, serverName, resolvedSpec);
          dirty = true;
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName,
            configPath,
            action: 'updated-forced',
            message: dryRun
              ? `[DRY-RUN] Would force-update [mcp_servers.${serverName}] in TOML config.`
              : `Updated [mcp_servers.${serverName}] in TOML config (--force).`
          });
        } else {
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName,
            configPath,
            action: 'conflict-preserved',
            message: `Existing [mcp_servers.${serverName}] differs from central manifest. Preserved existing config (use --force to update).`
          });
        }
      }

      if (dirty && !dryRun) {
        try {
          snapshot?.recordPathBeforeModify(agent.definition.id, 'mcp-config', configPath);
          writeFileAtomicSync(configPath, modifiedToml);
        } catch (err) {
          results.push({
            agentId: agent.definition.id,
            agentName: agent.definition.name,
            serverName: '*',
            configPath,
            action: 'error',
            message: redactSecrets((err as Error).message)
          });
        }
      }
      continue;
    }

    // Handle JSON / JSONC dialects ('standard-json' and 'opencode-jsonc')
    const rootKey = format === 'opencode-jsonc' ? 'mcp' : 'mcpServers';
    let parsedRoot: Record<string, unknown> = {};

    if (configInfo.state === 'file') {
      try {
        const rawJson = fs.readFileSync(configPath, 'utf8');
        parsedRoot = parseJsoncObject(rawJson);
      } catch (err) {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName: '*',
          configPath,
          action: 'corrupted-config',
          message: `Corrupted JSON configuration preserved untouched: ${redactSecrets((err as Error).message)}`
        });
        continue;
      }
    }

    const existingContainer = parsedRoot[rootKey];
    if (
      existingContainer !== undefined &&
      (typeof existingContainer !== 'object' ||
        existingContainer === null ||
        Array.isArray(existingContainer))
    ) {
      results.push({
        agentId: agent.definition.id,
        agentName: agent.definition.name,
        serverName: '*',
        configPath,
        action: 'corrupted-config',
        message: `Invalid "${rootKey}" property in configuration (expected object). Preserved untouched.`
      });
      continue;
    }

    const serversContainer: Record<string, unknown> = existingContainer
      ? { ...(existingContainer as Record<string, unknown>) }
      : {};
    let dirty = false;

    for (const [serverName, resolvedSpec] of desiredForAgent) {
      const formattedEntry =
        format === 'opencode-jsonc'
          ? toOpenCodeEntry(resolvedSpec)
          : toStandardJsonEntry(resolvedSpec);

      const currentEntry = serversContainer[serverName];

      if (currentEntry === undefined) {
        serversContainer[serverName] = formattedEntry;
        dirty = true;
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName,
          configPath,
          action: 'added',
          message: dryRun
            ? `[DRY-RUN] Would add "${serverName}" to ${rootKey}.`
            : `Added "${serverName}" to ${rootKey}.`
        });
      } else if (areJsonEntriesEqual(currentEntry, formattedEntry)) {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName,
          configPath,
          action: 'unchanged',
          message: `"${serverName}" is already configured and up to date.`
        });
      } else if (force) {
        serversContainer[serverName] = formattedEntry;
        dirty = true;
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName,
          configPath,
          action: 'updated-forced',
          message: dryRun
            ? `[DRY-RUN] Would force-update "${serverName}" in ${rootKey}.`
            : `Updated "${serverName}" in ${rootKey} (--force).`
        });
      } else {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName,
          configPath,
          action: 'conflict-preserved',
          message: `Existing "${serverName}" differs from central manifest. Preserved existing config (use --force to update).`
        });
      }
    }

    if (dirty && !dryRun) {
      try {
        parsedRoot[rootKey] = serversContainer;
        snapshot?.recordPathBeforeModify(agent.definition.id, 'mcp-config', configPath);
        writeFileAtomicSync(configPath, `${JSON.stringify(parsedRoot, null, 2)}\n`);
      } catch (err) {
        results.push({
          agentId: agent.definition.id,
          agentName: agent.definition.name,
          serverName: '*',
          configPath,
          action: 'error',
          message: redactSecrets((err as Error).message)
        });
      }
    }
  }

  return results;
}
