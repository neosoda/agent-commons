import * as jsonc from 'jsonc-parser';
import type { McpServerOverride } from '../types.js';

/**
 * Safely strips JSONC comments (`//` and `/* ... * /`) and trailing commas
 * without ever modifying characters inside double-quoted JSON strings.
 */
export function stripJsonCommentsAndTrailingCommas(raw: string): string {
  const input = raw.replace(/^\uFEFF/, '');
  let out = '';
  let i = 0;
  const len = input.length;
  let inString = false;

  while (i < len) {
    const ch = input[i]!;
    const next = input[i + 1];

    if (inString) {
      out += ch;
      if (ch === '\\' && i + 1 < len) {
        out += input[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i++;
      continue;
    }

    // Single-line comment
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < len && input[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Multi-line comment
    if (ch === '/' && next === '*') {
      const start = i;
      i += 2;
      while (i < len && !(input[i] === '*' && input[i + 1] === '/')) {
        i++;
      }
      if (i >= len) {
        throw new Error(`Unterminated block comment starting at offset ${start}`);
      }
      i += 2;
      continue;
    }

    out += ch;
    i++;
  }

  // Second pass: remove trailing commas before } or ] outside strings
  let finalOut = '';
  inString = false;
  i = 0;
  const outLen = out.length;

  while (i < outLen) {
    const ch = out[i]!;
    if (inString) {
      finalOut += ch;
      if (ch === '\\' && i + 1 < outLen) {
        finalOut += out[i + 1]!;
        i += 2;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      finalOut += ch;
      i++;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < outLen && /\s/.test(out[j]!)) {
        j++;
      }
      if (j < outLen && (out[j] === '}' || out[j] === ']')) {
        i++;
        continue;
      }
    }

    finalOut += ch;
    i++;
  }

  return finalOut;
}

/**
 * Parses a JSON or JSONC string into an object using both `jsonc-parser` AST validation
 * and strict stripped-JSON verification. Throws if malformed or not a JSON object.
 */
export function parseJsoncObject(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) {
    throw new Error('Configuration file is empty');
  }
  const body = raw.replace(/^\uFEFF/, '');
  const stripped = stripJsonCommentsAndTrailingCommas(body);
  const parsed: unknown = JSON.parse(stripped);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Configuration root must be a JSON object');
  }

  const errors: jsonc.ParseError[] = [];
  const rootNode = jsonc.parseTree(body, errors, {
    allowTrailingComma: true,
    disallowComments: false
  });
  if (errors.length > 0 || !rootNode || rootNode.type !== 'object') {
    const firstErr = errors[0];
    const codeMsg = firstErr ? jsonc.printParseErrorCode(firstErr.error) : 'invalid syntax';
    throw new Error(`Malformed JSONC syntax (${codeMsg})`);
  }

  return parsed as Record<string, unknown>;
}

export interface DetectedJsoncStyle {
  hasBom: boolean;
  body: string;
  eol: '\r\n' | '\n';
  indentUnit: string;
}

/**
 * Detects BOM, line endings (CRLF vs LF), and indentation unit from an existing JSON/JSONC string.
 */
export function detectJsoncStyle(raw: string): DetectedJsoncStyle {
  const hasBom = raw.startsWith('\uFEFF');
  const body = hasBom ? raw.slice(1) : raw;
  const eol: '\r\n' | '\n' = body.includes('\r\n') ? '\r\n' : '\n';
  const lines = body.split(/\r?\n/);
  let indentUnit = '  ';
  for (const line of lines) {
    const m = /^([ \t]+)(?=["/*}])/.exec(line);
    if (m && m[1]) {
      indentUnit = m[1];
      break;
    }
  }
  return { hasBom, body, eol, indentUnit };
}

function getLineIndent(body: string, offset: number): string {
  const lineStart = body.lastIndexOf('\n', offset - 1) + 1;
  const m = /^[ \t]*/.exec(body.slice(lineStart, offset));
  return m ? m[0] : '';
}

function formatJsonValue(
  value: unknown,
  indentUnit: string,
  eol: string,
  baseIndent: string
): string {
  const raw = JSON.stringify(value, null, indentUnit);
  return raw.replace(/\n/g, eol + baseIndent);
}

function setObjectPropertyInText(
  body: string,
  objNode: jsonc.Node,
  propName: string,
  value: unknown,
  indentUnit: string,
  eol: string
): string {
  const children = objNode.children ?? [];
  const existingProp = children.find(
    (p) => p.children && p.children[0] && p.children[0].value === propName
  );

  // Update existing property value in-place without touching surrounding comments or commas
  if (existingProp && existingProp.children && existingProp.children[1]) {
    const valNode = existingProp.children[1];
    const propIndent = getLineIndent(body, existingProp.offset);
    const formattedVal = formatJsonValue(value, indentUnit, eol, propIndent);
    return (
      body.slice(0, valNode.offset) +
      formattedVal +
      body.slice(valNode.offset + valNode.length)
    );
  }

  const objEnd = objNode.offset + objNode.length;
  const objLineIndent = getLineIndent(body, objNode.offset);

  // Empty object `{}` or `{ /* comments */ }`
  if (children.length === 0) {
    const propIndent = objLineIndent + indentUnit;
    const formattedVal = formatJsonValue(value, indentUnit, eol, propIndent);
    const entryText = `${JSON.stringify(propName)}: ${formattedVal}`;
    const inner = body.slice(objNode.offset + 1, objEnd - 1);
    if (!inner.trim()) {
      return (
        body.slice(0, objNode.offset) +
        `{${eol}${propIndent}${entryText}${eol}${objLineIndent}}` +
        body.slice(objEnd)
      );
    }
    const beforeClosing = body.slice(0, objEnd - 1).replace(/[ \t]*$/, '');
    const prefixSep = beforeClosing.endsWith('\n') ? '' : eol;
    return (
      beforeClosing +
      `${prefixSep}${propIndent}${entryText}${eol}${objLineIndent}` +
      body.slice(objEnd - 1)
    );
  }

  // Non-empty object: append after last property while preserving inline comments & trailing commas
  const lastProp = children[children.length - 1]!;
  const lastPropEnd = lastProp.offset + lastProp.length;
  const propIndent = getLineIndent(body, lastProp.offset) || objLineIndent + indentUnit;
  const formattedVal = formatJsonValue(value, indentUnit, eol, propIndent);

  const tailSlice = body.slice(lastPropEnd, objEnd - 1);
  const scanner = jsonc.createScanner(tailSlice, false);
  let commaRelOffset = -1;
  let commaRelEnd = -1;
  let tok = scanner.scan();
  while (tok !== jsonc.SyntaxKind.EOF) {
    if (tok === jsonc.SyntaxKind.CommaToken) {
      commaRelOffset = scanner.getTokenOffset();
      commaRelEnd = commaRelOffset + scanner.getTokenLength();
      break;
    }
    tok = scanner.scan();
  }

  const hasTrailingComma = commaRelOffset >= 0;
  const entryText = `${JSON.stringify(propName)}: ${formattedVal}${hasTrailingComma ? ',' : ''}`;

  const searchNewlineFrom = hasTrailingComma ? commaRelEnd : 0;
  const afterAnchor = tailSlice.slice(searchNewlineFrom);
  const nlMatch = /\r?\n/.exec(afterAnchor);
  const lineEndRel = nlMatch ? searchNewlineFrom + nlMatch.index : tailSlice.length;
  const insertAbsOffset = lastPropEnd + lineEndRel;

  if (hasTrailingComma) {
    return (
      body.slice(0, insertAbsOffset) +
      `${eol}${propIndent}${entryText}` +
      body.slice(insertAbsOffset)
    );
  }

  return (
    body.slice(0, lastPropEnd) +
    ',' +
    body.slice(lastPropEnd, insertAbsOffset) +
    `${eol}${propIndent}${entryText}` +
    body.slice(insertAbsOffset)
  );
}

/**
 * Surgically inserts or updates `root[rootKey][serverName] = serverEntry` in a JSON or JSONC
 * document while preserving `//` and `/* * /` comments, inline comments, trailing commas,
 * custom indentation, UTF-8 BOM, and CRLF/LF line endings.
 */
export function upsertJsoncMcpServer(
  raw: string,
  rootKey: string,
  serverName: string,
  serverEntry: Record<string, unknown>
): string {
  // Validate first
  parseJsoncObject(raw);

  const { hasBom, body: initialBody, eol, indentUnit } = detectJsoncStyle(raw);
  let body = initialBody;

  const errors: jsonc.ParseError[] = [];
  const rootNode = jsonc.parseTree(body, errors, {
    allowTrailingComma: true,
    disallowComments: false
  });
  if (errors.length > 0 || !rootNode || rootNode.type !== 'object') {
    throw new Error('Corrupted JSON/JSONC configuration');
  }

  const containerProp = (rootNode.children ?? []).find(
    (p) => p.children && p.children[0] && p.children[0].value === rootKey
  );

  if (!containerProp) {
    body = setObjectPropertyInText(
      body,
      rootNode,
      rootKey,
      { [serverName]: serverEntry },
      indentUnit,
      eol
    );
    return (hasBom ? '\uFEFF' : '') + body;
  }

  const containerNode = containerProp.children?.[1];
  if (!containerNode || containerNode.type !== 'object') {
    throw new Error(`"${rootKey}" must be a JSON object`);
  }

  body = setObjectPropertyInText(body, containerNode, serverName, serverEntry, indentUnit, eol);
  return (hasBom ? '\uFEFF' : '') + body;
}

/**
 * Escapes a string for TOML double-quoted literal.
 */
export function tomlEscapeString(val: string): string {
  return val
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Formats a TOML key (bare if `[A-Za-z0-9_-]+`, quoted otherwise).
 */
export function tomlFormatKey(key: string): string {
  if (/^[A-Za-z0-9_-]+$/.test(key)) {
    return key;
  }
  return `"${tomlEscapeString(key)}"`;
}

/**
 * Strips a trailing `# comment` from a TOML line without touching `#` inside quoted strings.
 */
export function stripTomlCommentOutsideQuotes(line: string): string {
  let inQuote: '"' | "'" | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuote) {
      if (ch === '\\' && inQuote === '"' && i + 1 < line.length) {
        i++;
        continue;
      }
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '#') {
      return line.slice(0, i).trimEnd();
    }
  }
  return line.trimEnd();
}

function countBracketBalanceOutsideQuotes(text: string): number {
  let balance = 0;
  let inQuote: '"' | "'" | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuote) {
      if (ch === '\\' && inQuote === '"' && i + 1 < text.length) {
        i++;
        continue;
      }
      if (ch === inQuote) {
        inQuote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      continue;
    }
    if (ch === '[') balance++;
    else if (ch === ']') balance--;
  }
  return balance;
}

/**
 * Validates that a TOML string has valid section headers and basic syntax integrity.
 */
export function validateTomlSyntax(raw: string): void {
  const cleaned = raw.replace(/^\uFEFF/, '');
  if (cleaned.includes('\0')) {
    throw new Error('Corrupted TOML file: contains null bytes');
  }

  const lines = cleaned.split(/\r?\n/);
  let arrayBracketDepth = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const stripped = stripTomlCommentOutsideQuotes(lines[idx]!).trim();
    if (!stripped) continue;

    if (arrayBracketDepth > 0) {
      arrayBracketDepth += countBracketBalanceOutsideQuotes(stripped);
      if (arrayBracketDepth < 0) {
        throw new Error(`Unbalanced closing bracket at line ${idx + 1}: ${stripped}`);
      }
      continue;
    }

    if (stripped.startsWith('[')) {
      if (!stripped.endsWith(']')) {
        throw new Error(`Malformed TOML section header at line ${idx + 1}: ${stripped}`);
      }
      const bracketContent = stripped.slice(1, -1).trim();
      if (!bracketContent) {
        throw new Error(`Empty TOML section header at line ${idx + 1}`);
      }
      continue;
    }

    if (!stripped.includes('=')) {
      throw new Error(`Malformed TOML line ${idx + 1}: ${stripped}`);
    }

    const eqIdx = stripped.indexOf('=');
    const rhs = stripped.slice(eqIdx + 1).trim();
    if (!rhs) {
      throw new Error(`Missing value after '=' at TOML line ${idx + 1}`);
    }
    arrayBracketDepth += countBracketBalanceOutsideQuotes(rhs);
  }

  if (arrayBracketDepth !== 0) {
    throw new Error('Unclosed multiline array in TOML configuration');
  }
}

