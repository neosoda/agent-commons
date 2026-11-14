# Collection ECC — intégration sécurisée

Source : [Everything Claude Code](https://github.com/affaan-m/ECC), Affaan Mustafa et contributeurs. Licence : [MIT](https://github.com/affaan-m/ECC/blob/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b/LICENSE). Révision immuable : [`d2ef2680594f9a17526a6e1a2e18b3d242c5d17b`](https://github.com/affaan-m/ECC/commit/d2ef2680594f9a17526a6e1a2e18b3d242c5d17b). Vérification des chemins/licences : 2026-11-14.

**71 skills** sont ajoutés au catalogue natif d'Agent Commons. Les autres composants ECC (hooks, commandes, plugins, scripts d'installation et configuration d'agents) **ne sont pas importés** : nous conservons notre architecture local-first, les contrôles d'accès, les sauvegardes et l'installation sélective.

## Utilisation

```bash
agent-commons catalog search ecc                    # Découverte hors ligne
agent-commons catalog info team-agent-orchestration
agent-commons catalog install team-agent-orchestration # Prévisualisation sans écriture
agent-commons catalog install team-agent-orchestration --yes
agent-commons catalog verify team-agent-orchestration
agent-commons sync --skill team-agent-orchestration --agent codex --dry-run
agent-commons sync --skill team-agent-orchestration --agent codex
```

Adapter `codex` à l'agent détecté (`claude-code`, `gemini-cli`, `gemini-antigravity`, etc.). L'installation et la synchronisation sont **deux actions distinctes, volontaires**. Le Skill Hub permet aussi de rechercher les entrées en local.

## Par besoin

| Utilisation | Skills utiles |
|:--|:--|
| Architecture et agents | `agent-harness-construction`, `agent-architecture-audit`, `team-agent-orchestration`, `operator-approval-loop` |
| Audit et qualité produit | `ai-regression-testing`, `change-impact`, `verification-loop`, `production-audit` |
| Réseau et homelab | `homelab-network-readiness`, `homelab-vlan-segmentation`, `network-config-validation`, `netmiko-ssh-automation` |
| Sécurité / MCP | `agent-security-hardening`, `security-review`, `mcp-dependency-review` |
| UI/UX | `frontend-design-direction`, `frontend-a11y`, `design-system` |
| Documentation | `docs-governance`, `living-docs-governance`, `architecture-decision-records` |

**Sécurité :** les sources sont épinglées et leur structure `SKILL.md` et licence vérifiées ; cela **ne constitue pas un audit de sécurité du contenu**. Lisez les instructions, scripts, commandes et prérequis tiers avant de confirmer l'installation. Certains skills dépendent d'outils propres à Claude Code ou de services externes, non fournis par Agent Commons. Aucune exécution automatique ni suivi implicite de la branche `main` amont. Les politiques et approbations Agent Commons restent prioritaires.

Crédits : [affaan-m/ECC](https://github.com/affaan-m/ECC), © 2026 Affaan Mustafa et contributeurs, licence MIT. L'[index](skills/README.md) détaille chaque source, licence et commit épinglés.
