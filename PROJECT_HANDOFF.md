# Agent Commons — reprise opérationnelle

**État de référence : 28 novembre 2026.** Vérifier les commits, PR et workflows **en direct** avant toute modification ; aucun SHA de ce fichier ne remplace GitHub.

## État prouvé

- Dépôt [neosoda/agent-commons](https://github.com/neosoda/agent-commons), branche `main`.
- Dernière release publique : [`v0.6.1`](https://github.com/neosoda/agent-commons/releases/tag/v0.6.1) publiée le 28/11/2026 sur le tag `v0.6.1` → `2570fabf772548ec678156347525c5eb513c4da4` (PR #129), avec `AgentCommons-win-x64-portable.zip` et `.sha256` vérifiés ([preuve de livraison](docs/releases/v0.6.1.md)). Aucune publication npm.
- `main` est protégé par un ruleset : **11 contrôles requis** (6 tests OS/Node, 3 XERJ réels, Chromium, Windows portable) sur une branche à jour avec `main`. L'auto-merge GitHub est désactivé : fusionner à la main avec `gh pr merge --squash --match-head-commit <sha>`.
- 21 environnements IA reconnus, 212 skills et 11 MCP **référencés** (dont XERJ et Sellbird) ; référencé ≠ installé ≠ opérationnel.
- Gestion/synchronisation skills et MCP, snapshots, Extension Manager et Skill Hub local. Runtime de missions local **expérimental** : correctif Windows 8.3 (PR #117), outils MCP autorisés un par un (environnement par liste blanche), plan/checkpoints, interruption d'outil sur perte de bail/pause/annulation, mémoire SQLite FTS5, file/worker avec état visible dans Mission Control, drain de maintenance transactionnel, avis CLI consultatifs.

## Validation et limites

La CI et les tests simulés ne prouvent **pas** une recette complète Windows 11 + LM Studio + RTX 5070 Ti. Pas de sandbox OS forte : une mission avec `--allow-write` **et** `--allow-tests` peut exécuter du code arbitraire (voir [SECURITY](SECURITY.md)). L'archive Windows portable reste **non signée** (SmartScreen, NVDA et VoiceOver non certifiés). Pas de délégation multi-agent mutante, pas d'interface LAN authentifiée. Aucun déploiement AGENTS01/SentinelBrain n'est attesté par ce dépôt, même si des PR (#121, #122) préparent ce déploiement.

**Sources de vérité :** [CAPABILITIES](docs/CAPABILITIES.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [AGENT_RUNTIME](docs/AGENT_RUNTIME.md) · [SKILLS_AND_MCP](docs/SKILLS_AND_MCP.md) · [SECURITY](SECURITY.md) · [DECISIONS](docs/DECISIONS.md) · [ROADMAP](docs/ROADMAP.md). Guides des intégrations optionnelles : [XERJ](docs/XERJ.md), [Sellbird](docs/SELLBIRD.md), [Claude SEO](docs/CLAUDE_SEO.md).

## Prochaine action concrète

**P0 de la [roadmap](docs/ROADMAP.md) :** réaliser la recette matérielle du moteur de missions dans un worktree Git jetable (Windows 11 + LM Studio + modèle `tool_calls` vérifié + RTX 5070 Ti) et consigner les mesures (latence, RAM/VRAM, tokens, stabilité) dans un rapport daté sous `docs/qa/`.

## Reprise rapide pour un agent neuf

1. Lire `AGENTS.md` puis ce handoff.
2. Examiner `git status`, `main`, les PR ouvertes et leurs contrôles sur le SHA exact.
3. Ouvrir **uniquement** le document spécialisé utile au changement.
4. Travailler sur une branche dédiée, lancer les validations locales, attendre les 11 contrôles requis, fusionner, recontrôler `main`, puis mettre à jour ce handoff si l'état change.

**Historique :** [versions antérieures via Git](docs/archive/INDEX.md), [CHANGELOG](CHANGELOG.md), [releases](docs/releases/) et l'historique des PR GitHub.
