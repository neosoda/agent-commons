# Motion Educator — Agent Commons

**Source :** [Zeative / motion-educator](https://github.com/zeative/motion-educator), licence [MIT](https://github.com/zeative/motion-educator/blob/c7914463f915e628f41270eae4e77de6a23460e1/LICENSE), épinglée au commit [`c7914463f915e628f41270eae4e77de6a23460e1`](https://github.com/zeative/motion-educator/tree/c7914463f915e628f41270eae4e77de6a23460e1) (revue du 2026-11-20).

Ce skill permet à Claude Code, Codex et Gemini CLI de préparer des **films pédagogiques animés** (16:9 ou 9:16) avec storyboard dessiné et vérifiable, faits sourcés, moteur déterministe 3D, sous-titres, voix et son. **Le storyboard doit être approuvé avant de produire le film.**

Agent Commons référence uniquement le commit Git. L'installation, sur accord explicite, sélectionne **38 fichiers sources (614 529 octets)** : `SKILL.md`, `package.json`, `references/` et `kit/`. Les vidéos, images et `examples/` restent [chez Zeative](https://github.com/zeative/motion-educator/tree/c7914463f915e628f41270eae4e77de6a23460e1/examples), sans téléchargement automatique ni copie dans Agent Commons.

## Installation et utilisation

```bash
agent-commons catalog search motion-educator
agent-commons catalog info motion-educator
agent-commons catalog install motion-educator              # aperçu, aucune écriture
agent-commons catalog install motion-educator --yes        # installation consentie
agent-commons catalog verify motion-educator
agent-commons skills route "Explique DNS en vidéo pédagogique de 45 secondes" --json
agent-commons skills load motion-educator                   # uniquement SKILL.md
agent-commons skills load motion-educator --resource references/storyboard.md
agent-commons sync --skill motion-educator --agent codex --dry-run
agent-commons sync --skill motion-educator --agent codex
```

Pour Claude Code utiliser `--agent claude-code` ; pour Gemini CLI, `--agent gemini-cli`. Le routeur n'injecte que des **métadonnées**. Après validation du storyboard, le guide amont propose `node <skill>/kit/tools/new.mjs <workspace> <film-name>` puis la préparation des dépendances **dans le projet vidéo séparé**.

## Prérequis et sécurité

- Agent Commons nécessite Node.js 22+ ; la réalisation vidéo utilise Node.js 20+, dépendances npm du kit, Playwright avec Chromium/WebGL2, FFmpeg/ffprobe, Python 3/NumPy et GPU ou Vulkan logiciel. L'installation du skill **ne prépare pas** ces outils.
- ElevenLabs pour la voix est facultatif, avec potentiel coût API. Aucune clé ne doit être transmise dans les prompts ; toute dépense ou connexion externe requiert un accord séparé.
- `kit/audio/fetch.sh` récupère des musiques et effets depuis Mixkit, sous **licences médias distinctes**. Aucune musique n'est incluse ; contrôler les droits avant publication.
- Les scripts tiers (`kit/tools/`, `kit/audio/`, `kit/farm/`) sont téléchargés mais **jamais exécutés par Agent Commons**. Ne pas activer `kit/farm/compose.yml` ni ouvrir l'accès réseau sans vérification spécifique.
- La revue est limitée à la **source et à la licence**, pas à un audit complet de code tiers ni à un test de rendu réel. Aucun agent personnel n'est modifié par les tests du projet.

**Prompt :** « Utilise motion-educator pour construire le storyboard illustré d'une leçon de 45 secondes en français sur DNS ; cite les faits et présente-moi le storyboard avant tout rendu et avant tout coût externe. »

Voir aussi [Video Engine](VIDEO_SKILLS.md) et [SaaS Product Demo](SAAS_PRODUCT_DEMO_VIDEO.md). Crédits : [Zeative](https://github.com/zeative/motion-educator) · [MIT](https://github.com/zeative/motion-educator/blob/c7914463f915e628f41270eae4e77de6a23460e1/LICENSE).
