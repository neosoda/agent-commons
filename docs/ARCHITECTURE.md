# Architecture réelle d'Agent Commons

**Référence :** branche `main` au 28 novembre 2026 (`v0.6.1`, `2570fabf`). Ce document décrit le code disponible, non une cible d'infrastructure. Voir [capacités](CAPABILITIES.md) et [décisions](DECISIONS.md).

## Deux ensembles indépendants

1. **Gestionnaire d'environnements IA** (fonctionnalités principales) : bibliothèque centrale `~/.agents/skills/`, catalogue public de références épinglées, manifeste `~/.agents/mcp.json`, inventaires par client, previews de synchronisation, profils, sauvegardes et restauration. Modules `src/agents/`, `src/commands/`, `src/core/`, `src/sync/`, `src/mcp/`.
2. **Moteur de missions local expérimental** : `src/runtime/`, `src/web/mission-api.ts` et `src/web/mission-ui.ts`. Les étapes P1 à P6 et les correctifs ultérieurs sont intégrés dans `main` et publiés à titre expérimental depuis `v0.6.1`. Une seule exécution locale pilote les outils ; les CLI externes ne donnent qu'un avis facultatif.

```text
CLI agent-commons / Skill Hub (loopback)
  ├── Agents détectés et formats natifs (JSON, JSONC, TOML)
  ├── Skills locaux + catalogue de métadonnées → routeur progressif
  ├── Manifeste MCP central → gestionnaire d'extensions → sync ciblée
  └── Snapshots / contrôles de révision / diagnostics
CLI agent-commons-agent
  ├── Endpoint compatible OpenAI (LM Studio par défaut)
  ├── Workspace Git validé + outils intégrés bornés
  ├── Skills physiques sélectionnés + outils MCP autorisés un par un
  ├── Checkpoints, plan, anti-boucle, mémoire SQLite FTS5
  ├── File SQLite, worker utilisateur, Mission Control local
  └── Avis cloud ou CLI facultatif sur blocage, sans outils d'exécution
```

## Frontières et persistance

- `src/cli/index.ts` expose la CLI de gestion ; `src/web/server.ts` expose le Skill Hub **uniquement sur `127.0.0.1`**. Aucun login distant : ne pas publier la surface administrative.
- `src/runtime/cli.ts` expose `agent-commons-agent` ; `src/runtime/mission.ts` gère les états, plans, budgets, traces et reprises ; `workspace.ts` borne les lectures/écritures et contrôles de tests.
- `src/runtime/extensions.ts` sélectionne les skills effectivement installés et sonde les MCP du manifeste central. Les profils de synchronisation MCP **ne constituent pas** une politique d'autorisation des appels pendant une mission.
- `src/runtime/memory.ts` garde `~/.agents/memory.sqlite` (recherche FTS5 lexicale, identité de checkout) ; `queue.ts` garde `~/.agents/queue.sqlite` ; `worker.ts` sérialise les exécutions locales. Checkpoints : `~/.agents/missions/` ; événements du worker : `~/.agents/queue-events.jsonl`.
- `src/runtime/delegate.ts` lance une **CLI déjà installée et déclarée** en conseil borné ; ni session multi-agent mutante, ni sous-agent autonome concurrent.
- `src/mcp/extension-manager.ts` gère les packages MCP approuvés sous `~/.agents/mcp-packages/` et leurs reçus `mcp-installations.json` ; `extension-provision.ts` configure séparément les exécutables dans le manifeste central. Découverte, installation, configuration et synchronisation sont **quatre actes distincts**.

**Recherche locale XERJ (opt-in) :** `src/mcp/xerj-binary.ts` ajoute l'installation épinglée au gestionnaire MCP existant ; `src/mcp/xerj-operations.ts` contrôle un nœud local `127.0.0.1`, un registre de racines validées `~/.agents/xerj-roots.json`, l'indexation et la recherche. `extension-provision.ts` publie `xerj mcp` via le manifeste standard et `src/sync/mcp.ts` synchronise vers les clients retenus. Ce n'est ni un deuxième gestionnaire MCP, ni un remplacement de `memory.sqlite`. Voir [XERJ](XERJ.md).

## Exécution et déploiement

Node.js >=22, TypeScript, dépendance d'exécution `jsonc-parser` ; pas de backend distant requis. Déploiement actuel = local, Windows/macOS/Linux, et ZIP Windows portable publié. Le service worker Windows ou Linux est facultatif et fonctionne sous l'utilisateur courant. Les capacités MCP effectives dépendent des serveurs configurés, installés, démarrables et autorisés. Voir [skills/MCP](SKILLS_AND_MCP.md).

**SentinelBrain, futur seulement :** un service mutualisé de catalogue/mémoire, un fournisseur de modèles hébergé sur un autre PC et la distribution sécurisée LAN sont des possibilités d'intégration, **pas une installation attestée ni une architecture implémentée**. Le modèle peut être sélectionné par URL compatible OpenAI ; transport, authentification, segmentation réseau, identité des clients, contrôle de permission et stockage des secrets restent à concevoir avant exposition LAN. Agent Commons doit rester utilisable seul.
