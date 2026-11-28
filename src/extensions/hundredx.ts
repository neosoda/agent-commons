/**
 * Native 100x Engineer extension manager, execution profiles and workspace inspector.
 * Pinned release archive with SHA-256 verification, isolated installation, snapshot-backed
 * configuration/skill operations, and read-only inspection without unauthorized execution.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { detectAgents } from '../agents/detector.js';
import { SnapshotSession, restoreBackup } from '../core/backup.js';
import {
  arePathsEqual,
  copyDirectorySafe,
  inspectPath,
  mkdtempSafe,
  removePhysicalDirectorySafe,
  writeFileAtomicSync
} from '../core/links.js';
import { resolveCommand } from '../mcp/health.js';
import { redactSecrets } from '../security/scrubber.js';
import { runSync } from '../commands/sync.js';
import type { EnvironmentContext, SyncReport } from '../types.js';

export const HUNDREDX_EXTENSION = Object.freeze({
  id: '100x',
  name: '100x Engineer',
  version: '0.1.1',
  commit: '8b43a726e3114882061f4b0b5dc1887bb96cefa3',
  repository: 'https://github.com/DeadInternetStudios/100x-engineer-skill',
  tarballUrl:
    'https://github.com/DeadInternetStudios/100x-engineer-skill/releases/download/v0.1.1/100x-engineer-skill-0.1.1.tgz',
  tarballSha256: '1a745ddade5db30a413baafe8dc7e1ef91bc9b8c4486d8be220b047013257118',
  license: 'MIT',
  author: 'DeadInternetStudios'
});

export interface HundredXModeInfo {
  id: string;
  kind: 'build' | 'review' | 'run' | 'plan' | 'setup' | 'eval';
  summary: string;
  paidRisk: 'none' | 'optional' | 'helper';
  requiresSecondModel: boolean;
}

export const HUNDREDX_MODES: readonly HundredXModeInfo[] = Object.freeze([
  { id: '100x', kind: 'build', summary: 'Full 8-stage build pipeline with formal property checks, polish passes and second-model review.', paidRisk: 'optional', requiresSecondModel: false },
  { id: '100x-mockup', kind: 'build', summary: 'Fast 15-minute working moment prototype; skips formal verification and judge rounds (UNREVIEWED).', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-wrapup', kind: 'build', summary: 'Deadline wrap-up: stabilizes the primary user journey and hides unfinished paths.', paidRisk: 'optional', requiresSecondModel: false },
  { id: '100x-overnight', kind: 'build', summary: 'Deadline-bounded unattended run across one or more briefs using saved checkpoints.', paidRisk: 'helper', requiresSecondModel: false },
  { id: '100x-solo', kind: 'build', summary: 'Single-session pipeline with explicit written self-challenge and no subagents or external judge.', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-judge', kind: 'review', summary: 'Independent second-model review rounds (code, UI/UX, ship) with mandatory finding triage.', paidRisk: 'helper', requiresSecondModel: true },
  { id: '100x-grind', kind: 'review', summary: 'Iterative review and fix loop until ship-ready, 3 consecutive non-improving rounds, 15 rounds or timeout.', paidRisk: 'helper', requiresSecondModel: true },
  { id: '100x-continue', kind: 'run', summary: 'Resume an interrupted 100x run from .100x/STATE.md and verify/ledger.tsv.', paidRisk: 'optional', requiresSecondModel: false },
  { id: '100x-status', kind: 'run', summary: 'Concise 6-line status of stage, open asks, risks, clock and next action.', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-report', kind: 'run', summary: 'Inspect finished runs, verdicts and .100x/REPORT.html gallery without mutating code.', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-adhd', kind: 'plan', summary: 'Iterative short-turn scoping into a concrete brief before any implementation starts.', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-setup', kind: 'setup', summary: 'Interactive model, role, preset and budget configuration for 100x.', paidRisk: 'none', requiresSecondModel: false },
  { id: '100x-bakeoff', kind: 'eval', summary: 'Blind comparison harness evaluating agent output with vs without 100x.', paidRisk: 'helper', requiresSecondModel: true }
]);

export const HUNDREDX_SKILL_IDS = HUNDREDX_MODES.map(mode => mode.id);

export type ExecutionProfileName = 'lite' | 'standard' | 'deep';

export interface ExecutionProfileSpec {
  id: ExecutionProfileName;
  label: string;
  usage: string;
  maxSteps: number;
  maxToolCalls: number;
  maxTokens: number;
  maxDurationMs: number;
  maxIdleSteps: number;
  maxCloudCalls: number;
  maxParallelHelpers: number;
  maxRetriesPerTask: number;
  hundredxPreset: 'lite' | 'medium' | 'standard';
  polishPasses: number;
  reviewRounds: number;
  allowPaidByDefault: false;
}

export const EXECUTION_PROFILES: Readonly<Record<ExecutionProfileName, ExecutionProfileSpec>> = Object.freeze({
  lite: {
    id: 'lite',
    label: 'Lite',
    usage: 'Daily development with strictly controlled token, step and cost budgets.',
    maxSteps: 18,
    maxToolCalls: 14,
    maxTokens: 12_000,
    maxDurationMs: 10 * 60_000,
    maxIdleSteps: 2,
    maxCloudCalls: 0,
    maxParallelHelpers: 1,
    maxRetriesPerTask: 2,
    hundredxPreset: 'lite',
    polishPasses: 1,
    reviewRounds: 2,
    allowPaidByDefault: false
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    usage: 'Complex features and important deliveries with balanced verification and review.',
    maxSteps: 30,
    maxToolCalls: 24,
    maxTokens: 24_000,
    maxDurationMs: 20 * 60_000,
    maxIdleSteps: 3,
    maxCloudCalls: 1,
    maxParallelHelpers: 1,
    maxRetriesPerTask: 3,
    hundredxPreset: 'medium',
    polishPasses: 2,
    reviewRounds: 3,
    allowPaidByDefault: false
  },
  deep: {
    id: 'deep',
    label: 'Deep',
    usage: 'Thorough verification, regression coverage and production-readiness gates.',
    maxSteps: 60,
    maxToolCalls: 48,
    maxTokens: 64_000,
    maxDurationMs: 45 * 60_000,
    maxIdleSteps: 4,
    maxCloudCalls: 2,
    maxParallelHelpers: 2,
    maxRetriesPerTask: 3,
    hundredxPreset: 'standard',
    polishPasses: 3,
    reviewRounds: 5,
    allowPaidByDefault: false
  }
});

export interface ProfileAdaptationScope {
  allowWrite?: boolean;
  allowTests?: boolean;
  allowPaidReview?: boolean;
  fileCountHint?: number;
  hasUi?: boolean;
}

export interface AdaptedExecutionPlan {
  profile: ExecutionProfileName;
  limits: {
    maxSteps: number;
    maxToolCalls: number;
    maxTokens: number;
    maxDurationMs: number;
    maxIdleSteps: number;
    maxCloudCalls: number;
    maxParallelHelpers: number;
    maxRetriesPerTask: number;
  };
  checks: {
    verifyStatus: boolean;
    verifyRun: boolean;
    uiScreenshots: boolean;
    independentReview: boolean;
    polishPasses: number;
    reviewRounds: number;
  };
  paidConsumptionAuthorized: boolean;
  notes: string[];
}

export function isExecutionProfile(value: unknown): value is ExecutionProfileName {
  return value === 'lite' || value === 'standard' || value === 'deep';
}

/**
 * Dynamically adapts checks, iteration counts and concurrency within the strict upper
 * bounds of the selected profile. Never authorizes paid cloud/review calls automatically.
 */
