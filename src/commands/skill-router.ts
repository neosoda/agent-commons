import fs from 'node:fs';
import path from 'node:path';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { inspectPath } from '../core/links.js';
import { discoverCentralSkills } from '../sync/skills.js';
import { readPublicCatalog } from './public-catalog.js';
import { readSavedProfiles } from './saved-profiles.js';
import type { EnvironmentContext } from '../types.js';

/**
 * Offline, read-only skill discovery. Nothing is installed, executed, injected
 * into an agent session, or sent to an LLM by this module.
 */
export interface SkillRouteOptions {
  agent?: string;
  budget?: number;
  limit?: number;
  expand?: boolean;
}
export interface RoutedSkill {
  id: string;
  description: string;
  score: number;
  metadataTokens: number;
  fullTextTokens: number;
  content?: string;
}
export interface SkillRouteReport {
  task: string;
  agent: string | null;
  budget: number;
  estimatedTokens: number;
  scanned: number;
  matching: number;
  selected: RoutedSkill[];
  skippedForBudget: number;
  expanded: boolean;
  note: string;
}

const DEFAULT_BUDGET = 2400;
const DEFAULT_LIMIT = 3;
const MAX_READ_BYTES = 16 * 1024;
const MAX_EXPAND_BYTES = 256 * 1024;
const STOP = new Set([
  'and', 'the', 'for', 'from', 'with', 'that', 'this', 'your', 'you',
  'dans', 'pour', 'avec', 'une', 'des', 'les', 'est', 'sur', 'aux',
  'qui', 'que', 'par', 'mon', 'mes', 'notre', 'nous', 'plus', 'faire'
]);

function tokens(value: string): string[] {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(part => part.length >= 3 && !STOP.has(part));
}
function estimate(value: number): number {
  // Heuristic only: provider tokenization differs, and UTF-8 bytes are not tokens.
  return Math.ceil(value / 4);
}
function brief(text: string): string {
  return text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ')
    .trim().slice(0, 240);
}
function skillDescription(header: string, fallback: string): string {
  const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(header);
  if (front) {
    const lines = front[1]!.split(/\r?\n/);
    const start = lines.findIndex(line => /^description:\s*/i.test(line));
    if (start >= 0) {
      const value = lines[start]!.replace(/^description:\s*/i, '').trim();
      const raw = /^[>|][-+0-9]*$/.test(value)
        ? lines.slice(start + 1).filter(line => /^\s+\S/.test(line)).join(' ')
        : value;
      const description = brief(raw.replace(/^["']|["']$/g, ''));
      if (description) return description;
    }
  }
  return brief(fallback);
}
function readHeader(filename: string, size: number): string {
  const fd = fs.openSync(filename, 'r');
  try {
    const buf = Buffer.alloc(Math.min(size, MAX_READ_BYTES));
    const bytes = fs.readSync(fd, buf, 0, buf.length, 0);
    return buf.toString('utf8', 0, bytes);
  } finally {
    fs.closeSync(fd);
  }
}

/** Return the best matching local skills, respecting an approximate token cap. */
export function routeSkills(
  ctx: EnvironmentContext, task: string, options: SkillRouteOptions = {}
): SkillRouteReport {
  if (!task.trim() || task.length > 1000 || /[\u0000-\u001f\u007f]/.test(task)) {
    throw new Error('Provide a task of 1-1000 characters without control characters.');
  }
  const budget = options.budget ?? DEFAULT_BUDGET;
  const limit = options.limit ?? DEFAULT_LIMIT;
  if (!Number.isSafeInteger(budget) || budget < 128 || budget > 32768) {
    throw new Error('Token budget must be an integer between 128 and 32768.');
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10) {
    throw new Error('Skill limit must be an integer between 1 and 10.');
  }
  if (options.agent && !AGENT_REGISTRY.some(agent => agent.id === options.agent)) {
    throw new Error('Unknown agent: ' + options.agent);
  }

  const queryTokens = [...new Set(tokens(task))];
  if (queryTokens.length === 0) throw new Error('Task has no searchable keywords.');

  const catalog = readPublicCatalog().catalog.skills;
  const catalogById = new Map(catalog.map(item => [item.id, item]));
  const profile = options.agent ? readSavedProfiles(ctx).profiles[options.agent] : undefined;
  const candidates = discoverCentralSkills(ctx).filter(skill => {
    if (!profile) return true;
    const entry = catalogById.get(skill.name);
    return profile.skills.includes(skill.name) ||
      Boolean(entry && profile.categories.includes(entry.category));
  });
  const matched: RoutedSkill[] = [];

  for (const skill of candidates) {
    const filename = path.join(skill.path, 'SKILL.md');
    if (inspectPath(skill.path).state !== 'directory' ||
        inspectPath(filename).state !== 'file') continue;
    const stat = fs.lstatSync(filename);
    if (!stat.isFile() || stat.size === 0) continue;
    const description = skillDescription(readHeader(filename, stat.size),
      catalogById.get(skill.name)?.description ?? '');
    const nameTerms = new Set(tokens(skill.name));
    const detailTerms = new Set(tokens(description + ' ' +
      (catalogById.get(skill.name)?.tags.join(' ') ?? '')));
    const score = queryTokens.reduce((sum, word) =>
      sum + (nameTerms.has(word) ? 9 : 0) + (detailTerms.has(word) ? 2 : 0), 0);
    if (score === 0) continue;

    matched.push({
      id: skill.name, description, score,
      metadataTokens: estimate(skill.name.length + description.length + 80),
      fullTextTokens: estimate(stat.size)
    });
  }
  matched.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));

  const selected: RoutedSkill[] = [];
  let spent = 0;
  let skippedForBudget = 0;
  for (const item of matched) {
    if (selected.length >= limit) break;
    const cost = item.metadataTokens + (options.expand ? item.fullTextTokens : 0);
    const filename = path.join(ctx.centralSkillsDir, item.id, 'SKILL.md');
    const size = fs.lstatSync(filename).size;
    if ((options.expand && size > MAX_EXPAND_BYTES) || spent + cost > budget) {
      skippedForBudget++;
      continue;
    }
    if (options.expand) {
      if (inspectPath(filename).state !== 'file') continue;
      item.content = fs.readFileSync(filename, 'utf8');
    }
    selected.push(item);
    spent += cost;
  }
  return {
    task, agent: options.agent ?? null, budget, estimatedTokens: spent,
    scanned: candidates.length, matching: matched.length, selected,
    skippedForBudget, expanded: Boolean(options.expand),
    note: 'Approximation (UTF-8 bytes / 4), not measured model tokens. Read-only; no automatic agent context injection.'
  };
}
