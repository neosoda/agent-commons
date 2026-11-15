# Improve — read-only audits and self-contained plans

**Source:** [shadcn/improve](https://github.com/shadcn/improve/tree/cac56e1ebd3c279aa9153616cfeac7b174ab90f9/skills/improve) · **Author:** shadcn · **License:** [MIT](https://github.com/shadcn/improve/blob/cac56e1ebd3c279aa9153616cfeac7b174ab90f9/LICENSE.md) · **Pinned SHA:** `cac56e1ebd3c279aa9153616cfeac7b174ab90f9` · **Reviewed:** 2026-11-15.

This skill audits codebases **read-only** (correctness, security, performance, testing, debt, dependencies, DX, docs, roadmap), vets findings and writes executor-ready plans. It never edits source code; the advisor writes only to `plans/` or `advisor-plans/`. The pinned folder contains `SKILL.md` and three supporting `references/` Markdown files: `audit-playbook.md`, `plan-template.md` and `closing-the-loop.md`.

### Install and invoke

```bash
agent-commons catalog info improve
agent-commons catalog install improve             # preview only
agent-commons catalog install improve --yes       # explicit approval
agent-commons catalog verify improve
agent-commons skills route "audit my codebase" --json # metadata only
agent-commons skills load improve                 # load on request
agent-commons sync --skill improve --agent codex --dry-run
```

Installing and syncing require separate approval. Modes: `/improve quick`, `/improve deep`, `/improve security`, `/improve branch`, `/improve next`, `/improve plan <goal>`, `/improve review-plan <file>`, `/improve reconcile`. Claude Code uses `/improve`; Codex may use `$improve`; Gemini CLI uses native skill discovery.

`execute <plan>` requires a host that can dispatch a **separate executor to an isolated worktree**. The advisor reviews the diff but never commits, pushes or merges. Otherwise hand off plans manually. `--issues` posts only when requested; seek confirmation before exposing sensitive findings on public GitHub issues.

**Limits:** checked source/license metadata is not a full security audit. Catalog discovery does not install, run or audit anything in the user's local projects.
