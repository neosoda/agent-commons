# Catalogue interactif — Skills & MCP

Le **Skill Hub local** (`127.0.0.1`) regroupe les skills et serveurs MCP sur la même page pour faciliter la découverte. Le **MCP Control Center** reste l'espace de configuration et de synchronisation.



**État de `main` au 22/11/2026** : ce catalogue ne se limite plus à la découverte. Les Skills déjà gérés disposent des actions d'installation/mise à jour/suppression. Les packages MCP approuvés disposent aussi d'actions **Install / Update / Repair / Uninstall**, suivies d'un provisionnement contrôlé dans le manifeste et d'une synchronisation vers les clients choisis. Une confirmation séparée est exigée à chaque opération et les configurations MCP natives ne sont jamais effacées par une désinstallation de package. Voir [Extension Manager](EXTENSION_MANAGER.md).

Lancer `agent-commons web`, puis choisir **Catalogue Skills & MCP**.

- **Skills** : catalogue public épinglé et skills présents dans la bibliothèque centrale ; catégories développement, DevOps, sécurité, design, IA, documentation, productivité.
- **MCP** : références vérifiées et noms des serveurs MCP recensés dans le manifeste central ou les clients natifs détectés ; catégories web, développement/Git et infrastructure.
- **Tous** : recherche unifiée, catégories et filtres d'état (*installé/configuré* ou *disponible/référence*).
- **Voir les détails** : rôle, provenance publique, état, commande de prévisualisation du skill, accès au MCP Control Center et prompts d'exemple copiables.

Pour les skills, `catalog install <id>` affiche l'aperçu, `--yes` confirme le téléchargement épinglé, puis `sync --skill <id> --agent codex --dry-run` prévisualise la liaison. Un skill présent dans la bibliothèque n'est **pas nécessairement actif dans un agent**. Les prompts fournis sont seulement du texte à copier, pas des instructions exécutées automatiquement.

Un MCP **configuré** ou **détecté** n'est pas forcément en cours d'exécution ni accessible à tous les clients. Le catalogue n'affiche **aucun chemin privé, aucune commande, variable d'environnement ou clé**. Un MCP marqué « fournisseur non vérifié » n'est pas une recommandation d'installation.

La sélection comprend des exemples concrets pour Video Engine, Remotion Superpowers (production, shorts, sous-titres, revue), Grim Prompter, les vidéos SaaS Remotion, Lemo-Opuscar, find-skills, Docker et UI/UX, ainsi que les neuf MCP publics du catalogue, dont Agent Desktop (contrôle du bureau soumis à autorisation) ; les autres entrées ont un modèle de prompt générique à adapter. L'interface est entièrement locale, sans dépendance ni service externe ; aucune opération de gestion n'est déclenchée par la navigation ou la copie.

[Guide anglais](INTERACTIVE_CATALOG.en.md) · [README FR](../README.md).
