# Find Skills — activation in Agent Commons

The upstream [Find Skills](https://agenticskills.io/skills/find-skills) skill is maintained by
[Vercel Labs](https://github.com/vercel-labs/skills/tree/main/skills/find-skills). It helps an
agent **discover** third-party skills using the broader skills ecosystem. It is
already included as `find-skills` in Agent Commons' reviewed, **metadata-only**
public catalog. That catalog entry is pinned to a full Git commit and links to
the upstream MIT license; being catalogued is **not** the same as being installed.

## Install into the shared library

Run from a machine where Agent Commons is installed, with access to public GitHub:

```powershell
agent-commons catalog info find-skills
agent-commons catalog install find-skills
# Inspect the pinned source, file list and any local conflicts first.
agent-commons catalog install find-skills --yes
agent-commons catalog verify find-skills
```

The first install command is a **read-only preview**. The second explicitly
approves a staged install into `~/.agents/skills/find-skills/`, with the
existing Agent Commons integrity checks, snapshot and no script execution. If
the target already exists, Agent Commons refuses to overwrite it; inspect it
rather than using a forced external installer. Verification is read-only.

## Link only to the agents you choose

```powershell
agent-commons doctor
agent-commons sync --skill find-skills --agent codex --dry-run
agent-commons sync --skill find-skills --agent codex
```

Replace `codex` with an **installed** agent ID such as `claude-code`,
`gemini-cli` or `gemini-antigravity`, or repeat `--agent` to select
multiple agents. These filtered syncs do not modify MCP settings. Run the
preview before applying. Installing the skill does not synchronize it
automatically and does not inject it into a running agent's context.

## How to discover and adopt a new skill

1. Prefer `agent-commons catalog search <keywords>` for reviewed, offline
   discovery. If a reviewed skill is already available, use `catalog info`,
   `catalog install` and a selective `sync`.
2. For a skill **outside** the curated catalog, Find Skills can suggest
   searches via [skills.sh](https://skills.sh/) or `npx skills find <keywords>`
   (requires Node/npm and an approved network/package-execution boundary).
3. Review the actual source, license, maintainer, external commands and
   permissions before importing a new skill. A third-party recommendation is
   not a security audit and does not authorize installation.
4. **Do not automatically execute `npx skills add`, `npx skills update`, or
   global `-g -y` commands** from the upstream skill: they install/update
   outside Agent Commons' pinned-catalog, snapshots and selective-sync flow.
   Submit a reviewed catalog entry first if you want to manage that skill with
   Agent Commons.

No external CLI, hook, autonomous installation or network search is added to
Agent Commons itself. This integration only documents how to activate and use
the **existing** curated skill workflow. It does not install anything on your
PC, and the shipped public catalog remains metadata-only.