export interface ParsedTomlMcpServer {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
  enabled?: boolean;
  env: Record<string, string>;
}

function unescapeTomlString(rawQuoted: string): string {
  const trimmed = rawQuoted.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1).replace(/\\\\/g, '\\').replace(/\\"/g, '"');
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseTomlStringArray(rawArray: string): string[] {
  const inner = rawArray.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!inner) return [];
  const items: string[] = [];
  let current = '';
  let inQuotes: '"' | "'" | null = null;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]!;
    if (inQuotes) {
      current += ch;
      if (ch === '\\' && inQuotes === '"' && i + 1 < inner.length) {
        current += inner[++i]!;
        continue;
      }
      if (ch === inQuotes) {
        inQuotes = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuotes = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      if (current.trim()) {
        items.push(unescapeTomlString(current.trim()));
      }
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    items.push(unescapeTomlString(current.trim()));
  }
  return items;
}

/**
 * Extracts all `[mcp_servers.<name>]` and `[mcp_servers.<name>.env]` entries from a Codex `config.toml`,
 * supporting inline comments and multiline arrays.
 */
export function parseCodexTomlMcpServers(raw: string): Map<string, ParsedTomlMcpServer> {
  validateTomlSyntax(raw);
  const servers = new Map<string, ParsedTomlMcpServer>();
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/);

  let currentServer: string | null = null;
  let inEnvSubtable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = stripTomlCommentOutsideQuotes(lines[i]!).trim();
    if (!line) continue;

    if (line.startsWith('[')) {
      const header = line.slice(1, -1).trim();
      const envMatch = /^mcp_servers\.(.+)\.env$/.exec(header);
      const serverMatch = /^mcp_servers\.([^.]+|"[^"]+")$/.exec(header);

      if (envMatch) {
        const sName = unescapeTomlString(envMatch[1]!);
        currentServer = sName;
        inEnvSubtable = true;
        if (!servers.has(sName)) {
          servers.set(sName, { name: sName, env: {} });
        }
      } else if (serverMatch) {
        const sName = unescapeTomlString(serverMatch[1]!);
        currentServer = sName;
        inEnvSubtable = false;
        if (!servers.has(sName)) {
          servers.set(sName, { name: sName, env: {} });
        }
      } else {
        currentServer = null;
        inEnvSubtable = false;
      }
      continue;
    }

    if (!currentServer) continue;
    const entry = servers.get(currentServer)!;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 0) continue;

    const rawKey = unescapeTomlString(line.slice(0, eqIdx).trim());
    let rawVal = line.slice(eqIdx + 1).trim();

    // Handle multiline array values
    let bracketDepth = countBracketBalanceOutsideQuotes(rawVal);
    while (bracketDepth > 0 && i + 1 < lines.length) {
      i++;
      const nextPart = stripTomlCommentOutsideQuotes(lines[i]!).trim();
      rawVal += ' ' + nextPart;
      bracketDepth += countBracketBalanceOutsideQuotes(nextPart);
    }

    if (inEnvSubtable) {
      entry.env[rawKey] = unescapeTomlString(rawVal);
      continue;
    }

    if (rawKey === 'command') {
      entry.command = unescapeTomlString(rawVal);
    } else if (rawKey === 'args') {
      entry.args = parseTomlStringArray(rawVal);
    } else if (rawKey === 'url') {
      entry.url = unescapeTomlString(rawVal);
    } else if (rawKey === 'startup_timeout_sec') {
      entry.startupTimeoutSec = Number(rawVal);
    } else if (rawKey === 'tool_timeout_sec') {
      entry.toolTimeoutSec = Number(rawVal);
    } else if (rawKey === 'enabled') {
      entry.enabled = rawVal === 'true';
    }
  }

  return servers;
}

