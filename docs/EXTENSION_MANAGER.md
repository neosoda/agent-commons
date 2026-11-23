# Extension Manager — Skills et MCP

Le catalogue Skills & MCP du Skill Hub local devient un gestionnaire d'extensions. Démarrage : agent-commons web.

## Fonctions réellement implémentées

- Skills : installation, mise à jour vers la révision épinglée, vérification d'intégrité, désinstallation des exemplaires gérés, profils et synchronisation sélective déjà existants.
- MCP : installation isolée, réparation, mise à jour vers la version approuvée dans le catalogue et suppression des packages gérés.
- Provisionnement : Playwright, Fetch, Filesystem, Git et XERJ peuvent être déclarés dans le manifeste MCP central à partir de leurs exécutables installés. Sélection de clients ; chemins explicites obligatoires pour Filesystem et Git.
- Synchronisation ciblée : choisir les clients compatibles (dont LM Studio), vérifier la simulation et confirmer. Les entrées natives sans rapport sont conservées.
- Vérification des mises à jour : compare les installations aux versions et révisions approuvées dans le catalogue **local**. Pas de requête automatique vers les dernières versions npm/PyPI/GitHub.

## Packages pris en charge

| MCP | Installateur | Conditions |
| --- | --- | --- |
| Playwright | npm (version épinglée) | Node.js, npm, navigateur Chromium installé séparément |
| Filesystem | npm (version épinglée) | Node.js, npm, répertoires autorisés explicitement |
| Fetch | uv (version épinglée) | uv, Python compatible |
| Git | uv (version épinglée) | uv, Git, dépôt choisi explicitement |
| XERJ | Archive officielle v1.0.0-rc.104 vérifiée par SHA-256 | Windows/Linux/macOS, instance locale et roots autorisés explicitement ; [guide](XERJ.md) |
| GitHub, Docker Gateway, Agent Desktop | Manuel | Revue des permissions et des prérequis |
| Web Search et OSINT génériques | Indisponible | Aucun package fiable retenu |

L'archive Windows portable d'Agent Commons n'intègre pas nécessairement npm, uv ou Python. Le gestionnaire peut réclamer leur installation locale.

XERJ se rattache aussi à un binaire existant trouvé dans PATH sans le modifier. Le nœud de recherche reste optionnel et son interface est intégrée au MCP Control Center. Voir [XERJ](XERJ.md).

Les packages sont isolés sous ~/.agents/mcp-packages et suivis dans ~/.agents/mcp-installations.json. Les commandes utilisent des arguments construits exclusivement à partir du catalogue approuvé ; aucun texte de commande arbitraire n'est exécuté depuis le navigateur. Les scripts de post-installation npm sont désactivés et uv impose les roues binaires. Cela n'empêche pas le code MCP tiers d'être exécuté quand un client le lance.

## Utilisation

1. Dans le catalogue Skills & MCP, choisir un MCP, puis **Install** et confirmer la prévisualisation.
2. Choisir **Configure for clients** pour déclarer son exécutable ; sélectionner les clients et, pour Filesystem ou Git, les répertoires autorisés. Valider la modification du manifeste central.
3. Choisir **Sync to selected clients**, prévisualiser et confirmer le dry-run. Un redémarrage du client IA peut être nécessaire.
4. Pour les packages gérés, utiliser **Update**, **Repair** ou **Uninstall** après vérification.

## Améliorations de l'interface — v0.5.4

Les cartes de skills proposent directement les aperçus d'installation ou de mise à jour épinglée, puis **Choisir les agents** pour un skill installé. Les filtres distinguent les installations gérées, les mises à jour approuvées, les éléments à vérifier et les outils locaux/non gérés. Les fiches présentent leurs actions avant l'aide et les exemples.

Pour synchroniser un seul skill, choisir les agents compatibles installés, examiner l'aperçu puis confirmer. L'approbation est à usage unique et liée au skill, aux agents choisis et à l'état des fichiers : une modification impose un nouvel aperçu. Cette opération ne modifie ni les profils enregistrés ni les MCP. Les agents lisant nativement `~/.agents/skills` voient déjà les skills partagés ; aucun lien supplémentaire n'est créé et la sélection ne limite pas leur visibilité.

Les fiches MCP indiquent séparément l'état du package, de sa configuration centrale et de sa synchronisation aux clients. Après une installation ou une configuration, la fiche se rouvre pour proposer l'étape suivante ; chaque étape conserve sa propre confirmation. Fermer un aperçu en cours, ou changer de page, empêche une réponse tardive d'ouvrir une confirmation. Cela n'annule pas une opération déjà confirmée.

## Limites et sécurité

- Installer un package, le configurer et le synchroniser sont **trois opérations indépendantes**. Un MCP installé n'est pas nécessairement actif ou fonctionnel.
- Désinstaller le package ne supprime pas les configurations MCP centrales ou natives. **Retirer les configurations associées avant la désinstallation**, sinon elles référenceront un exécutable absent. L'éditeur MCP existant permet de supprimer le manifeste central ; les entrées natives existantes doivent être gérées séparément.
- Mettre un serveur central sur disabled n'efface pas une entrée déjà synchronisée dans les clients.
- Les répertoires non gérés ne sont ni écrasés ni adoptés. Les opérations de package utilisent un dossier temporaire et une restauration de l'installation précédente en cas d'échec, dans les limites du système de fichiers.
- Les changements dans les manifests MCP utilisent des prévisualisations, des validations de révision et des snapshots.
- Le Skill Hub reste lié à 127.0.0.1, sans télémetrie ; ne jamais l'exposer directement au réseau.
- La revue des sources et l'épinglage des versions ne certifient pas l'innocuité des logiciels tiers.

## Diagnostic de lancement (livré en CLI)

`agent-commons doctor` vérifie sans rien exécuter que les exécutables et scripts des serveurs MCP existent ; `agent-commons mcp probe` démarre explicitement un serveur et teste la connexion MCP. La prévisualisation de désinstallation liste les configurations qui référencent encore le paquet. Voir [DIAGNOSTICS.md](DIAGNOSTICS.md).

## Suite envisagée — non livrée

Vérifications live des versions amont, désactivation/suppression sécurisée des entrées natives prouvées comme gérées, opérations en lot transactionnelles, permissions plus fines et historique des opérations.
