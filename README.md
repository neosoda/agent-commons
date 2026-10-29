# Agent Commons (`@neosoda/agent-commons`)

[![CI](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml/badge.svg)](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://github.com/neosoda/agent-commons/releases)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Agent Commons** (`@neosoda/agent-commons`, CLI binary `agent-commons`) is a lightweight, local-first CLI that centralizes and synchronizes AI agent **Skills** (`~/.agents/skills/`) and **Model Context Protocol (MCP)** configurations (`~/.agents/mcp.json`) across **17 AI coding environments** on Windows, Linux, and macOS.

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

### Run Instantly via `npx`

```bash
npx @neosoda/agent-commons doctor
npx @neosoda/agent-commons list
npx @neosoda/agent-commons sync --dry-run
```

### Install Globally

```bash
npm install -g @neosoda/agent-commons

# Once installed globally, use the `agent-commons` command directly:
agent-commons doctor
agent-commons list
agent-commons sync --dry-run
```

### Build from Source

```bash
git clone https://github.com/neosoda/agent-commons.git
cd agent-commons
npm ci
npm run build
node dist/cli/index.js doctor
```

---

## Initial Setup (`~/.agents/`)

Agent Commons uses `~/.agents/` in your user home directory as your single source of truth:

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

### 1. Centralizing Skills (`~/.agents/skills/`)

Create `~/.agents/skills/` and place each reusable skill in its own folder containing a `SKILL.md` file:

```bash
mkdir -p ~/.agents/skills/my-skill
```

If your installed agents already have local skill folders that do not exist yet in `~/.agents/skills/`, you can import them automatically into the central library using:

```bash
npx @neosoda/agent-commons sync --adopt
```

### 2. Centralizing MCP Servers (`~/.agents/mcp.json`)

Create `~/.agents/mcp.json` to declare your shared MCP servers once. You can use environment variable placeholders (`${ENV_VAR}`), restrict target agents via `agents` / `excludeAgents`, and define per-agent argument overrides via `agentOverrides`:

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

## Precautions Before Running a Real Synchronization

Before running `sync` without `--dry-run` for the first time, follow this 3-step workflow:

1. **Diagnose your environment (`doctor`)**:
   ```bash
   npx @neosoda/agent-commons doctor
   ```
   Verify that link creation (`ntfs-junction` on Windows or `symlink` on Linux/macOS) is healthy and check whether any existing agent configurations or skill links report issues.
2. **Preview every planned change (`sync --dry-run`)**:
   ```bash
   npx @neosoda/agent-commons sync --dry-run
   ```
   `--dry-run` is strictly read-only. It computes and displays every link creation (`created-link`), identical duplicate replacement (`replaced-identical-copy`), broken link repair (`repaired-link`), conflict skip (`conflict-skipped` / `conflict-preserved`), and MCP addition without touching the disk.
3. **Create an explicit baseline backup (`backup`)**:
   ```bash
   npx @neosoda/agent-commons backup
   ```
   Although `sync` automatically creates a pre-sync snapshot before modifying any path, creating a baseline snapshot gives you a named restore point you can return to at any time via `npx @neosoda/agent-commons restore <snapshot-id>`.

---

## Essential CLI Commands

### 1. `doctor` — Environment & Health Diagnostic

Runs a read-only check of OS link capabilities, `~/.agents/`, and all 17 agents (broken links, diverged skill copies, and corrupted MCP files).

```text
$ npx @neosoda/agent-commons doctor
=== Agent Commons Doctor (v0.1.1) ===
Platform       : win32 (v24.22.1)
Link Strategy  : ntfs-junction (OK)
Commons Root   : C:\Users\alice\.agents
Central Skills : 2 (C:\Users\alice\.agents\skills)
Central MCP    : 3 servers [status: valid]

Agents (3/17 installed):
  * [claude-code       ] Skills: 2 linked, 0 physical (0 conflicts), 0 broken | MCP: valid (3 servers, standard-json)
  * [codex             ] Skills: 2 linked, 0 physical (0 conflicts), 0 broken | MCP: valid (3 servers, codex-toml)
  * [cursor            ] Skills: 2 linked, 0 physical (0 conflicts), 0 broken | MCP: valid (3 servers, standard-json)
```

### 2. `list` — Inventory of Skills, MCP Servers, Agents & Snapshots

```bash
npx @neosoda/agent-commons list
npx @neosoda/agent-commons list --json
```

### 3. `sync --dry-run` — Read-Only Simulation

```text
$ npx @neosoda/agent-commons sync --dry-run
=== [DRY-RUN] Agent Commons Sync ===
Detected Agents : 1
Central Skills  : 2
Central MCP     : 3

Skills Summary  : 0 already synced, 2 action(s)
  [claude-code] frontend-nextjs: created-link - [DRY-RUN] Would create NTFS junction -> C:\Users\alice\.agents\skills\frontend-nextjs
  [claude-code] security-review: created-link - [DRY-RUN] Would create NTFS junction -> C:\Users\alice\.agents\skills\security-review

MCP Summary     : 0 unchanged, 3 action(s)
  [claude-code] serena: added - [DRY-RUN] Would add "serena" to mcpServers.
  [claude-code] context-mode: added - [DRY-RUN] Would add "context-mode" to mcpServers.
  [claude-code] github: added - [DRY-RUN] Would add "github" to mcpServers.

Dry-run complete. No files were modified. Run "agent-commons sync" to apply.
```

### 4. `sync` — Apply Synchronization

```bash
# Safe synchronization (never overwrites diverged skills or conflicting MCP servers)
npx @neosoda/agent-commons sync

# Adopt local-only physical skills from agents into ~/.agents/skills/
npx @neosoda/agent-commons sync --adopt

# Snapshot and overwrite diverged physical skills or conflicting MCP entries
npx @neosoda/agent-commons sync --force

# Target specific agent(s) or scope
npx @neosoda/agent-commons sync --skills-only --agent cursor
npx @neosoda/agent-commons sync --mcp-only --agent codex
```

### 5. `backup` & `restore` — Snapshot Management

```bash
# Create an explicit point-in-time snapshot
npx @neosoda/agent-commons backup

# List available snapshots
npx @neosoda/agent-commons restore --list

# Restore the most recent snapshot
npx @neosoda/agent-commons restore

# Restore a specific snapshot by ID
npx @neosoda/agent-commons restore snapshot-20261029-114500-a1b2c3
```

---

## Compatibility Matrix (17 Registered Agents)

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

| Feature | **Agent Commons** (`v0.1.1`) | `agent-sync` | `skills-sync` | `skill-buddy` | `agentbridge` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Primary Scope** | Local CLI (Skills + MCP) | Git/Cloud config sync | Skills sync | Skills manager | Multi-agent bridge |
| **Supported Agents** | **17 registered (sandbox-tested)** | ~4–6 | ~4–6 | ~3–5 | ~4–6 |
| **Windows Junctions (No Admin)** | **Yes (`junction`)** | Partial / Symlinks | Symlinks / Copy | Copy / Symlinks | Partial |
| **MCP Multi-Dialect Merge** | **JSON + JSONC (comments kept) + TOML** | JSON only | No | No | JSON only |
| **SHA-256 Skill Conflict Detection** | **Yes** | No | Basic | Basic | No |
| **Automatic Rollback & Snapshots** | **Yes** | Git-based | No | No | No |
| **Runtime Dependencies** | **1 (`jsonc-parser`, 0 transitive)** | Multiple npm pkgs | Multiple npm pkgs | Multiple npm pkgs | Multiple npm pkgs |

---

## Known Limitations (`v0.1.1`)

1. **Skills-Only Agents**: 8 of the 17 registered agents (`cline`, `roo-code`, `continue`, `hermes-home`, `hermes-appdata`, `kimi`, `aider-desk`, `grok`) are currently managed for Skills synchronization only; their internal or extension-managed MCP settings are not modified by `v0.1.1`.
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