/**
 * Formats an MCP server specification into a Codex TOML `[mcp_servers.<name>]` block.
 */
export function renderCodexTomlMcpBlock(
  serverName: string,
  spec: McpServerOverride,
  eol = '\n'
): string {
  const key = tomlFormatKey(serverName);
  const lines: string[] = [`[mcp_servers.${key}]`];

  if (spec.command) {
    lines.push(`command = "${tomlEscapeString(spec.command)}"`);
  }
  if (spec.args && spec.args.length > 0) {
    const formattedArgs = spec.args.map((a) => `"${tomlEscapeString(a)}"`).join(', ');
    lines.push(`args = [${formattedArgs}]`);
  }
  if (spec.url) {
    lines.push(`url = "${tomlEscapeString(spec.url)}"`);
  }
  if (typeof spec.startupTimeoutSec === 'number') {
    lines.push(`startup_timeout_sec = ${spec.startupTimeoutSec}`);
  }
  if (typeof spec.toolTimeoutSec === 'number') {
    lines.push(`tool_timeout_sec = ${spec.toolTimeoutSec}`);
  }
  if (typeof spec.enabled === 'boolean') {
    lines.push(`enabled = ${spec.enabled ? 'true' : 'false'}`);
  }

  const envEntries = spec.env ? Object.entries(spec.env) : [];
  if (envEntries.length > 0) {
    lines.push('');
    lines.push(`[mcp_servers.${key}.env]`);
    for (const [envKey, envVal] of envEntries) {
      lines.push(`${tomlFormatKey(envKey)} = "${tomlEscapeString(envVal)}"`);
    }
  }

  return lines.join(eol);
}

