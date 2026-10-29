import fs from 'node:fs';
import { AGENT_REGISTRY } from './registry.js';
import type { DetectedAgent, EnvironmentContext } from '../types.js';

/**
 * Detects which of the 17 registered AI coding agents are installed on the local environment.
 */
export function detectAgents(ctx: EnvironmentContext, agentFilter?: string[]): DetectedAgent[] {
  const normalizedFilter =
    agentFilter && agentFilter.length > 0
      ? new Set(agentFilter.map((id) => id.trim().toLowerCase()))
      : null;

  const results: DetectedAgent[] = [];

  for (const def of AGENT_REGISTRY) {
    if (normalizedFilter && !normalizedFilter.has(def.id.toLowerCase())) {
      continue;
    }

    const candidates = def.detectPaths(ctx);
    let detectedAt: string | null = null;
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        detectedAt = candidate;
        break;
      }
    }

    const skillsDirPath = def.skillsDir(ctx);
    const skillsDirExists = fs.existsSync(skillsDirPath);

    let mcpConfigPath: string | null = null;
    let mcpConfigExists = false;
    let mcpFormat = null;

    if (def.mcpConfig) {
      mcpFormat = def.mcpConfig.format;
      const primaryPath = def.mcpConfig.path(ctx);
      if (fs.existsSync(primaryPath)) {
        mcpConfigPath = primaryPath;
        mcpConfigExists = true;
      } else if (def.mcpConfig.altPaths) {
        const alts = def.mcpConfig.altPaths(ctx);
        const foundAlt = alts.find((p) => fs.existsSync(p));
        if (foundAlt) {
          mcpConfigPath = foundAlt;
          mcpConfigExists = true;
        } else {
          mcpConfigPath = primaryPath;
          mcpConfigExists = false;
        }
      } else {
        mcpConfigPath = primaryPath;
        mcpConfigExists = false;
      }
    }

    results.push({
      definition: def,
      installed: detectedAt !== null,
      detectedAt,
      skillsDirPath,
      skillsDirExists,
      mcpConfigPath,
      mcpConfigExists,
      mcpFormat
    });
  }

  return results;
}
