# Security Policy

Agent Commons is a **local-first** configuration management tool. It reads and can
modify local AI agent skills, MCP configuration files and backups **only when
explicitly requested**. Treat those changes as potentially destructive:
preview first, use a backup, and keep independent recovery copies for important data.

## Supported versions

| Version | Security fixes |
|---|---|
| 0.3.x | Supported (current) |
| 0.2.x | Superseded; upgrade to 0.3.x |
| 0.1.x | Unsupported |

## Security boundaries and guarantees

- **Skill Hub:** binds exclusively to `127.0.0.1`, has **no login**, rejects
  foreign Host/Origin requests, uses a per-process CSRF token and a restrictive
  Content Security Policy. **Never** put this administrative UI behind a tunnel,
  reverse proxy, port forward or public/LAN listener.
- **No telemetry:** Agent Commons does not transmit analytics or private reports.
  Inventory, diagnostics, public catalog browsing and ordinary sync run locally.
  **Exception:** a user-triggered installation/update of a public GitHub skill
  downloads pinned GitHub metadata/blobs over HTTPS. Do not describe the entire
  application as permanently offline.
- **Managed filesystem paths:** symlinks and Windows NTFS junctions are inspected
  without following links into unrelated data; unrelated physical skill folders
  and unknown native configuration fields are preserved wherever possible.
- **Mutations:** preview and explicit approval are required from the Skill Hub.
  Synchronization uses a short-lived, single-use preview revision guard (starting
  with the next patch after v0.3.0); on-disk snapshots and rollback are used for
  managed changes. These safeguards reduce risk but **do not** guarantee crash
  atomicity or cross-process filesystem locking.
- **Secrets:** browser responses deliberately omit MCP command arguments, URLs,
  environment values and arbitrary private exception messages. Native configs
  may still contain credentials; never share backup archives or recovery folders.
- **Supply chain:** curated pinned source/licence metadata is **not a code
  security audit**. Review third-party skills before installing/running them.
  The Windows portable ZIP is currently unsigned. Verify the release SHA-256.

## Reporting a vulnerability

Please report vulnerabilities **privately** via
[GitHub Security Advisories](https://github.com/neosoda/agent-commons/security/advisories/new).
Do not post secret values or exploitable details in a public issue.

Provide the affected version, platform/Node version, reproduction steps using
an isolated `--home` directory and a minimized example that contains no real secrets.
