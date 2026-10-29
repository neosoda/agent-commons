import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { inspectPath } from '../core/links.js';
import { redactSecrets } from '../security/scrubber.js';
import { readPublicCatalog } from './public-catalog.js';
import type { EnvironmentContext } from '../types.js';

const RECEIPT = '.agent-commons-source.json';
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEGMENT = /^[A-Za-z0-9_. -]+$/;
const SHA = /^[a-f0-9]{40}$/;
const MAX_FILES = 150;
const MAX_BYTES = 1024 * 1024;
const MAX_TOTAL = 8 * 1024 * 1024;
const MAX_ENTRIES = 2048;

export type IntegrityStatus = 'intact' | 'modified' | 'untracked' | 'missing' | 'unmanaged' | 'unsafe';
export interface IntegrityIssue {
  type: Exclude<IntegrityStatus, 'intact'>;
  reason: string;
  path?: string;
}
export interface SkillIntegrity {
  skill: string;
  status: IntegrityStatus;
  commit: string | null;
  checkedFiles: number;
  issues: IntegrityIssue[];
}
export interface CatalogIntegrityReport {
  healthy: boolean;
  scanned: number;
  results: SkillIntegrity[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validFilePath(value: string): boolean {
  return value.length > 0 && value.length < 500 && value.split('/').every(segment =>
    segment !== '.' && segment !== '..' && SEGMENT.test(segment) &&
    !segment.endsWith('.') && segment.toLowerCase() !== RECEIPT &&
    !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(segment));
}
function fileHash(data: Buffer): string {
  return crypto.createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex');
}
function assertRoots(ctx: EnvironmentContext): void {
  if (inspectPath(ctx.homeDir).state !== 'directory') throw new Error('Invalid or linked home directory.');
  for (const root of [ctx.commonsDir, ctx.centralSkillsDir]) {
    const state = inspectPath(root).state;
    if (state !== 'missing' && state !== 'directory') {
      throw new Error('Refusing linked or invalid central skill library.');
    }
  }
}
function auditOne(ctx: EnvironmentContext, id: string, sources: Map<string, { repository: string; path: string }>): SkillIntegrity {
  const issues: IntegrityIssue[] = [];
  const report: SkillIntegrity = { skill: id, status: 'intact', commit: null, checkedFiles: 0, issues };
  const add = (type: IntegrityIssue['type'], reason: string, relative?: string): void => {
    issues.push({ type, reason, ...(relative === undefined ? {} : { path: redactSecrets(relative) }) });
  };
  const root = path.join(ctx.centralSkillsDir, id);
  const rootState = inspectPath(root).state;
  if (rootState === 'missing') {
    add('missing', 'Skill directory does not exist.');
  } else if (rootState !== 'directory') {
    add('unsafe', 'Skill root is linked or not a physical directory.');
  } else {
    try {
      const receiptPath = path.join(root, RECEIPT);
      const receiptState = inspectPath(receiptPath).state;
      if (receiptState === 'missing') {
        add('unmanaged', 'No Agent Commons management receipt.');
      } else if (receiptState !== 'file' || fs.lstatSync(receiptPath).size > 128 * 1024) {
        add('unsafe', 'Invalid, linked or oversized management receipt.');
      } else {
        let receipt: unknown;
        try { receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8')) as unknown; }
        catch { receipt = null; }
        if (!isRecord(receipt) || receipt.schemaVersion !== 1 || receipt.managedBy !== 'agent-commons' ||
            receipt.skill !== id || typeof receipt.repository !== 'string' ||
            typeof receipt.source !== 'string' || typeof receipt.commit !== 'string' ||
            !SHA.test(receipt.commit) || !Array.isArray(receipt.files) ||
            receipt.files.length < 1 || receipt.files.length > MAX_FILES) {
          add('unsafe', 'Malformed or untrusted management receipt.');
        } else {
          const known = sources.get(id);
          const expectedSource = known && known.repository + '/tree/' + receipt.commit +
            (known.path === '.' ? '' : '/' + known.path);
          if (!known || known.repository !== receipt.repository || receipt.source !== expectedSource) {
            add('unsafe', 'Receipt provenance differs from reviewed catalog source.');
          } else {
            report.commit = receipt.commit;
            const expected = new Map<string, { sha: string; name: string }>();
            const expectedDirs = new Set<string>();
            for (const entry of receipt.files) {
              if (!isRecord(entry) || typeof entry.path !== 'string' ||
                  !validFilePath(entry.path) || typeof entry.gitBlobSha1 !== 'string' ||
                  !SHA.test(entry.gitBlobSha1) || expected.has(entry.path.toLowerCase())) {
                add('unsafe', 'Invalid or duplicate path/hash in management receipt.');
                break;
              }
              const key = entry.path.toLowerCase();
              expected.set(key, { sha: entry.gitBlobSha1, name: entry.path });
              const parts = entry.path.split('/');
              for (let i = 1; i < parts.length; i++) {
                expectedDirs.add(parts.slice(0, i).join('/').toLowerCase());
              }
            }
            if (!expected.has('skill.md')) add('unsafe', 'Receipt does not track root SKILL.md.');
            if (!issues.length) {
              const seen = new Set<string>();
              let entries = 0;
              let total = 0;
              const walk = (dir: string, prefix = ''): void => {
                for (const name of fs.readdirSync(dir)) {
                  if (++entries > MAX_ENTRIES) { add('unsafe', 'Directory entry limit exceeded.'); return; }
                  const relative = prefix ? prefix + '/' + name : name;
                  const key = relative.toLowerCase();
                  const child = path.join(dir, name);
                  const stat = fs.lstatSync(child); // Never follow junctions or symlinks.
                  if (stat.isSymbolicLink()) {
                    add('unsafe', 'Nested link or junction detected.');
                  } else if (stat.isDirectory()) {
                    if (!expectedDirs.has(key)) add('untracked', 'Unexpected directory detected.');
                    walk(child, relative);
                  } else if (stat.isFile()) {
                    if (relative === RECEIPT) continue;
                    const tracked = expected.get(key);
                    if (!tracked || seen.has(key)) {
                      add('untracked', 'Untracked or case-colliding file detected.');
                      continue;
                    }
                    seen.add(key);
                    if (stat.size > MAX_BYTES || ++report.checkedFiles > MAX_FILES ||
                        (total += stat.size) > MAX_TOTAL) {
                      add('unsafe', 'Managed skill exceeds file/size limits.');
                      continue;
                    }
                    if (fileHash(fs.readFileSync(child)) !== tracked.sha) {
                      add('modified', 'Tracked file does not match recorded Git blob.', tracked.name);
                    }
                  } else {
                    add('unsafe', 'Unsupported filesystem entry.');
                  }
                }
              };
              walk(root);
              for (const [key, entry] of expected) {
                if (!seen.has(key)) add('missing', 'Tracked file is missing.', entry.name);
              }
            }
          }
        }
      }
    } catch {
      add('unsafe', 'Filesystem read failed during local audit.');
    }
  }
  const priority: IntegrityIssue['type'][] = ['unsafe', 'untracked', 'modified', 'missing', 'unmanaged'];
  report.status = priority.find(type => issues.some(issue => issue.type === type)) ?? 'intact';
  return report;
}

/** Strictly offline and read-only: no automatic repair, downloads or agent configuration changes. */
export function verifyCatalogSkills(ctx: EnvironmentContext, id?: string): CatalogIntegrityReport {
  assertRoots(ctx);
  if (id !== undefined && !ID.test(id)) throw new Error('Invalid skill identifier.');
  const catalog = readPublicCatalog().catalog;
  const sources = new Map(catalog.skills.map(skill =>
    [skill.id, { repository: skill.repository, path: skill.path }] as const));
  // Include installed catalog entries, plus managed receipts for catalog IDs.
  // Unknown/local-only skill folders are not implicitly inspected or disclosed.
  const ids = id ? [id] : catalog.skills
    .map(skill => skill.id)
    .filter(name => inspectPath(path.join(ctx.centralSkillsDir, name)).state !== 'missing')
    .sort();
  const results = ids.map(name => auditOne(ctx, name, sources));
  return { healthy: results.every(result => result.status === 'intact'),
    scanned: results.length, results };
}
