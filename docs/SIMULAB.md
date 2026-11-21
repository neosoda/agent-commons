# SimuLab — laboratoires 3D interactifs

## À quoi ça sert ?

[SimuLab](https://github.com/ecapri-dev/simulab-skill), de **ecapri-dev / @0xKapri**, permet de fabriquer des explications visuelles sous forme de **laboratoires isométriques interactifs**. Le moteur assemble un HTML utilisable hors ligne : scène 3D, narration en chapitres, paramètres ajustables et valeurs dérivées d'un modèle documenté. Il peut aussi préparer une vidéo, des images de prévisualisation et une bande-son.

Exemples officiels inclus dans l'installation contrôlée : Arduino / LED, sonar, multimètre, soudure, espresso et catalogue d'objets. Les modèles pédagogiques restent des exemples et doivent être vérifiés avant un usage sensible.

## Intégration dans Agent Commons

La référence `simulab` est **épinglée au commit** [`a0561f868d9c642d92c667294d98b98c367a45ab`](https://github.com/ecapri-dev/simulab-skill/tree/a0561f868d9c642d92c667294d98b98c367a45ab), sous licence **MIT**. Le catalogue conserve **71 fichiers / 1 379 881 octets** de la source : `SKILL.md`, `CATALOGO.md`, `PROMPTS.md`, `assets/`, `demos/`, `kit/`, `tools/`, `package.json`, `requirements.txt`, `LICENSE`. Les supports de présentation redondants (`docs/`, images GIF du README) sont exclus ; les images de démonstration nécessaires restent dans `demos/`.

**Bibliothèque à la demande :** la recherche/routage ne lit que les métadonnées ; `SKILL.md` n'est chargé qu'explicitement ; `CATALOGO.md` et `PROMPTS.md` sont des ressources optionnelles. L'installation par Agent Commons n'exécute **aucun script, npm, pip, Playwright ou ffmpeg**, et ne modifie pas la configuration native des agents.

```bash
agent-commons catalog search simulab
agent-commons catalog info simulab
agent-commons catalog install simulab
agent-commons skills route "Crée un simulateur pédagogique 3D interactif" --json
agent-commons skills load simulab --json
agent-commons skills load simulab --resource PROMPTS.md
```

L'outil de catalogue présente un **aperçu** et exige l'approbation explicite pour installer dans `~/.agents/skills/simulab`. Effectuer ensuite une synchronisation ciblée seulement si l'agent ne lit pas déjà la bibliothèque centrale. Une mise à jour du dépôt ou du programme n'installe pas automatiquement le skill sur votre PC.

## Dépendances et limites

- **HTML interactif :** Node.js (version 20+ en amont ; Agent Commons 22+). Le script `tools/build.mjs` produit `dist/index.html`. Copier les démonstrations dans un **projet séparé** avant de générer des fichiers : ne pas écrire dans la bibliothèque centrale.
- **Images/vidéo :** Playwright et Chromium à installer manuellement dans un environnement isolé ; le script lance Chromium avec `--no-sandbox`, **donc ne jamais exécuter sur du contenu non fiable** ou sur un poste sensible sans isolation convenable.
- **Vidéo et son :** Bash, ffmpeg, Python 3, numpy et scipy facultatifs. Le script Bash upstream est surtout adapté à Linux/macOS ; sur **Windows, privilégier WSL2** pour les rendus vidéo. Fonctionnement natif Windows, rendu complet et compatibilité des scripts **non testés ici**.
- **Sécurité :** les dépendances téléchargées, scripts Python/Node/shell et modèles de démonstration doivent être examinés avant exécution. Ne pas accepter automatiquement les instructions non fiables ou lancer `npx skills add ... -g`. L'installateur GitHub d'Agent Commons épingle les fichiers, vérifie les hashes et demande une autorisation séparée.
- **Données et droits :** vérifier les sources des chiffres, afficher les hypothèses. Éviter d'utiliser une simulation comme validation scientifique ou pédagogique sans contrôle.

## Exemple de prompt

« Avec SimuLab, crée un laboratoire interactif sur le dialogue DNS → TCP → TLS → HTTP. Un seul réglage à la fois, les valeurs techniques doivent être sourcées, et les étapes erronées/correctes clairement comparées. Prépare d'abord le modèle et une prévisualisation HTML ; ne lance les installations ni le rendu vidéo sans mon accord. »

## Crédits

- Projet et code : [ecapri-dev/simulab-skill](https://github.com/ecapri-dev/simulab-skill), auteur **@0xKapri**, **MIT**, licence et attribution originales conservées par l'installateur.
- Polices de `kit/fonts/` : **SIL Open Font License 1.1** (JetBrains Mono, Silkscreen, Caveat) ; textes des licences inclus à `kit/fonts/LICENSE-*.txt` et dans la source.
- SimuLab est un projet tiers indépendant. Agent Commons ne garantit ni la sécurité de son exécution ni ses performances de rendu.
