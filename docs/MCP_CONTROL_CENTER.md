# MCP Control Center — target 0.4.0

The MCP Control Center is part of the existing local Skill Hub (agent-commons web).
It is not another service; the UI stays bound to 127.0.0.1.

## Delivered capabilities

- Detects native MCP host configurations including LM Studio, without creating a fictitious skill directory.
- Displays eight offline-reviewed MCP references, maintainer, source, verified version if available, requirements, compatibility, transport and risk.
- Inventories configured server names and malformed native configuration status without returning executable paths, secret values or environment variables to the browser.
- Provides predefined OSINT, Development and Infrastructure profiles and named custom allowlists.
- Prevents mixing untrusted OSINT/fetch tools and the Docker MCP Gateway in one custom profile.
- Previews and selectively adds centrally configured servers to chosen installed clients, with one-use approval and revision checks.
- Leaves unrelated native MCP entries, conflicting names and client-specific fields in place; reuses the existing pre-sync snapshot and restore mechanism.

An MCP profile does not REMOVE or disable native client tools. Its allowlist limits only what Agent Commons synchronizes. For actual context savings, disable unneeded servers in the client as well.

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

The catalog is metadata-only. It never downloads, installs, upgrades, removes or launches third-party binaries. Guided executable installation, launch diagnostics and generic import of existing client commands remain unimplemented. Provision MCP servers using their official instructions with restricted permissions and credentials outside Git; review the package before executing.

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
