import fs from 'node:fs';
import path from 'node:path';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { inspectPath } from '../core/links.js';
import { isValidIdentifier } from '../security/validator.js';
import { discoverCentralSkills } from '../sync/skills.js';
import { readPublicCatalog } from './public-catalog.js';
import { readSavedProfiles } from './saved-profiles.js';
import type { EnvironmentContext } from '../types.js';

/**
 * Smart Skill Router: offline, read-only metadata matching and explicit,
 * bounded loading of locally installed physical files. No instructions are
 * executed, auto-installed, synchronized or injected into a client.
 */
export interface SmartSkillRouterConfig {
  enabled: boolean;
  mode: 'automatic' | 'manual';
  maxSelectedSkills: number;
  maxLoadedSkills: number;
  maxSkillContextTokens: number;
  progressiveLoading: boolean;
  allowRemoteExecution: false;
  autoInstall: false;
  explainSelection: boolean;
}
export interface SkillMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  dependencies: string[];
  installed: boolean;
}
export interface RankedSkill extends SkillMetadata {
  score: number;
  reason: string;
  estimatedMetadataTokens: number;
}
export interface SmartRouteReport {
  task: string;
  agent: string | null;
  available: number;
  selected: RankedSkill[];
  loaded: string[];
  absent: RankedSkill[];
  estimatedTokens: number;
  budget: number;
  mode: 'automatic' | 'manual';
  note: string;
}
export interface LoadedSkill {
  id: string;
  status: 'loaded';
  content: string;
  resource: string;
  estimatedTokens: number;
  budget: number;
}
export interface SkillDependency {
  id: string;
  status: 'available' | 'absent' | 'unlisted' | 'cycle';
  depth: number;
}
export interface SmartRouteOptions {
  agent?: string;
  limit?: number;
  budget?: number;
  manualSelection?: string[];
}

const DEFAULT_CONFIG: Readonly<SmartSkillRouterConfig> = Object.freeze({
  enabled: true, mode: 'automatic', maxSelectedSkills: 3,
  maxLoadedSkills: 3, maxSkillContextTokens: 4000,
  progressiveLoading: true, allowRemoteExecution: false,
  autoInstall: false, explainSelection: true
});
const STOP = new Set(['the', 'and', 'for', 'from', 'with', 'your', 'this', 'that',
  'une', 'des', 'les', 'dans', 'pour', 'avec', 'sur', 'aux', 'qui', 'que',
  'mon', 'mes', 'notre', 'nous', 'est', 'faire', 'bonjour', 'hello', 'salut']);
const ALIASES: Record<string, string[]> = {
  audite: ['audit', 'security'], audit: ['security'], securite: ['security'],
  vulnerabilites: ['security'], vulns: ['security'], corrige: ['fix'],
  correction: ['fix'], docker: ['devops', 'container'], compose: ['docker'],
  conteneur: ['docker'], refonte: ['design'], interface: ['design', 'ui'],
  graphique: ['design', 'ui'], ergonomie: ['ux', 'design'], orchestrer: ['orchestration'],
  coordonne: ['orchestration', 'agent'], agents: ['agent'],
  protocole: ['protocol'], animation: ['visualization', 'interactive'],
  explique: ['documentation'], marketing: ['marketing'], psychologie: ['psychology']
};
const MAX_FILE_BYTES = 256 * 1024;
const HEADER_BYTES = 8192;
const MAX_CONFIG_BYTES = 8192;
const cache = new Map<string, { mtimeMs: number; size: number; description: string }>();

