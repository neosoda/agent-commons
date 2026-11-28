# Capacités, preuves et limites

**Périmètre :** code `main` au 28/11/2026 (PR jusqu'à #127 fusionnées) ; release GitHub actuelle `v0.6.0` (20/11/2026), qui ne contient pas les ajouts listés dans `[Unreleased]` du [CHANGELOG](../CHANGELOG.md). Chaque fusion exige les 11 contrôles requis (6 OS/Node, 3 XERJ réels, Chromium, ZIP Windows). **Vert en CI n'équivaut pas à validé sur matériel.**

## Vocabulaire obligatoire

- **Implémenté** = présent dans le code de `main` ; **testé** = test automatique existant réussi dans la CI du SHA cité.
- **Validé en réel** = essai manuel sur l'environnement spécifié et daté ; ne pas extrapoler à une autre machine/version.
- **Expérimental** = fonction livrée dans `main` mais sans recette complète des usages réels ; **prévu** = absent du code utilisable.

| Capacité | État dans `main` | Preuves et réserve |
|---|---|---|
| Détection de 21 environnements et adaptation skills/MCP | Implémentée, tests CI | `src/agents/registry.ts`, `src/test/client-compat.test.ts` ; certaines intégrations réelles non testées |
| Catalogue 212 skills / 11 références MCP (dont XERJ et Sellbird) | Références embarquées, tests CI | `catalog/skills.json`, `src/mcp/catalog.ts` ; **référencé ≠ installé ≠ opérationnel** |
| Synchronisation, profils, snapshots, rollback | Implémentés, tests CI | `src/sync/`, `src/core/backup.ts`, tests de sécurité ; conserver les données non gérées |
| Installation contrôlée skills et packages MCP | Implémentée, tests CI | `src/commands/skill-install.ts`, `src/mcp/extension-manager.ts` ; installation de tiers explicitement approuvée |
| Diagnostics `doctor` / `mcp probe` | Implémentés ; essais réels ciblés Windows 17/11 | [rapport historique](qa/WINDOWS_REAL_AUDIT_2026-11-17.md) ; non généralisable à tous les MCP |
| Skill Hub et MCP Control Center | Implémentés, tests CI/Chromium | Interface loopback sans login ; jamais d'exposition LAN brute |
| Moteur LM Studio et outils Git bornés | Expérimental, tests simulés | `src/runtime/*` ; aucune recette complète LM Studio/RTX 5070 Ti validée |
| Sélection de skills installés pour une mission | Expérimental, tests CI | Jusqu'à 2 instructions sélectionnées, budget estimé ~1600 tokens ; pas de chargement massif |
| Appels MCP par `serveur/outil` autorisé | Expérimental, tests CI | Handshake et tool call ; permissions d'outil, pas sandbox des effets de bord |
| Plans, checkpoints, pause, reprise, anti-boucle | Expérimental, tests CI | Effets de bord incertains => `needs_approval`, jamais rejoués automatiquement |
| Mémoire SQLite FTS5 par checkout | Expérimental, tests CI | Connaissances explicites approuvées ; résultats automatiques non promus sans validation |
| File persistante et worker local | Expérimental, tests CI | Worker unique avec bail ; pas de disponibilité 24/7 garantie |
| Mission Control dans le Skill Hub | Expérimental, tests CI/Chromium | Affiche vrais états et la présence du worker (vu < 15 s) ; l'UI ne lance pas le worker |
| Avis facultatif Codex/Claude/Gemini/OpenCode/Orchestrator CLI | Expérimental, faux exécutables testés | Versions/auth réelles à valider ; **pas** de délégation multi-agent d'exécution |
| Sandbox OS forte, contrôle des effets MCP par argument, accès LAN authentifié | Prévu, **non implémenté** | À concevoir et à tester avant automatisation de données sensibles |
| SentinelBrain distribué, multi-PC, modèle distant mutualisé | Préparation documentaire uniquement | **Aucun déploiement attesté** par ce dépôt |

## Validation concrète

Les workflows [CI](../.github/workflows/ci.yml), [Chromium](../.github/workflows/web-qa.yml) et [Windows portable](../.github/workflows/windows-portable.yml) exécutent les contrôles automatiques. `npm ci`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high` et `npm pack --dry-run` sont exigés à chaque PR ; ne jamais annoncer un résultat sans préciser le SHA vérifié. Le test Windows du 17/11 valide des scénarios réels Claude Code/Codex mais **pas** la couche agentique ajoutée après le 20/11. Voir [roadmap](ROADMAP.md).
