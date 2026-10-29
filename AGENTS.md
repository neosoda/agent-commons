# Agent Commons — AI contributor instructions

**Before doing any work:** read [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) in full. It contains the current architecture, safety decisions, PR/CI status (time-stamped), prioritized backlog and a reusable resumption prompt. Then independently verify the **live** GitHub and worktree state: never assume the handoff's snapshot is still current.

1. Inspect `git status`, branch and pending user changes before switching branches or modifying files. Never erase uncommitted work.
2. Keep the application local-first. Do not expose the unauthenticated Skill Hub outside `127.0.0.1`, leak credentials or private paths, or make destructive actions implicit.
3. Prefer the existing CLI/core modules for skill, MCP, snapshot and filesystem operations. Preserve unmanaged local files and Windows junction semantics.
4. Run `npm ci`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high` and `npm pack --dry-run`. For changed UI/release logic, also require the Chromium and Windows portable GitHub workflows.
5. Merge only after **all six** Windows/Ubuntu/macOS × Node 22/24 CI jobs, Chromium and Windows portable jobs pass on the PR's **exact head SHA**. Confirm new `main` CI after merge.
6. Never claim a release, Windows asset, npm publication or permission exists until verified at its source. Account-authenticated npm Trusted Publisher settings may require maintainer action.
7. At the end of every session, update `PROJECT_HANDOFF.md` with concise *actual* state, completed tasks, blockers, references and the next concrete action. Commit/push that update through the normal reviewed branch process.

The user-facing product introduction remains in [README.md](README.md). Avoid duplicating it here.