/**
 * Checks whether an existing parsed Codex TOML server matches the desired spec.
 */
export function doesCodexTomlServerMatch(
  existing: ParsedTomlMcpServer,
  desired: McpServerOverride
): boolean {
  if ((existing.command ?? undefined) !== (desired.command ?? undefined)) return false;
  if ((existing.url ?? undefined) !== (desired.url ?? undefined)) return false;
  if ((existing.startupTimeoutSec ?? undefined) !== (desired.startupTimeoutSec ?? undefined)) {
    return false;
  }
  if ((existing.toolTimeoutSec ?? undefined) !== (desired.toolTimeoutSec ?? undefined)) {
    return false;
  }
  if ((existing.enabled ?? undefined) !== (desired.enabled ?? undefined)) {
    return false;
  }

  const existingArgs = existing.args ?? [];
  const desiredArgs = desired.args ?? [];
  if (existingArgs.length !== desiredArgs.length) return false;
  for (let i = 0; i < existingArgs.length; i++) {
    if (existingArgs[i] !== desiredArgs[i]) return false;
  }

  const existingEnv = existing.env ?? {};
  const desiredEnv = desired.env ?? {};
  const existingKeys = Object.keys(existingEnv).sort();
  const desiredKeys = Object.keys(desiredEnv).sort();
  if (existingKeys.length !== desiredKeys.length) return false;
  for (let i = 0; i < existingKeys.length; i++) {
    const k = existingKeys[i]!;
    if (k !== desiredKeys[i] || existingEnv[k] !== desiredEnv[k]) return false;
  }

  return true;
}

