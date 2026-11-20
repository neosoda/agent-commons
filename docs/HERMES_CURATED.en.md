# Curated Hermes selection: six practical skills, never a bulk load

**Reviewed: 20 November 2026.** Discovery source: [frankxai/awesome-hermes-agent-skills](https://github.com/frankxai/awesome-hermes-agent-skills), an independent **directory**, not one installable pack. Keep its named-job and safety-first selection policy.

## Six pinned catalog references

| Skill | Specific value | Upstream |
|:--|:--|:--|
| `todo-discipline` | Verify task-board state before reporting work complete | [FrankX](https://github.com/frankxai/awesome-hermes-agent-skills) |
| `bounded-orchestration-contract` | Strict delegation scopes, file ownership, review rounds, root verification | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `compaction-survival` | Low-token, durable checkpoints for long-running agents | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `skill-health-audit` | Assess triggers, overlap, context cost and proof before promotion | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `local-inference-tuning` | Hardware-aware private local LLM serving and measured smoke checks | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `skill-inspector` | Manual and optional SkillSpector risk reviews without executing untrusted skill scripts | [NVIDIA](https://github.com/NVIDIA/SkillSpector) |

These are **metadata-only pinned references**, not installations. No third-party source is vendored and no dependency, hook, cron, MCP permission, process or agent config is changed. Exact source paths and MIT/Apache-2.0 license texts were inspected, **not** dynamically tested or comprehensively security-audited. ABVX skills label themselves experimental.

## On-demand usage

```bash
agent-commons catalog search hermes-curated
agent-commons catalog info bounded-orchestration-contract
agent-commons catalog install bounded-orchestration-contract       # no-write preview
agent-commons catalog install bounded-orchestration-contract --yes # after source review
agent-commons catalog verify bounded-orchestration-contract
agent-commons sync --skill bounded-orchestration-contract --agent codex --dry-run
agent-commons sync --skill bounded-orchestration-contract --agent codex
agent-commons skills route "Coordinate coding agents" --json
agent-commons skills load bounded-orchestration-contract --json
```

Synchronize only the approved skill and agent. Do not load all six `SKILL.md` bodies in every session. `skills route` is metadata-only; `skills load` explicitly reads instructions from an **already installed** skill, within its budget. No new cloud requests or silent installations.

**Security:** read the skill and its requested access before installation. `skill-inspector` can invoke NVIDIA SkillSpector when independently available, but no scanner is installed automatically; otherwise it must say it performed manual inspection only. Human confirmation remains mandatory for deployment, deletion, credentials, spending, or public publishing.

## Deliberately excluded

- `coding-agents-superpack`: unnecessary overlapping orchestrator material and a potentially unsafe auto-approval CLI example.
- `ecc-session-guard`: native hooks/scripts would require per-host explicit integration.
- `planning-with-files`: lifecycle hooks and scripts add host-specific complexity; start with existing handoffs and `compaction-survival`.
- `hermes-incident-commander`: automated remediation, service restarts, file cleanup and time-based implied approval are unsuitable for this project's explicit-approval boundaries.
- `hermes-skill-factory` and large catalogs: no uncontrolled generation, promotion or bulk import.

**Attribution:** the curated list is maintained by [Frank Riemer / FrankX](https://github.com/frankxai/awesome-hermes-agent-skills) (MIT). Selected skills are maintained by [Anton Biletskiy-Volokh / ABVX](https://github.com/markoblogo/abvx-agent-skills) (MIT) and [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) (Apache-2.0). Pinned file and license links appear in the [generated index](skills/README.md). No third-party source is copied.