function words(text: string): string[] {
  const raw = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(word => word.length >= 3 && !STOP.has(word));
  return [...new Set(raw.flatMap(word => [word, ...(ALIASES[word] ?? [])]))];
}
function estimate(text: string): number {
  return Math.ceil(Buffer.byteLength(text, 'utf8') / 4);
}
function validateBudget(value: number): void {
  if (!Number.isSafeInteger(value) || value < 128 || value > 32768) {
    throw new Error('Token budget must be an integer between 128 and 32768.');
  }
}
function validateLimit(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new Error('Skill limit must be an integer between 1 and 10.');
  }
}
function assertPhysicalRoot(ctx: EnvironmentContext): void {
  for (const dir of [ctx.homeDir, ctx.commonsDir, ctx.centralSkillsDir]) {
    const state = inspectPath(dir).state;
    if (state !== 'directory' && state !== 'missing') {
      throw new Error('Skill router requires physical local directories.');
    }
  }
}
function safeSkillFile(ctx: EnvironmentContext, id: string, relative = 'SKILL.md'): string {
  if (!isValidIdentifier(id)) throw new Error('Invalid skill identifier.');
  if (path.isAbsolute(relative) || relative.includes('\\') || relative.length > 256) {
    throw new Error('Unsafe skill resource path.');
  }
  const segments = relative.split('/');
  if (!segments.length || segments.some(seg => !seg || seg === '.' || seg === '..' ||
    !/^[A-Za-z0-9_.-]+$/.test(seg))) throw new Error('Unsafe skill resource path.');
  assertPhysicalRoot(ctx);
  let target = path.join(ctx.centralSkillsDir, id);
  if (inspectPath(target).state !== 'directory') throw new Error('Skill absent locally: ' + id);
  for (const segment of segments.slice(0, -1)) {
    target = path.join(target, segment);
    if (inspectPath(target).state !== 'directory') throw new Error('Linked or missing resource directory.');
  }
  target = path.join(target, segments[segments.length - 1]!);
  if (inspectPath(target).state !== 'file') throw new Error('Linked or missing skill resource.');
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.size > MAX_FILE_BYTES) throw new Error('Skill resource is too large.');
  return target;
}
function localDescription(ctx: EnvironmentContext, id: string): string {
  try {
    const file = safeSkillFile(ctx, id);
    const stat = fs.lstatSync(file);
    const existing = cache.get(file);
    if (existing && existing.size === stat.size && existing.mtimeMs === stat.mtimeMs) {
      return existing.description;
    }
    const fd = fs.openSync(file, 'r');
    let header: string;
    try {
      const buffer = Buffer.alloc(Math.min(stat.size, HEADER_BYTES));
      const size = fs.readSync(fd, buffer, 0, buffer.length, 0);
      header = buffer.toString('utf8', 0, size);
    } finally { fs.closeSync(fd); }
    const front = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(header)?.[1] ?? '';
    const lines = front.split(/\r?\n/);
    const index = lines.findIndex(line => /^description:\s*/i.test(line));
    let description = index < 0 ? '' : lines[index]!.replace(/^description:\s*/i, '').trim();
    if (/^[>|][-+0-9]*$/.test(description)) {
      description = lines.slice(index + 1).filter(line => /^\s+\S/.test(line)).join(' ');
    }
    description = description.replace(/^["']|["']$/g, '')
      .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
    if (cache.size >= 128) cache.clear();
    cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, description });
    return description;
  } catch {
    return '';
  }
}

export function readSkillRouterConfig(ctx: EnvironmentContext): SmartSkillRouterConfig {
  assertPhysicalRoot(ctx);
  const configPath = path.join(ctx.commonsDir, 'skill-router.json');
  const info = inspectPath(configPath);
  if (info.state === 'missing') return { ...DEFAULT_CONFIG };
  if (info.state !== 'file' || fs.lstatSync(configPath).size > MAX_CONFIG_BYTES) {
    throw new Error('Router configuration must be a small physical JSON file.');
  }
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown; }
  catch { throw new Error('Invalid skill router JSON.'); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid skill router configuration.');
  }
  const values = raw as Record<string, unknown>;
  const keys = Object.keys(DEFAULT_CONFIG);
  if (Object.keys(values).some(key => !keys.includes(key))) {
    throw new Error('Unknown skill router configuration property.');
  }
  const config = { ...DEFAULT_CONFIG, ...values } as SmartSkillRouterConfig;
  if (typeof config.enabled !== 'boolean' ||
      !['automatic', 'manual'].includes(config.mode) ||
      !Number.isSafeInteger(config.maxSelectedSkills) || config.maxSelectedSkills < 1 ||
      config.maxSelectedSkills > 10 ||
      !Number.isSafeInteger(config.maxLoadedSkills) || config.maxLoadedSkills < 1 ||
      config.maxLoadedSkills > 10 ||
      !Number.isSafeInteger(config.maxSkillContextTokens) || config.maxSkillContextTokens < 128 ||
      config.maxSkillContextTokens > 32768 ||
      typeof config.progressiveLoading !== 'boolean' ||
      config.allowRemoteExecution !== false || config.autoInstall !== false ||
      typeof config.explainSelection !== 'boolean') {
    throw new Error('Invalid or unsafe skill router configuration.');
  }
  return config;
}

