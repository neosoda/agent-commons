# Agent Commons — instructions minimales pour tous les agents

**Point d'entrée :** [PROJECT_HANDOFF.md](PROJECT_HANDOFF.md) (état et prochaine action), puis ouvrir **uniquement** la documentation pertinente pour la mission. Ne charger ni catalogue complet ni historique P1–P6 en contexte par défaut.

## Sources de vérité (ordre)

- Ce qui **existe** : code, `package.json`, tests, workflows et GitHub `main`/PR/CI sur le **SHA exact** ; [capacités et preuves](docs/CAPABILITIES.md).
- **Conception** : [architecture](docs/ARCHITECTURE.md), [décisions](docs/DECISIONS.md).
- **Modifications skills/MCP** : [guide opérationnel](docs/SKILLS_AND_MCP.md), [sécurité](SECURITY.md).
- **Missions agentiques** : [runtime](docs/AGENT_RUNTIME.md) (expérimental sur `main`).
- **Travail futur** : [roadmap](docs/ROADMAP.md). La release `v0.6.0` n'est pas l'état complet de `main`.

## Règles non négociables

1. Vérifier `git status`, la branche et les changements utilisateur avant toute écriture. Ne jamais écraser des données non gérées, des secrets, des junctions NTFS ou un travail en cours.
2. Local-first ; **ne pas exposer le Skill Hub non authentifié au-delà de `127.0.0.1`**. Ne pas publier de chemins privés, prompts, sorties MCP brutes ou credentials.
3. Découvrir par **métadonnées**, router, puis charger sélectivement les skills utiles. Référence de catalogue ≠ installation. Aucun code tiers arbitraire, hook, sous-agent ou package installé automatiquement.
4. MCP uniquement par permission explicite ; distinguer synchronisation des clients et autorisation `--allow-mcp-tool serveur/outil` de mission. Une action à effet incertain requiert inspection humaine avant reprise. Limiter les droits sans bloquer les actions sûres autorisées.
5. Favoriser réutilisation des modules existants, petite modification testée et récupération/rollback. Ne pas changer le comportement applicatif pour un simple alignement documentaire.
6. Vérifier `npm ci`, `npm run typecheck`, `npm test`, `npm audit --audit-level=high`, `npm pack --dry-run` et `npm run catalog:check`. Pour toute PR, attendre **six checks OS/Node + Chromium + Windows portable** sur le SHA de tête exact, puis vérifier les checks du nouveau `main` après fusion. Distinguer CI synthétique et essai physique.
7. Conserver [README FR](README.md) / [EN](README.en.md) synchronisés ; ne pas casser les marqueurs de crédits générés du catalogue ni les licences amont.
8. Mettre à jour le [handoff](PROJECT_HANDOFF.md) avec l'état **actuel et concis** et une seule prochaine action vérifiable. Pas de journal chronologique ni de supposition de release, npm, Windows réel ou infrastructure SentinelBrain déployée.

**Lire à la demande :** [diagnostics](docs/DIAGNOSTICS.md), [Extension Manager](docs/EXTENSION_MANAGER.md), [routage](docs/CONTEXT_ROUTING.md) et [recette matérielle](docs/qa/RELEASE_ACCEPTANCE.md). Les documents historiques ne sont pas des instructions actives.