interface TomlSectionSpan {
  header: string;
  startLine: number;
  lastContentLine: number;
}

function findTomlSections(lines: string[]): TomlSectionSpan[] {
  const sections: TomlSectionSpan[] = [];
  let bracketDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const stripped = stripTomlCommentOutsideQuotes(lines[i]!).trim();
    if (!stripped) continue;

    if (bracketDepth > 0) {
      bracketDepth += countBracketBalanceOutsideQuotes(stripped);
      if (sections.length > 0) {
        sections[sections.length - 1]!.lastContentLine = i;
      }
      continue;
    }

    if (stripped.startsWith('[') && stripped.endsWith(']')) {
      const header = stripped.slice(1, -1).trim();
      sections.push({ header, startLine: i, lastContentLine: i });
      continue;
    }

    const eqIdx = stripped.indexOf('=');
    if (eqIdx >= 0) {
      const rhs = stripped.slice(eqIdx + 1).trim();
      bracketDepth += countBracketBalanceOutsideQuotes(rhs);
      if (sections.length > 0) {
        sections[sections.length - 1]!.lastContentLine = i;
      }
    }
  }

  return sections;
}

/**
 * Inserts or replaces a `[mcp_servers.<name>]` block in Codex `config.toml` in-place,
 * preserving comments (`#`), blank lines, section ordering, UTF-8 BOM, and CRLF/LF line endings.
 */