export function adaptExecutionProfile(
  profileName: ExecutionProfileName = 'lite',
  scope: ProfileAdaptationScope = {}
): AdaptedExecutionPlan {
  const base = EXECUTION_PROFILES[profileName];
  const allowPaid = scope.allowPaidReview === true;
  const allowTests = scope.allowTests === true;
  const smallScope = typeof scope.fileCountHint === 'number' && scope.fileCountHint > 0 && scope.fileCountHint <= 3;

  const maxSteps = smallScope ? Math.max(8, Math.ceil(base.maxSteps * 0.75)) : base.maxSteps;
  const maxToolCalls = smallScope ? Math.max(6, Math.ceil(base.maxToolCalls * 0.75)) : base.maxToolCalls;
  const maxCloudCalls = allowPaid ? base.maxCloudCalls : 0;
  const polishPasses = scope.hasUi === false ? 0 : smallScope && profileName !== 'deep' ? 1 : base.polishPasses;
  const reviewRounds = allowPaid ? (smallScope && profileName === 'lite' ? 1 : base.reviewRounds) : 0;

  const notes: string[] = [];
  if (!allowPaid) notes.push('Paid/external review calls disabled (requires explicit authorization).');
  if (!allowTests) notes.push('Executable verification commands disabled without --allow-tests.');
  if (smallScope) notes.push('Bounded scope detected: step/polish budget tightened within profile cap.');

  return {
    profile: profileName,
    limits: {
      maxSteps,
      maxToolCalls,
      maxTokens: base.maxTokens,
      maxDurationMs: base.maxDurationMs,
      maxIdleSteps: base.maxIdleSteps,
      maxCloudCalls,
      maxParallelHelpers: base.maxParallelHelpers,
      maxRetriesPerTask: base.maxRetriesPerTask
    },
    checks: {
      verifyStatus: true,
      verifyRun: allowTests,
      uiScreenshots: scope.hasUi !== false && profileName !== 'lite',
      independentReview: allowPaid && reviewRounds > 0,
      polishPasses,
      reviewRounds
    },
    paidConsumptionAuthorized: allowPaid,
    notes
  };
}

const MAX_ARCHIVE_BYTES = 32 * 1024 * 1024;
const MAX_TAR_BYTES = 64 * 1024 * 1024;
const MAX_PACKAGE_FILES = 1000;
const RECEIPT_NAME = '100x-installation.json';
const SKILL_SOURCE_RECEIPT = '.agent-commons-source.json';
const RESERVED_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

interface HundredXReceipt {
  schemaVersion: 1;
  id: '100x';
  version: string;
  commit: string;
  tarballSha256: string;
  entrySha256: string;
  installedAt: string;
  files: Array<{ path: string; sha256: string }>;
}

const extensionsRoot = (ctx: EnvironmentContext): string => path.join(ctx.commonsDir, 'extensions');
export const hundredxInstallDir = (ctx: EnvironmentContext): string => path.join(extensionsRoot(ctx), '100x');
export const hundredxReceiptPath = (ctx: EnvironmentContext): string => path.join(extensionsRoot(ctx), RECEIPT_NAME);
export const hundredxGlobalDir = (ctx: EnvironmentContext): string => path.join(ctx.homeDir, '.100x');
export const hundredxGlobalConfigPath = (ctx: EnvironmentContext): string => path.join(hundredxGlobalDir(ctx), 'config.json');

function sha256Hex(bytes: Uint8Array | string): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function gitBlobSha1(bytes: Buffer): string {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

function assertSafeLocalRoots(ctx: EnvironmentContext): void {
  if (inspectPath(ctx.homeDir).state !== 'directory') {
    throw new Error('Home directory must be physical.');
  }
  for (const dir of [ctx.commonsDir, extensionsRoot(ctx), ctx.centralSkillsDir]) {
    const state = inspectPath(dir).state;
    if (state !== 'missing' && state !== 'directory') {
      throw new Error('Unsafe 100x extension storage path.');
    }
  }
  const receiptState = inspectPath(hundredxReceiptPath(ctx)).state;
  if (receiptState !== 'missing' && receiptState !== 'file') {
    throw new Error('Unsafe 100x extension receipt path.');
  }
}

function safePackageRelative(rawName: string): string | null {
  const cleaned = rawName.replace(/^\.\//, '');
  if (!cleaned.startsWith('package/')) return null;
  const rel = cleaned.slice('package/'.length);
  if (!rel || rel.endsWith('/')) return null;
  if (rel.length > 450 || rel.includes('\0') || rel.includes('\\')) {
    throw new Error('Unsafe path inside 100x release archive.');
  }
  const parts = rel.split('/');
  if (
    parts.some(
      seg =>
        !seg ||
        seg === '.' ||
        seg === '..' ||
        seg.endsWith('.') ||
        seg.endsWith(' ') ||
        RESERVED_DEVICE.test(seg) ||
        !/^[A-Za-z0-9_@.+ -]+$/.test(seg)
    )
  ) {
    throw new Error('Unsafe filename inside 100x release archive.');
  }
  return rel;
}

function parsePaxRecords(data: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  const text = data.toString('utf8');
  let offset = 0;
  while (offset < text.length) {
    const space = text.indexOf(' ', offset);
    if (space < 0) break;
    const len = Number(text.slice(offset, space));
    if (!Number.isSafeInteger(len) || len <= 0 || offset + len > text.length) break;
    const record = text.slice(space + 1, offset + len - 1);
    const eq = record.indexOf('=');
    if (eq > 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    offset += len;
  }
  return out;
}

/**
 * Verifies the release tarball SHA-256 and extracts only regular files under `package/`
 * without invoking tar/npm or executing any scripts.
 */
export function extractVerifiedTgz(
  archive: Buffer,
  destination: string,
  expectedSha256: string = HUNDREDX_EXTENSION.tarballSha256
): Array<{ path: string; sha256: string; mode: number }> {
  if (archive.length === 0 || archive.length > MAX_ARCHIVE_BYTES) {
    throw new Error('100x release archive exceeded size limit.');
  }
  if (sha256Hex(archive) !== expectedSha256) {
    throw new Error('100x release SHA-256 verification failed.');
  }
  const tar = gunzipSync(archive, { maxOutputLength: MAX_TAR_BYTES });
  const extracted: Array<{ path: string; sha256: string; mode: number }> = [];
  const seen = new Set<string>();
  let totalUnpacked = 0;
  let paxNext: Record<string, string> = {};

  for (let offset = 0; offset + 512 <= tar.length; ) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every(b => b === 0)) break;
    const nameRaw = header.toString('utf8', 0, 100).split('\0')[0] ?? '';
    const prefixRaw = header.toString('utf8', 345, 500).split('\0')[0] ?? '';
    const modeOctal = header.toString('ascii', 100, 108).replace(/\0.*$/, '').trim();
    const sizeOctal = header.toString('ascii', 124, 136).replace(/\0.*$/, '').trim();
    const typeFlag = header[156] ?? 0;
    if (!/^[0-7]+$/.test(sizeOctal)) throw new Error('Invalid 100x tar header.');
    const size = parseInt(sizeOctal, 8);
    const dataStart = offset + 512;
    if (!Number.isSafeInteger(size) || size < 0 || dataStart + size > tar.length) {
      throw new Error('Invalid 100x tar entry size.');
    }
    const data = tar.subarray(dataStart, dataStart + size);
    offset = dataStart + Math.ceil(size / 512) * 512;

    if (typeFlag === 120 /* 'x' */) {
      paxNext = { ...paxNext, ...parsePaxRecords(data) };
      continue;
    }
    if (typeFlag === 103 /* 'g' */) continue;

    const rawPath = paxNext['path'] ?? (prefixRaw ? `${prefixRaw}/${nameRaw}` : nameRaw);
    paxNext = {};

    if (typeFlag === 53 /* '5' dir */) continue;
    if (typeFlag !== 48 /* '0' */ && typeFlag !== 0) {
      throw new Error('Unsupported or linked entry in 100x release archive.');
    }
    const rel = safePackageRelative(rawPath);
    if (!rel) continue;
    const lower = rel.toLowerCase();
    if (seen.has(lower)) throw new Error('Case-insensitive path collision in 100x release archive.');
    seen.add(lower);

    totalUnpacked += size;
    if (extracted.length >= MAX_PACKAGE_FILES || totalUnpacked > MAX_TAR_BYTES) {
      throw new Error('100x release contents exceed safe extraction limits.');
    }

    const outPath = path.join(destination, ...rel.split('/'));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const parsedMode = /^[0-7]+$/.test(modeOctal) ? parseInt(modeOctal, 8) : 0o644;
    const executable = (parsedMode & 0o111) !== 0 || rel.startsWith('bin/') || rel.endsWith('.sh');
    const fileMode = executable ? 0o755 : 0o644;
    const fileBytes = Buffer.from(data);
    fs.writeFileSync(outPath, fileBytes, { flag: 'wx', mode: fileMode });
    if (process.platform !== 'win32' && executable) fs.chmodSync(outPath, 0o755);
    extracted.push({ path: rel, sha256: sha256Hex(fileBytes), mode: fileMode });
  }

  if (!extracted.some(item => item.path === 'bin/100x.mjs')) {
    throw new Error('100x CLI entry point missing in verified archive.');
  }
  return extracted.sort((a, b) => a.path.localeCompare(b.path));
}

function readReceipt(ctx: EnvironmentContext): { raw: string; receipt: HundredXReceipt | null } {
  assertSafeLocalRoots(ctx);
  const file = hundredxReceiptPath(ctx);
  if (inspectPath(file).state !== 'file') return { raw: '', receipt: null };
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.length > 512 * 1024) throw new Error('Invalid 100x installation receipt.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Invalid 100x installation receipt.');
  }
  const r = parsed as HundredXReceipt;
  if (
    !r ||
    typeof r !== 'object' ||
    r.schemaVersion !== 1 ||
    r.id !== '100x' ||
    typeof r.version !== 'string' ||
    !/^[0-9a-f]{40}$/.test(r.commit) ||
    !/^[0-9a-f]{64}$/.test(r.tarballSha256) ||
    !/^[0-9a-f]{64}$/.test(r.entrySha256) ||
    !Array.isArray(r.files)
  ) {
    throw new Error('Invalid 100x installation receipt.');
  }
  return { raw, receipt: r };
}

