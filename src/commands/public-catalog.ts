import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { discoverCentralSkills } from '../sync/skills.js';
import type { EnvironmentContext } from '../types.js';

export interface PublicSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  repository: string;
  source: string;
  path: string;
  ref: string;
  license: string;
  licenseEvidence: string;
  review: { sourceChecked: string; licenseChecked: string; scope: 'source-and-license-only' };
  dependencies: string[];
  tags: string[];
}
export interface PublicCatalog { schemaVersion: 1; generatedAt: string; skills: PublicSkill[] }
export interface Category { id: string; label: string; description: string }
export interface PublicSkillResult extends PublicSkill { installed: boolean }
export interface PublicSearchOptions {
  query?: string;
  category?: string;
  source?: string;
  author?: string;
  license?: string;
}
const PUBLIC_CATALOG_PATH = fileURLToPath(new URL('../../catalog/skills.json', import.meta.url));
const CATEGORIES_PATH = fileURLToPath(new URL('../../catalog/categories.json', import.meta.url));
const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isSafeText(value: unknown, min = 1): value is string {
  return typeof value === 'string' && value.trim().length >= min &&
    value.length <= 1000 && !/[\u0000-\u001f<>{}]/.test(value);
}
function isSafeRelativePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length < 512 &&
    !value.startsWith('/') && !value.endsWith('/') &&
    value.split('/').every(part => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..');
}

