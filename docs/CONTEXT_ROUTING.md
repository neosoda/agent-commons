# Lightweight skill routing (inspired by ECC)

Agent Commons already has safe central storage, saved per-agent profiles and
explicit synchronization. This feature adds **offline task-based discovery**.
It deliberately does **not** install ECC, import its large agent catalog,
auto-run hooks, start subagents or change any native Codex/Claude configuration.

## Usage

```bash
# Read only the smallest useful metadata shortlist (default: max 3, ~2400 token budget)
agent-commons context "review TypeScript security"

# Focus on skills permitted by an existing saved profile for Codex
agent-commons context "review the API" --agent codex --limit 2 --budget 800

# Only when you actually need full SKILL.md text:
agent-commons context "test the API" --expand --budget 4000 --json
```

The results use existing **physical** `~/.agents/skills/<id>/SKILL.md`
files and catalog tags/description where available. A profile is an optional
allowlist. An agent without a saved profile can search the central library.

Only skills with overlapping task keywords are recommended; a zero-match query
stays empty. Ranking is deterministic, local and cheap, **not LLM semantic
search**. Each skill's full instructions are returned only with `--expand`,
if its whole estimated size fits the budget. Skills over 256 KiB are never
expanded. Nothing executes, is copied, installed, uploaded or pushed into an
agent's prompt automatically.

**Token budget is an approximation, not a guaranteed provider limit.**
We estimate UTF-8 bytes / 4 and include a metadata allowance. Real tokenizers,
agent-managed skill discovery and tool calls may consume more; this command
cannot measure or control Claude Code/Codex's native background overhead.

A good workflow: search locally, inspect the shortlist, and explicitly load
only the selected skills when needed. Keep normal per-agent sync selective via
`profiles` or `sync --skill` to avoid exposing an oversized catalog.
No third-party ECC content is copied; these are independent design ideas,
inspired by [affaan-m/ECC](https://github.com/affaan-m/ECC) (MIT).


## Smart Skill Router (extended, November 2026)

The existing `context` command is retained for backward compatibility.
The `skills` interface adds offline catalog discovery, absent-skill suggestions,
explicit on-demand loading, and dependency metadata.

```bash
agent-commons skills route "Audite la sécurité de mon application" --json
agent-commons skills route --explain "Refonds l'interface UX/UI"
agent-commons skills load security-review --json
agent-commons skills load anatomy --resource references/guide.md
agent-commons skills deps chief-of-staff --json
```

Routing returns **metadata only**: the `available` count, `selected` locally
installed skills, `loaded: []`, and a small list of `absent` catalog matches.
Loading is a separate explicit operation on a **physical local file**.
No skill scripts are executed. A client/orchestrator may call route and load
through CLI JSON or exported TypeScript functions; the client is responsible
for deciding whether and how to pass content to the agent. Agent Commons
cannot inject instructions automatically into native Codex, Claude Code,
Gemini CLI or Antigravity sessions. CLI and TS API work with Node 22+ on
Windows, Linux and macOS; no standalone MCP server or client hook is installed.

Optional local configuration: `~/.agents/skill-router.json`

```json
{
  "enabled": true,
  "mode": "automatic",
  "maxSelectedSkills": 3,
  "maxLoadedSkills": 3,
  "maxSkillContextTokens": 4000,
  "progressiveLoading": true,
  "allowRemoteExecution": false,
  "autoInstall": false,
  "explainSelection": true
}
```

"Automatic" means **automatic metadata ranking**, never automatic execution,
installation, native synchronization or prompt injection. "Manual" requires
explicit `manualSelection` via the TS API. No LLM, vector DB, extra server,
external API, new npm dependency or catalog modification is required.
An in-process cache stores short local skill descriptions only.
Dependency reporting is bounded and never recursively loads dependencies.

Symlinks/junctions, path traversal, oversized files and unsafe configuration
values are rejected. External skill text is **untrusted** and cannot supersede
the agent's security policy. Token usage is estimated as UTF-8 bytes / 4,
not provider-measured usage. Oversized files are refused, not silently
truncated. No user prompts, secrets or private paths are written into logs.
Even a catalog of thousands of skills never injects all SKILL.md files.