function verifyManagedTree(ctx: EnvironmentContext, receipt: HundredXReceipt): boolean {
  const root = hundredxInstallDir(ctx);
  if (inspectPath(root).state !== 'directory') return false;
  const entry = path.join(root, 'bin', '100x.mjs');
  if (inspectPath(entry).state !== 'file') return false;
  if (sha256Hex(fs.readFileSync(entry)) !== receipt.entrySha256) return false;
  for (const item of receipt.files) {
    if (!/^[a-f0-9]{64}$/.test(item.sha256) || item.path.includes('..') || path.isAbsolute(item.path)) {
      return false;
    }
    const file = path.join(root, ...item.path.split('/'));
    if (inspectPath(file).state !== 'file') return false;
    if (sha256Hex(fs.readFileSync(file)) !== item.sha256) return false;
  }
  return true;
}

export function findExternalHundredX(): string | null {
  return resolveCommand('100x');
}

export function hundredxExecutable(ctx: EnvironmentContext): { command: string; argsPrefix: string[]; managed: boolean } | null {
  const { receipt } = readReceipt(ctx);
  if (receipt && verifyManagedTree(ctx, receipt)) {
    return {
      command: process.execPath,
      argsPrefix: [path.join(hundredxInstallDir(ctx), 'bin', '100x.mjs')],
      managed: true
    };
  }
  const external = findExternalHundredX();
  if (!external) return null;
  return { command: external, argsPrefix: [], managed: false };
}

function detectGitSh(platform: NodeJS.Platform): boolean {
  if (platform !== 'win32') return resolveCommand('sh') !== null;
  if (process.env['X100_SH'] && inspectPath(process.env['X100_SH']).state === 'file') return true;
  if (resolveCommand('sh') !== null) return true;
  const roots = new Set<string>();
  for (const dir of (process.env['PATH'] ?? '').split(path.delimiter).filter(Boolean)) {
    if (inspectPath(path.join(dir, 'git.exe')).state === 'file') roots.add(path.dirname(dir));
  }
  for (const base of [
    process.env['ProgramFiles'],
    process.env['ProgramFiles(x86)'],
    process.env['ProgramW6432'],
    process.env['LOCALAPPDATA'] ? path.join(process.env['LOCALAPPDATA'], 'Programs') : undefined
  ]) {
    if (base) roots.add(path.join(base, 'Git'));
  }
  for (const root of roots) {
    if (
      inspectPath(path.join(root, 'usr', 'bin', 'sh.exe')).state === 'file' ||
      inspectPath(path.join(root, 'bin', 'sh.exe')).state === 'file'
    ) {
      return true;
    }
  }
  return false;
}

function detectChromiumCache(ctx: EnvironmentContext): boolean {
  const cacheDir =
    process.env['PLAYWRIGHT_BROWSERS_PATH'] && process.env['PLAYWRIGHT_BROWSERS_PATH'] !== '0'
      ? process.env['PLAYWRIGHT_BROWSERS_PATH']
      : ctx.platform === 'win32'
        ? path.join(ctx.localAppDataDir, 'ms-playwright')
        : ctx.platform === 'darwin'
          ? path.join(ctx.homeDir, 'Library', 'Caches', 'ms-playwright')
          : path.join(ctx.homeDir, '.cache', 'ms-playwright');
  try {
    return fs.readdirSync(cacheDir).some(name => name.startsWith('chromium'));
  } catch {
    return false;
  }
}

export interface HundredXConfigSummary {
  exists: boolean;
  profile: ExecutionProfileName | 'custom' | 'unconfigured';
  reviewEnabled: boolean;
  verifyEnabled: boolean;
  polishPasses: number;
  reviewRounds: number;
  hasReviewModel: boolean;
  hasReviewCommand: boolean;
  tokenBudget: number | null;
}

function readHundredXConfigFile(file: string): HundredXConfigSummary {
  const state = inspectPath(file).state;
  if (state !== 'file') {
    return {
      exists: false,
      profile: 'unconfigured',
      reviewEnabled: true,
      verifyEnabled: true,
      polishPasses: 3,
      reviewRounds: 5,
      hasReviewModel: false,
      hasReviewCommand: false,
      tokenBudget: null
    };
  }
  const raw = fs.readFileSync(file, 'utf8');
  if (raw.length > 64 * 1024) throw new Error('Oversized 100x configuration file.');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid 100x configuration JSON.');
  }
  const polish = (parsed['polish'] as Record<string, unknown> | undefined) ?? {};
  const review = (parsed['review'] as Record<string, unknown> | undefined) ?? {};
  const verify = (parsed['verify'] as Record<string, unknown> | undefined) ?? {};
  const budget = (parsed['budget'] as Record<string, unknown> | undefined) ?? {};
  const polishPasses = typeof polish['passes'] === 'number' ? polish['passes'] : 3;
  const reviewRounds = typeof review['rounds'] === 'number' ? review['rounds'] : 5;
  const profile: HundredXConfigSummary['profile'] =
    polishPasses === 1 && reviewRounds === 2
      ? 'lite'
      : polishPasses === 2 && reviewRounds === 3
        ? 'standard'
        : polishPasses === 3 && reviewRounds === 5
          ? 'deep'
          : 'custom';
  return {
    exists: true,
    profile,
    reviewEnabled: review['enabled'] !== false,
    verifyEnabled: verify['enabled'] !== false,
    polishPasses,
    reviewRounds,
    hasReviewModel: typeof review['model'] === 'string' && review['model'].trim().length > 0,
    hasReviewCommand: typeof review['command'] === 'string' && review['command'].trim().length > 0,
    tokenBudget: typeof budget['tokens'] === 'number' ? budget['tokens'] : null
  };
}

