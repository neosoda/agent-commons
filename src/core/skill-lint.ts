import fs from 'node:fs';
import path from 'node:path';
import { inspectPath } from './links.js';

/**
 * Read-only SKILL.md frontmatter checks matching what native clients enforce before loading a
 * skill (Codex and Claude Code require a YAML frontmatter with `name` and `description`; Codex
 * rejects descriptions over 1024 characters). Only the frontmatter is parsed, never the body.
 */
export const MAX_DESCRIPTION = 1024;
export const MAX_NAME = 64;
const MAX_READ = 64 * 1024;

export interface SkillLintResult {
  skill: string;
  /** Problems that make a client refuse to load the skill. */
  errors: string[];
  /** Agent Skills conventions that clients currently tolerate. */
  advisories: string[];
}

export interface SkillLint { errors: string[]; advisories: string[] }

interface Scalar { value: string; error?: string }

/** Index of the closing quote, honoring YAML escapes ('' in single, backslash in double quotes). */
function closingQuote(text: string, quote: string): number {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote === '"' && ch === '\\') { i++; continue; }
    if (ch === quote) {
      if (quote === "'" && text[i + 1] === "'") { i++; continue; }
      return i;
    }
  }
  return -1;
}

/** Parses one top-level YAML scalar (plain, quoted or block) starting at `lines[index]`. */
function readScalar(lines: string[], index: number, key: string): Scalar {
  const first = lines[index]!.slice(key.length + 1).trim();
  const continuation = (from: number) => {
    const out: string[] = [];
    for (let i = from; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trim() === '') { out.push(''); continue; }
      if (!/^\s/.test(line)) break;
      out.push(line.trim());
    }
    return out;
  };
  if (/^[>|][+-]?\s*(#.*)?$/.test(first)) {
    return { value: continuation(index + 1).join(first.startsWith('>') ? ' ' : '\n').trim() };
  }
  if (first.startsWith('"') || first.startsWith("'")) {
    const quote = first[0]!;
    let text = first.slice(1);
    let i = index + 1;
    for (;;) {
      const end = closingQuote(text, quote);
      if (end >= 0) {
        const rest = text.slice(end + 1).trim();
        if (rest && !rest.startsWith('#')) return { value: text.slice(0, end), error: 'unexpected text after closing quote' };
        return { value: text.slice(0, end) };
      }
      if (i >= lines.length) return { value: text, error: 'unterminated quoted string' };
      text += ' ' + lines[i++]!.trim();
    }
  }
  if (/:\s/.test(first) && !first.startsWith('#')) {
    return { value: first, error: 'unquoted ": " in value (quote the text)' };
  }
  return { value: [first, ...continuation(index + 1)].join(' ').trim() };
}

/** Validates the frontmatter of a single SKILL.md text. */
export function lintSkillText(folderName: string, text: string): SkillLint {
  const problems: string[] = [];
  const advisories: string[] = [];
  const raw = text.replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return { errors: ['missing YAML frontmatter (first line must be ---)'], advisories };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end < 0) return { errors: ['frontmatter is not closed by ---'], advisories };
  const fm = lines.slice(1, end);
  const field = (key: string): Scalar | null => {
    const i = fm.findIndex(line => line.startsWith(key + ':'));
    return i < 0 ? null : readScalar(fm, i, key);
  };
  const name = field('name');
  if (!name || !name.value) problems.push('missing "name"');
  else {
    if (name.error) problems.push(`name: ${name.error}`);
    if (name.value.length > MAX_NAME) problems.push(`name longer than ${MAX_NAME} characters`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name.value)) advisories.push(`name "${name.value.slice(0, 40)}" is not lowercase letters, digits and hyphens`);
    else if (name.value !== folderName) advisories.push(`name "${name.value}" differs from folder "${folderName}"`);
  }
  const description = field('description');
  if (!description || !description.value) problems.push('missing "description"');
  else {
    if (description.error) problems.push(`description: ${description.error}`);
    if (description.value.length > MAX_DESCRIPTION) {
      problems.push(`description is ${description.value.length} characters (clients such as Codex reject more than ${MAX_DESCRIPTION})`);
    }
  }
  if (fm.some(line => line.startsWith('\t'))) problems.push('tab used for indentation in frontmatter (invalid YAML)');
  return { errors: problems, advisories };
}

/** Lints every physical skill folder directly under `root` (links are not followed). */
export function lintSkillsDirectory(root: string): SkillLintResult[] {
  if (inspectPath(root).state !== 'directory') return [];
  const results: SkillLintResult[] = [];
  for (const entry of fs.readdirSync(root).sort()) {
    if (entry.startsWith('.')) continue;
    const dir = path.join(root, entry);
    if (inspectPath(dir).state !== 'directory') continue;
    const file = path.join(dir, 'SKILL.md');
    const info = inspectPath(file);
    if (info.state === 'missing') continue; // not a skill folder
    if (info.state !== 'file') { results.push({ skill: entry, errors: ['SKILL.md is not a regular file'], advisories: [] }); continue; }
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(Math.min(fs.fstatSync(fd).size, MAX_READ));
      fs.readSync(fd, buf, 0, buf.length, 0);
      const lint = lintSkillText(entry, buf.toString('utf8'));
      if (lint.errors.length || lint.advisories.length) results.push({ skill: entry, ...lint });
    } finally { fs.closeSync(fd); }
  }
  return results;
}

/**
 * Approximate tokens a client spends at session start to advertise the skills in `root`:
 * native clients load only each skill's name and description (progressive disclosure), never
 * the SKILL.md body. Linked skills are followed one level because that is what clients see.
 * Estimate = characters / 4; it is not a provider tokenizer measurement.
 */
export function estimateSkillMetadataTokens(root: string): number {
  if (inspectPath(root).state === 'missing') return 0;
  let chars = 0;
  for (const entry of fs.readdirSync(root)) {
    if (entry.startsWith('.')) continue;
    const file = path.join(root, entry, 'SKILL.md');
    let text: string;
    try {
      const fd = fs.openSync(file, 'r');
      try {
        const buf = Buffer.alloc(Math.min(fs.fstatSync(fd).size, 8192));
        fs.readSync(fd, buf, 0, buf.length, 0);
        text = buf.toString('utf8');
      } finally { fs.closeSync(fd); }
    } catch { continue; }
    const fm = /^FEFF?---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
    const lines = fm.split(/\r?\n/);
    const start = lines.findIndex(l => l.startsWith('description:'));
    let description = '';
    if (start >= 0) {
      description = lines[start]!.slice(12);
      for (let i = start + 1; i < lines.length && /^\s/.test(lines[i]!); i++) description += ' ' + lines[i]!.trim();
    }
    chars += entry.length + Math.min(description.trim().length, MAX_DESCRIPTION) + 16;
  }
  return Math.round(chars / 4);
}
