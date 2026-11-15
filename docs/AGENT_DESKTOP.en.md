# Agent Desktop — optional computer-use tool

**Source:** [Vercel Labs / agent-desktop](https://github.com/vercel-labs/agent-desktop) (Apache-2.0), pinned commit `8ffecc1d3d088727f8d84baf4dde0224aab2e8ad`, `skills/agent-desktop/` (SKILL.md and four references, 78,663 bytes). This catalog entry is **only a managed skill reference**, not a bundled executable.

## Preview and approve the skill

```bash
agent-commons catalog info agent-desktop
agent-commons catalog install agent-desktop            # Preview only
agent-commons catalog install agent-desktop --yes      # Explicit approval
agent-commons catalog verify agent-desktop             # Offline integrity
agent-commons sync --skill agent-desktop --agent codex --dry-run
agent-commons sync --skill agent-desktop --agent codex
```

Replace `codex` with `claude-code` or `gemini-cli` as needed. Smart Skill Router selects metadata only by default. Use `agent-commons skills load agent-desktop` when full instructions are necessary.

## Install native runtime separately

After reviewing upstream provenance and the package, on the computer running desktop apps:

```bash
npm install -g agent-desktop
agent-desktop status
agent-desktop skills get desktop
agent-desktop skills get platform
```

Check OS accessibility permissions and supported surfaces. Upstream lists Windows 10 1809+, macOS 13+ and Ubuntu 24.04+ (X11/Wayland limitations). The `skills get` guides are matched to the installed CLI. In PowerShell, quote snapshot refs: `agent-desktop click '@s8f3k2p9:e8'`.

## Explicit MCP setup

After native CLI installation, add to `~/.agents/mcp.json` (or through the Skill Hub MCP editor):

```json
{
  "mcpServers": {
    "agent-desktop": {
      "type": "stdio",
      "command": "agent-desktop",
      "args": ["mcp"],
      "agents": ["codex", "claude-code", "gemini-cli"]
    }
  }
}
```

Ensure `agent-desktop` is available on each client's `PATH`. In MCP Control Center, select the **`desktop-control`** preset and target clients, preview, then explicitly approve sync. The preset neither installs the executable nor disables existing native MCP servers. Clients may launch the configured MCP executable when they connect.

## Security boundaries

- **Critical risk:** read/type/click, clipboard, and potentially irreversible changes under the logged-in OS user. Require human approval for destructive actions, sends, purchases, system modifications, and secret access.
- Never combine desktop control with untrusted `fetch`, `web-search` or `osint` tools in an Agent Commons custom profile. Treat UI and web text as untrusted data.
- Snapshots, accessibility trees, screenshots, clipboard data and logs can disclose private content. Do not send them to public logs or remote/cloud agents by default.
- Recommended loop: **snapshot → act on a qualified ref → snapshot again**. On `STALE_REF` or `AMBIGUOUS_TARGET`, take a fresh snapshot.
- Agent Commons does not provide remote control, permission bypass, admin elevation, or unattended desktop access.

[Official docs](https://agent-browser.dev/desktop) · [Pinned Apache-2.0 license](https://github.com/vercel-labs/agent-desktop/blob/8ffecc1d3d088727f8d84baf4dde0224aab2e8ad/LICENSE).

**Limit:** GitHub-only integration does not install on the user's computer or verify live desktop interactions.