export interface HundredXStatus {
  id: '100x';
  name: string;
  reviewedVersion: string;
  pinnedCommit: string;
  managed: boolean;
  healthy: boolean;
  unmanaged: boolean;
  installedVersion: string | null;
  updateAvailable: boolean;
  externalAvailable: boolean;
  skillsInstalled: string[];
  skillsMissing: string[];
  compatibleClients: Array<{ id: string; name: string; syncedSkillsCount: number; readsCentralSkills: boolean }>;
  prerequisites: {
    node22Plus: boolean;
    git: boolean;
    posixSh: boolean;
    chromiumCache: boolean;
  };
  config: HundredXConfigSummary;
  modes: readonly HundredXModeInfo[];
  revision: string;
}

export function inspectHundredX(ctx: EnvironmentContext): HundredXStatus {
  const { raw, receipt } = readReceipt(ctx);
  const dirState = inspectPath(hundredxInstallDir(ctx)).state;
  const managed = receipt !== null;
  const healthy = managed && verifyManagedTree(ctx, receipt);
  const unmanaged = !managed && dirState !== 'missing';

  const skillsInstalled: string[] = [];
  const skillsMissing: string[] = [];
  for (const id of HUNDREDX_SKILL_IDS) {
    const skillDir = path.join(ctx.centralSkillsDir, id);
    if (inspectPath(skillDir).state === 'directory' && inspectPath(path.join(skillDir, 'SKILL.md')).state === 'file') {
      skillsInstalled.push(id);
    } else {
      skillsMissing.push(id);
    }
  }

  const compatibleClients = detectAgents(ctx)
    .filter(agent => agent.installed && agent.definition.skillsSupported !== false)
    .map(agent => {
      let syncedSkillsCount = 0;
      if (agent.definition.readsCentralSkills) {
        syncedSkillsCount = skillsInstalled.length;
      } else if (inspectPath(agent.skillsDirPath).state === 'directory') {
        syncedSkillsCount = skillsInstalled.filter(
          id => inspectPath(path.join(agent.skillsDirPath, id)).state !== 'missing'
        ).length;
      }
      return {
        id: agent.definition.id,
        name: agent.definition.name,
        syncedSkillsCount,
        readsCentralSkills: agent.definition.readsCentralSkills === true
      };
    });

  const major = Number(process.versions.node.split('.')[0]);
  const prerequisites = {
    node22Plus: major >= 22,
    git: resolveCommand('git') !== null,
    posixSh: detectGitSh(ctx.platform),
    chromiumCache: detectChromiumCache(ctx)
  };
  const config = readHundredXConfigFile(hundredxGlobalConfigPath(ctx));
  const revision = sha256Hex(
    [raw, dirState, skillsInstalled.join(','), config.exists ? fs.readFileSync(hundredxGlobalConfigPath(ctx), 'utf8') : ''].join('\0')
  );

  return {
    id: '100x',
    name: HUNDREDX_EXTENSION.name,
    reviewedVersion: HUNDREDX_EXTENSION.version,
    pinnedCommit: HUNDREDX_EXTENSION.commit,
    managed,
    healthy,
    unmanaged,
    installedVersion: receipt?.version ?? null,
    updateAvailable: healthy && (receipt?.version !== HUNDREDX_EXTENSION.version || receipt?.commit !== HUNDREDX_EXTENSION.commit),
    externalAvailable: findExternalHundredX() !== null,
    skillsInstalled,
    skillsMissing,
    compatibleClients,
    prerequisites,
    config,
    modes: HUNDREDX_MODES,
    revision
  };
}

export type HundredXOperation = 'install' | 'update' | 'repair' | 'uninstall';

export interface HundredXPreview {
  id: '100x';
  operation: HundredXOperation;
  version: string;
  commit: string;
  tarballSha256: string;
  includeSkills: boolean;
  skillsToStage: string[];
  skillsAlreadyPresent: string[];
  skillsToRemove: string[];
  linkedClients: string[];
  affectsNativeClients: false;
  revision: string;
}

function collectCentralFiles(dir: string, prefix = ''): Array<{ path: string; gitBlobSha1: string }> {
  const out: Array<{ path: string; gitBlobSha1: string }> = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = fs.lstatSync(full);
    if (st.isSymbolicLink()) throw new Error('Refusing symlink inside 100x skill folder.');
    if (st.isDirectory()) out.push(...collectCentralFiles(full, rel));
    else if (st.isFile() && rel !== SKILL_SOURCE_RECEIPT) {
      out.push({ path: rel, gitBlobSha1: gitBlobSha1(fs.readFileSync(full)) });
    }
  }
  return out;
}

function isManaged100xSkillDir(ctx: EnvironmentContext, id: string): boolean {
  const dir = path.join(ctx.centralSkillsDir, id);
  const receiptFile = path.join(dir, SKILL_SOURCE_RECEIPT);
  if (inspectPath(dir).state !== 'directory' || inspectPath(receiptFile).state !== 'file') return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(receiptFile, 'utf8')) as { managedBy?: string; repository?: string };
    return parsed.managedBy === 'agent-commons' && parsed.repository === HUNDREDX_EXTENSION.repository;
  } catch {
    return false;
  }
}

export function previewHundredX(
  ctx: EnvironmentContext,
  operation: HundredXOperation,
  options: { includeSkills?: boolean } = {}
): HundredXPreview {
  if (!['install', 'update', 'repair', 'uninstall'].includes(operation)) {
    throw new Error('Unknown 100x extension operation.');
  }
  const status = inspectHundredX(ctx);
  const dirState = inspectPath(hundredxInstallDir(ctx)).state;
  const includeSkills = options.includeSkills !== false;

  if (operation === 'install' && (status.managed || dirState !== 'missing')) {
    throw new Error('100x extension already exists.');
  }
  if (operation !== 'install' && !status.managed) {
    throw new Error('100x extension is not managed by Agent Commons.');
  }
  if (dirState === 'link' || dirState === 'file') {
    throw new Error('Unsafe 100x extension path.');
  }

  const skillsToStage: string[] = [];
  const skillsAlreadyPresent: string[] = [];
  const skillsToRemove: string[] = [];
  const linkedClients = new Set<string>();

  if (operation === 'uninstall') {
    for (const id of HUNDREDX_SKILL_IDS) {
      if (includeSkills && isManaged100xSkillDir(ctx, id)) {
        skillsToRemove.push(id);
      }
      const target = path.join(ctx.centralSkillsDir, id);
      for (const agent of detectAgents(ctx)) {
        if (!agent.installed || agent.definition.skillsSupported === false) continue;
        const linkPath = path.join(agent.skillsDirPath, id);
        const info = inspectPath(linkPath);
        if (info.state === 'link' && info.resolvedTarget && arePathsEqual(info.resolvedTarget, target, ctx.platform)) {
          linkedClients.add(agent.definition.name);
        }
      }
    }
  } else if (includeSkills) {
    for (const id of HUNDREDX_SKILL_IDS) {
      const state = inspectPath(path.join(ctx.centralSkillsDir, id)).state;
      if (state === 'missing') skillsToStage.push(id);
      else skillsAlreadyPresent.push(id);
    }
  }

  return {
    id: '100x',
    operation,
    version: HUNDREDX_EXTENSION.version,
    commit: HUNDREDX_EXTENSION.commit,
    tarballSha256: HUNDREDX_EXTENSION.tarballSha256,
    includeSkills,
    skillsToStage,
    skillsAlreadyPresent,
    skillsToRemove,
    linkedClients: [...linkedClients].sort(),
    affectsNativeClients: false,
    revision: status.revision
  };
}

async function downloadVerifiedRelease(download: typeof fetch = fetch): Promise<Buffer> {
  const response = await download(HUNDREDX_EXTENSION.tarballUrl, {
    headers: { 'User-Agent': 'agent-commons' },
    signal: AbortSignal.timeout(120_000)
  });
  if (!response.ok) {
    throw new Error(`100x release download failed (HTTP ${response.status}).`);
  }
  const finalUrl = response.url ? new URL(response.url) : null;
  if (
    finalUrl &&
    (finalUrl.protocol !== 'https:' ||
      !['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com'].includes(finalUrl.hostname))
  ) {
    throw new Error('100x release redirected to an untrusted host.');
  }
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader !== null && Number(lengthHeader) > MAX_ARCHIVE_BYTES) {
    throw new Error('100x release archive exceeded size limit.');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_ARCHIVE_BYTES || sha256Hex(bytes) !== HUNDREDX_EXTENSION.tarballSha256) {
    throw new Error('100x release SHA-256 verification failed.');
  }
  return bytes;
}

