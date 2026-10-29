import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentContext } from '../types.js';
import { inspectPath } from '../core/links.js';
import { discoverCentralSkills } from '../sync/skills.js';

export interface SkillCatalogEntry {
  name: string;
  sourceUrl: string | null;
  sourceType: string | null;
  ref: string | null;
  skillPath: string | null;
  declaredLicense: string | null;
  provenance: 'recorded' | 'unknown';
  reviewStatus: 'unverified';
}

export interface SkillCatalogReport {
  count: number;
  attributed: number;
  unattributed: number;
  lockfiles: string[];
  warnings: string[];
  skills: SkillCatalogEntry[];
}

type LockEntry = { sourceUrl?: unknown; sourceType?: unknown; source?: unknown; ref?: unknown; skillPath?: unknown };

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 && value.length < 1024 ? value.trim() : null;
}

/** Reject credentials, query tokens, local paths and unrecognized hosts. No remote calls. */
function sourceUrlFromLock(entry: LockEntry): string | null {
  const raw = safeString(entry.sourceUrl);
  if (raw) {
    try {
      const url = new URL(raw);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
          !['github.com', 'gitlab.com', 'codeberg.org', 'bitbucket.org'].includes(host) ||
          url.pathname.split('/').filter(Boolean).length < 2) return null;
      return url.origin + url.pathname.replace(/\/$/, '');
    } catch { return null; }
  }
  const source = safeString(entry.source);
  if (entry.sourceType === 'github' && source && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source)) {
    return 'https://github.com/' + source;
  }
  return null;
}

/** A license in SKILL.md is a claim by the author, NOT a verified redistribution grant. */
function declaredLicense(skillDir: string): string | null {
  const filename = path.join(skillDir, 'SKILL.md');
  try {
    const fd = fs.openSync(filename, 'r');
    let text = '';
    try {
      const buffer = Buffer.alloc(8192);
      const n = fs.readSync(fd, buffer, 0, buffer.length, 0);
      text = buffer.toString('utf8', 0, n);
    } finally { fs.closeSync(fd); }
    if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
    const frontmatter = text.split(/\r?\n---\s*\r?\n/, 1)[0] ?? '';
    const match = /^license:\s*['\"]?([A-Za-z0-9.+-]{1,80})['\"]?\s*$/m.exec(frontmatter);
    return match?.[1] ?? null;
  } catch { return null; }
}

/** Read-only local catalog. It never clones, installs, modifies or publishes skills. */
export function runCatalog(ctx: EnvironmentContext): SkillCatalogReport {
  const sources = new Map<string, LockEntry>();
  const warnings: string[] = [];
  const lockfiles: string[] = [];
  for (const filename of ['.skill-lock.json', 'skills-lock.json']) {
    const lockPath = path.join(ctx.commonsDir, filename);
    const info = inspectPath(lockPath);
    if (info.state === 'missing') continue;
    if (info.state !== 'file') { warnings.push(filename + ' is not a regular file; skipped'); continue; }
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('expected an object');
      const skills = (parsed as Record<string, unknown>)['skills'];
      if (!skills || typeof skills !== 'object' || Array.isArray(skills)) throw new Error('expected skills object');
      for (const [name, raw] of Object.entries(skills as Record<string, unknown>)) {
        if (sources.has(name) || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
        sources.set(name, raw as LockEntry);
      }
      lockfiles.push(filename);
    } catch { warnings.push(filename + ' is invalid or unsupported; skipped'); }
  }

  const skills: SkillCatalogEntry[] = discoverCentralSkills(ctx).map((skill) => {
    const locked = sources.get(skill.name);
    const sourceUrl = locked ? sourceUrlFromLock(locked) : null;
    return {
      name: skill.name,
      sourceUrl,
      sourceType: sourceUrl && locked ? safeString(locked.sourceType) : null,
      ref: sourceUrl && locked ? safeString(locked.ref) : null,
      skillPath: sourceUrl && locked ? safeString(locked.skillPath) : null,
      declaredLicense: declaredLicense(skill.path),
      provenance: sourceUrl ? 'recorded' : 'unknown',
      reviewStatus: 'unverified'
    };
  });
  const attributed = skills.filter((skill) => skill.provenance === 'recorded').length;
  return { count: skills.length, attributed, unattributed: skills.length - attributed, lockfiles, warnings, skills };
}
