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