export async function applyHundredX(
  ctx: EnvironmentContext,
  operation: HundredXOperation,
  expectedRevision: string,
  options: { includeSkills?: boolean; download?: typeof fetch; approved?: boolean } = {}
): Promise<{ applied: true; operation: HundredXOperation; version: string | null; snapshotId: string; skillsInstalled: string[]; skillsRemoved: string[] }> {
  if (!options.approved) throw new Error('Explicit approval is required.');
  if (!/^[a-f0-9]{64}$/.test(expectedRevision)) throw new Error('100x preview required.');
  const preview = previewHundredX(ctx, operation, { includeSkills: options.includeSkills });
  if (preview.revision !== expectedRevision) throw new Error('100x state changed since preview.');

  assertSafeLocalRoots(ctx);
  fs.mkdirSync(ctx.commonsDir, { recursive: true });
  fs.mkdirSync(extensionsRoot(ctx), { recursive: true });

  const dest = hundredxInstallDir(ctx);
  const receiptFile = hundredxReceiptPath(ctx);
  const stage = mkdtempSafe(path.join(extensionsRoot(ctx), '.stage-100x-'));
  let stagedSkillsDir: string | null = null;
  const placedSkills: string[] = [];
  const removedSkills: string[] = [];

  try {
    let extractedFiles: Array<{ path: string; sha256: string; mode: number }> = [];
    if (operation !== 'uninstall') {
      const archive = await downloadVerifiedRelease(options.download);
      extractedFiles = extractVerifiedTgz(archive, stage, HUNDREDX_EXTENSION.tarballSha256);
      if (previewHundredX(ctx, operation, { includeSkills: options.includeSkills }).revision !== expectedRevision) {
        throw new Error('100x state changed since preview.');
      }
      if (preview.includeSkills && preview.skillsToStage.length > 0) {
        stagedSkillsDir = mkdtempSafe(path.join(extensionsRoot(ctx), '.stage-100x-skills-'));
        for (const id of preview.skillsToStage) {
          const src = path.join(stage, 'skills', id);
          if (inspectPath(path.join(src, 'SKILL.md')).state !== 'file') {
            throw new Error(`100x skill ${id} missing in verified archive.`);
          }
          const skillStage = path.join(stagedSkillsDir, id);
          copyDirectorySafe(src, skillStage);
          const files = collectCentralFiles(skillStage);
          const skillReceipt = {
            schemaVersion: 1,
            skill: id,
            repository: HUNDREDX_EXTENSION.repository,
            source: `${HUNDREDX_EXTENSION.repository}/tree/${HUNDREDX_EXTENSION.commit}/skills/${id}`,
            commit: HUNDREDX_EXTENSION.commit,
            managedBy: 'agent-commons',
            files
          };
          writeFileAtomicSync(path.join(skillStage, SKILL_SOURCE_RECEIPT), JSON.stringify(skillReceipt, null, 2));
        }
      }
    }

    const session = new SnapshotSession(ctx, 'manual');
    session.recordPathBeforeModify('commons', 'extension-package', dest);
    session.recordPathBeforeModify('commons', 'extension-package', receiptFile);
    if (operation === 'uninstall') {
      for (const id of preview.skillsToRemove) {
        session.recordPathBeforeModify('commons', 'central-skill', path.join(ctx.centralSkillsDir, id));
      }
    } else if (preview.includeSkills) {
      for (const id of preview.skillsToStage) {
        session.recordPathBeforeModify('commons', 'central-skill', path.join(ctx.centralSkillsDir, id));
      }
    }
    const snapshot = session.commitManifest();

    try {
      if (operation === 'uninstall') {
        if (inspectPath(dest).state === 'directory') removePhysicalDirectorySafe(dest);
        if (inspectPath(receiptFile).state === 'file') fs.unlinkSync(receiptFile);
        for (const id of preview.skillsToRemove) {
          const target = path.join(ctx.centralSkillsDir, id);
          if (isManaged100xSkillDir(ctx, id)) {
            removePhysicalDirectorySafe(target);
            removedSkills.push(id);
          }
        }
        return {
          applied: true,
          operation,
          version: null,
          snapshotId: snapshot.id,
          skillsInstalled: [],
          skillsRemoved: removedSkills
        };
      }

      if (inspectPath(dest).state === 'directory') removePhysicalDirectorySafe(dest);
      fs.renameSync(stage, dest);
      const entryBytes = fs.readFileSync(path.join(dest, 'bin', '100x.mjs'));
      const receipt: HundredXReceipt = {
        schemaVersion: 1,
        id: '100x',
        version: HUNDREDX_EXTENSION.version,
        commit: HUNDREDX_EXTENSION.commit,
        tarballSha256: HUNDREDX_EXTENSION.tarballSha256,
        entrySha256: sha256Hex(entryBytes),
        installedAt: new Date().toISOString(),
        files: extractedFiles.map(f => ({ path: f.path, sha256: f.sha256 }))
      };
      writeFileAtomicSync(receiptFile, JSON.stringify(receipt, null, 2) + '\n');

      if (stagedSkillsDir && preview.skillsToStage.length > 0) {
        fs.mkdirSync(ctx.centralSkillsDir, { recursive: true });
        for (const id of preview.skillsToStage) {
          const target = path.join(ctx.centralSkillsDir, id);
          if (inspectPath(target).state === 'missing') {
            fs.renameSync(path.join(stagedSkillsDir, id), target);
            placedSkills.push(id);
          }
        }
      }

      return {
        applied: true,
        operation,
        version: HUNDREDX_EXTENSION.version,
        snapshotId: snapshot.id,
        skillsInstalled: placedSkills,
        skillsRemoved: []
      };
    } catch (err) {
      try {
        restoreBackup(ctx, snapshot.id);
      } catch (rollbackErr) {
        throw new Error(
          `100x ${operation} failed and rollback failed; restore snapshot ${snapshot.id}: ${(rollbackErr as Error).message}`,
          { cause: err }
        );
      }
      throw err;
    }
  } finally {
    if (inspectPath(stage).state === 'directory') removePhysicalDirectorySafe(stage);
    if (stagedSkillsDir && inspectPath(stagedSkillsDir).state === 'directory') {
      removePhysicalDirectorySafe(stagedSkillsDir);
    }
  }
}

export interface HundredXConfigureOptions {
  profile: ExecutionProfileName;
  reviewEnabled?: boolean;
  verifyEnabled?: boolean;
  tokenBudget?: number | null;
}

export interface HundredXConfigPreview {
  profile: ExecutionProfileName;
  targetPath: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  changed: boolean;
  revision: string;
}

