# XERJ dans Agent Commons — moteur local et MCP

**Statut :** intégration opt-in dans le MCP Control Center, épinglée sur le binaire officiel XERJ **v1.0.0-rc.104**. Le moteur est sous **Apache-2.0** ; le modèle **XERJ Query-1 est propriétaire**, distribué séparément, et n'est pas une dépendance d'Agent Commons. [Sources](https://github.com/xerj-org/xerj) · [Release](https://github.com/xerj-org/xerj/releases/tag/v1.0.0-rc.104) · [Documentation pour agents](https://xerj.org/llms.txt).

## Exemple de bout en bout (Codex ou Claude Code)

1. Lancer `agent-commons web`, ouvrir **Skills & MCP → XERJ → Install**. La prévisualisation n'installe rien : confirmer pour télécharger **seulement** l'archive officielle adaptée à l'OS, vérifier son SHA-256 épinglé, extraire `xerj` et enregistrer le reçu de gestion. Un XERJ trouvé dans le `PATH` peut aussi être utilisé sans réinstallation (pas d'adoption ni modification de l'exécutable existant).
2. Dans **MCP Control Center → XERJ**, cliquer **Start local node** (opt-in, processus non privilégié, `127.0.0.1:9200` uniquement, données dans `~/.agents/xerj-node-data`). Si le port est déjà occupé, Agent Commons ne prend pas le contrôle de l'instance existante. Le démarrage local utilise `--insecure` **exclusivement sur loopback** ; ce n'est jamais une configuration LAN.
3. Choisir le **chemin absolu** d'un dépôt Git local sans secrets, par ex. `/home/me/projets/demo` ou `A:\\PROJETS\\demo`. Cliquer **Authorize directory** puis confirmer. Aucun dossier n'est indexé à la simple autorisation ; `.agents`, répertoires personnels, racines de volumes et chemins sensibles sont refusés.
4. Cliquer **Index / refresh** et confirmer. La commande réelle est `xerj autoindex <dossier> --url http://127.0.0.1:9200 --prefix <préfixe stable>`. Agent Commons distingue un index complet (code 0) d'un index contenant des fichiers refusés (code 3). En cas de plan d'indexation nécessitant une décision (code 4), l'opération échoue de manière sûre sans donner d'approbation implicite. L'index se trouve dans le répertoire de données XERJ, **jamais dans le dépôt**.
5. Saisir le nom d'une fonction (ex. `loadConfig`) dans **Search**. La commande `xerj search` retourne des passages contenant références fichier/ligne lorsque XERJ les expose. Les résultats affichés viennent de XERJ : pas de citations fabriquées par Agent Commons.
6. Dans **Skills & MCP → XERJ → Configure for clients**, sélectionner **Codex** et/ou **Claude Code**, prévisualiser et confirmer le serveur stdio `xerj mcp --no-autostart` dans le **manifeste central**. **Sync to selected clients** ajoute ensuite uniquement XERJ aux configurations natives sélectionnées, avec snapshot et gestion des conflits. Les autres serveurs restent inchangés.
7. Vérifier le handshake réel (et la liste d'outils de ce binaire) :

```bash
agent-commons mcp probe xerj
# ou depuis les sources :
node dist/cli/index.js mcp probe xerj
```

8. Dans Codex ou Claude Code : **« Utilise le MCP XERJ pour rechercher `loadConfig` dans le dépôt indexé. Fournis le fichier, les lignes et les passages utiles avant de proposer du code. Ne stocke aucune mémoire sans permission. »** Les outils exacts dépendent de la version XERJ et du handshake `tools/list`; ne pas deviner leur présence. Pour les missions du moteur Agent Commons, autoriser explicitement chaque outil `--allow-mcp-tool xerj/nom_doutil`, après inspection des permissions.

## Mode opératoire et limites

- **Installer**, **configurer le manifeste**, **synchroniser les clients** et **autoriser un outil MCP de mission** sont des étapes indépendantes. La consultation du catalogue n'exécute aucun binaire.
- Le nœud local démarré dans l'interface n'est arrêté par celle-ci que si **ce processus** a été lancé par cette instance. Un nœud externe n'est jamais arrêté arbitrairement. Aucun port LAN, service utilisateur au démarrage ou tâche planifiée n'est créé.
- Les dossiers d'indexation autorisés sont enregistrés avec sauvegarde et restauration ; une suppression d'index exige une prévisualisation et une confirmation distinctes. La suppression d'une autorisation n'efface pas l'index existant ; l'effacement doit être demandé avant révocation.
- **BM25** fonctionne sur l'index textuel. Recherche **vectorielle/hybride** seulement lorsque le moteur et la configuration d'embeddings le permettent ; les modèles neuronaux et les téléchargements associés sont **opt-in**. La recherche de symboles, le code et les outils de référence (*reference coding*) sont ceux exposés par l'instance XERJ, pas des capacités réimplémentées localement. Un agent peut explicitement chercher des implémentations existantes avant de produire du code ; **aucun clonage de dépôt tiers automatique** par Agent Commons.
- **Mémoire** : XERJ propose `/_memory/{namespace}` et ses outils MCP de mémorisation/rappel. Des namespaces sont des **partitions de requêtes**, pas une isolation de confidentialité entre clients munis de la même clé. Les outils d'écriture restent à autoriser explicitement. La mémoire Agent Commons `~/.agents/memory.sqlite` (SQLite FTS5) demeure la source de vérité du runtime ; aucun transfert, duplication, promotion ou remplacement implicite n'a été ajouté.
- **XERJ Query-1** : modèle distinct (binaire privé, option `--facts-model-dir`, API `/_facts`), **ni activé ni installé** ici. **Reader-1** est le service cloud distinct, non nécessaire, sans clé de service ni appel cloud dans cette intégration.
- **Instance externe/SentinelBrain** : aucune configuration LAN intégrée ni port ouvert. Un éventuel nœud partagé exigera une revue séparée : TLS, authentification, clés à portée limitée, politiques par index, segmentation réseau et tests d'accès refusés. Ne pas utiliser `--insecure` sur une interface réseau.

## Contrôle de qualité

`npm test` couvre le catalogue, la vérification SHA-256 négative, les autorisations et snapshots, et la configuration MCP synthétique. Le workflow **Live XERJ (Linux)** exécute un test **avec le vrai binaire**, démarre une instance éphémère, indexe un petit projet et teste recherche + handshake MCP. Ce test peut être indisponible en l'absence de téléchargement réseau ; ne pas le présenter comme réussi avant examen de la CI. La validation Windows/macOS réelle nécessite encore des machines adaptées : la compilation et les mocks ne la remplacent pas.

**Crédits :** XERJ (xerj-org et contributeurs), licence Apache-2.0, [code](https://github.com/xerj-org/xerj) et [NOTICE](https://github.com/xerj-org/xerj/blob/main/NOTICE). Agent Commons est distribué sous sa propre licence MIT ; aucun code du moteur ni aucun modèle de XERJ n'est inclus dans son package.
