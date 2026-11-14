# Video Engine et Remotion Superpowers — intégration Agent Commons

Deux sources MIT épinglées au **14 novembre 2026** :
- [ninjasweb/video-engine-skill](https://github.com/ninjasweb/video-engine-skill/tree/cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5) — auteur ninjasweb, [licence](https://github.com/ninjasweb/video-engine-skill/blob/cf35b05a9ecf3e878eff30c9ffaa8a911248d7c5/LICENSE). Entrée `video-engine`, skill racine et guides `references/`.
- [DojoCodingLabs/remotion-superpowers](https://github.com/DojoCodingLabs/remotion-superpowers/tree/970efd2d2f4ce2492231a31ee684c2ead883f4bc) — auteur Dojo Coding Labs, [licence](https://github.com/DojoCodingLabs/remotion-superpowers/blob/970efd2d2f4ce2492231a31ee684c2ead883f4bc/LICENSE). **15 skills indépendants** dans `skills/<id>/`.

## Quel skill utiliser ?

**`video-engine`** : pour produire des vidéos narrées, avec synchronisation mot à mot, Remotion/SVG déterministe, SRT, miniature et validation visuelle. Excellent pour les explications pédagogiques et séries d'épisodes.

**`remotion-production`** : pour orchestrer les médias d'une production Remotion avec uniquement les règles utiles au projet. Autres skills Dojo : `create-video`, `create-short`, `add-captions`, `add-music`, `add-transitions`, `add-voiceover`, `analyze-footage`, `find-footage`, `generate-clip`, `generate-image`, `review-video`, `setup`, `setup-guide` et `transcribe`. Les références des sous-dossiers `remotion-production/rules` et `setup-guide/rules` sont conservées à l'installation de ces deux skills.

**Important :** la suite Dojo attend aussi 12 skills Remotion officiels ; ils ne sont **ni repris ni installés** automatiquement. Les scripts, hooks, plugins et le `.mcp.json` du dépôt Dojo ne sont pas téléchargés par une installation individuelle.

## Installation sélective et chargement progressif

```bash
agent-commons catalog search remotion-superpowers
agent-commons catalog info video-engine
agent-commons catalog install video-engine                # aperçu réseau sans écriture
agent-commons catalog install video-engine --yes          # accord explicite
agent-commons catalog verify video-engine
agent-commons skills route "Crée une vidéo pédagogique narrée en 9:16" --json
agent-commons skills load video-engine                    # charge uniquement SKILL.md
agent-commons skills load video-engine --resource references/voice-and-alignment.md
agent-commons sync --skill video-engine --agent codex --dry-run
agent-commons sync --skill video-engine --agent codex
```

Pour un besoin de production Dojo, remplacer `video-engine` par `remotion-production`, `create-video` ou le skill spécialisé. Installer séparément les compagnons utiles. Dans Claude Code : `/video-engine` ou `/create-video` **une fois relié à cet agent** ; dans Codex : `$video-engine`, `$create-video`. Pour Gemini CLI : utiliser l'invocation native, sans inventer de commande slash universelle.

Le routeur ne renvoie que les **métadonnées** ; `skills load` est une lecture explicite et bornée, pas une exécution. Aucun skill n'est automatiquement installé, injecté, synchronisé, exécuté ou chargé en masse.

## MCP externes, prérequis et coûts

Le dépôt Dojo propose cinq serveurs dans son `.mcp.json` : **ElevenLabs** (voix/musique), **remotion-media** (génération), **TwelveLabs** (analyse), **Pexels** (banque de médias) et **Replicate** (modèles). Il s'agit de **suggestions tierces**, pas de cinq entrées approuvées du catalogue MCP. Avant de les ajouter manuellement dans le [MCP Control Center](MCP_CONTROL_CENTER.md), vérifier les packages et versions, autorisations, limites d'accès au dossier de rendu `public/`, clés API, facturation et licences des médias. Ne jamais mettre les clés dans les prompts, ni exécuter automatiquement les commandes `npx`, `uvx`, `npx skills add` des guides tiers.

Node/Remotion/ffmpeg, parfois Python ou un fournisseur de transcription, sont nécessaires **au projet vidéo**, pas à Agent Commons. La génération d'actifs, les appels distants, TTS payants, téléchargements et rendus nécessitent une approbation séparée. Vérifier la licence Remotion et les droits des voix, images, musiques et séquences. Les dépôts sont examinés au niveau **source/licence** : cela ne constitue pas un audit de sécurité du code tiers.

**Prompts :** « Utilise video-engine pour scénariser une leçon de 45 secondes, synchronisée sur la narration ; demande mon accord avant tout TTS payant. » / « Utilise create-short pour préparer un Reel 9:16 avec sous-titres, sans lancer le rendu avant validation. »

Crédits : [ninjasweb](https://github.com/ninjasweb/video-engine-skill) et [Dojo Coding Labs](https://github.com/DojoCodingLabs/remotion-superpowers), MIT aux commits indiqués plus haut. Agent Commons ne redistribue pas leurs skills.
