import path from 'node:path';

const SAFE_IDENTIFIER_REGEX = /^[A-Za-z0-9._-]+$/;

/**
 * Validates a skill name or MCP server identifier to prevent path traversal and injection.
 */
export function isValidIdentifier(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  if (name.length > 128) return false;
  if (name === '.' || name === '..') return false;
  if (name.includes('/') || name.includes('\\') || name.includes('\0')) return false;
  return SAFE_IDENTIFIER_REGEX.test(name);
}

/**
 * Ensures that a resolved target path stays strictly inside the expected parent directory.
 */
export function isSafeSubpath(parentDir: string, candidatePath: string): boolean {
  const resolvedParent = path.resolve(parentDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedParent, resolvedCandidate);
  if (!relative) return false;
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return false;
  }
  return true;
}

/**
 * Throws an error if candidatePath is not a safe subpath of parentDir.
 */
export function assertSafeSubpath(parentDir: string, candidatePath: string, label = 'Path'): void {
  if (!isSafeSubpath(parentDir, candidatePath)) {
    throw new Error(`${label} traversal rejected: "${candidatePath}" is outside "${parentDir}"`);
  }
}
