# Security Policy — Agent Commons

**Statut :** projet local-first, avec une surface d'administration non authentifiée, et un **runtime agentique expérimental** sur `main`. L'utilisation sur un dépôt fiable avec un compte utilisateur non privilégié reste la base de sécurité ; les tests CI et les checksums ne prouvent pas l'absence de vulnérabilités.

## Versions

| Version | Statut au 22/11/2026 |
|---|---|
| `v0.6.0` | **Dernière release GitHub publiée** (20/11/2026), support courant publié |
| `main` post-v0.6.0 | Développement actif, runtime P1–P6 fusionné mais non publié comme nouvelle release |
| `v0.5.x` | Anciennes versions ; mettre à niveau vers `v0.6.0` |
| `v0.4.x` et antérieures | Historiques, non recommandées |

Une nouvelle fonctionnalité sur `main` n'est pas automatiquement un correctif livré aux installations `v0.6.0`. Vérifier [release](https://github.com/neosoda/agent-commons/releases) et [changelog](CHANGELOG.md) avant toute assertion.

## Frontières effectives

- **Skill Hub :** bind strict à `127.0.0.1`, **sans login** ; contrôles Host/Origin, jeton CSRF de processus, CSP et prévisualisations à validation unique. **Ne jamais exposer par proxy inverse, tunnel, port forwarding ou écoute LAN.**
- **Écritures et backups :** aperçu et consentement explicites dans l'UI, contrôle de révision et snapshots avant les mutations gérées ; les profils, liens Windows et configurations clientes non gérées doivent être préservés. Ce ne sont ni des transactions atomiques à toute épreuve ni des garanties de rollback après crash.
- **Secrets :** ne pas les enregistrer dans Git, prompts, logs, interface, catalogues ou rapports publics. Les réponses web omettent commandes/arguments/env/URLs privés ; les fichiers natifs et archives peuvent toujours contenir des credentials. Les contrôles de redaction ne garantissent pas zéro fuite.
- **Réseau :** les opérations ordinaires restent locales, sans télémétrie applicative ; l'installation approuvée d'un skill GitHub ou d'un package MCP utilise le réseau et exécuter un MCP tiers dépend de sa configuration. N'affirmez pas un mode « toujours hors ligne ».
- **Installation de tiers :** catalogue épinglé et licences documentées ne constituent **pas** un audit du code externe. Extension Manager utilise des versions approuvées, phases indépendantes install/config/sync et prévisualisations ; les MCP manuels (Docker Gateway, desktop, GitHub) restent hors installation automatique.
- **Diagnostics :** `doctor` inspecte en lecture seule les commandes/chemins ; `mcp probe` exécute **explicitement** le serveur choisi, handshake MCP et appel d'outil seulement s'il est demandé. Un endpoint à auth non disponible peut rester non vérifié. Les launchers Windows à syntaxe dangereuse sont refusés.
- **Profils MCP :** ils contrôlent les **ajouts synchronisés** et non l'accès réel aux serveurs déjà natifs chez les clients. Ne jamais confondre profil, isolation système et autorisation de l'outil lors d'une mission.

## Runtime expérimental : menaces résiduelles

- Écriture (`--allow-write`), tests de dépôt (`--allow-tests`) et outils MCP (`--allow-mcp-tool serveur/outil`) sont désactivés/non exposés par défaut. Seuls des chemins contrôlés et outils bornés sont proposés, sans shell générique, mais **aucune sandbox OS forte** n'isole le modèle ou les scripts npm de confiance.
- Les outils MCP sont filtrés par nom, **pas par effets et arguments**. Un appel autorisé peut modifier des fichiers, des conteneurs ou accéder au réseau. Choisir des serveurs et comptes restreints, idéalement lecture seule ; empêcher la combinaison OSINT non fiable avec Docker/desktop privilégiés.
- Chaque intention à effet de bord est sauvegardée avant l'action ; un résultat incertain implique `needs_approval`/`needs_review` et inspection humaine, jamais un rejeu automatique. Pause/annulation coopératives : un processus bloqué peut persister.
- Mémoire `memory.sqlite` cloisonnée par checkout, approbation explicite des connaissances, contrôles de secrets et pas de promotion automatique de texte du modèle. Queue/checkpoints/logs contiennent des métadonnées, mais restent des données privées à protéger sur disque.
- Conseil cloud/CLI facultatif (`--cloud` ou `--delegate`) **sans outils**, retour au modèle local. Un `readOnlyAdvice: true` déclaré dans `delegates.json` ne prouve pas la sandbox d'une CLI externe. `--allow-cloud-source` autorise le transfert de source vers un tiers : exiger consentement et vérifier le fournisseur/coût.
- Endpoint modèle compatible OpenAI sur un autre PC, distribution LAN, accès distant de Mission Control et mutualisation SentinelBrain : **non qualifiés, non sécurisés par ce projet**. Définir TLS, identité, autorisations, confinement réseau et contrôle des secrets avant tout essai distant.

## Signalement responsable

[Ouvrir une alerte de sécurité privée GitHub](https://github.com/neosoda/agent-commons/security/advisories/new). Ne pas publier d'exploit ou de clé dans une issue. Joindre OS, version/commit, Node, étapes de reproduction isolées avec `--home` et données synthétiques.

Le portable Windows actuel est **non signé** ; vérifier les empreintes SHA-256 officielles. Une signature et une recette SmartScreen/NVDA/VoiceOver restent distinctes de la réussite de CI. [Limites détaillées](docs/CAPABILITIES.md) · [Plan d'action](docs/ROADMAP.md).