/** Discover catalog metadata and locally installed skills without loading instructions. */
export function discoverSkills(ctx: EnvironmentContext): SkillMetadata[] {
  assertPhysicalRoot(ctx);
  const local = new Set(discoverCentralSkills(ctx).map(skill => skill.name));
  const catalog = readPublicCatalog().catalog.skills;
  const items: SkillMetadata[] = catalog.map(item => ({
    id: item.id, name: item.name, description: item.description.slice(0, 240),
    category: item.category, tags: item.tags,
    dependencies: item.dependencies, installed: local.delete(item.id)
  }));
  for (const id of local) {
    items.push({ id, name: id, description: localDescription(ctx, id),
      category: 'local', tags: [], dependencies: [], installed: true });
  }
  return items.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}

/** Pure deterministic ranking. Results may include absent catalog entries. */
export function rankSkills(task: string, skills: SkillMetadata[]): RankedSkill[] {
  if (!task.trim() || task.length > 1000 || /[\u0000-\u001f\u007f]/.test(task)) {
    throw new Error('Provide a task of 1-1000 characters without control characters.');
  }
  const query = words(task);
  if (!query.length) return [];
  const result: RankedSkill[] = [];
  for (const skill of skills) {
    const names = new Set(words(skill.id + ' ' + skill.name));
    const tags = new Set(words(skill.tags.join(' ') + ' ' + skill.category));
    const description = new Set(words(skill.description));
    const hitName = query.filter(word => names.has(word));
    const hitTag = query.filter(word => tags.has(word));
    const hitDetail = query.filter(word => description.has(word));
    const score = hitName.length * 9 + hitTag.length * 5 + hitDetail.length * 2;
    if (score < 4) continue;
    result.push({
      ...skill, score, reason: hitName.length ? 'name' : hitTag.length ? 'tags/category' : 'description',
      estimatedMetadataTokens: estimate(skill.id + skill.description + skill.category) + 24
    });
  }
  return result.sort((a, b) => b.score - a.score ||
    Number(b.installed) - Number(a.installed) || a.id.localeCompare(b.id, 'en'));
}

/** Report transitive dependencies, never recursively load or install them. */
export function resolveSkillDependencies(ctx: EnvironmentContext, id: string, maxDepth = 4): SkillDependency[] {
  if (!isValidIdentifier(id)) throw new Error('Invalid skill identifier.');
  if (!Number.isInteger(maxDepth) || maxDepth < 0 || maxDepth > 6) throw new Error('Invalid dependency depth.');
  const catalog = new Map(discoverSkills(ctx).map(skill => [skill.id, skill]));
  const result: SkillDependency[] = [];
  const visited = new Set<string>();
  function walk(parent: string, depth: number, ancestors: Set<string>): void {
    if (depth > maxDepth || result.length >= 32) return;
    for (const child of catalog.get(parent)?.dependencies ?? []) {
      if (result.length >= 32) break;
      const candidate = catalog.get(child);
      const cycle = ancestors.has(child);
      if (visited.has(child) && !cycle) continue;
      result.push({ id: child, depth, status: cycle ? 'cycle' :
        !candidate ? 'unlisted' : candidate.installed ? 'available' : 'absent' });
      if (cycle) continue;
      visited.add(child);
      walk(child, depth + 1, new Set([...ancestors, child]));
    }
  }
  walk(id, 1, new Set([id]));
  return result;
}

