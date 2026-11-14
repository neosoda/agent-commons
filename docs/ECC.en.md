# ECC collection — safe integration

Source: [Everything Claude Code](https://github.com/affaan-m/ECC), Affaan Mustafa and contributors. License: [MIT](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/LICENSE). Immutable revision: [`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b`](https://github.com/affaan-m/ECC/commit/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b). Source/license checks: 2026-11-14.

**71 skills** are now included as references in the native Agent Commons catalog. ECC-specific hooks, commands, plugins, installers and agent configurations **are not imported**: the local-first security model, approvals, backups and selective installation remain intact.

## Usage

```bash
agent-commons catalog search ecc                     # Offline discovery
agent-commons catalog info team-agent-orchestration
agent-commons catalog install team-agent-orchestration # Read-only preview
agent-commons catalog install team-agent-orchestration --yes
agent-commons catalog verify team-agent-orchestration
agent-commons sync --skill team-agent-orchestration --agent codex --dry-run
agent-commons sync --skill team-agent-orchestration --agent codex
```

Choose a detected agent (`codex`, `claude-code`, `gemini-cli`, `gemini-antigravity`, etc.). **Installing and synchronizing are separate, opt-in actions.** You can also browse the local Skill Hub.

## Relevant workflows

| Goal | Suggested skills |
|:--|:--|
| Agent architecture | `agent-harness-construction`, `agent-architecture-audit`, `team-agent-orchestration`, `operator-approval-loop` |
| Product quality | `ai-regression-testing`, `change-impact`, `verification-loop`, `production-audit` |
| Networks and homelab | `homelab-network-readiness`, `homelab-vlan-segmentation`, `network-config-validation`, `netmiko-ssh-automation` |
| Security and MCP | `agent-security-hardening`, `security-review`, `mcp-dependency-review` |
| UX | `frontend-design-direction`, `frontend-a11y`, `design-system` |
| Documentation | `docs-governance`, `living-docs-governance`, `architecture-decision-records` |

**Safety:** sources are pinned; upstream `SKILL.md` paths and licenses were checked. This is **not a security audit of each instruction**. Review commands, scripts and external requirements before installation. Some skills rely on Claude Code-specific features or third-party services that Agent Commons does not supply. No automatic execution or moving-main update. Agent Commons rules and approval gates take precedence.

Credits: [affaan-m/ECC](https://github.com/affaan-m/ECC), © 2026 Affaan Mustafa and contributors, MIT. The [index](skills/README.md) identifies each pinned source and license.