export function previewConfigureHundredX(
  ctx: EnvironmentContext,
  options: HundredXConfigureOptions
): HundredXConfigPreview {
  if (!isExecutionProfile(options.profile)) {
    throw new Error('Execution profile must be lite, standard or deep.');
  }
  assertSafeLocalRoots(ctx);
  const globalDir = hundredxGlobalDir(ctx);
  const dirState = inspectPath(globalDir).state;
  if (dirState !== 'missing' && dirState !== 'directory') {
    throw new Error('Unsafe 100x configuration directory.');
  }
  const configFile = hundredxGlobalConfigPath(ctx);
  const fileState = inspectPath(configFile).state;
  if (fileState !== 'missing' && fileState !== 'file') {
    throw new Error('Unsafe 100x configuration file.');
  }
  const raw = fileState === 'file' ? fs.readFileSync(configFile, 'utf8') : '';
  const before = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  if (!before || typeof before !== 'object' || Array.isArray(before)) {
    throw new Error('Invalid 100x configuration JSON.');
  }
  const spec = EXECUTION_PROFILES[options.profile];
  const after: Record<string, unknown> = structuredClone(before);
  const reviewObj =
    after['review'] && typeof after['review'] === 'object' && !Array.isArray(after['review'])
      ? { ...(after['review'] as Record<string, unknown>) }
      : {};
  const polishObj =
    after['polish'] && typeof after['polish'] === 'object' && !Array.isArray(after['polish'])
      ? { ...(after['polish'] as Record<string, unknown>) }
      : {};
  const depthObj =
    after['depth'] && typeof after['depth'] === 'object' && !Array.isArray(after['depth'])
      ? { ...(after['depth'] as Record<string, unknown>) }
      : {};
  const verifyObj =
    after['verify'] && typeof after['verify'] === 'object' && !Array.isArray(after['verify'])
      ? { ...(after['verify'] as Record<string, unknown>) }
      : {};
  const budgetObj =
    after['budget'] && typeof after['budget'] === 'object' && !Array.isArray(after['budget'])
      ? { ...(after['budget'] as Record<string, unknown>) }
      : {};

  polishObj['passes'] = spec.polishPasses;
  reviewObj['rounds'] = spec.reviewRounds;
  depthObj['max'] = options.profile === 'lite' ? 2 : options.profile === 'standard' ? 3 : 5;
  if (typeof options.reviewEnabled === 'boolean') reviewObj['enabled'] = options.reviewEnabled;
  if (typeof options.verifyEnabled === 'boolean') verifyObj['enabled'] = options.verifyEnabled;
  budgetObj['tokens'] =
    options.tokenBudget === undefined
      ? spec.maxTokens
      : options.tokenBudget === null
        ? null
        : Math.max(1000, Math.min(200_000, Math.trunc(options.tokenBudget)));

  after['polish'] = polishObj;
  after['review'] = reviewObj;
  after['depth'] = depthObj;
  after['verify'] = verifyObj;
  after['budget'] = budgetObj;

  return {
    profile: options.profile,
    targetPath: configFile,
    before,
    after,
    changed: JSON.stringify(before) !== JSON.stringify(after),
    revision: sha256Hex(raw)
  };
}

export function applyConfigureHundredX(
  ctx: EnvironmentContext,
  options: HundredXConfigureOptions,
  expectedRevision: string,
  approved = false
): { applied: true; profile: ExecutionProfileName; changed: boolean; snapshotId: string | null } {
  if (!approved) throw new Error('Explicit approval is required.');
  if (!/^[a-f0-9]{64}$/.test(expectedRevision)) throw new Error('100x configuration preview required.');
  const plan = previewConfigureHundredX(ctx, options);
  if (plan.revision !== expectedRevision) throw new Error('100x configuration changed since preview.');
  if (!plan.changed) return { applied: true, profile: plan.profile, changed: false, snapshotId: null };

  const session = new SnapshotSession(ctx, 'manual');
  session.recordPathBeforeModify('commons', 'extension-config', plan.targetPath);
  const snapshot = session.commitManifest();
  try {
    fs.mkdirSync(hundredxGlobalDir(ctx), { recursive: true });
    writeFileAtomicSync(plan.targetPath, JSON.stringify(plan.after, null, 2) + '\n');
    return { applied: true, profile: plan.profile, changed: true, snapshotId: snapshot.id };
  } catch (err) {
    try {
      restoreBackup(ctx, snapshot.id);
    } catch {
      throw new Error('100x configuration save failed and rollback failed.', { cause: err });
    }
    throw err;
  }
}

export function syncHundredXSkills(
  ctx: EnvironmentContext,
  agents: string[],
  options: { dryRun?: boolean } = {}
): SyncReport {
  const installed = inspectHundredX(ctx).skillsInstalled;
  if (installed.length === 0) {
    throw new Error('No 100x skills are installed in the shared library.');
  }
  return runSync(ctx, {
    skillsOnly: true,
    skillFilter: installed,
    agentFilter: agents,
    dryRun: options.dryRun
  });
}

export interface HundredXDiagnosticReport {
  status: HundredXStatus;
  cliResolved: boolean;
  cliManaged: boolean;
  healthy: boolean;
  issues: string[];
  warnings: string[];
}

export function diagnoseHundredX(ctx: EnvironmentContext): HundredXDiagnosticReport {
  const status = inspectHundredX(ctx);
  const exec = hundredxExecutable(ctx);
  const issues: string[] = [];
  const warnings: string[] = [];
  if (!status.prerequisites.node22Plus) issues.push('Node.js >= 22 is required for 100x CLI.');
  if (status.unmanaged) warnings.push('Unmanaged 100x folder exists in extensions/100x (preserved).');
  if (status.managed && !status.healthy) issues.push('Managed 100x package failed integrity check; run repair.');
  if (!exec && status.skillsInstalled.length > 0) {
    warnings.push('100x skills are installed without a managed or PATH 100x CLI binary.');
  }
  if (status.managed && !status.prerequisites.git) warnings.push('git not detected on PATH (needed for 100x verify/checkpoints).');
  if (status.managed && ctx.platform === 'win32' && !status.prerequisites.posixSh) {
    warnings.push('Git Bash / sh.exe not detected (needed only if configuring shell-based 100x review.command).');
  }
  if (status.managed && !status.prerequisites.chromiumCache) {
    warnings.push('Playwright Chromium cache not detected (optional; required for 100x screenshot matrices).');
  }
  return {
    status,
    cliResolved: exec !== null,
    cliManaged: exec?.managed ?? false,
    healthy: issues.length === 0,
    issues,
    warnings
  };
}

export interface WorkspaceInvariantRow {
  id: string;
  kind: string;
  property: string;
  level: string;
  state: 'holds' | 'stale' | 'broken' | 'unproven' | 'unchecked' | 'waived';
  reason: string;
}

export interface WorkspaceHundredXReport {
  present: boolean;
  stage: string | null;
  next: string | null;
  openRisks: string | null;
  canResume: boolean;
  verdict: string | null;
  verdictWhy: string | null;
  finishedAt: string | null;
  polishPasses: number;
  mustNotBreak: Array<{ kind: string; status: string; summary: string }>;
  matrix: { label: string; viewports: number; states: number; broken: number; weak: number; contactSheetRel: string | null } | null;
  heroRel: string | null;
  review: {
    status: string;
    model: string | null;
    flags: number;
    accepted: number;
    rejected: number;
    deferred: number;
    untriaged: number;
    bySeverity: Record<string, number>;
    readyToShip: boolean | null;
  } | null;
  invariants: WorkspaceInvariantRow[];
  invariantCounts: Record<'holds' | 'stale' | 'broken' | 'unproven' | 'unchecked' | 'waived', number>;
  decisions: Array<{ ts: string; phase: string; decision: string; result: string }>;
  anomalies: string[];
}

const SKIP_COVER_DIRS = new Set(['node_modules', '.git', '.100x', 'dist', 'build', 'coverage', '.next', 'vendor']);

function walkSafeCover(root: string, relEntry: string, out: string[]): boolean {
  if (!relEntry || path.isAbsolute(relEntry) || relEntry.split('/').includes('..')) return false;
  const full = path.resolve(root, ...relEntry.split('/'));
  if (full !== root && !full.startsWith(root + path.sep)) return false;
  let st: fs.Stats;
  try {
    st = fs.lstatSync(full);
  } catch {
    return false;
  }
  if (st.isSymbolicLink()) return false;
  if (st.isFile()) {
    out.push(relEntry);
    return true;
  }
  if (!st.isDirectory()) return false;
  for (const name of fs.readdirSync(full).sort()) {
    if (SKIP_COVER_DIRS.has(name) || name.startsWith('.')) continue;
    walkSafeCover(root, `${relEntry}/${name}`, out);
  }
  return true;
}

