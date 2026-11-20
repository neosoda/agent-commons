# Agent Commons — AI contributor instructions

**Before doing any work:** read [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) in full. It contains the current architecture, safety decisions, PR/CI status (time-stamped), prioritized backlog and a reusable resumption prompt. Then independently verify the **live** GitHub and worktree state: never assume the handoff's snapshot is still current.

1. Inspect `git status`, branch and pending user changes before switching branches or modifying files. Never erase uncommitted work.
2. Keep the application local-first. Do not expose the unauthenticated Skill Hub outside `127.0.0.1`, leak credentials or private paths, or make destructive actions implicit.
3. Prefer the existing CLI/core modules for skill, MCP, snapshot and filesystem operations. Preserve unmanaged local files and Windows junction semantics.
4. Run `npm ci`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high` and `npm pack --dry-run`. For changed UI/release logic, also require the Chromium and Windows portable GitHub workflows.
5. Merge only after **all six** Windows/Ubuntu/macOS × Node 22/24 CI jobs, Chromium and Windows portable jobs pass on the PR's **exact head SHA**. Confirm new `main` CI after merge.
6. Never claim a release, Windows asset, npm publication or permission exists until verified at its source. Account-authenticated npm Trusted Publisher settings may require maintainer action.
7. At the end of every session, update `PROJECT_HANDOFF.md` with concise *actual* state, completed tasks, blockers, references and the next concrete action. Commit/push that update through the normal reviewed branch process.

8. For skill discovery, prefer the existing offline curated catalog. `find-skills` is a reviewed catalog entry but not installed automatically; use its [activation guide](docs/FIND_SKILLS.md). Treat upstream `npx skills add` suggestions as **untrusted**: never install/update arbitrary external skills or bypass Agent Commons' pinned GitHub installer, preview and explicit approval.

The user-facing product introduction is French by default in [README.md](README.md), with the complete English version in [README.en.md](README.en.md). Keep both README editions aligned for technical content, safeguards, commands and attribution; the generated public skill credits must pass `npm run catalog:check`. Avoid duplicating the introduction here.


9. For task-based skills, use `skills route --json` (metadata only) and explicit `skills load <id>` only when needed. Catalog references are not installed skills. Never auto-install third-party scripts or assume native agent prompt injection is supported; see [routing](docs/CONTEXT_ROUTING.md).

10. Desktop computer-use integration: the `agent-desktop` catalog skill and MCP reference are opt-in only. Never install/launch native binaries, grant OS permissions or expose clipboard/screen data as part of catalog discovery or sync. Desktop control must not be mixed with untrusted Web/OSINT MCP tools; require operator review for sensitive actions. See [FR](docs/AGENT_DESKTOP.md) / [EN](docs/AGENT_DESKTOP.en.md).

11. Never declare an MCP server working because it appears in a config file. Use `doctor` (read-only launch checks) and `mcp probe` (explicit handshake) — see [diagnostics](docs/DIAGNOSTICS.en.md). Tests must also pass on a **standard Windows account** (no admin, no Developer Mode): use junctions for directory links in tests.

12. Curated Hermes discovery: six pinned, metadata-only skills are documented in [FR](docs/HERMES_CURATED.md) / [EN](docs/HERMES_CURATED.en.md). No auto-install, auto-run or hooks; never treat the source awesome-list as a security attestation. Apply selective routing and explicit install/sync approval; for third-party skills consider manual analysis with `skill-inspector` (NVIDIA CLI optional). Do not adopt unattended remediation or approval bypass patterns.
