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
 * Parses a JSON or JSONC string into an object. Throws if malformed or not a JSON object.
 */
export function parseJsoncObject(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) {
    throw new Error('Configuration file is empty');
  }
  const stripped = stripJsonCommentsAndTrailingCommas(raw);
  const parsed: unknown = JSON.parse(stripped);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Configuration root must be a JSON object');
  }
  return parsed as Record<string, unknown>;
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
export function renderCodexTomlMcpBlock(serverName: string, spec: McpServerOverride): string {
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

  return lines.join('\n');
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

/**
 * Inserts or replaces a `[mcp_servers.<name>]` block in Codex `config.toml` non-destructively.
 */
export function upsertCodexTomlServer(
  rawToml: string,
  serverName: string,
  spec: McpServerOverride
): string {
  const block = renderCodexTomlMcpBlock(serverName, spec);
  const formattedKey = tomlFormatKey(serverName);
  const mainHeader = `[mcp_servers.${formattedKey}]`;
  const envHeader = `[mcp_servers.${formattedKey}.env]`;

  const lines = rawToml.split(/\r?\n/);

  // Remove existing [mcp_servers.<name>] and [mcp_servers.<name>.env] sections if present
  const keptLines: string[] = [];
  let skipping = false;
  let removedAny = false;

  for (const line of lines) {
    const trimmed = stripTomlCommentOutsideQuotes(line).trim();
    if (trimmed.startsWith('[')) {
      if (trimmed === mainHeader || trimmed === envHeader) {
        skipping = true;
        removedAny = true;
        continue;
      } else {
        skipping = false;
      }
    }
    if (!skipping) {
      keptLines.push(line);
    }
  }

  const updatedContent = keptLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();

  if (removedAny) {
    return `${updatedContent}\n\n${block}\n`;
  }

  // Insert before `[projects.` if present (Codex convention), else at the end
  const projectsIndex = updatedContent.indexOf('\n[projects.');
  if (projectsIndex >= 0) {
    const before = updatedContent.slice(0, projectsIndex).trimEnd();
    const after = updatedContent.slice(projectsIndex + 1);
    return `${before}\n\n${block}\n\n${after}\n`;
  }

  if (!updatedContent) {
    return `${block}\n`;
  }

  return `${updatedContent}\n\n${block}\n`;
}
