import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { detectAgents } from '../agents/detector.js';
import type { EnvironmentContext } from '../types.js';

export type SyncPreviewKind = 'skills' | 'all';

/**
 * Fingerprint every managed input that can influence a web synchronization.
 * Do not follow symlinks/junctions. Hash all small files and include metadata
 * for larger files to bound memory use; a directory entry is never omitted.
 * This is an optimistic concurrency check, not a filesystem transaction lock.
 */
export function syncInputRevision(ctx: EnvironmentContext, kind: SyncPreviewKind): string {
  const hash = crypto.createHash('sha256');
  const included = new Set<string>();
  let entries = 0;
  const check = (location: string, descend: boolean, depth = 0): void => {
    const absolute = path.resolve(location);
    const key = absolute.toLowerCase();
    if (included.has(key)) return;
    included.add(key);
    if (++entries > 50000 || depth > 40) {
      throw new Error('Workspace too large for safe synchronization preview.');
    }
    let stat: fs.Stats;
    try { stat = fs.lstatSync(absolute); }
    catch (err) {
      if (['ENOENT', 'ENOTDIR'].includes((err as NodeJS.ErrnoException).code ?? '')) {
        hash.update(JSON.stringify([absolute, 'missing']) + '\n');
        return;
      }
      throw err;
    }
    hash.update(JSON.stringify([
      absolute, stat.dev, stat.ino, stat.mode, stat.size,
      stat.mtimeMs, stat.ctimeMs, stat.isSymbolicLink() ? 'link' :
        stat.isDirectory() ? 'directory' : 'file'
    ]) + '\n');
    if (stat.isSymbolicLink()) {
      hash.update(fs.readlinkSync(absolute) + '\n');
    } else if (stat.isFile()) {
      if (stat.size <= 2 * 1024 * 1024) {
        hash.update(crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex'));
      }
    } else if (stat.isDirectory() && descend) {
      for (const name of fs.readdirSync(absolute).sort()) check(path.join(absolute, name), true, depth + 1);
    }
  };
  hash.update('agent-commons-web-sync-preview-v1:' + kind + '\n');
  for (const agent of AGENT_REGISTRY) {
    for (const detectPath of agent.detectPaths(ctx)) check(detectPath, false);
  }
  const agents = detectAgents(ctx).filter(agent => agent.installed);
  hash.update(agents.map(agent => agent.definition.id).sort().join(',') + '\n');
  check(ctx.centralSkillsDir, true);
  if (kind === 'skills') check(path.join(ctx.commonsDir, 'agent-profiles.json'), false);
  if (kind === 'all') check(ctx.centralMcpPath, false);
  for (const agent of agents) {
    check(agent.skillsDirPath, true);
    if (kind === 'all' && agent.mcpConfigPath) check(agent.mcpConfigPath, false);
  }
  return hash.digest('hex');
}
