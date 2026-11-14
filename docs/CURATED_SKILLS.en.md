# Three additional Agent Commons skill sources

As of **November 14, 2026**. Catalog references never install third-party skills automatically.

## Chief of Staff — Matt Pocock

[Pinned source](https://github.com/mattpocock/skills/tree/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/in-progress/chief-of-staff) · [MIT license](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/LICENSE)

This **experimental** (`skills/in-progress`) skill manages long-running objectives with subagents, durable notes, retrospectives and tracking. It uses four relative sibling skills: `../retro`, `../to-spec`, `../to-tickets`, `../implement-spec`. All four are now independently cataloged, **not auto-installed**. Workflows may require Claude Code features, an issue tracker, or additional skills such as `writing-for-agents` and `setup-matt-pocock-skills`.

```bash
agent-commons catalog install chief-of-staff
agent-commons catalog install retro
agent-commons catalog install to-spec
agent-commons catalog install to-tickets
agent-commons catalog install implement-spec
# After review: use --yes per skill, then selectively sync
```

## Anatomy — Ryan (wheresryan22)

[Pinned source](https://github.com/wheresryan22/anatomy/tree/1482e8469b0a9e0d8cc18ea2740a01423d29ae80) · [MIT license](https://github.com/wheresryan22/anatomy/blob/1482e8469b0a9e0d8cc18ea2740a01423d29ae80/LICENSE)

Builds interactive isometric SVG/WebGL/3D figures to explain technical ideas. The complete upstream repository has **173 files (~27.6 MB)**, exceeding existing installer limits. The curated **126-file source-only subset (~1.9 MiB)** includes `SKILL.md`, `LICENSE`, `agents/`, `kit/`, `references/`, `scripts/` and source examples. Generated PDF/HTML and captures are excluded. Some upstream instructions reference those generated demos; the source build scripts are included but must be invoked separately.

```bash
agent-commons catalog info anatomy
agent-commons catalog install anatomy
agent-commons catalog install anatomy --yes
agent-commons catalog verify anatomy
agent-commons sync --skill anatomy --agent codex --dry-run
agent-commons sync --skill anatomy --agent codex
```

## Marketing Psychology — Corey Haines

[Pinned source](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/marketing-psychology) · [MIT license](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/LICENSE)

Uses mental models and ethical persuasion for marketing decisions. Can read existing project marketing context at `.agents/product-marketing.md`.

```bash
agent-commons catalog install marketing-psychology
agent-commons catalog install marketing-psychology --yes
agent-commons sync --skill marketing-psychology --agent claude-code --dry-run
```

## Existing protections

Optional `installPaths` enables a validated subset of files or directories from a **pinned GitHub commit**. All selectors must be safe, present in the pinned tree and include `SKILL.md`. Existing **150 file / 8 MiB total / 1 MiB per file** limits remain intact. Excluded files are never downloaded; selected linked or unsafe paths fail closed. Git blob hashes, pre-install snapshots and no-overwrite semantics remain in place. **Source/license review is not a complete security audit** of third-party skills.

[Full catalog](skills/README.md) · [Catalog policy](SKILL_CATALOG.md)
