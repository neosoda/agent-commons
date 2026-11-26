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

## Intégration XERJ (23 novembre 2026)

La branche `feat/xerj-native-integration` implémente le raccordement optionnel à XERJ v1.0.0-rc.104 dans le gestionnaire MCP existant. Sources et critères de recette dans [docs/XERJ.md](docs/XERJ.md). **Ne la considérer fusionnée/validée que si la PR et ses contrôles réels sont vérifiés**. Elle ne remplace pas SQLite FTS5, n'installe aucun modèle Query-1/Reader-1 et n'expose pas SentinelBrain au LAN.

## Skill Loop Engineering universel (25 novembre 2026)

La branche `feat/universal-product-engineering` ajoute le skill original [universal-product-engineering](skills/universal-product-engineering/SKILL.md), une référence épinglée au catalogue et le guide d'activation. La V2 ajoute baseline, scorecard, preuves A/B/C/D, anti-oscillation et état persistant léger aux boucles de développement et d'UX/UI anti-slop via les outils autorisés de l'agent ; ce n'est pas un nouveau moteur runtime. Vérifier la PR et ses checks avant de déclarer la disponibilité sur main. L'installation cliente reste explicite.

## Audit produit et correctifs (26 novembre 2026)

Branche `fix/runtime-path-guard-audit-20261126`, partie de `main` `1fe87d8` (8 checks verts). Preuves A sur Windows 11 réel, HOME synthétique :
- **P0 corrigé** : sur NTFS avec noms 8.3, `GIT~1`/`ENV~1` contournaient les chemins protégés du runtime ; une mission `--allow-write` pouvait créer `.git/hooks/pre-commit`. Revérification sous forme canonique, refus des noms finissant par point/espace, erreurs sans chemins absolus. Racines XERJ comparées sous forme canonique, sans casse.
- **Catalogue** : 20 descriptions tronquées ou polluées par du frontmatter réparées ; test de garde ajouté.
- **Skill Hub** : en-tête d'accueil compact (statuts au-dessus de la ligne de flottaison), « agents détectés », « non vérifié » au lieu d'« intact » sans contrôle, agents absents repliés, état du worker dans Mission Control, page Missions traduite en français.
- Local : typecheck, 267/268 tests (1 test XERJ réel ignoré), audit 0, pack, `catalog:check`. Revue adversariale indépendante : aucun contournement ni régression. CI de la PR et fusion **non vérifiées à la rédaction**.

**Backlog restant :** P1 `--allow-write` + `--allow-tests` = exécution de code arbitraire (documenté dans SECURITY, seule une sandbox OS le résout) ; P2 les phrases de déclenchement « Use when… » tronquées ne sont pas restaurées depuis l'amont épinglé (impact possible sur le routage) ; P3 `doctor` ne vérifie pas les fichiers passés en arguments aux commandes MCP.

## Claude SEO (26 novembre 2026)

La branche `feat/claude-seo-integration` ajoute un pack de références épinglé Claude SEO (23 workflows, MIT), un point d'entrée portable et une recette de validation simulée. Voir [docs/CLAUDE_SEO.md](docs/CLAUDE_SEO.md). Aucun script, hook, sous-agent, MCP ou runtime Python n'est installé par le pack. Vérifier la PR et ses checks avant de déclarer la disponibilité sur main.

## Prochaine action concrète

**P0 :** recette réelle du moteur dans un worktree Git jetable avec Windows 11 + LM Studio + modèle `tool_calls` + GPU ; confirmer édition autorisée, test, checkpoint/reprise, MCP sélectionné, worker, mémoire et absence de fuite. Relever les mesures et écarts dans un rapport de recette **daté**, puis mettre à jour [CAPABILITIES](docs/CAPABILITIES.md) et [ROADMAP](docs/ROADMAP.md). Ne pas augmenter la surface réseau avant le threat model.

## Reprise rapide pour un agent neuf

1. Lire `AGENTS.md` puis ce handoff.
2. Examiner `git status`, `main`, les PR ouvertes et les checks sur leur SHA exact.
3. Ouvrir **uniquement** le document spécialisé par rapport au changement envisagé.
4. Implémenter sur branche dédiée, exécuter les validations, attendre les huit checks PR, merger si verts ; recontrôler les huit checks `main` ; mettre à jour ce handoff si l'état opérationnel change.

**Historique conservé :** [versions antérieures via Git](docs/archive/INDEX.md), [CHANGELOG](CHANGELOG.md) et [releases](docs/releases/). Pas de nouvelle release créée pour une consolidation de documentation.
