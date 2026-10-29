# Agent Commons

[![CI](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml/badge.svg)](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/neosoda/agent-commons/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Agent Commons** (`agent-commons`) is a lightweight, local-first CLI that centralizes and synchronizes AI agent **Skills** (`~/.agents/skills/`) and **Model Context Protocol (MCP)** configurations (`~/.agents/mcp.json`) across **17 AI coding environments** on Windows, Linux, and macOS.

---

## Key Features

1. **Privilege-Free Windows Support via NTFS Junctions**  
   Standard directory symlinks on Windows require Administrator elevation or Windows Developer Mode. Agent Commons uses native **NTFS Junctions** (`'junction'`) on Windows, working out of the box on standard user accounts while using standard directory symlinks on Linux and macOS.
2. **Non-Destructive Multi-Dialect MCP Merging (JSON, JSONC, TOML)**  
   Maintains a single `~/.agents/mcp.json` manifest and performs surgical in-place edits in each agent's native configuration format (**Standard JSON**, **JSONC with comments**, and **OpenAI Codex TOML**), preserving `//` and `/* */` comments, inline comments, trailing commas, custom indentation, UTF-8 BOM, CRLF/LF line endings, existing servers, and unrelated settings.
3. **Conflict-Aware & Safe by Construction**  
   - Physical skill folders in an agent directory are compared byte-for-byte (SHA-256) against `~/.agents/skills/`. Identical copies are cleanly replaced with links; diverged folders are preserved and reported as conflicts unless `--force` is passed.
   - Corrupted JSON/JSONC/TOML configuration files are detected and never overwritten.
   - Link removal uses `lstat` inspection and detaches the reparse point without ever traversing or deleting target files.
   - Atomic file writes (`write + fsync + rename`) prevent half-written MCP configurations on interruption.
4. **Automatic Pre-Sync Snapshots & Transactional Rollback**  
   Every mutating `sync` records a point-in-time snapshot in `~/.agents/backups/` and automatically rolls back if an unexpected filesystem error occurs mid-sync.
5. **100% Offline & Minimal Footprint**  
   Built on Node.js 22+ standard library modules with a single zero-dependency AST parser (`jsonc-parser`). Zero telemetry, zero external network calls, and automatic secret scrubbing in CLI logs.

---

## Installation & Quick Start

### Requirements

- **Node.js 22.0.0** or newer
- Windows, Linux, or macOS

### Run via `npx` (Once Published to npm) or Local Package

```bash
npx agent-commons doctor
npx agent-commons list
npx agent-commons sync --dry-run
```

### Build and Run from Source

```bash
git clone https://github.com/neosoda/agent-commons.git
cd agent-commons
npm install
npm run build

# Run directly
node dist/cli/index.js doctor

# Or link globally on your machine
npm link
agent-commons doctor
```

---

## Shared Library Layout (`~/.agents/`)

Agent Commons uses `~/.agents/` as your single source of truth:

```text
~/.agents/
├── skills/
│   ├── frontend-nextjs/
│   │   └── SKILL.md
│   └── security-review/
│       └── SKILL.md
├── mcp.json
└── backups/
    └── snapshot-20261029-114500-a1b2c3/
        ├── manifest.json
        └── payload/
```

- **`~/.agents/skills/<skill-name>/`**: Any directory containing a `SKILL.md` file is treated as a shared skill and linked into every detected agent's `skills/` directory.
- **`~/.agents/mcp.json`**: Optional declarative manifest defining your shared MCP servers.
- **`~/.agents/backups/`**: Point-in-time snapshots created automatically before synchronization or manually via `agent-commons backup`.

---

## Declarative MCP Manifest (`~/.agents/mcp.json`)

Define your MCP servers once in `~/.agents/mcp.json`. You can use environment variable placeholders (`${ENV_VAR}`), filter target agents via `agents` / `excludeAgents`, and define per-agent argument overrides via `agentOverrides`:

```json
{
  "mcpServers": {
    "serena": {
      "type": "stdio",
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--context",
        "ide"
      ],
      "startupTimeoutSec": 120,
      "toolTimeoutSec": 180,
      "agentOverrides": {
        "claude-code": {
          "args": [
            "--from",
            "git+https://github.com/oraios/serena",
            "serena",
            "start-mcp-server",
            "--context",
            "claude-code"
          ]
        },
        "codex": {
          "args": [
            "--from",
            "git+https://github.com/oraios/serena",
            "serena",
            "start-mcp-server",
            "--context",
            "codex"
          ]
        }
      }
    },
    "context-mode": {
      "type": "stdio",
      "command": "context-mode",
      "args": []
    },
    "github": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      }
    }
  }
}
```

### How Agent Commons Translates MCP Formats

- **Standard JSON (`mcpServers`)** — Claude Code, Cursor, Gemini CLI, Gemini Config, Gemini Antigravity, Kiro, MiniMax:
  Surgically updates only target entries inside the `"mcpServers"` object while preserving existing keys (`permissions`, `hooks`, `theme`, etc.), indentation, BOM, and line endings.
- **OpenCode JSON / JSONC (`mcp`)** — OpenCode (`~/.config/opencode/opencode.json` or `opencode.jsonc`):
  Uses AST-guided in-place editing (`jsonc-parser`) to translate each server to `{ "type": "local", "command": ["cmd", ...args], "enabled": true, "environment": { ... } }` (or `"type": "remote"` for URL servers) while preserving `//` and `/* */` comments, inline comments, trailing commas, custom indentation, BOM, and CRLF/LF line endings.
- **Codex TOML (`[mcp_servers.<name>]`)** — OpenAI Codex (`~/.codex/config.toml`):
  Inserts or updates `[mcp_servers.<name>]` and `[mcp_servers.<name>.env]` sections in-place without disturbing `#` comments, `[projects.*]` sections, or top-level TOML settings.

---

## CLI Commands & Real Output Examples

### 1. `agent-commons doctor`

Runs a read-only diagnostic of your OS link capability, central `~/.agents/` directory, and all 17 agents (checking for broken links, diverged skill copies, and corrupted MCP files).

```text
$ agent-commons doctor
=== Agent Commons Doctor ===
OS / Arch          : win32 / x64
Home Directory     : C:\Users\alice
Central Skills Dir : C:\Users\alice\.agents\skills (exists, 2 skills)
Central MCP Config : C:\Users\alice\.agents\mcp.json (exists, valid, 3 servers)
Link Capability    : OK (junction) - NTFS junctions work without elevation

Installed Agents   : 3 / 17
Healthy            : yes

--- Installed Agents ---
  [OK] Claude Code (claude-code)
       Skills: C:\Users\alice\.claude\skills (linked: 2, local: 0, broken: 0, diverged: 0)
       MCP   : C:\Users\alice\.claude.json [standard-json] (exists, valid, 3 servers)
  [OK] OpenAI Codex (codex)
       Skills: C:\Users\alice\.codex\skills (linked: 2, local: 0, broken: 0, diverged: 0)
       MCP   : C:\Users\alice\.codex\config.toml [codex-toml] (exists, valid, 3 servers)
  [OK] Cursor (cursor)
       Skills: C:\Users\alice\.cursor\skills (linked: 2, local: 0, broken: 0, diverged: 0)
       MCP   : C:\Users\alice\.cursor\mcp.json [standard-json] (exists, valid, 3 servers)
```

### 2. `agent-commons list`

Displays all central skills, central MCP servers, installed agent inventories, and available backup snapshots.

```text
$ agent-commons list
=== Agent Commons Inventory ===

Central Skills (2) in C:\Users\alice\.agents\skills:
  - frontend-nextjs (SKILL.md: yes)
  - security-review (SKILL.md: yes)

Central MCP Servers (3) in C:\Users\alice\.agents\mcp.json:
  - serena [stdio] cmd="uvx"
  - context-mode [stdio] cmd="context-mode"
  - github [stdio] cmd="docker"

Installed Agents (3 / 17):
  * Claude Code (claude-code) [Capabilities: Skills, MCP]
    Skills (2):
      - frontend-nextjs [linked-central]
      - security-review [linked-central]
    MCP Servers (3): serena, context-mode, github
```

### 3. `agent-commons sync --dry-run`

Simulates synchronization and prints every planned link creation, repair, conflict, or MCP merge without modifying the disk.

```text
$ agent-commons sync --dry-run
=== Agent Commons Sync (DRY-RUN) ===
Timestamp : 2026-10-29T11:45:00.000Z

--- Skills Actions (2) ---
  [CREATE] claude-code / frontend-nextjs: Will link to central skill (C:\Users\alice\.agents\skills\frontend-nextjs)
  [CREATE] claude-code / security-review: Will link to central skill (C:\Users\alice\.agents\skills\security-review)

--- MCP Actions (3) ---
  [CREATE] claude-code / serena: Will add MCP server 'serena'
  [CREATE] claude-code / context-mode: Will add MCP server 'context-mode'
  [CREATE] claude-code / github: Will add MCP server 'github'

Summary:
  Skills : +2 created, ~0 repaired, ^0 adopted, =0 unchanged, !0 conflicts, x0 errors
  MCP    : +3 added, ~0 updated, =0 preserved, !0 conflicts, x0 errors
```

### 4. `agent-commons sync`

Synchronizes central skills and MCP servers across all installed agents. Creates an automatic pre-sync snapshot before modifying any path.

```bash
# Standard safe synchronization
agent-commons sync

# Adopt unique local physical skills from agents into ~/.agents/skills/
agent-commons sync --adopt

# Backup and replace diverged physical skills or conflicting MCP entries
agent-commons sync --force

# Sync only skills or only MCP servers for specific agent(s)
agent-commons sync --skills-only --agent cursor
agent-commons sync --mcp-only --agent codex
```

### 5. `agent-commons backup` & `agent-commons restore`

Creates and restores full point-in-time snapshots in `~/.agents/backups/<snapshot-id>`.

```bash
# Create an explicit snapshot
agent-commons backup

# List available snapshots
agent-commons restore --list

# Restore the most recent snapshot
agent-commons restore

# Restore a specific snapshot by ID
agent-commons restore snapshot-20261029-114500-a1b2c3
```

---

## Verified Compatibility Matrix (17 Agents)

Agent Commons only declares support for integrations that are implemented and verified by automated tests.

| Agent ID | Agent Name | Detection Path | Skills Path | Skills Sync | MCP Config Path | MCP Format |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| `claude-code` | Claude Code | `~/.claude` or `~/.claude.json` | `~/.claude/skills` | Yes | `~/.claude.json` | `standard-json` (`mcpServers`) |
| `codex` | OpenAI Codex | `~/.codex` | `~/.codex/skills` | Yes | `~/.codex/config.toml` | `codex-toml` (`[mcp_servers.*]`) |
| `cursor` | Cursor | `~/.cursor` | `~/.cursor/skills` | Yes | `~/.cursor/mcp.json` | `standard-json` (`mcpServers`) |
| `gemini-cli` | Gemini CLI | `~/.gemini` | `~/.gemini/skills` | Yes | `~/.gemini/settings.json` | `standard-json` (`mcpServers`) |
| `gemini-config` | Gemini Config | `~/.gemini/config` | `~/.gemini/config/skills` | Yes | `~/.gemini/config/mcp_config.json` | `standard-json` (`mcpServers`) |
| `gemini-antigravity` | Gemini Antigravity | `~/.gemini/antigravity` | `~/.gemini/antigravity/skills` | Yes | `~/.gemini/antigravity/mcp_config.json` | `standard-json` (`mcpServers`) |
| `opencode` | OpenCode | `~/.opencode` or `~/.config/opencode` | `~/.opencode/skills` | Yes | `~/.config/opencode/opencode.json(c)` | `opencode-jsonc` (`mcp`) |
| `minimax` | MiniMax | `~/.minimax` | `~/.minimax/skills` | Yes | `~/.minimax/mcp.json` | `standard-json` (`mcpServers`) |
| `kiro` | Kiro | `~/.kiro` | `~/.kiro/skills` | Yes | `~/.kiro/settings/mcp.json` | `standard-json` (`mcpServers`) |
| `cline` | Cline | `~/.cline` | `~/.cline/skills` | Yes | *Not managed (Skills-only)* | — |
| `roo-code` | Roo Code | `~/.roo` | `~/.roo/skills` | Yes | *Not managed (Skills-only)* | — |
| `continue` | Continue | `~/.continue` | `~/.continue/skills` | Yes | *Not managed (Skills-only)* | — |
| `hermes-home` | Hermes (`~/.hermes`) | `~/.hermes` | `~/.hermes/skills` | Yes | *Not managed (Skills-only)* | — |
| `hermes-appdata` | Hermes (AppData / Share) | `<AppData>/hermes` | `<AppData>/hermes/skills` | Yes | *Not managed (Skills-only)* | — |
| `kimi` | Kimi | `~/.kimi-work` | `~/.kimi-work/skills` | Yes | *Not managed (Skills-only)* | — |
| `aider-desk` | Aider Desk | `~/.aider-desk` | `~/.aider-desk/skills` | Yes | *Not managed (Skills-only)* | — |
| `grok` | Grok | `~/.grok` | `~/.grok/skills` | Yes | *Not managed (Skills-only)* | — |

> Note: On Windows, `<AppData>` resolves to `%LOCALAPPDATA%` (`~\AppData\Local`). On macOS, it resolves to `~/Library/Application Support`. On Linux, it resolves to `~/.local/share`.

---

## Cross-Platform Link & Backup Architecture

### Windows, Linux, and macOS Link Mechanics

- **Windows (`win32`)**: Creates directory links using Node's `'junction'` type (`fs.symlinkSync(target, linkPath, 'junction')`). NTFS junctions do not require Administrator privileges or Developer Mode.
- **Linux & macOS (`linux`, `darwin`)**: Creates standard POSIX directory symbolic links (`fs.symlinkSync(target, linkPath, 'dir')`).
- **Safe Link Detachment**: When updating or removing a link, Agent Commons inspects `fs.lstatSync(path)` first and detaches only the link entry itself, never recursing into the target directory.

### Transactional Backup & Restore

- Before `agent-commons sync` mutates any file or directory, a `SnapshotSession` is initialized under `~/.agents/backups/snapshot-<timestamp>-<id>/`.
- Every modified MCP configuration file, replaced physical directory, or re-pointed link is recorded in `manifest.json` along with its original payload.
- If an unhandled exception occurs mid-sync, Agent Commons automatically invokes `session.restore()` to roll back all changes made during that session.
- Snapshots validate all target paths against the active home directory during restore to prevent path-traversal attacks from tampered manifests.

---

## Comparison with Existing Tools

| Feature | **Agent Commons** (`v0.1.0`) | `agent-sync` | `skills-sync` | `skill-buddy` | `agentbridge` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Scope** | Local CLI (Skills + MCP) | Git/Cloud config sync | Skills sync | Skills manager | Multi-agent bridge |
| **Supported Agents** | **17 registered (sandbox-tested)** | ~4–6 | ~4–6 | ~3–5 | ~4–6 |
| **Windows Junctions (No Admin)** | **Yes (`junction`)** | Partial / Symlinks | Symlinks / Copy | Copy / Symlinks | Partial |
| **MCP Multi-Dialect Merge** | **JSON + JSONC (comments kept) + TOML** | JSON only | No | No | JSON only |
| **SHA-256 Skill Conflict Detection** | **Yes** | No | Basic | Basic | No |
| **Automatic Rollback & Snapshots** | **Yes** | Git-based | No | No | No |
| **Runtime Dependencies** | **1 (`jsonc-parser`, 0 transitive)** | Multiple npm pkgs | Multiple npm pkgs | Multiple npm pkgs | Multiple npm pkgs |

---

## Known Limitations (`v0.1.0`)

1. **Skills-Only Agents**: 8 of the 17 registered agents (`cline`, `roo-code`, `continue`, `hermes-home`, `hermes-appdata`, `kimi`, `aider-desk`, `grok`) are currently managed for Skills synchronization only; their internal or extension-managed MCP settings are not modified by `v0.1.0`.
2. **Validation Scope**: All 17 agent directory layouts and configuration dialects are verified via automated cross-platform sandbox tests (Windows, Linux, macOS) and real-world configuration structures inspected during audit (`claude-code`, `codex`, `cursor`, `gemini-cli`, `gemini-config`, `gemini-antigravity`, `opencode`, `minimax`, `kiro`); Agent Commons does not spawn or invoke third-party proprietary agent binaries during CI.
3. **Same-Volume NTFS Junctions / Network Shares**: NTFS junctions on Windows require a filesystem that supports reparse points. If `~/.agents/skills/` is hosted on a non-NTFS network share (SMB/WebDAV) that does not support reparse points, link creation will report an explicit error in `doctor` and `sync`.

---

## Development & Testing

All automated tests run in isolated temporary sandboxes (`os.tmpdir()`) and never touch your real home directory:

```bash
npm run typecheck
npm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines and [SECURITY.md](./SECURITY.md) for our security policy.

---

## License

Released under the [MIT License](./LICENSE).
