# SaaS Product Demo Video — Agent Commons

**Source :** [noamdorr/saas-product-demo-video](https://github.com/noamdorr/saas-product-demo-video), auteur **Noam Dorr**, licence [MIT](https://github.com/noamdorr/saas-product-demo-video/blob/c93c00ff44a65eea25ac1bb773a4565c68893ff9/LICENSE), commit `c93c00ff44a65eea25ac1bb773a4565c68893ff9`.

## Intégration

Le catalogue proposait une ancienne version de ce skill. La référence est mise à jour vers le **skill v2 officiel** `skills/saas-product-demo-video/SKILL.md`. L'installation épinglée conserve **les 92 fichiers (622 353 octets)** du skill : scaffold Remotion, composants React, outils, modèles et références. Les fichiers d'évaluation, hooks et commandes de publication du dépôt amont ne sont pas importés. Le code tiers reste **hors du dépôt Agent Commons** et les hashes Git sont vérifiés à l'installation.

```bash
# Dans un checkout Agent Commons à jour, après npm ci et npm run build
node dist/cli/index.js catalog info saas-product-demo-video
node dist/cli/index.js catalog install saas-product-demo-video             # aperçu + réseau, aucun fichier écrit
node dist/cli/index.js catalog install saas-product-demo-video --yes       # accord explicite
node dist/cli/index.js catalog verify saas-product-demo-video             # intégrité locale
node dist/cli/index.js skills route "Créer une vidéo démo SaaS avec Remotion" --json
node dist/cli/index.js sync --skill saas-product-demo-video --agent codex --dry-run
node dist/cli/index.js sync --skill saas-product-demo-video --agent codex
```

Pour Claude Code : remplacer `codex` par `claude-code`, invocation `/saas-product-demo-video`. Dans Codex : `$saas-product-demo-video`. Gemini CLI : remplacer par `gemini-cli` et demander explicitement le skill via son système natif. `skills route` renvoie les **métadonnées seulement** ; `skills load saas-product-demo-video` lit le `SKILL.md` **à l'invocation**, puis l'agent choisit les seules références utiles.

## Pré-requis et garde-fous

- **Création vidéo seulement :** Node.js 18+, npm/Remotion (versions épinglées dans le scaffold), Python 3 et librosa pour les beats ; ffmpeg, Pillow, Playwright, navigateur ou Gemini API selon l'option. Installation des dépendances **dans le projet film**, pas dans Agent Commons. Les versions Remotion et les licences des médias ne sont pas définies par la licence MIT du skill.
- Le skill contient des scripts tiers dans `scripts/` et `assets/scaffold/tools/`. Leur téléchargement nécessite `--yes`, **leur exécution n'est jamais automatique**. Toute installation npm/Python, capture web authentifiée, téléchargement de navigateur, appel API ou rendu requiert l'accord de l'utilisateur.
- Le guide amont mentionne `npx skills add remotion-dev/skills`. **Ne pas l'exécuter automatiquement** : seuls les skills examinés, épinglés et explicitement approuvés via le mécanisme Agent Commons doivent être installés.
- Pour économiser des tokens, ne pas charger les références en bloc, ne pas démarrer de sous-agents par défaut, et conserver le checkpoint après les deux premières scènes prévu par l'amont.
- Les créations, musiques, captures, marques et images ont leurs propres droits. Ne pas confondre la licence MIT du skill avec un droit de réutilisation de tous les médias ou un abonnement Remotion.

**Mise à jour :** après examen de la nouvelle source et de la licence, modifier `ref/source/licenseEvidence` dans `catalog/skills.json`, générer `npm run catalog:generate`, puis lancer `catalog outdated` et `catalog update saas-product-demo-video` (aperçu) ; `--yes` uniquement sur installation gérée, intacte et non liée à un agent. Les installations liées ne sont pas écrasées silencieusement.

Crédits : [Noam Dorr](https://github.com/noamdorr/saas-product-demo-video) · [MIT](https://github.com/noamdorr/saas-product-demo-video/blob/c93c00ff44a65eea25ac1bb773a4565c68893ff9/LICENSE). [Remotion](https://www.remotion.dev/) est un outil externe.
