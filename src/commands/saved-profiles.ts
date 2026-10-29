import fs from 'node:fs';
import path from 'node:path';
import { AGENT_REGISTRY } from '../agents/registry.js';
import { detectAgents } from '../agents/detector.js';
import { inspectPath, writeFileAtomicSync } from '../core/links.js';
import { discoverCentralSkills } from '../sync/skills.js';
import { readPublicCatalog } from './public-catalog.js';
import { runSync } from './sync.js';
import type { EnvironmentContext, SyncReport } from '../types.js';

export interface SavedAgentProfile {
  skills: string[];
  categories: string[];
}
export interface SavedProfileManifest {
  version: 1;
  profiles: Record<string, SavedAgentProfile>;
}
export interface SavedProfileSyncOptions {
  agentFilter?: string[];
  dryRun?: boolean;
}
const FILENAME = 'agent-profiles.json';
const MAX_BYTES = 128 * 1024;
const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const registered = new Set(AGENT_REGISTRY.map(agent => agent.id));

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function requirePhysicalHome(ctx: EnvironmentContext): void {
  if (inspectPath(ctx.homeDir).state !== 'directory') {
    throw new Error('Profile home must be a physical directory.');
  }
  const dir = inspectPath(ctx.commonsDir);
  if (dir !== undefined && dir.state !== 'missing' && dir.state !== 'directory') {
    throw new Error('Refusing linked Agent Commons profile directory.');
  }
}
function profilePath(ctx: EnvironmentContext): string {
  return path.join(ctx.commonsDir, FILENAME);
}
function sortedUnique(items: string[]): string[] {
  return [...new Set(items)].sort();
}
function validateProfile(agent: string, raw: unknown, categories: Set<string>): SavedAgentProfile {
  if (!registered.has(agent) || !isRecord(raw) ||
      Object.keys(raw).sort().join(',') !== 'categories,skills' ||
      !Array.isArray(raw.skills) || !Array.isArray(raw.categories) ||
      raw.skills.length > 512 || raw.categories.length > categories.size ||
      !raw.skills.every((s: unknown) => typeof s === 'string' && IDENTIFIER.test(s)) ||
      !raw.categories.every((s: unknown) => typeof s === 'string' && categories.has(s))) {
    throw new Error('Invalid saved profile for agent ' + agent);
  }
  const skills = raw.skills as string[];
  const selectedCategories = raw.categories as string[];
  if ((!skills.length && !selectedCategories.length) ||
      new Set(skills).size !== skills.length ||
      new Set(selectedCategories).size !== selectedCategories.length) {
    throw new Error('Saved profiles must have a selection without duplicates.');
  }
  return { skills: sortedUnique(skills), categories: sortedUnique(selectedCategories) };
}
function validateManifest(raw: unknown): SavedProfileManifest {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.profiles) ||
      Object.keys(raw).sort().join(',') !== 'profiles,version' ||
      Object.keys(raw.profiles).length > registered.size) {
    throw new Error('Invalid Agent Commons profile manifest.');
  }
  const { categories } = readPublicCatalog();
  const allowedCategories = new Set(categories.map(c => c.id));
  const profiles: Record<string, SavedAgentProfile> = Object.create(null) as Record<string, SavedAgentProfile>;
  for (const [agent, profile] of Object.entries(raw.profiles)) {
    profiles[agent] = validateProfile(agent, profile, allowedCategories);
  }
  return { version: 1, profiles };
}
/** Read-only and offline. Local profiles are never included in the public catalog. */
export function readSavedProfiles(ctx: EnvironmentContext): SavedProfileManifest {
  requirePhysicalHome(ctx);
  const filename = profilePath(ctx);
  const info = inspectPath(filename);
  if (info.state === 'missing') return { version: 1, profiles: {} };
  if (info.state !== 'file' || fs.lstatSync(filename).size > MAX_BYTES) {
    throw new Error('Profile manifest must be a small, physical JSON file.');
  }
  let raw: unknown;
  try { raw = JSON.parse(fs.readFileSync(filename, 'utf8')) as unknown; }
  catch { throw new Error('Cannot parse the saved Agent Commons profile manifest.'); }
  return validateManifest(raw);
}

/** Explicitly writes only ~/.agents/agent-profiles.json, never an agent's native files. */
export function saveAgentProfile(
  ctx: EnvironmentContext,
  agent: string,
  selections: { skills?: string[]; categories?: string[] }
): SavedProfileManifest {
  if (!registered.has(agent)) throw new Error('Unknown agent ID: ' + agent);
  const manifest = readSavedProfiles(ctx);
  const { categories } = readPublicCatalog();
  const entry = validateProfile(agent, {
    skills: selections.skills ?? [], categories: selections.categories ?? []
  }, new Set(categories.map(c => c.id)));
  manifest.profiles[agent] = entry;
  if (inspectPath(ctx.commonsDir).state === 'missing') fs.mkdirSync(ctx.commonsDir);
  writeFileAtomicSync(profilePath(ctx), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function clearAgentProfile(ctx: EnvironmentContext, agent: string): SavedProfileManifest {
  if (!registered.has(agent)) throw new Error('Unknown agent ID: ' + agent);
  const manifest = readSavedProfiles(ctx);
  if (!Object.hasOwn(manifest.profiles, agent)) {
    throw new Error('No saved profile for agent: ' + agent);
  }
  delete manifest.profiles[agent];
  writeFileAtomicSync(profilePath(ctx), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

/**
 * One unified sync transaction for installed profiled agents only. All selected
 * skills and categories are validated before runSync can change any agent.
 */
export function runSavedProfilesSync(
  ctx: EnvironmentContext, options: SavedProfileSyncOptions = {}
): SyncReport {
  const manifest = readSavedProfiles(ctx);
  const configured = Object.keys(manifest.profiles);
  if (configured.length === 0) throw new Error('No saved agent profiles. Use profiles set first.');
  const requested = options.agentFilter;
  if (requested?.some(agent => !registered.has(agent))) {
    throw new Error('Unknown requested agent for saved profiles.');
  }
  const selectedAgents = requested?.length ?
    configured.filter(agent => requested.includes(agent)) : configured;
  if (!selectedAgents.length) throw new Error('No saved profiles match the selected agents.');
  const installed = detectAgents(ctx, selectedAgents).filter(agent => agent.installed);
  if (!installed.length) throw new Error('No configured profile agents are installed on this machine.');

  const physicalSkills = new Set(discoverCentralSkills(ctx).map(skill => skill.name));
  const catalog = readPublicCatalog().catalog.skills;
  const filters: Record<string, string[]> = {};
  for (const agent of installed) {
    const config = manifest.profiles[agent.definition.id]!;
    const expanded = new Set(config.skills);
    for (const skill of catalog) {
      if (config.categories.includes(skill.category) && physicalSkills.has(skill.id)) {
        expanded.add(skill.id);
      }
    }
    if (!expanded.size) {
      throw new Error('Saved profile for ' + agent.definition.id +
        ' resolves to no locally installed skills; refusing an empty sync.');
    }
    const missing = [...expanded].filter(id => !physicalSkills.has(id));
    if (missing.length) {
      throw new Error('Saved profile for ' + agent.definition.id +
        ' includes missing central skills: ' + missing.join(', '));
    }
    filters[agent.definition.id] = sortedUnique([...expanded]);
  }
  return runSync(ctx, {
    agentFilter: installed.map(agent => agent.definition.id),
    skillFilterByAgent: filters,
    skillsOnly: true,
    dryRun: options.dryRun
  });
}
