# Changelog

All notable changes to **Agent Commons** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-29

### Added

- **Agent Detection Engine**: Automatic discovery of 17 AI coding environments across Windows, Linux, and macOS (`claude-code`, `codex`, `cursor`, `gemini-cli`, `gemini-config`, `gemini-antigravity`, `opencode`, `minimax`, `kiro`, `cline`, `roo-code`, `continue`, `hermes-home`, `hermes-appdata`, `kimi`, `aider-desk`, `grok`).
- **Safe Link & NTFS Junction Engine**:
  - Privilege-free Windows directory linking via native NTFS Junctions (`'junction'`), requiring neither Administrator rights nor Windows Developer Mode.
  - Standard directory symlinks (`'dir'`) on Linux and macOS.
  - `lstat`-guarded link detachment (`detachLinkSafe`) and recursive nested-link detachment (`removePhysicalDirectorySafe`) preventing target data loss.
- **Skills Synchronization (`~/.agents/skills/`)**:
  - Byte-for-byte SHA-256 content verification (`areDirectoriesIdentical`) to replace duplicate physical folders with links while preserving modified local folders as conflicts unless `--force` is specified.
  - Local skill adoption into the central library via `--adopt`.
  - Automatic repair of broken or misdirected skill links.
- **Multi-Dialect Non-Destructive MCP Synchronization (`~/.agents/mcp.json`)**:
  - Support for Standard JSON (`mcpServers`), OpenCode JSON/JSONC (`mcp` with `//` and `/* */` comments, inline comments, and trailing commas preserved via `jsonc-parser`), and OpenAI Codex TOML (`[mcp_servers.<name>]` + `[mcp_servers.<name>.env]`).
  - Preserves custom indentation (spaces or tabs), UTF-8 BOM, and CRLF/LF line endings across JSON, JSONC, and TOML configurations, with strict idempotence (zero file rewrites when unchanged).
  - Per-agent overrides (`agentOverrides`), inclusion/exclusion filters (`agents`, `excludeAgents`), and `${ENV_VAR}` placeholder preservation.
  - Atomic crash-safe file writes (`writeFileAtomicSync`) with `fsync`.
- **Snapshot Backup, Restore & Transactional Rollback**:
  - Automatic pre-sync snapshots in `~/.agents/backups/<snapshot-id>/manifest.json` and automatic rollback on mid-sync failure.
  - Manual `backup` and `restore` CLI commands with strict subpath boundary validation.
- **Security & Secret Scrubbing**:
  - Minimal footprint (`jsonc-parser` with zero transitive dependencies), zero telemetry, and automatic redaction of API keys, Bearer tokens, JWTs, private keys, and URI passwords in logs and error outputs.