export function upsertCodexTomlServer(
  rawToml: string,
  serverName: string,
  spec: McpServerOverride
): string {
  const hasBom = rawToml.startsWith('\uFEFF');
  const body = hasBom ? rawToml.slice(1) : rawToml;
  const eol: '\r\n' | '\n' = body.includes('\r\n') ? '\r\n' : '\n';
  const blockLines = renderCodexTomlMcpBlock(serverName, spec, eol).split(/\r?\n/);

  if (!body.trim()) {
    const prefix = hasBom ? '\uFEFF' : '';
    if (!body) {
      return `${prefix}${blockLines.join(eol)}${eol}`;
    }
    const base = body.endsWith(eol) ? body : `${body}${eol}`;
    return `${prefix}${base}${blockLines.join(eol)}${eol}`;
  }

  const hasTrailingNewline = body.endsWith('\n');
  const lines = body.split(/\r?\n/);
  if (hasTrailingNewline && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const formattedKey = tomlFormatKey(serverName);
  const mainHeader = `mcp_servers.${formattedKey}`;
  const envHeader = `mcp_servers.${formattedKey}.env`;

  const sections = findTomlSections(lines);
  const matching = sections.filter((s) => s.header === mainHeader || s.header === envHeader);

  if (matching.length > 0) {
    const first = matching[0]!;
    const last = matching[matching.length - 1]!;
    const firstSecIdx = sections.indexOf(first);
    const lastSecIdx = sections.indexOf(last);

    if (lastSecIdx - firstSecIdx === matching.length - 1) {
      lines.splice(first.startLine, last.lastContentLine - first.startLine + 1, ...blockLines);
    } else {
      for (let m = matching.length - 1; m >= 1; m--) {
        const sec = matching[m]!;
        lines.splice(sec.startLine, sec.lastContentLine - sec.startLine + 1);
      }
      lines.splice(first.startLine, first.lastContentLine - first.startLine + 1, ...blockLines);
    }
  } else {
    const mcpSections = sections.filter((s) => s.header.startsWith('mcp_servers.'));
    if (mcpSections.length > 0) {
      const lastMcp = mcpSections[mcpSections.length - 1]!;
      lines.splice(lastMcp.lastContentLine + 1, 0, '', ...blockLines);
    } else {
      const projSec = sections.find((s) => s.header.startsWith('projects.'));
      if (projSec) {
        let insertIdx = projSec.startLine;
        while (insertIdx > 0 && lines[insertIdx - 1]!.trim().startsWith('#')) {
          insertIdx--;
        }
        lines.splice(insertIdx, 0, ...blockLines, '');
      } else {
        if (lines.length > 0 && lines[lines.length - 1]!.trim() !== '') {
          lines.push('');
        }
        lines.push(...blockLines);
      }
    }
  }

  const joined = lines.join(eol) + (hasTrailingNewline ? eol : '');
  return (hasBom ? '\uFEFF' : '') + joined;
}
