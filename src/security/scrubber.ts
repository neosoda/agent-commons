const SECRET_VALUE_PATTERNS: RegExp[] = [
  /\b(Bearer\s+)(?!\[REDACTED)[A-Za-z0-9._~+/=-]{12,}/gi,
  /\b(sk-(?:proj-|ant-|live-|test-)?)(?!\[REDACTED)[A-Za-z0-9_-]{12,}/g,
  /\b(gh[pousr]_)(?!\[REDACTED)[A-Za-z0-9_]{12,}/g,
  /\b(github_pat_)(?!\[REDACTED)[A-Za-z0-9_]{12,}/g,
  /\b(AKIA)[0-9A-Z]{16}\b/g,
  /\b(xox[baprs]-)(?!\[REDACTED)[A-Za-z0-9-]{10,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g,
  /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g,
  /\b((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|rediss|amqp):\/\/[^:\s/]+:)(?!\$\{|[^\s@]*\[REDACTED)([^\s@]+)(@)/gi,
  /(\b[A-Za-z0-9_]*(?:api[_-]?key|token|secret|password|passphrase|private[_-]?key|client[_-]?secret|access[_-]?key)[A-Za-z0-9_]*\s*[:=]\s*['"]?)(?!\$\{|[^\s,'"&]*\[REDACTED)([^\s,'"&]+)(['"]?)/gi
];

const SENSITIVE_KEY_REGEX =
  /(?:api[_-]?key|token|secret|password|passphrase|private[_-]?key|credential|authorization|auth[_-]?token|cookie|session[_-]?key)/i;

/**
 * Redacts potential secrets, tokens, and credentials from any log or error string.
 */
export function redactSecrets(input: string): string {
  if (!input || typeof input !== 'string') return '';
  let result = input;

  // Replace URI passwords
  result = result.replace(
    /\b((?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|rediss|amqp):\/\/[^:\s/]+:)(?!\$\{|[^\s@]*\[REDACTED)([^\s@]+)(@)/gi,
    '$1[REDACTED]$3'
  );

  // Replace standalone known token formats first (including inside quotes)
  result = result.replace(/\b(Bearer\s+)(?!\[REDACTED)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[REDACTED]');
  result = result.replace(
    /\b(sk-(?:proj-|ant-|live-|test-)?)(?!\[REDACTED)[A-Za-z0-9_-]{12,}/g,
    '[REDACTED]'
  );
  result = result.replace(/\b(gh[pousr]_)(?!\[REDACTED)[A-Za-z0-9_]{12,}/g, '[REDACTED]');
  result = result.replace(/\b(github_pat_)(?!\[REDACTED)[A-Za-z0-9_]{12,}/g, '[REDACTED]');
  result = result.replace(/\b(AKIA)[0-9A-Z]{16}\b/g, '[REDACTED]');
  result = result.replace(/\b(xox[baprs]-)(?!\[REDACTED)[A-Za-z0-9-]{10,}/g, '[REDACTED]');
  result = result.replace(
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g,
    '[REDACTED_JWT]'
  );
  result = result.replace(
    /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g,
    '[REDACTED_PRIVATE_KEY]'
  );

  // Replace key=value or key: value patterns
  result = result.replace(
    /(\b[A-Za-z0-9_]*(?:api[_-]?key|token|secret|password|passphrase|private[_-]?key|client[_-]?secret|access[_-]?key)[A-Za-z0-9_]*\s*[:=]\s*['"]?)(?!\$\{|[^\s,'"&]*\[REDACTED)([^\s,'"&]+)(['"]?)/gi,
    (_match, prefix: string, val: string, suffix: string) => {
      if (val.startsWith('${') && val.endsWith('}')) {
        return `${prefix}${val}${suffix}`;
      }
      if (val.includes('[REDACTED')) {
        return `${prefix}${val}${suffix}`;
      }
      return `${prefix}[REDACTED]${suffix}`;
    }
  );

  return result;
}

/**
 * Checks if a string contains unredacted secret patterns.
 */
export function containsRawSecret(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  return SECRET_VALUE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
}

/**
 * Deeply clones an object while redacting sensitive keys and values for safe logging/output.
 */
export function redactObjectSecrets<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return redactSecrets(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactObjectSecrets(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_REGEX.test(k) && typeof v === 'string') {
        if (v.startsWith('${') && v.endsWith('}')) {
          out[k] = v;
        } else {
          out[k] = '[REDACTED]';
        }
      } else {
        out[k] = redactObjectSecrets(v);
      }
    }
    return out as T;
  }
  return value;
}
