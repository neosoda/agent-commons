# Changelog

All notable changes to **Agent Commons** (`@neosoda/agent-commons`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] — 2026-10-30 (publiée sur GitHub)

### Fixed
- Sync UI : `sync-apply` et `sync-all-apply` exigent désormais un jeton éphémère à usage unique lié à l'aperçu exact et à la révision des entrées (profil, skills, MCP, agents), avec refus en cas de modification intermédiaire.
- Éditeur de profils : sauvegarde d'un agent immuable pendant l'appel HTTP, protection anti-double clic lors d'un changement d'agent, brouillons distincts conservés.

### Changed
- Politique de sécurité et versions prises en charge actualisées, documentation de la release 0.3.0 corrigée.
- Workflow one-shot de publication 0.3.0 retiré après sa réussite ; mécanisme de publication 0.3.1 contrôlé séparément.
- Script autonome de vérification du ZIP **téléchargé** sur un Windows indépendant, et checklist d'acceptation Windows/NVDA/VoiceOver.
- Handoff simplifié pour la reprise autonome.


## [0.3.0] — 2026-10-30 (publiée sur GitHub)

### Added
- Bilingual FR/EN local Skill Hub with persistent browser preference, accessible keyboard navigation, focus management and explicit error announcements.
- Additional real Chromium regression scenarios for dialogs, localization, user draft recovery, delayed/failed HTTP requests and MCP synchronization preview races.
- Release-quality Windows portable check: extract the final ZIP into a clean directory with spaces, run its **embedded** Node and CLI against a synthetic home, verify localhost HTTP startup, package/CLI versions and ZIP checksum.

### Improved
- Non-text contrast on interactive controls, clear inline feedback for invalid MCP previews, focus restoration after refresh, and protection against duplicate or stale dialogs.
- MCP and profile editing keep drafts on read-only refresh; concurrent responses no longer overwrite newer UI state.
- Staged backup/restore rollback preservation, recursive content fingerprints, private HTTP error allowlisting, and expanded cross-platform safety tests.

### Fixed
- CLI `--version` now reports the actual installed package version, not an obsolete hard-coded value.
- MCP preview failures no longer discard the server configuration being edited.
- Pending writes cannot be hidden by closing a confirmation; failures remain retryable and accessible.

### Distribution notes
- This version is **prepared**, not yet tagged/published. The previous published GitHub Release remains v0.2.0 until a verified v0.3.0 release is created.
- Windows x64 portable ZIP is the preferred no-Node end-user distribution. The optional npm scope still requires authorized first publication and Trusted Publisher configuration.
- No claims of full NVDA/VoiceOver certification, executable code signing, or manual installation on an independent physical Windows device.


### Fixed

- Normalize the npm CLI `bin` path (remove leading `./`) to avoid npm 11 publish-time rewrite/warning; add regression test of compiled executable.
- Retire the one-shot v0.2.0 release workflow after successfully publishing GitHub assets; future releases continue to use standard release workflows.

## [0.2.0] - 2026-10-29

### Added

- **MCP manifest editor** in the local Skill Hub: guarded create, agent routing edits and removal, SHA-256 stale-state protection, JSONC-aware writes, snapshot rollback and redacted browser metadata.

- Local browser **Skill Hub**: overview, curated catalog with safe install/update/remove previews, agent profiles and explicit synchronization, shared MCP visibility, read-only integrity diagnostics, and manual snapshots/restoration.
- Real Chromium QA at five viewport sizes with sanitized screenshot artifacts.
- Automated Windows portable ZIP build using a SHA-256-verified official Node.js 24 LTS runtime (v24.22.2), with a smoke-tested local HTTP startup and archive checksum. Windows assets and checksums are attached to the official GitHub Release after successful release validation.

### Security

- Loopback-only HTTP server with CSRF, strict Host/Origin controls, CSP and sanitized diagnostic messages.
- CI now cancels superseded PR runs, audits npm dependencies, and verifies packaged files.
- Release automation validates the exact main SHA, all six CI matrix jobs, Chromium and Windows artifact checksums before creating v0.2.0 and dispatching npm OIDC publication.

## [0.1.1] - 2026-10-29

### Changed

- **Scoped npm Package Name**: Renamed package to `@neosoda/agent-commons` with `publishConfig.access = "public"` for public npm distribution while preserving the `agent-commons` CLI binary command.
- **GitHub Actions OIDC Trusted Publishing**: Added `.github/workflows/publish.yml` with Node.js 24, `id-token: write` OIDC provenance attestation, GitHub Environment (`npm`) protection, tag/version/commit verification, and duplicate-version guards without permanent npm tokens.
- **Documentation**: Expanded `README.md` with `npx @neosoda/agent-commons` usage, initial setup walkthrough, `--dry-run` inspection guide, and pre-sync safety precautions.

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
