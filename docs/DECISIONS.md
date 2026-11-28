# Décisions d'architecture valides — 28/11/2026

Décisions **observées dans le code et les règles du dépôt**, distinctes des expérimentations et du futur SentinelBrain. Les détails d'exécution sont dans [architecture](ARCHITECTURE.md), [runtime](AGENT_RUNTIME.md) et [sécurité](../SECURITY.md).

| Décision | Motif | Conséquence / limite |
|---|---|---|
| Local-first et exécution sous utilisateur non privilégié | Garder le contrôle des modèles et fichiers | UI uniquement `127.0.0.1`, pas d'accès LAN/Internet sans architecture d'authentification |
| Répertoire `~/.agents` comme source de configuration locale | Éviter les copies divergentes entre outils | Préserver données non gérées et configurations natives ; chaque client garde son format |
| Catalogue public **métadonnées épinglées** | Découvrir sans installer du code arbitraire | Référence/licence ≠ audit sécurité ; installation/activation séparées |
| Skills routés par métadonnées, chargement progressif | Maîtriser la taille du contexte | Pas d'injection de 212 skills ; budget de tokens indicatif |
| MCP central avec profils et prévisualisation révisée | Déploiements cohérents et réversibles | Les profils ajoutent, ne désactivent pas les anciens serveurs ; runtime autorise les outils séparément |
| Extensions MCP installées depuis liste examinée et versions épinglées | Limiter la chaîne d'approvisionnement | Npm/uv requis selon package ; code tiers reste à contrôler |
| Moteur de mission **un seul exécutant local** | Permissions contrôlables et vérification par outils | Cloud/CLI externes uniquement conseillers sans tools, jamais agents codeurs autonomes |
| Plans, checkpoints et arrêt sur résultat incertain | Prévenir les boucles et doubles effets de bord | L'opérateur réconcilie ; pas de replay silencieux |
| SQLite natif FTS5 et queue locale | Persistance simple, sans service serveur | Isolation par checkout, connaissances approuvées, worker unique ; pas de mémoire partagée LAN |
| Séparer code sur `main` et dernière release | Éviter les promesses trompeuses | Ne revendiquer dans une release que ce qui figure sur le tag publié (ex. `v0.6.1` → `2570fabf`) |
| SentinelBrain comme intégration future facultative | Maintenir Agent Commons autonome | Ni modèle distant déployé, ni passerelle multi-PC, ni réseau MCP authentifié attesté |

**Invariant opératoire :** autonomie/automatisation maximales pour les tâches courantes autorisées ; opérations sensibles avec droits explicites, preuve, journal de contrôle et mécanisme de reprise. Le texte renvoyé par un LLM ou un outil tiers n'est jamais une attestation.

Décisions non prises : protocole de distribution LAN, identité distante, auth inter-nœuds, coffre à secrets partagé, placement des GPU, véritable orchestration multi-agent. Ces sujets restent dans [la roadmap](ROADMAP.md), pas dans la description des fonctions livrées.
