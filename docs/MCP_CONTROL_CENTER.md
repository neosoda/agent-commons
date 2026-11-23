# MCP Control Center — configuration et profils (historique v0.4.0)

**Current package installation/update/removal capability is documented in [Extension Manager](EXTENSION_MANAGER.md).** Catalog browsing remains read-only, but the separately approved Extension Manager can install pinned MCP packages and provision their commands. The [single operational guide](SKILLS_AND_MCP.md) defines the current separation of discovery, package installation, configuration, and synchronization.

The MCP Control Center is part of the existing local Skill Hub (agent-commons web).
It is not another service; the UI stays bound to 127.0.0.1.

## Delivered capabilities

- Detects native MCP host configurations including LM Studio, without creating a fictitious skill directory.
- Displays ten offline-reviewed MCP references, maintainer, source, verified version if available, requirements, compatibility, transport and risk.
- Inventories configured server names and malformed native configuration status without returning executable paths, secret values or environment variables to the browser.
- Provides predefined OSINT, Development and Infrastructure profiles and named custom allowlists.
- Prevents mixing untrusted OSINT/fetch tools and the Docker MCP Gateway in one custom profile.
- Previews and selectively adds centrally configured servers to chosen installed clients, with one-use approval and revision checks.
- Leaves unrelated native MCP entries, conflicting names and client-specific fields in place; reuses the existing pre-sync snapshot and restore mechanism.

An MCP profile does not REMOVE or disable native client tools. Its allowlist limits only what Agent Commons synchronizes. For actual context savings, disable unneeded servers in the client as well.

## Local XERJ search integration

XERJ v1.0.0-rc.104 is an optional SHA-256 verified official Rust binary. The existing MCP Control Center supports local node status, explicit allowed folders, indexing, searching and deletion previews. Configure and sync its **stdio** endpoint only for selected clients; no global activation or LAN listener is created. See [XERJ](XERJ.md). XERJ's Query-1 and Reader-1 are separate offerings and are not deployed here.

## LM Studio native integration

Verified official documentation: https://lmstudio.ai/docs/app/mcp

Windows: %USERPROFILE%\.lmstudio\mcp.json
Linux: ~/.lmstudio/mcp.json
macOS: ~/.lmstudio/mcp.json

LM Studio uses the Cursor-style JSON file with a root mcpServers object and supports command / args or a remote url. To inspect the actual file inside LM Studio, open Program > Install > Edit mcp.json. A cache-path copy reported by some macOS versions is intentionally NOT modified.

Use the existing Skill Hub Shared MCP servers editor to create reviewed central entries. Then open MCP Control Center, choose a profile and client(s), preview changes, and confirm the exact sync. Existing LM Studio servers remain untouched unless a name is absent and is being added. Conflicts are preserved.

Use Snapshots & recovery in the Skill Hub or the established backup/restore CLI if recovery is necessary. Never restore an unrelated snapshot.

## Catalog validation

Verified on 2026-11-14:
- Playwright: Microsoft, @playwright/mcp 0.0.85.
- Filesystem: Model Context Protocol, @modelcontextprotocol/server-filesystem 2.3.0.
- Fetch and Git: Model Context Protocol, mcp-server-fetch / mcp-server-git 2026.11.11.
- Docker MCP Gateway and GitHub MCP: official sources, manually provisioned, no guessed release version.
- Web Search and OSINT: no universal trustworthy server/package selected; installation unavailable pending upstream verification.

**Browsing** the catalog is metadata-only: it never downloads or launches software. The separate reviewed **Extension Manager** implements explicit preview/approval-based install, repair, update and uninstall for selected pinned npm/uv packages (Playwright, Filesystem, Fetch, Git), plus guided configuration for those four. Other servers still require manual provisioning. Use `doctor` (read-only) and `mcp probe` (explicit live launch) for diagnostics. Provision MCP servers with restricted permissions and credentials outside Git; review third-party code before executing it.

## Profile configuration

Built-in presets:
- OSINT: playwright, fetch, web-search, osint.
- Development: filesystem, git, github, playwright.
- Infrastructure: docker-mcp-gateway, filesystem.

Custom profiles live at ~/.agents/mcp-profiles.json and are not synchronized until explicitly applied. Only server IDs already configured in the central ~/.agents/mcp.json may be saved to custom profiles. Built-in profiles skip unconfigured entries. A server's permission boundaries (filesystem roots, Docker gateway profile) must be configured and enforced by that MCP server itself.

## Validation and recovery

All tests use a synthetic home and never modify real MCP client files.
Useful existing commands: agent-commons doctor, agent-commons list, agent-commons sync --dry-run.

Corrupt JSON/TOML is reported and left untouched. A native server conflict is preserved by default. Browser diagnostics intentionally redact private paths, URLs, commands and credentials; use local client logs and the CLI for advanced diagnostics. Never make the Skill Hub publicly reachable.

## Agent Desktop — optional critical-risk computer use

[Vercel Labs agent-desktop](https://github.com/vercel-labs/agent-desktop) is registered as a **manual-only**, critical-risk stdio MCP. It operates the logged-in user's desktop via OS accessibility APIs and must be installed separately; browsing this catalog never installs or runs it. The `desktop-control` preset selects only `agent-desktop` and requires explicit preview and approval. Custom profiles cannot mix desktop control with untrusted `fetch`, `web-search` or `osint`. A connected client may launch the configured MCP subprocess. OS permissions, client `PATH`, limited use and human approval for sensitive operations remain the operator's responsibility.

See the [French guide](AGENT_DESKTOP.md) and [English guide](AGENT_DESKTOP.en.md), including CLI setup, privacy warnings and a safe observe-act-verify loop.