/** Select only locally installed skills; absent entries are suggestions, not installs. */
export function routeSmartSkills(
  ctx: EnvironmentContext, task: string, options: SmartRouteOptions = {}
): SmartRouteReport {
  const config = readSkillRouterConfig(ctx);
  const budget = options.budget ?? config.maxSkillContextTokens;
  const limit = options.limit ?? config.maxSelectedSkills;
  validateBudget(budget);
  validateLimit(limit);
  if (options.agent && !AGENT_REGISTRY.some(agent => agent.id === options.agent)) {
    throw new Error('Unknown agent: ' + options.agent);
  }
  if (options.manualSelection?.some(id => !isValidIdentifier(id)) ||
      (options.manualSelection?.length ?? 0) > 10) {
    throw new Error('Invalid manual skill selection.');
  }
  const all = discoverSkills(ctx);
  const profile = options.agent ? readSavedProfiles(ctx).profiles[options.agent] : undefined;
  const eligible = all.filter(item => !profile ||
    profile.skills.includes(item.id) || profile.categories.includes(item.category));
  const ranked = rankSkills(task, eligible);
  const wanted = new Set(options.manualSelection ?? []);
  const manuallyRanked = [...ranked];
  for (const id of wanted) {
    const entry = eligible.find(item => item.id === id);
    if (entry && !manuallyRanked.some(item => item.id === id)) {
      manuallyRanked.unshift({ ...entry, score: 0, reason: 'manual',
        estimatedMetadataTokens: estimate(entry.id + entry.description) + 24 });
    }
  }
  const pool = config.mode === 'manual' ? manuallyRanked.filter(item => wanted.has(item.id)) :
    wanted.size ? manuallyRanked.filter(item => wanted.has(item.id)) : ranked;
  const selected: RankedSkill[] = [];
  let estimatedTokens = 0;
  for (const candidate of pool) {
    if (selected.length >= Math.min(limit, config.maxSelectedSkills)) break;
    if (!candidate.installed) continue;
    const samePurpose = selected.some(item => item.category === candidate.category &&
      item.category !== 'local' && (() => {
        const a = new Set(words(item.id + ' ' + item.description));
        const b = new Set(words(candidate.id + ' ' + candidate.description));
        const overlap = [...a].filter(word => b.has(word)).length;
        return overlap / Math.max(1, Math.min(a.size, b.size)) >= 0.7;
      })());
    if (samePurpose) continue;
    if (estimatedTokens + candidate.estimatedMetadataTokens > budget) continue;
    selected.push(candidate);
    estimatedTokens += candidate.estimatedMetadataTokens;
  }
  const absent = ranked.filter(item => !item.installed).slice(0, 5);
  return {
    task, agent: options.agent ?? null, available: eligible.filter(item => item.installed).length,
    selected: config.enabled ? selected : [], loaded: [],
    absent, estimatedTokens: config.enabled ? estimatedTokens : 0, budget,
    mode: config.mode,
    note: 'Metadata only. Local read-only routing; approximate UTF-8 bytes/4. Explicit load is separate; no prompt injection, execution or installation.'
  };
}

/** Explicit opt-in load with a hard cap; resource files must stay within the physical skill. */
export function loadSkill(ctx: EnvironmentContext, id: string, resource = 'SKILL.md',
  budget?: number): LoadedSkill {
  const config = readSkillRouterConfig(ctx);
  if (!config.enabled) throw new Error('Skill router is disabled.');
  const cap = Math.min(budget ?? config.maxSkillContextTokens, config.maxSkillContextTokens);
  validateBudget(cap);
  const filename = safeSkillFile(ctx, id, resource);
  const content = fs.readFileSync(filename, 'utf8');
  const estimatedTokens = estimate(content);
  if (estimatedTokens > cap) {
    throw new Error('Skill exceeds token budget; select a smaller resource or increase configured budget.');
  }
  return { id, status: 'loaded', content, resource, estimatedTokens, budget: cap };
}

export function loadSkills(ctx: EnvironmentContext, ids: string[], budget?: number): LoadedSkill[] {
  const config = readSkillRouterConfig(ctx);
  if (ids.length > config.maxLoadedSkills || new Set(ids).size !== ids.length) {
    throw new Error('Too many or duplicate skills requested.');
  }
  const cap = Math.min(budget ?? config.maxSkillContextTokens, config.maxSkillContextTokens);
  validateBudget(cap);
  let used = 0;
  const result: LoadedSkill[] = [];
  for (const id of ids) {
    const skill = loadSkill(ctx, id, 'SKILL.md', cap - used < 128 ? 128 : cap - used);
    if (used + skill.estimatedTokens > cap) {
      throw new Error('Combined skill context budget exceeded.');
    }
    used += skill.estimatedTokens;
    result.push(skill);
  }
  return result;
}
