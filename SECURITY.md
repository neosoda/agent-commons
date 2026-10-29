# Security Policy

## Core Security Principles

Agent Commons is designed from the ground up for safe local operation:

1. **Zero Telemetry & Zero Network Calls**: The CLI operates 100% offline against the local filesystem. It never transmits analytics, paths, or configuration data to any external server.
2. **Non-Destructive Link Detachment**: Symlinks and Windows NTFS junctions are inspected via `lstat` and detached via `unlink`/`rmdir` on the reparse point itself. Target directories are never recursively traversed during link removal.
3. **Symlink-Follow & Boundary Protection**: Agent Commons refuses to overwrite symlinked MCP configuration files, refuses to traverse agent `skills/` root folders that are themselves symlinks, and enforces strict subpath boundary checks during backup restoration.
4. **Secret Scrubbing**: All diagnostic messages, error logs, and dry-run outputs pass through a strict credential scrubber that redacts API keys (`sk-*`, `ghp_*`, `github_pat_*`, `AKIA*`), Bearer tokens, JWTs, private keys, and database connection passwords while preserving `${ENV_VAR}` references.
5. **Pre-Sync Snapshots & Automatic Rollback**: Every mutating `sync` operation records the prior state of modified paths in `~/.agents/backups/` and automatically rolls back if a fatal filesystem error occurs mid-flight.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a Vulnerability

If you discover a security issue (such as a symlink traversal edge case, config corruption vector, or credential leak in CLI output):

1. **Do not open a public GitHub issue** containing a live exploit.
2. Report the vulnerability privately via [GitHub Security Advisories](https://github.com/neosoda/agent-commons/security/advisories/new).
3. Include minimal reproduction steps (using an isolated `--home` sandbox directory) and your OS / Node.js version.