function verifyUrl(value: unknown, repository?: string): value is string {
  if (typeof value !== 'string' || value.length > 1000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' ||
        !['github.com', 'gitlab.com', 'codeberg.org'].includes(url.hostname) ||
        url.username || url.password || url.search || url.hash ||
        url.port || url.pathname.includes('%') || value !== url.origin + url.pathname) return false;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2 || !parts.every(part => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..')) return false;
    // Accept nested GitLab groups without permitting arbitrary hosts or special URL characters.
    return !repository || value.startsWith(repository + '/');
  } catch { return false; }
}
function sourcePrefix(repository: string, ref: string): string {
  const host = new URL(repository).hostname;
  return repository + (host === 'gitlab.com' ? '/-/tree/' : host === 'codeberg.org' ? '/src/commit/' : '/tree/') + ref + '/';
}
function licensePrefix(repository: string, ref: string): string {
  const host = new URL(repository).hostname;
  return repository + (host === 'gitlab.com' ? '/-/blob/' : host === 'codeberg.org' ? '/src/commit/' : '/blob/') + ref + '/';
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + 'T00:00:00Z'));
}
/** Validate manually reviewed PUBLIC metadata; never trust local lockfiles here. */
export function validatePublicCatalog(input: unknown, categories: unknown): PublicCatalog {
  if (!Array.isArray(categories) || !categories.length) throw new Error('Invalid public categories');
  const ids = new Set<string>();
  for (const category of categories) {
    if (!isRecord(category) || typeof category.id !== 'string' ||
        !ID_PATTERN.test(category.id) || !isSafeText(category.label) ||
        !isSafeText(category.description) || ids.has(category.id) ||
        Object.keys(category).sort().join(',') !== 'description,id,label') {
      throw new Error('Invalid or duplicate public category');
    }
    ids.add(category.id);
  }
  if (!isRecord(input) || input.schemaVersion !== 1 || !validDate(input.generatedAt) ||
      !Array.isArray(input.skills) ||
      Object.keys(input).sort().join(',') !== 'generatedAt,schemaVersion,skills') {
    throw new Error('Invalid public catalog manifest');
  }
  const seen = new Set<string>();
  const seenOrigins = new Set<string>();
  for (const raw of input.skills) {
    if (!isRecord(raw) ||
        Object.keys(raw).sort().join(',') !== 'author,category,dependencies,description,id,license,licenseEvidence,name,path,ref,repository,review,source,tags' ||
        typeof raw.id !== 'string' || !ID_PATTERN.test(raw.id) || seen.has(raw.id) ||
        !isSafeText(raw.name, 3) || !isSafeText(raw.description, 10) ||
        !isSafeText(raw.author, 2) || typeof raw.category !== 'string' || !ids.has(raw.category) ||
        !verifyUrl(raw.repository) || !verifyUrl(raw.source, raw.repository) ||
        !verifyUrl(raw.licenseEvidence, raw.repository) ||
        !(raw.path === '.' || isSafeRelativePath(raw.path)) ||
        typeof raw.ref !== 'string' || !SHA_PATTERN.test(raw.ref) ||
        !isSafeText(raw.license, 2) ||
        raw.source !== (raw.path === '.' ? sourcePrefix(raw.repository as string, raw.ref).slice(0, -1) : sourcePrefix(raw.repository as string, raw.ref) + raw.path) ||
        !(raw.licenseEvidence as string).startsWith(licensePrefix(raw.repository as string, raw.ref)) ||
        !isSafeRelativePath((raw.licenseEvidence as string).slice(licensePrefix(raw.repository as string, raw.ref).length)) ||
        !/^(?:LICENSE|COPYING)(?:\.[A-Za-z0-9_-]+)?$/i.test((raw.licenseEvidence as string).split('/').at(-1) ?? '') ||
        !isRecord(raw.review) || !validDate(raw.review.sourceChecked) ||
        !validDate(raw.review.licenseChecked) || raw.review.scope !== 'source-and-license-only' ||
        Object.keys(raw.review).sort().join(',') !== 'licenseChecked,scope,sourceChecked' ||
        !Array.isArray(raw.dependencies) || !raw.dependencies.every((x: unknown) => isSafeText(x)) ||
        !Array.isArray(raw.tags) || !raw.tags.every((x: unknown) => typeof x === 'string' && ID_PATTERN.test(x))) {
      throw new Error('Invalid public catalog skill: ' +
        (isRecord(raw) && typeof raw.id === 'string' && ID_PATTERN.test(raw.id) ? raw.id : '[unknown]'));
    }
    if (seenOrigins.has(raw.source)) throw new Error('Duplicate public catalog source');
    seenOrigins.add(raw.source);
    seen.add(raw.id);
  }
  return input as unknown as PublicCatalog;
}
export function readPublicCatalog(): { catalog: PublicCatalog; categories: Category[] } {
  const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8')) as unknown;
  const catalog = JSON.parse(fs.readFileSync(PUBLIC_CATALOG_PATH, 'utf8')) as unknown;
  return { catalog: validatePublicCatalog(catalog, categories), categories: categories as Category[] };
}
export function searchPublicCatalog(ctx: EnvironmentContext, opts: PublicSearchOptions = {}): PublicSkillResult[] {
  const { catalog } = readPublicCatalog();
  const installed = new Set(discoverCentralSkills(ctx).map(skill => skill.name));
  const test = (value: string, filter?: string): boolean =>
    !filter || value.toLocaleLowerCase('en-US').includes(filter.toLocaleLowerCase('en-US'));
  return catalog.skills.filter(skill =>
    test([skill.id, skill.name, skill.description, skill.author, skill.category, ...skill.tags].join(' '), opts.query) &&
    test(skill.category, opts.category) &&
    test(new URL(skill.repository).hostname, opts.source) &&
    test(skill.author, opts.author) &&
    test(skill.license, opts.license)
  ).map(skill => ({ ...skill, installed: installed.has(skill.id) }));
}
/** Deterministic, GitHub-friendly metadata table (NO vendored skill files). */
export function renderPublicCatalogMarkdown(): string {
  const { catalog, categories } = readPublicCatalog();
  const escape = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const rows = catalog.skills.slice().sort((a,b) => a.id.localeCompare(b.id)).map(skill =>
    '| [' + escape(skill.name) + '](' + skill.source + ') | ' + escape(skill.description) +
    ' | ' + escape(categories.find(c => c.id === skill.category)?.label ?? skill.category) +
    ' | ' + escape(skill.author) + ' | [' + escape(skill.license) + '](' + skill.licenseEvidence + ') |');
  return '# Explore Agent Skills\n\n' +
    'A metadata-only catalog of **' + catalog.skills.length +
    ' upstream skills**. Sources and license texts were inspected on **' +
    catalog.generatedAt + '**; this does **not** certify code safety or grant additional redistribution rights.\n\n' +
    '| Skill | What it does | Category | Upstream / maintainer | Upstream license |\n' +
    '|:--|:--|:--|:--|:--|\n' + rows.join('\n') + '\n\n' +
    'The links target upstream files pinned to a reviewed Git commit. Agent Commons does not copy the skills.\n\n' +
    'Browse locally: `agent-commons catalog list`, `agent-commons catalog search <query>`, ' +
    '`agent-commons catalog info <id>`.\n\n' +
    '> Source and license metadata have been checked, but individual executable scripts have not been security-audited. ' +
    'Installation and updating from the catalog are disabled until a safe workflow is validated.\n';
}
