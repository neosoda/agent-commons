# Lemo-Opuscar — films et animations générés en code

Source : [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar), par Lemomo / LemoLab. Révision examinée : [`3a7132b996be0241c1ea0ab180d519f06e6f10b6`](https://github.com/lemomo-ai/lemo-opuscar/commit/3a7132b996be0241c1ea0ab180d519f06e6f10b6), 14 novembre 2026.

Agent Commons référence **le skill d'amorçage uniquement** : `SKILL.md` et `scripts/setup.sh` (13 223 octets). Les **99 styles**, vidéos, modèles et outils de rendu ne sont **ni copiés ni chargés dans Agent Commons**. Recherche locale par métadonnées et chargement du SKILL.md uniquement lorsque demandé.

## Installation sélective

```bash
agent-commons catalog search lemo-opuscar
agent-commons catalog info lemo-opuscar
agent-commons catalog install lemo-opuscar            # aperçu, aucune écriture
agent-commons catalog install lemo-opuscar --yes      # téléchargement des deux fichiers épinglés
agent-commons catalog verify lemo-opuscar
agent-commons sync --skill lemo-opuscar --agent codex --dry-run
agent-commons sync --skill lemo-opuscar --agent codex
```

Remplacer `codex` par l'agent souhaité. Le skill est proposé par le Smart Skill Router en fonction de la tâche (film, animation, vidéo, etc.), sans installation, exécution ou injection automatique de ses instructions.

## Attention avant le premier film

- Le script `setup.sh` **clone ou met à jour la bibliothèque amont depuis `main`** dans `~/lemo-opuscar` lors de son invocation, et peut exécuter des téléchargements/installations de dépendances (npm, Python, Chromium). **Le commit épinglé dans Agent Commons ne fige que les deux fichiers du skill, pas cette bibliothèque téléchargée ultérieurement.**
- Utiliser le skill après accord explicite sur ces opérations et vérification des scripts amont. Sous Windows, il faut un shell POSIX (par exemple Git Bash). Pour produire les films : Node.js 20+, ffmpeg 7+, Python 3.11+ ; certaines options demandent voix, musique, modèles ou services externes.
- Pour un fonctionnement reproductible, préparer **manuellement** un clone de la bibliothèque au commit examiné et définir `LEMO_OPUSCAR_HOME` vers ce clone non géré par `setup.sh`. Éviter l'initialisation automatique sur `main` si le figement de version est requis.
- Pas de serveur MCP supplémentaire, pas de téléchargement des 99 styles lors de la consultation du catalogue, pas d'accès non sollicité aux fichiers des projets. Les rendus sont créés dans un dossier de travail choisi par l'utilisateur.

**Licences distinctes :** le contenu Markdown du skill, les guides et les styles sont soumis à **CC BY-NC 4.0** (avec autorisation spécifique limitée à leur usage pour produire des films, y compris commerciaux ; **pas** une autorisation générale de republier ces textes dans Agent Commons). Le script et une grande partie du code sont **MIT**. Les médias et autres ressources tiers gardent leurs licences. Voir [LICENSE amont](https://github.com/lemomo-ai/lemo-opuscar/blob/3a7132b996be0241c1ea0ab180d519f06e6f10b6/LICENSE) et [REUSE.toml](https://github.com/lemomo-ai/lemo-opuscar/blob/3a7132b996be0241c1ea0ab180d519f06e6f10b6/REUSE.toml). Ces références ne constituent pas un audit du code exécuté.

Crédits : **Lemomo / LemoLab**, [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) ; Agent Commons ne revendique pas la paternité du projet ni de ses styles.
