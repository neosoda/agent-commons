<div align="center">

<img src="docs/assets/agent-commons-hero.svg" alt="Agent Commons — one home for skills, one manifest for tools, every coding agent in sync" width="100%" />

<br />

[![CI](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml/badge.svg)](https://github.com/neosoda/agent-commons/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/neosoda/agent-commons?label=release&color=7c83ff)](https://github.com/neosoda/agent-commons/releases)
[![Node 22+](https://img.shields.io/badge/node-22%2B-75D7C9?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MIT license](https://img.shields.io/github/license/neosoda/agent-commons?color=91A0FF)](LICENSE)
[![Windows · macOS · Linux](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-263550)](#compatibility)

**The local-first home for your AI coding agents.**  
Share skills, keep MCP configurations in sync, and protect existing setups.

[**Get started**](#quick-start) · [How it works](#how-it-works) · [Compatibility](#compatibility) · [Safety](#designed-to-be-safe) · [Contribute](CONTRIBUTING.md)

</div>

---

## Stop configuring the same thing seventeen times.

Claude Code, Codex, Cursor, Gemini, OpenCode and other coding agents all want their own skills and tools. Agent Commons gives them **a shared source of truth**—without forcing you to abandon their native configurations.

| 🧩 **One skills library** | 🔌 **One MCP manifest** | 🛟 **A way back** |
|:--|:--|:--|
| Reuse the same `SKILL.md` folders through filesystem links—no needless copies. | Add shared servers to each supported agent's native JSON, JSONC or TOML configuration. | Preview changes, keep conflicts intact, capture snapshots and restore previous state. |

**At a glance:** 17 registered agent environments · 9 with Skills + MCP adapters · 8 with Skills synchronization · Windows, macOS and Linux CI.

> [!NOTE]
> **Publication status:** Source and GitHub releases are available today. The npm package `@neosoda/agent-commons` has **not yet been published**. Use the source instructions below; `npx @neosoda/agent-commons` will work only after the first npm release. The `main` branch also includes fixes newer than the latest tagged release.

## Quick start

**Requirements:** Node.js **22+**, npm, and Git.

~~~bash
git clone https://github.com/neosoda/agent-commons.git
cd agent-commons
npm ci
npm run build

# Inspect your environment — no agent configuration changes
node dist/cli/index.js doctor
node dist/cli/index.js list

# Preview every planned synchronization
node dist/cli/index.js sync --dry-run
~~~

When the preview looks right, take a baseline backup and apply:

~~~bash
node dist/cli/index.js backup
node dist/cli/index.js sync
~~~

**New to Agent Commons?** Start with only one agent, using `sync --dry-run --agent codex` (replace `codex` with your agent's ID). The `--home <path>` flag lets you test against a separate home directory first.

## How it works

~~~mermaid
flowchart TB
    A["~/.agents/skills/<br/>Shared SKILL.md folders"] --> C["Agent Commons"]
    B["~/.agents/mcp.json<br/>Shared MCP definitions"] --> C
    C --> D["Claude Code"]
    C --> E["Codex"]
    C --> F["Cursor"]
    C --> G["Gemini / Antigravity"]
    C --> H["OpenCode + others"]
    C -. "Backups before changes" .-> I["~/.agents/backups/"]
~~~

**Skills** use NTFS directory junctions on Windows and directory symlinks on macOS/Linux. Agent Commons compares physical copies before replacing them with links. If a local copy differs, it is left untouched unless you explicitly use `--force`.

**MCP** is different: Agent Commons **merges individual servers** into native config files rather than linking whole files together. It preserves unrelated settings and existing server definitions; conflicts require an explicit `--force`.

### 1. Create your shared library

Each skill is a physical directory containing a `SKILL.md` file.

~~~text
~/.agents/
├── skills/
│   ├── code-review/
│   │   └── SKILL.md
│   └── security-check/
│       └── SKILL.md
├── mcp.json
└── backups/
~~~

Already have unique local skills scattered between agents? `sync --adopt` can copy them into the common library and replace those original folders with links. **Preview it first** with `sync --adopt --dry-run`.

### 2. Declare MCP servers once

Create `~/.agents/mcp.json`:

~~~json
{
  "mcpServers": {
    "my-local-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server.js"],
      "agents": ["claude-code", "codex", "cursor"]
    }
  }
}
~~~

This is an **example**, not a bundled server. Replace the path with an MCP server you already have installed.

Agent Commons handles the destination dialect:

| Agent format | Example destination | Behavior |
|---|---|---|
| **JSON** | `~/.claude.json`, `~/.gemini/settings.json` | Merge into `mcpServers` |
| **JSONC** | `~/.config/opencode/opencode.jsonc` | Merge into `mcp`, preserving comments and formatting |
| **TOML** | `~/.codex/config.toml` | Merge `[mcp_servers.<name>]` sections |

You can also use `excludeAgents`, `agentOverrides` and environment placeholders such as `${MY_API_TOKEN}`. **Placeholders are preserved, not a secret vault**—configure credentials securely in the target environment and never commit real credentials to your shared manifest.

### 3. Preview, sync, recover

~~~bash
# Inspect
node dist/cli/index.js doctor
node dist/cli/index.js sync --dry-run

# Make a baseline snapshot, then synchronize
node dist/cli/index.js backup
node dist/cli/index.js sync

# Inspect or restore snapshots
node dist/cli/index.js restore --list
node dist/cli/index.js restore snapshot-<id>
~~~

`restore` replaces the currently managed paths with their saved state. Review the target snapshot before running it: **restoration is a mutating operation**.

## Explore Skills — public Skill Hub

**7 upstream skills** currently have verified source and license references. Browse them directly on GitHub in the [public Skills index](docs/skills/README.md).

```bash
node dist/cli/index.js catalog list
node dist/cli/index.js catalog search playwright
node dist/cli/index.js catalog info skill-creator
node dist/cli/index.js catalog list --category ai-automation
node dist/cli/index.js catalog list --source github --license Apache-2.0
```

All browsing is **offline** using [catalog/skills.json](catalog/skills.json); `--json` also works. An `INSTALLED` marker indicates a matching local skill in your shared library.

**Safety boundary:** Only metadata and pinned upstream references are published—not copies of authors' skills. Source and license references have been inspected; executable scripts **have not** been security-audited. `catalog install` and `catalog update` deliberately **refuse to run** until a safe installer/rollback design is validated.

The separate `catalog` / `catalog --json` commands still inventory your **local private library**, using lockfile provenance if available. Do **not** commit those local reports without review. The personal 136-skill library is not bundled or published by this project; upstream source references are reviewed individually.

See [catalog policy](docs/SKILL_CATALOG.md) and [categories](catalog/categories.json).

---

## Local skill provenance inventory

Agent Commons can now **inventory the actual skills installed in your shared library** and look up their origins in the existing Vercel Skills lockfile (`~/.agents/.skill-lock.json`; legacy `skills-lock.json` is also inspected).

```bash
node dist/cli/index.js catalog
node dist/cli/index.js catalog --json
node dist/cli/index.js catalog review
node dist/cli/index.js catalog review --json
```

**Private review mode** groups every local skill by what needs attention: missing source, absent license claim, mutable/unpinned version, shared upstream path (potential duplicate), or pending human review. Categories are suggested from names but never treated as verified. Nothing is sent to GitHub or executed.

On Windows, store the review **outside the repository**:

```powershell
cd A:\PROJETS\agent-commons
git pull --ff-only
npm ci
npm run build
node dist/cli/index.js catalog review --json > "$env:USERPROFILE\skill-catalog-review.private.json"
```

Review that file locally before deciding which entries can be proposed for the community catalog. It may disclose private project names or repository URLs.

The public catalog accepts reviewed skills with repository-specific paths and pinned license files from GitHub, GitLab and Codeberg. **Local reports are never promoted automatically.**


The report lists skill names, source URLs (where recorded), repository subpaths, pinned refs and **author-declared** license strings. Unknown sources and licenses are explicitly marked **unknown**. Every entry remains **unverified** until a person reviews the original repository and its license.

> [!WARNING]
> **Catalog output is local inventory, not an approved public skill pack.** Lockfile source URLs may reference private repositories. Do not commit the output to GitHub without reviewing every entry. Cataloging a third-party skill does **not** grant permission to redistribute its files or prove that it is safe to execute.

Nothing is downloaded, installed, synchronized or published by `catalog`. See [the catalog policy](docs/SKILL_CATALOG.md) for the intended workflow for a future opt-in public collection.

---

## CLI reference

| Command | Purpose |
|---|---|
| `doctor` | Diagnose detected agents, links and MCP configurations |
| `catalog list` / `catalog search <term>` | Browse the offline public Skill Hub |
| `catalog info <id>` | View upstream source, license and installed status |
| `catalog` / `catalog --json` | Inspect the local private skill inventory (read-only) |
| `catalog review [--json]` | Find missing provenance, license claims, unpinned versions and possible duplicates locally |
| `list` | Inventory skills, MCP servers, agents and snapshots |
| `sync --dry-run` | Show planned changes without modifying agent configurations |
| `sync` | Synchronize compatible installed agents |
| `sync --adopt` | Import unique local skills into the shared library |
| `sync --force` | Resolve differing copies/conflicting servers by replacing them **with backups** |
| `sync --agent codex` | Synchronize only the named agent (repeat `--agent` for more) |
| `sync --skills-only` / `sync --mcp-only` | Restrict the operation to one feature |
| `backup` | Make a manual snapshot |
| `restore --list` | List available snapshots |
| `restore <snapshot-id>` | Restore a selected snapshot |
| `list --json` / `doctor --json` | Machine-readable reports |
| `--home <path>` | Operate against an alternative user home |

Use `node dist/cli/index.js --help` for the full help, or `node dist/cli/index.js sync --help` for command-specific options. Once npm publishing is enabled, these commands will also be available through the `agent-commons` executable.

## Compatibility

**17 registered environments** in the source registry. This means their paths and file formats have automated coverage—not that their proprietary applications are launched and end-to-end verified in CI.

### Skills + MCP (9)

| Environment | Skills | MCP |
|---|:---:|---|
| Claude Code | ✓ | JSON |
| OpenAI Codex | ✓ | TOML |
| Cursor | ✓ | JSON |
| Gemini CLI | ✓ | JSON |
| Gemini Config | ✓ | JSON |
| Gemini Antigravity | ✓ | JSON |
| OpenCode | ✓ | JSON/JSONC |
| MiniMax | ✓ | JSON |
| Kiro | ✓ | JSON |

### Skills only (8)

| Environment | Support |
|---|---|
| Cline · Roo Code · Continue · Kimi | Skills |
| Hermes (home and AppData installations) | Skills |
| Aider Desk · Grok | Skills |

MCP for skills-only environments is **not yet implemented**. Actual agent directory layouts can change between vendor versions; please [open an issue](https://github.com/neosoda/agent-commons/issues) if detection or integration needs updating.

## Designed to be safe

- **Local-first.** No account, background daemon, telemetry or network routing is required for synchronization. Building from source and installing npm packages still use their usual package registries.
- **Non-destructive defaults.** Existing divergent skill folders and conflicting MCP definitions are preserved until you opt into `--force`.
- **Careful config editing.** JSONC comments, indentation and line endings are preserved during supported edits. Corrupted configurations are reported instead of overwritten.
- **Recoverable changes.** Mutating sync operations record per-path snapshots and attempt rollback after errors. Restore now preflights entries and expected backup payloads before destructive changes in the current source.
- **Windows-friendly.** Junctions avoid requiring Developer Mode or Administrator rights on compatible local filesystems. Some network filesystems cannot create them.
- **No bundled third-party skills.** Agent Commons distributes the sync engine, **not** someone else's skill library.

> [!CAUTION]
> A filesystem synchronizer can replace files. Always inspect `sync --dry-run`, keep an independent backup of important agent configurations, and treat `--force` and `restore` as deliberate changes. This project is pre-1.0 software.

## Development

~~~bash
npm ci
npm run typecheck
npm test
npm pack --dry-run
~~~

CI runs on **Windows, macOS and Ubuntu** with **Node.js 22 and 24**. Tests use isolated temporary homes; the registered agent adapters are tested without starting proprietary agents.

Want to help? See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), the [changelog](CHANGELOG.md), or [open an issue](https://github.com/neosoda/agent-commons/issues). We welcome reproducible bug reports, additional adapter tests and documentation fixes.

---

<div align="center">

**One source of truth. Less configuration drift. More time building.**

Made by [@neosoda](https://github.com/neosoda) · [MIT licensed](LICENSE) · [Releases](https://github.com/neosoda/agent-commons/releases)

</div>
