# Claude SEO — intégration Agent Commons

Source : [AgriciDaniel/claude-seo](https://github.com/AgricIDaniel/claude-seo), version des skills 2.6.3, commit [`5d7d85ef32ade08dd4265cb678af8357ca6e6098`](https://github.com/AgricIDaniel/claude-seo/tree/5d7d85ef32ade08dd4265cb678af8357ca6e6098), [licence MIT](https://github.com/AgricIDaniel/claude-seo/blob/5d7d85ef32ade08dd4265cb678af8357ca6e6098/LICENSE). Le catalogue compte une référence pour ce pack, pas 23 installations indépendantes.

## Utilisation

```bash
agent-commons catalog info claude-seo
agent-commons catalog install claude-seo
# Après inspection de la prévisualisation :
agent-commons catalog install claude-seo --yes
agent-commons sync --skill claude-seo --agent codex --dry-run
# Après inspection :
agent-commons sync --skill claude-seo --agent codex
agent-commons skills load claude-seo
```

Exemple de demande : « Utilise claude-seo pour auditer le SEO technique et GEO de https://example.com ; reste en lecture seule, cite les preuves, priorise les corrections et propose des tests de validation. » Adapter le client aux agents compatibles avec les skills (Claude Code, Codex, Gemini CLI, etc.).

## Périmètre

23 points d'entrée originaux (hub compris), références locales, schémas JSON et données de référence, licence complète. Le point d'entrée synthétique oriente vers un seul workflow et permet un usage documentaire avec les outils autorisés du client. L'installation télécharge les fichiers épinglés et vérifie leur hash ; elle ne les exécute pas.

- `skills/seo/SKILL.md`
- `skills/seo-agentic/SKILL.md`
- `skills/seo-audit/SKILL.md`
- `skills/seo-backlinks/SKILL.md`
- `skills/seo-cluster/SKILL.md`
- `skills/seo-competitor-pages/SKILL.md`
- `skills/seo-content/SKILL.md`
- `skills/seo-content-brief/SKILL.md`
- `skills/seo-drift/SKILL.md`
- `skills/seo-ecommerce/SKILL.md`
- `skills/seo-geo/SKILL.md`
- `skills/seo-google/SKILL.md`
- `skills/seo-hreflang/SKILL.md`
- `skills/seo-images/SKILL.md`
- `skills/seo-local/SKILL.md`
- `skills/seo-maps/SKILL.md`
- `skills/seo-page/SKILL.md`
- `skills/seo-plan/SKILL.md`
- `skills/seo-programmatic/SKILL.md`
- `skills/seo-schema/SKILL.md`
- `skills/seo-sitemap/SKILL.md`
- `skills/seo-sxo/SKILL.md`
- `skills/seo-technical/SKILL.md`

Exclusions volontaires : scripts Python et lanceurs, agents Claude, hooks, fichiers de plugin, installateurs, extensions et miroirs Bing/DataForSEO/image-gen/PostHog/Shopify, et FLOW (contenu CC BY 4.0 distinct). Ne pas prétendre que les commandes natives, mesures Chromium, données Search Console ou sous-agents fonctionnent dans ce pack. Les références non incluses sont à signaler ; les contrôles sans données sont « non vérifiés ».

## Runtime natif facultatif

Pour le plugin complet, consulter [l'installation officielle épinglée](https://github.com/AgricIDaniel/claude-seo/blob/5d7d85ef32ade08dd4265cb678af8357ca6e6098/docs/INSTALLATION.md), [la sécurité](https://github.com/AgricIDaniel/claude-seo/blob/5d7d85ef32ade08dd4265cb678af8357ca6e6098/SECURITY.md) et [la confidentialité](https://github.com/AgricIDaniel/claude-seo/blob/5d7d85ef32ade08dd4265cb678af8357ca6e6098/PRIVACY.md). Examiner la source et installer séparément à la révision choisie, puis exécuter `/seo setup` et `/seo doctor` dans Claude Code seulement après approbation. Python et Chromium sont des dépendances natives, pas des dépendances Agent Commons. Les services tiers, données privées et actions d'indexation requièrent une autorisation explicite. Aucun secret ni rapport n'est transmis par Agent Commons lors de l'installation du pack.

La revue porte sur la provenance, la licence et la sélection de fichiers, pas sur la sécurité complète du code amont ni sur l'exécution réelle de Claude SEO.
