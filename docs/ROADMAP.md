# Roadmap vérifiable — après le 22 novembre 2026

Cette page contient **uniquement les lacunes non soldées**. Les étapes P1–P6 du moteur agentique sont fusionnées dans `main` (`#106–#111`), mais restent **expérimentales**, non une recette du produit complet. État des faits : [capacités](CAPABILITIES.md).

## P0 — qualifications avant confiance élargie

- [ ] Recette **sur Windows 11 réel** avec LM Studio, ID de modèle à tool-calling vérifié et RTX 5070 Ti : lecture, édition contrôlée en worktree jetable, `npm test`, pause/reprise, crash simulé, mémoire et worker ; mesures réelles latence, RAM/VRAM, tokens et stabilité.
- [ ] Tester les CLI conseillers **réellement installées** (Codex, Claude, Gemini, OpenCode) une par une : arguments lecture seule, authentification, quotas, timeouts, absence de modification et transfert contrôlé.
- [ ] Isoler les exécutions de scripts de dépôts et les serveurs MCP à effets de bord (compte non privilégié, répertoires autorisés, conteneur/sandbox OS au besoin) ; ne pas décrire un filtrage applicatif comme une sandbox matérielle.

## P1 — sécurité, distribution, acceptation

- [ ] Définir les approbations MCP **par opération/arguments** et la stratégie pour les outils privilégiés, sans paralyser les opérations ordinaires sûres.
- [ ] Tester la release Windows portable sur une machine distincte, SmartScreen, extraction/empreinte, sans Node installé ; essais NVDA/VoiceOver. L'historique Windows du 17/11 ne couvre pas le nouveau runtime.
- [ ] Requalifier et traiter [issue #18](https://github.com/neosoda/agent-commons/issues/18) : édition avancée des arguments/URL MCP existants avec secrets *replace-only* et tests de non-divulgation.
- [ ] Suivre [issue #19](https://github.com/neosoda/agent-commons/issues/19) : qualification matérielle/accessibilité et éventuelle publication npm ; ne pas en faire un blocage de fonctionnalités déjà fusionnées.
- [ ] Mesurer les plafonds réels des tokens/contextes avec différents modèles : les estimations ne sont pas une facturation garantie.

## P2 — intégration future (aucun déploiement prétendu)

- [ ] Rédiger un **threat model** réseau avant toute extension LAN : identité des clients, MFA/auth, TLS, autorisation fine des MCP, isolation du runner, journalisation sans secrets, proxy et segmentation.
- [ ] Étudier un provider de modèle local sur **un autre PC** (portée réseau, TLS/auth, disponibilité, GPU) ; tester les tâches planifiées avec cette topologie **avant** de promettre le support distribué.
- [ ] Évaluer la mutualisation des seuls services qui le justifient sur SentinelBrain et une distribution de skills/MCP à plusieurs machines ; **n'implémenter aucune topologie dans cette mission documentaire**.
- [ ] Envisager une véritable délégation multi-agent avec rôles, contextes, permissions et preuves par agent ; **distincte de l'avis consultatif actuel**.

## Gates systématiques

`npm ci`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high`, `npm pack --dry-run` et `npm run catalog:check` ; ensuite 6 jobs CI multi-OS/Node + Chromium + Windows portable sur le **SHA exact de PR**, puis sur le nouveau `main`. Réévaluer chaque statut avec GitHub, pas un ancien handoff. Aucun nouveau tag de release sans justification produit.
