# Agent Commons — reprise opérationnelle

**État de référence : 22 novembre 2026.** Vérifier les commits, PR et workflows **en direct** avant toute modification ; aucun SHA statique dans ce fichier ne remplace GitHub.

## État prouvé

- Dépôt [neosoda/agent-commons](https://github.com/neosoda/agent-commons), branche cible `main`, point de départ du nettoyage documentaire : `ab19b47598f4036ca10c1639e801c2ac29c13470`.
- Dernière release GitHub publique contrôlée : [`v0.6.0`](https://github.com/neosoda/agent-commons/releases/tag/v0.6.0), publiée le 20/11/2026 ; **elle ne contient pas** les enrichissements runtime des PR #105–#111.
- PR [#105–#111](https://github.com/neosoda/agent-commons/pulls?q=is%3Apr+is%3Amerged) fusionnées dans `main` au 22/11. Le point de départ `ab19b475` possède **6/6 jobs CI + Chromium + Windows portable** réussis.
- 21 environnements IA reconnus, 210 skills et neuf MCP **référencés** ; ces nombres ne prouvent pas leur installation sur une machine.
- Gestion et synchronisation skills/MCP, snapshots, Extension Manager et interface locale présents dans le code. Runtime autonome local **expérimental** : outils MCP approuvés, sélection de skills, plan/checkpoints, SQLite FTS5, file/worker, Mission Control et avis consultatifs CLI.

## Validation et limites

Les tests d'intégration simulés et la CI ne prouvent **pas** une recette complète Windows 11/LM Studio/RTX 5070 Ti. Pas de sandbox OS forte, de délégation mutante à plusieurs agents ou d'authentification d'une interface LAN. Les essais Windows historiques du 17/11 concernaient principalement la synchronisation des clients. Aucune infrastructure SentinelBrain distante n'est attestée par ce dépôt.

**Source de vérité fonctionnelle :** [CAPABILITIES](docs/CAPABILITIES.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [AGENT_RUNTIME](docs/AGENT_RUNTIME.md) · [SKILLS_AND_MCP](docs/SKILLS_AND_MCP.md) · [SECURITY](SECURITY.md). Les décisions stables sont dans [DECISIONS](docs/DECISIONS.md). Les étapes P1–P6 **sont fusionnées**, pas « en cours » ; les preuves matérielles restent ouvertes.

## Prochaine action concrète

**P0 :** recette réelle du moteur dans un worktree Git jetable avec Windows 11 + LM Studio + modèle `tool_calls` + GPU ; confirmer édition autorisée, test, checkpoint/reprise, MCP sélectionné, worker, mémoire et absence de fuite. Relever les mesures et écarts dans un rapport de recette **daté**, puis mettre à jour [CAPABILITIES](docs/CAPABILITIES.md) et [ROADMAP](docs/ROADMAP.md). Ne pas augmenter la surface réseau avant le threat model.

## Reprise rapide pour un agent neuf

1. Lire `AGENTS.md` puis ce handoff.
2. Examiner `git status`, `main`, les PR ouvertes et les checks sur leur SHA exact.
3. Ouvrir **uniquement** le document spécialisé par rapport au changement envisagé.
4. Implémenter sur branche dédiée, exécuter les validations, attendre les huit checks PR, merger si verts ; recontrôler les huit checks `main` ; mettre à jour ce handoff si l'état opérationnel change.

**Historique conservé :** [versions antérieures via Git](docs/archive/INDEX.md), [CHANGELOG](CHANGELOG.md) et [releases](docs/releases/). Pas de nouvelle release créée pour une consolidation de documentation.
