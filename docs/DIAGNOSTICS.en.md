# Diagnostics and real verification — `doctor` and `mcp probe`

[Français](DIAGNOSTICS.md)

An MCP server present in a JSON or TOML file is **not** proof that it starts, and a linked skill is not proof that a client loads it. Agent Commons distinguishes four levels:

| Level | Meaning | Tool |
|---|---|---|
| Detected | The client's configuration folder or file exists | `doctor` |
| Installed | The skill is linked / the MCP server is declared in the client config | `doctor`, `list` |
| Reachable | The MCP executable is found, its script exists, the `SKILL.md` is valid for clients | `doctor` (read-only) |
| Working | The server answers the MCP protocol (`initialize`, `tools/list`) and, on request, one tool call | `mcp probe` (explicit execution) |

## `agent-commons doctor` — read-only

Starts no server and writes nothing (except a junction probe in the temp folder). Beyond links and MCP syntax it checks:

- **Prerequisites on PATH**: `node` (22+), `npm`, `npx`, `git`, `uv`, `uvx`, `python`, `docker`. PATH lookup only, nothing is executed.
- **MCP launch targets** of the central manifest and every installed client: command found (PATH + PATHEXT on Windows), absolute executable still present, absolute script (`.js`, `.mjs`, `.py`…) present. Remote HTTP servers are reported as not tested.
- **`SKILL.md` frontmatter**: invalid YAML, missing `name`/`description`, description over 1,024 characters (Codex then refuses the skill). Convention gaps (uppercase name, name differing from folder) are advisories, not errors.
- **Token cost** per agent: estimate of the skill names and descriptions the client loads every session (progressive disclosure: `SKILL.md` bodies are not loaded).

Problems that make a skill or MCP unusable are **warnings** (`warnings` in JSON); `healthy` stays reserved for corrupted state (broken links, unreadable configurations).

```bash
agent-commons doctor
agent-commons doctor --json
```

## `agent-commons mcp probe` — explicit execution

**Actually starts** the selected servers, performs the MCP handshake (`initialize`, `notifications/initialized`, `tools/list`), may call one tool, then stops the process tree. Use it only for servers you trust: the configured command runs. CLI only, never reachable from the web UI.

```bash
# Central manifest (~/.agents/mcp.json)
agent-commons mcp probe
# One client's native configuration
agent-commons mcp probe --agent codex
# One server and a non-destructive tool call
agent-commons mcp probe agent-commons-demo --call echo --arg text=hello
```

`--arg key=value` (repeatable) passes string arguments without JSON quoting, avoiding Windows PowerShell 5.1 quote mangling; `--arguments '<json>'` remains available.

Results: `OK` (handshake succeeded, tool list), `FAIL` (not found, early exit with the relevant stderr line, timeout, missing tool), `AUTH` (HTTP server reachable but requires credentials: **unverified**, not failed). The probe never uses tokens; environment values are passed to the server but never printed.

On Windows, `.cmd`/`.bat` launchers (`npx`, `uvx`…) run through `cmd.exe /d /s /c` with quoted arguments; an argument containing `"`, `%`, `!`, `^` or a newline is refused rather than escaped.

## Secret-free demo MCP server

`agent-commons mcp demo-config` prints an entry ready to paste into `~/.agents/mcp.json` for a dependency-free stdio server (tools `echo` and `time`, no network, no file access). End-to-end path:

```bash
agent-commons mcp demo-config            # paste the entry into ~/.agents/mcp.json
agent-commons sync --mcp-only --dry-run --agent claude-code
agent-commons sync --mcp-only --agent claude-code
agent-commons mcp probe agent-commons-demo --agent claude-code --call echo --arg text=ok
claude mcp list                          # verification by the client itself
```

## Windows specifics observed on a real machine

- **Standard account**: NTFS junctions need neither administrator rights nor Developer Mode. File symlinks require a privilege; Agent Commons does not use them.
- **Long paths**: `git clone` into a path over 260 characters fails without `git config --global core.longpaths true`. Agent Commons handles deep working folders (MCP package installs, restore).
- **Upgraded runtimes**: an MCP entry pointing at an absolute `node.exe` of an old version (for example under `WinGet\Packages\…node-v24…`) stops working after an upgrade; `doctor` reports it. Prefer `node` (resolved through PATH).
- **uv**: required for the Fetch and Git MCP servers (`winget install astral-sh.uv`).
- **Gemini CLI**: MCP servers stay disabled in an untrusted folder; trust the working folder to enable them.
- **Restart**: restart the AI client after a sync so it rereads skills and MCP.
- **Fully undoing a sync**: restore the automatic `pre-sync` snapshot, which also records paths that did not exist before the sync; a manual `backup` only records what existed.
