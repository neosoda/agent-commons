# Trois nouvelles sources de skills

Date : **14 novembre 2026**. Aucun skill tiers n'est installé automatiquement par le catalogue.

## Chief of Staff — Matt Pocock

[Source à commit épinglé](https://github.com/mattpocock/skills/tree/5863806dd4e15c63174bee4e7515a4256792ecfa/skills/in-progress/chief-of-staff) · [Licence MIT](https://github.com/mattpocock/skills/blob/5863806dd4e15c63174bee4e7515a4256792ecfa/LICENSE)

Ce skill encore **expérimental** (`skills/in-progress`) pilote des objectifs complexes : coordination de sous-agents, mémoire documentaire, rétrospectives et suivi. Il fait référence à quatre autres skills par chemins relatifs : `../retro`, `../to-spec`, `../to-tickets`, `../implement-spec`. Ces quatre références sont également ajoutées au catalogue, **sans installation implicite**. Les workflows peuvent nécessiter des fonctionnalités propres à Claude Code, un issue tracker configuré ou d'autres skills (notamment `writing-for-agents` et `setup-matt-pocock-skills`).

```bash
agent-commons catalog install chief-of-staff     # Aperçu
agent-commons catalog install retro
agent-commons catalog install to-spec
agent-commons catalog install to-tickets
agent-commons catalog install implement-spec
# Après examen : reprendre chaque commande avec --yes et synchroniser au besoin
```

## Anatomy — Ryan (wheresryan22)

[Source à commit épinglé](https://github.com/wheresryan22/anatomy/tree/1482e8469b0a9e0d8cc18ea2740a01423d29ae80) · [Licence MIT](https://github.com/wheresryan22/anatomy/blob/1482e8469b0a9e0d8cc18ea2740a01423d29ae80/LICENSE)

Génère des figures isométriques interactives en SVG/WebGL/3D pour expliquer des concepts techniques. Le dépôt amont complet compte **173 fichiers (~27,6 Mo)** et dépasse les limites de l'installateur. Nous installons, sur demande, **126 fichiers sources (~1,9 Mio)** : `SKILL.md`, `LICENSE`, `agents/`, `kit/`, `references/`, `scripts/`, et les sources des exemples. Les PDF/HTML pré-générés et captures ne sont **pas** copiés. Certains exemples de `SKILL.md` renvoient à ces pages pré-générées : leurs scripts sources sont disponibles mais la génération doit être déclenchée séparément.

```bash
agent-commons catalog info anatomy
agent-commons catalog install anatomy          # Aperçu : vérification des 126 fichiers
agent-commons catalog install anatomy --yes    # Installation après accord
agent-commons catalog verify anatomy
agent-commons sync --skill anatomy --agent codex --dry-run
agent-commons sync --skill anatomy --agent codex
```

## Marketing Psychology — Corey Haines

[Source à commit épinglé](https://github.com/coreyhaines31/marketingskills/tree/1f837447b20bb6f0e72d87b80ece1c221c362c7d/skills/marketing-psychology) · [Licence MIT](https://github.com/coreyhaines31/marketingskills/blob/1f837447b20bb6f0e72d87b80ece1c221c362c7d/LICENSE)

Applique modèles mentaux et persuasion éthique au marketing ; peut lire un contexte produit existant (`.agents/product-marketing.md`).

```bash
agent-commons catalog install marketing-psychology
agent-commons catalog install marketing-psychology --yes
agent-commons sync --skill marketing-psychology --agent claude-code --dry-run
```

## Protections conservées

Le champ facultatif `installPaths` permet de sélectionner des fichiers ou des dossiers dans **un commit GitHub immuable**. Il exige des chemins sûrs, la présence de `SKILL.md` et de chaque sélecteur dans l'arbre. Les limites **150 fichiers, 8 Mio cumulés, 1 Mio par fichier** restent inchangées. Les fichiers exclus ne sont pas téléchargés, et les chemins dangereux ou liens symboliques sélectionnés sont refusés. Les blobs Git sont vérifiés, une sauvegarde précède l'écriture et aucune cible existante n'est remplacée. Un contrôle des licences et de la structure **n'est pas un audit de sécurité complet** des instructions tierces.

[Catalogue complet](skills/README.md) · [Politique du catalogue](SKILL_CATALOG.md)
