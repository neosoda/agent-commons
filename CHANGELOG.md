# Changelog

All notable changes to **Agent Commons** (`@neosoda/agent-commons`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation
- Consolidated the real `main` (post-v0.6.0) architecture, capabilities, runtime, skills/MCP, security decisions and prioritized roadmap into focused canonical documents; replaced the historic handoff with a short operational resume.
- Reduced bilingual public READMEs without discarding generated upstream repository/license credits; moved legacy long-form progress logs to immutable Git-history archive links.
- Corrected stale v0.5.x security support wording, main/release confusion, escaped Markdown fences and the contradictory MCP installer documentation. No application behavior changed and no new release was created.

### Added
- Optional pinned SimuLab catalog integration for sourced, standalone isometric 3D educational labs and optional video/audio; reviewed 71-file upstream subset with MIT source and OFL font attribution, explicit install, no dependency execution, bilingual guides and synthetic-home install/verify checks.

### Added
- Original opt-in `ux-psychology` skill inspired by 30 Laws of UX concepts, including progressive-loading reference guides, reproducible audit workflow, design patterns, independent source credits and bilingual integration documentation.
- Reviewed, pinned catalog entry and isolated installation/routing regression checks. No third-party asset redistribution, auto-install or agent configuration change.

## [0.6.0] - 2026-11-20

Release notes: docs/releases/v0.6.0-release-notes.md

### Added
- Experimental bounded local mission runner with LM Studio-compatible tool calling, opt-in Git workspace edits and project checks, resumable checkpoints, optional cloud recovery and anti-loop safeguards (including file-content oscillation detection).
- Pinned optional Motion Educator catalog integration and six reviewed Hermes metadata-only skills; neither installs nor executes third-party code automatically.

### Changed
- Redesigned Operating Surface: persistent themes and keyboard quick search over actual local agents, skills and MCP references.
- Bilingual README and runtime guide now document the experimental CLI, opt-in permission flags, boundaries and limitations.

### Fixed
- Safer checkpoint restore bound to the exact checkout, cumulative execution budgets, cloud-write approval and Windows reserved paths; macOS temporary directory normalization.

### Known limits
- The runtime still lacks live MCP tools, a real OS sandbox, a 24/7 daemon, a mission dashboard and an RTX 5070 Ti benchmark. GitHub ZIP remains unsigned; npm is not yet published.

## [0.5.4] - 2026-11-18

Release notes: docs/releases/v0.5.4-release-notes.md

### Added
- Skill Hub catalog filters for managed installations, reviewed updates, items needing attention and local/unmanaged tools; direct skill install/update previews and agent selection from catalog cards.
- Explicit single-skill synchronization to selected installed agents, with one-use revision/plan-bound preview tokens. Saved profiles and MCP settings stay unchanged; native central-library readers require no additional links.

### Changed
- Catalog details present actions before usage help. MCP details show package, central configuration and client synchronization stages and reopen after installation or configuration to expose the next action.

### Fixed
- Closing a pending catalog preview or navigating away discards its late response instead of opening an unexpected confirmation.

## [0.5.3] - 2026-11-18

Release notes: docs/releases/v0.5.3-release-notes.md

### Fixed
- Namespaced catalog skills (e.g. `ecc-design-system`) are installed and updated with the catalog id as frontmatter `name`, so clients no longer list two skills under one name; receipts keep the upstream blob hash.

### Added
- `catalog align-names [--yes]`: offline, integrity-checked migration of existing installs; `doctor` suggests it for catalog-managed name collisions.

## [0.5.2] - 2026-11-18

Release notes: docs/releases/v0.5.2-release-notes.md

### Fixed
- `doctor` duplicate-link advice targets only the affected clients (`sync --skills-only --agent …`); a plain skills sync would also link every missing central skill into clients such as Claude Code.
- `sync` reports a client skills folder linked to `~/.agents/skills` as already shared instead of a conflict.

## [0.5.1] - 2026-11-18

Release notes: docs/releases/v0.5.1-release-notes.md

### Changed
- Clients that natively read `~/.agents/skills` (Codex, Gemini CLI, Cursor, OpenCode, Windsurf) get no per-client links; `sync` removes redundant or dangling links to central skills (recorded in the pre-sync snapshot).
- Antigravity labels; OpenCode global skills folder is `~/.config/opencode/skills`.

### Added
- Windsurf, GitHub Copilot CLI (`copilot-json` MCP format with `type` and `tools`) and Qwen Code.
- `doctor`: real per-client token cost, redundant links, duplicate skill names; a client skills root linked to the central library is accepted.
- Skill Hub profile editor note for native-library clients.

## [0.5.0] - 2026-11-18

Release notes: docs/releases/v0.5.0-release-notes.md

### Added — real Windows diagnostics (audit of 2026-11-17)
- `doctor` checks prerequisites on PATH, MCP launch targets for the central manifest and every native client, `SKILL.md` frontmatter errors that clients reject, and estimates per-agent skill metadata tokens. Problems are reported as `warnings`.
- `mcp probe` explicitly starts MCP servers (central or `--agent`), performs `initialize` + `tools/list`, optionally one `tools/call`, and stops the process tree; Windows `.cmd` shims supported safely; HTTP servers needing credentials reported as unverified.
- `mcp demo-config` / `mcp demo-server`: zero-dependency, secret-free stdio MCP server for end-to-end checks.
- Uninstall preview of a managed MCP package lists configurations that still reference it.

### Fixed — Windows
- Reviewed npm/uv MCP package installs failed with "package manager is unavailable" when the home path was deep (spawn working directory over MAX_PATH).
- Restore, catalog install/update and central repair failed with ENOENT beyond MAX_PATH (`fs.mkdtempSync` ignores long-path namespacing).
- Three test suites failed with EPERM on standard Windows accounts (file symlinks need a privilege); directory links now use junctions.
- Portable build smoke test failed under Windows PowerShell 5.1 (`Invoke-WebRequest` without `-UseBasicParsing`) and ran against the builder's real profile.
- MCP details dialog showed "Reference only" for an installed package; Control Center now says "config valid, not started" instead of "valid".

### Added — shadcn Improve (pinned advisory skill)
- Reviewed MIT `improve` catalog entry, optional approved install and lazy routing, FR/EN documentation and Skill Hub sample prompts.
- Advisor audits code read-only and writes implementation plans; no automatic source edit, installation, subagent dispatch or merge.

### Added — reviewed MCP Extension Manager
- Managed package lifecycle: isolated pinned npm/uv installations, explicit preview/approval, repair, approved-version update and uninstall; external clients untouched by package operations.
- Unified Skills & MCP catalog displays managed state and reviewed update availability.
- Guided MCP provisioning for Playwright/Fetch/Filesystem/Git with client selection, directory scoping and separate targeted sync with revision-bound approval.
- Synthetic-home tests for installer rollback, unmanaged-path preservation, scoped provisioning and cross-platform execution.
- Documented limitations: reviewed versions only (no live upstream version checks), no native client deprovisioning on package removal.


### Added — Agent Desktop opt-in skill + MCP
- Added Vercel Labs `agent-desktop` Apache-2.0 pinned skill and FR/EN setup and security guides.
- Added critical-risk desktop MCP reference, explicit `desktop-control` preset and contextual prompt samples in the local interactive catalog.
- Blocked mixing untrusted Web/OSINT tools with desktop control in custom profiles; added synthetic regression tests. No native binary, OS permission, or client configuration is installed by default.


### Added — Video Engine and Remotion Superpowers (catalog only)
- 16 pinned MIT source references: ninjasweb Video Engine plus 15 distinct Dojo Coding Labs Remotion Superpowers skills.
- New lazy Skill Hub examples, selective installation and routing guidance, FR/EN docs and upstream credits.
- The optional Dojo MCP servers remain external, not installed or launched; no runtime dependencies, automatic execution or release.

## [0.4.0] — 2026-11-14 (GitHub)

### Added — MCP Control Center
- Native LM Studio MCP configuration support on Windows/Linux/macOS (MCP-only).
- Offline reviewed eight-server MCP catalog with safe version metadata, three presets and custom per-client MCP profiles.
- Selective non-destructive MCP sync with one-use preview, client inventory, security limits, and dedicated Skill Hub page.
- Synthetic tests for LM Studio native preservation, scoped sync and secret exclusion.
- Snapshot recovery for custom MCP profile creation, edits and deletion, with exact revision checks.
- Skill Hub custom MCP profile editing/deletion and guarded confirmation.

### Fixed
- Windows portable build uses system-selected loopback ports instead of a random possibly reserved range.
- npm and Windows portable packaging includes the compiled `dist/mcp` modules.

### Distribution
- GitHub-only v0.4.0 release: versioned source plus verified Windows x64 ZIP and `.sha256` asset. npm publication is **not** part of this release.

### Not yet available
- Automated package installation, update/uninstall, full native configuration import and live launch diagnostics.


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