function computeCoversHash(root: string, coversRaw: string): { hash: string; missing: string[] } {
  const entries = coversRaw
    .split(',')
    .map(p => p.trim().replace(/^\.\//, '').replace(/\/+$/, ''))
    .filter(Boolean);
  const files: string[] = [];
  const missing: string[] = [];
  for (const entry of entries) {
    if (!walkSafeCover(root, entry, files)) missing.push(entry);
  }
  const hasher = crypto.createHash('sha256');
  for (const rel of [...new Set(files)].sort()) {
    const full = path.join(root, ...rel.split('/'));
    if (fs.statSync(full).size > 2 * 1024 * 1024) continue;
    hasher.update(`${rel}\0`).update(fs.readFileSync(full)).update('\0');
  }
  return { hash: hasher.digest('hex').slice(0, 16), missing };
}

function safeImageRel(workspaceRoot: string, rel: unknown): string | null {
  if (typeof rel !== 'string' || !rel.trim() || rel.length > 256 || path.isAbsolute(rel) || rel.includes('\\')) {
    return null;
  }
  const normalized = rel.replace(/^\.\//, '');
  if (!normalized.startsWith('.100x/') || !/\.(?:png|jpg|jpeg|webp)$/i.test(normalized)) return null;
  const parts = normalized.split('/');
  if (parts.some(p => !p || p === '.' || p === '..')) return null;
  const full = path.resolve(workspaceRoot, ...parts);
  if (!full.startsWith(path.join(workspaceRoot, '.100x') + path.sep)) return null;
  try {
    let cur = workspaceRoot;
    for (const seg of parts) {
      cur = path.join(cur, seg);
      const st = fs.lstatSync(cur);
      if (st.isSymbolicLink()) return null;
    }
    const stat = fs.statSync(full);
    return stat.isFile() && stat.size > 0 && stat.size <= 5 * 1024 * 1024 ? normalized : null;
  } catch {
    return null;
  }
}

function readSmallText(file: string, maxBytes = 128 * 1024): string {
  try {
    if (inspectPath(file).state !== 'file') return '';
    if (fs.statSync(file).size > maxBytes) return '';
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Read-only, zero-execution inspection of a project's `.100x/` and `verify/ledger.tsv` artifacts.
 * Returns only redacted summaries, counts, invariant statuses and safe image paths.
 */
export function inspectWorkspaceHundredX(workspaceRoot: string): WorkspaceHundredXReport {
  const emptyCounts = { holds: 0, stale: 0, broken: 0, unproven: 0, unchecked: 0, waived: 0 };
  const empty: WorkspaceHundredXReport = {
    present: false,
    stage: null,
    next: null,
    openRisks: null,
    canResume: false,
    verdict: null,
    verdictWhy: null,
    finishedAt: null,
    polishPasses: 0,
    mustNotBreak: [],
    matrix: null,
    heroRel: null,
    review: null,
    invariants: [],
    invariantCounts: { ...emptyCounts },
    decisions: [],
    anomalies: []
  };
  if (inspectPath(workspaceRoot).state !== 'directory') return empty;
  const canonicalRoot = fs.realpathSync.native(workspaceRoot);
  const dot100x = path.join(canonicalRoot, '.100x');
  const ledgerPath = path.join(canonicalRoot, 'verify', 'ledger.tsv');
  const has100x = inspectPath(dot100x).state === 'directory';
  const hasLedger = inspectPath(ledgerPath).state === 'file';
  if (!has100x && !hasLedger) return empty;

  const stateMd = readSmallText(path.join(dot100x, 'STATE.md'));
  const extractLine = (label: string): string | null => {
    const match = new RegExp(`^${label}:\\s*(.+)$`, 'mi').exec(stateMd);
    return match ? redactSecrets(match[1]!).trim().slice(0, 200) : null;
  };
  const stage = extractLine('Stage');
  const next = extractLine('Next');
  const openRisks = extractLine('Open risks');

  let runJson: Record<string, unknown> | null = null;
  try {
    const rawRun = readSmallText(path.join(dot100x, 'run.json'));
    if (rawRun) runJson = JSON.parse(rawRun) as Record<string, unknown>;
  } catch { /* corrupt run.json noted in anomalies below */ }
  let finishedJson: Record<string, unknown> | null = null;
  try {
    const rawFinished = readSmallText(path.join(dot100x, 'finished.json'));
    if (rawFinished) finishedJson = JSON.parse(rawFinished) as Record<string, unknown>;
  } catch { /* ignore */ }

  const anomalies: string[] = [];
  if (inspectPath(path.join(dot100x, 'run.json')).state === 'file' && !runJson) {
    anomalies.push('Corrupted .100x/run.json detected.');
  }

  const mustNotBreak: Array<{ kind: string; status: string; summary: string }> = [];
  if (Array.isArray(runJson?.['mustNotBreak'])) {
    for (const item of (runJson['mustNotBreak'] as Array<Record<string, unknown>>).slice(0, 8)) {
      if (!item || typeof item !== 'object') continue;
      mustNotBreak.push({
        kind: String(item['kind'] ?? 'check').slice(0, 40),
        status: String(item['status'] ?? 'unknown').slice(0, 24),
        summary: redactSecrets(String(item['summary'] ?? '')).slice(0, 200)
      });
    }
  }

  let matrix: WorkspaceHundredXReport['matrix'] = null;
  const shotsDir = path.join(dot100x, 'shots');
  if (inspectPath(shotsDir).state === 'directory') {
    for (const label of ['final', 'review', 'pass-3', 'pass-2', 'pass-1']) {
      const mText = readSmallText(path.join(shotsDir, label, 'matrix.json'));
      if (!mText) continue;
      try {
        const m = JSON.parse(mText) as { totals?: { broken?: number; weak?: number }; viewports?: number; states?: number };
        const contactSheetRel = safeImageRel(canonicalRoot, `.100x/shots/${label}/contact-sheet.png`);
        matrix = {
          label,
          viewports: Number(m.viewports ?? 0),
          states: Number(m.states ?? 0),
          broken: Number(m.totals?.broken ?? 0),
          weak: Number(m.totals?.weak ?? 0),
          contactSheetRel
        };
        break;
      } catch { /* ignore malformed matrix */ }
    }
  }
  const heroRel = safeImageRel(canonicalRoot, runJson?.['heroRel'] ?? '.100x/hero.png');

  const findingsText = readSmallText(path.join(dot100x, 'review', 'findings.md'));
  const triageText = readSmallText(path.join(dot100x, 'review', 'triage.md'));
  let review: WorkspaceHundredXReport['review'] = null;
  if (runJson?.['review'] || findingsText) {
    const revObj = (runJson?.['review'] as Record<string, unknown> | undefined) ?? {};
    const bySeverity: Record<string, number> = { blocker: 0, major: 0, minor: 0, nit: 0 };
    const foundIds = new Map<string, string>();
    for (const line of findingsText.split(/\r?\n/)) {
      const hit = /^(?:#{1,4}\s+|\s*[-*]\s+)\**(F\d+)\b\**(.*)$/.exec(line);
      if (!hit) continue;
      const id = hit[1]!;
      if (foundIds.has(id)) continue;
      const sevHit = /[\[(]\s*(blocker|major|minor|nit)\s*[\])]/i.exec(hit[2] ?? '') ??
        /^\s*[:.|–—-]*(blocker|major|minor|nit)\b/i.exec(hit[2] ?? '');
      const sev = (sevHit?.[1] ?? 'blocker').toLowerCase();
      foundIds.set(id, sev);
      bySeverity[sev] = (bySeverity[sev] ?? 0) + 1;
    }
    let accepted = 0, rejected = 0, deferred = 0;
    const triagedIds = new Set<string>();
    for (const line of triageText.split(/\r?\n/)) {
      const m = /^\s*(?:[-*]\s*)?\**(F\d+)\**\s*[:.–—-]?\s*\**(accept|accepted|reject|rejected|defer|deferred)\**\b/i.exec(line);
      if (!m) continue;
      triagedIds.add(m[1]!);
      const d = m[2]!.toLowerCase();
      if (d.startsWith('accept')) accepted++;
      else if (d.startsWith('reject')) rejected++;
      else deferred++;
    }
    const readyMatch = /^Ready to ship:\s*(yes|no)\b/im.exec(findingsText);
    const flags = foundIds.size || Number(revObj['flags'] ?? 0);
    review = {
      status: String(revObj['status'] ?? (findingsText ? 'reviewed' : 'unreviewed')).slice(0, 32),
      model: typeof revObj['model'] === 'string' ? redactSecrets(revObj['model']).slice(0, 80) : null,
      flags,
      accepted: triagedIds.size ? accepted : Number(revObj['fixed'] ?? 0),
      rejected: triagedIds.size ? rejected : Number(revObj['rejected'] ?? 0),
      deferred: triagedIds.size ? deferred : Number(revObj['deferred'] ?? 0),
      untriaged: foundIds.size ? [...foundIds.keys()].filter(id => !triagedIds.has(id)).length : 0,
      bySeverity,
      readyToShip: readyMatch ? readyMatch[1]!.toLowerCase() === 'yes' : null
    };
  }

  const invariants: WorkspaceInvariantRow[] = [];
  const invariantCounts = { ...emptyCounts };
  const ledgerText = readSmallText(ledgerPath);
  if (ledgerText) {
    const lines = ledgerText.split(/\r?\n/).filter(Boolean).slice(1, 100);
    for (const line of lines) {
      const cells = line.split('\t');
      const id = (cells[0] ?? '').slice(0, 64);
      const kind = (cells[1] ?? '').slice(0, 24);
      const property = redactSecrets(cells[2] ?? '').slice(0, 180);
      const covers = cells[3] ?? '';
      const coversHash = cells[4] ?? '';
      const level = (cells[6] ?? '').slice(0, 24);
      const redRel = cells[7] ?? '';
      const rawStatus = cells[8] ?? '';
      const commit = cells[10] ?? '';

      let state: WorkspaceInvariantRow['state'] = 'unchecked';
      let reason = '';
      if (kind === 'waived') {
        state = 'waived';
        reason = property;
      } else if (rawStatus === 'broken') {
        state = 'broken';
        reason = `Last run failed${commit ? ` at ${commit}` : ''}.`;
      } else {
        const now = computeCoversHash(canonicalRoot, covers);
        if (now.missing.length) {
          state = 'stale';
          reason = `Covered path missing (${now.missing.length}).`;
        } else if (now.hash !== coversHash) {
          state = 'stale';
          reason = 'Covered files changed after last sync.';
        } else if (rawStatus !== 'holds') {
          state = 'unchecked';
          reason = 'Never verified green.';
        } else {
          const redFull =
            redRel && !path.isAbsolute(redRel) && !redRel.split('/').includes('..')
              ? path.resolve(canonicalRoot, ...redRel.split('/'))
              : path.join(canonicalRoot, 'verify', 'red', `${id}.txt`);
          const redText = readSmallText(redFull, 64 * 1024);
          if (!/^FAIL\s+\S/m.test(redText)) {
            state = 'unproven';
            reason = 'Missing FAIL proof on seeded defect.';
          } else {
            state = 'holds';
            reason = 'Verified and synced.';
          }
        }
      }
      invariantCounts[state]++;
      invariants.push({ id, kind, property, level, state, reason });
    }
  }

  const decisions: Array<{ ts: string; phase: string; decision: string; result: string }> = [];
  const decisionsText = readSmallText(path.join(dot100x, 'decisions.tsv'));
  if (decisionsText) {
    const rows = decisionsText.split(/\r?\n/).filter(Boolean).slice(1).slice(-8);
    for (const line of rows) {
      const cells = line.split('\t');
      decisions.push({
        ts: (cells[0] ?? '').slice(0, 40),
        phase: redactSecrets(cells[1] ?? '').slice(0, 40),
        decision: redactSecrets(cells[2] ?? '').slice(0, 140),
        result: redactSecrets(cells[3] ?? '').slice(0, 80)
      });
    }
  }

  if (invariantCounts.stale > 0) anomalies.push(`${invariantCounts.stale} stale invariant(s) require re-verification.`);
  if (invariantCounts.broken > 0) anomalies.push(`${invariantCounts.broken} broken invariant(s) failed.`);
  if (invariantCounts.unproven > 0) anomalies.push(`${invariantCounts.unproven} invariant(s) lack seeded failure proof.`);
  if (matrix && matrix.broken > 0) anomalies.push(`Visual matrix reports ${matrix.broken} broken layout issue(s).`);
  if (review && review.untriaged > 0) anomalies.push(`${review.untriaged} review finding(s) await triage.`);
  if (openRisks && !/^none$/i.test(openRisks)) anomalies.push(`Open risks: ${openRisks}`);

  return {
    present: true,
    stage,
    next,
    openRisks,
    canResume: has100x && !finishedJson,
    verdict: finishedJson ? String(finishedJson['verdict'] ?? '') : typeof runJson?.['verdict'] === 'string' ? runJson['verdict'] : null,
    verdictWhy: typeof runJson?.['verdictWhy'] === 'string' ? redactSecrets(runJson['verdictWhy']).slice(0, 220) : null,
    finishedAt: typeof finishedJson?.['finishedAt'] === 'string' ? finishedJson['finishedAt'] : null,
    polishPasses: Number(runJson?.['polishPasses'] ?? 0),
    mustNotBreak,
    matrix,
    heroRel,
    review,
    invariants,
    invariantCounts,
    decisions,
    anomalies
  };
}

const SAFE_READ_SUBCOMMANDS = new Set(['status', 'doctor', 'config', 'verify']);

/**
 * Invokes the verified 100x CLI with an allowlisted environment and strict execution guard.
 * Mutable/test-running subcommands (`verify run`) require `allowMutatingRun: true`.
 */
export async function runHundredXCli(
  ctx: EnvironmentContext,
  args: string[],
  options: { cwd: string; timeoutMs?: number; allowMutatingRun?: boolean }
): Promise<{ exitCode: number; output: string }> {
  const exec = hundredxExecutable(ctx);
  if (!exec) throw new Error('100x CLI is not installed or verified.');
  const sub = args[0] ?? '';
  if (!SAFE_READ_SUBCOMMANDS.has(sub)) {
    throw new Error('Unsupported 100x CLI subcommand for controlled execution.');
  }
  if (sub === 'verify' && args[1] === 'run' && options.allowMutatingRun !== true) {
    throw new Error('Running verification commands requires explicit approval (--allow-tests / --yes).');
  }
  if (sub === 'config' && !['print', 'validate', 'path'].includes(args[1] ?? '')) {
    throw new Error('Read-only 100x config inspection only.');
  }

  const allowedEnv: NodeJS.ProcessEnv = {};
  for (const key of [
    'PATH', 'Path', 'PATHEXT', 'COMSPEC', 'SYSTEMROOT', 'WINDIR', 'HOME', 'USERPROFILE',
    'APPDATA', 'LOCALAPPDATA', 'TMP', 'TEMP', 'TMPDIR', 'LANG', 'LC_ALL', 'X100_SH'
  ]) {
    if (process.env[key]) allowedEnv[key] = process.env[key];
  }
  allowedEnv['X100_HOME'] = hundredxGlobalDir(ctx);
  allowedEnv['X100_SKILLS_DIR'] = ctx.centralSkillsDir;

  return new Promise((resolve, reject) => {
    const child = spawn(exec.command, [...exec.argsPrefix, ...args], {
      cwd: options.cwd,
      env: allowedEnv,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    let settled = false;
    const finish = (err?: Error, code?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve({ exitCode: code ?? 1, output: redactSecrets(output).slice(0, 24_000) });
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('100x command timed out.'));
    }, options.timeoutMs ?? 60_000);
    for (const stream of [child.stdout, child.stderr]) {
      stream?.on('data', (chunk: Buffer) => {
        if (output.length < 64_000) output += chunk.toString('utf8');
      });
    }
    child.once('error', () => finish(new Error('Failed to start 100x CLI.')));
    child.once('close', code => finish(undefined, code ?? 1));
  });
}
