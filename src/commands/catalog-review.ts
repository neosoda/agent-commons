import { runCatalog } from './catalog.js';
import type { EnvironmentContext } from '../types.js';

/**
 * PRIVATE, read-only triage. It never publishes skill metadata, performs network
 * requests, or promotes a lockfile claim into a verified upstream reference.
 */
export type ReviewReason =
  | 'missing-origin'
  | 'missing-license-claim'
  | 'missing-source-subpath'
  | 'unpinned-version'
  | 'duplicate-upstream-reference'
  | 'upstream-and-license-review-required'
  | 'skill-safety-review-required';

export interface LocalSkillReview {
  name: string;
  sourceUrl: string | null;
  skillPath: string | null;
  ref: string | null;
  licenseClaim: string | null;
  categorySuggestion: string | null;
  duplicateOf: string | null;
  status: 'needs-metadata' | 'needs-human-review';
  reasons: ReviewReason[];
}

export interface LocalCatalogReview {
  visibility: 'private-local-only';
  scanned: number;
  needingMetadata: number;
  awaitingHumanReview: number;
  missingOrigins: number;
  missingLicenseClaims: number;
  duplicateReferences: number;
  lockfilesUsed: string[];
  warnings: string[];
  entries: LocalSkillReview[];
}

const CATEGORIES = [
  ['security', /secur|security|audit|pentest|vulnerab|threat|malware|sast|owasp/],
  ['devops', /docker|kubernetes|k8s|devops|infra|deploy|terraform|ansible|linux|cloud|network|observ/],
  ['design', /design|\bux\b|\bui\b|figma|frontend|css|tailwind|accessib/],
  ['documentation', /document|writing|markdown|docs|readme|pdf|docx|pptx|xlsx/],
  ['ai-automation', /agent|prompt|skill|llm|mcp|rag|model|automat/],
  ['development', /code|debug|test|react|python|typescript|javascript|git|api|backend/],
  ['productivity', /productiv|plan|organ|project|research|meeting|task/]
] as const;

function suggestCategory(name: string): string | null {
  const text = name.toLocaleLowerCase('en-US');
  for (const [category, re] of CATEGORIES) if (re.test(text)) return category;
  return null;
}

export function reviewLocalCatalog(ctx: EnvironmentContext): LocalCatalogReview {
  const local = runCatalog(ctx);
  const seen = new Map<string, string>();
  let duplicateReferences = 0;
  const entries = local.skills.map(skill => {
    let duplicateOf: string | null = null;
    // A repository alone may legitimately contain many distinct skills.
    if (skill.sourceUrl && skill.skillPath) {
      const key = skill.sourceUrl.toLocaleLowerCase('en-US') + '#' +
        skill.skillPath.toLocaleLowerCase('en-US');
      duplicateOf = seen.get(key) ?? null;
      if (duplicateOf) duplicateReferences++;
      else seen.set(key, skill.name);
    }
    const reasons: ReviewReason[] = [];
    if (!skill.sourceUrl) reasons.push('missing-origin');
    if (!skill.declaredLicense) reasons.push('missing-license-claim');
    if (skill.sourceUrl && !skill.skillPath) reasons.push('missing-source-subpath');
    if (skill.sourceUrl && (!skill.ref || !/^[a-f0-9]{40}$/.test(skill.ref))) {
      reasons.push('unpinned-version');
    }
    if (duplicateOf) reasons.push('duplicate-upstream-reference');
    reasons.push('upstream-and-license-review-required', 'skill-safety-review-required');

    const status = reasons.some(reason => [
      'missing-origin', 'missing-license-claim', 'missing-source-subpath',
      'unpinned-version', 'duplicate-upstream-reference'
    ].includes(reason)) ? 'needs-metadata' as const : 'needs-human-review' as const;

    return {
      name: skill.name,
      sourceUrl: skill.sourceUrl,
      skillPath: skill.skillPath,
      ref: skill.ref,
      licenseClaim: skill.declaredLicense,
      categorySuggestion: suggestCategory(skill.name),
      duplicateOf,
      status,
      reasons
    };
  });

  return {
    visibility: 'private-local-only',
    scanned: entries.length,
    needingMetadata: entries.filter(entry => entry.status === 'needs-metadata').length,
    awaitingHumanReview: entries.filter(entry => entry.status === 'needs-human-review').length,
    missingOrigins: entries.filter(entry => entry.reasons.includes('missing-origin')).length,
    missingLicenseClaims: entries.filter(entry => entry.reasons.includes('missing-license-claim')).length,
    duplicateReferences,
    lockfilesUsed: local.lockfiles,
    warnings: local.warnings,
    entries
  };
}
