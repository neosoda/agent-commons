---
name: ux-psychology
description: Auditer, concevoir et améliorer des interfaces UX/UI avec les lois psychologiques UX, les parcours utilisateur, l'accessibilité, des preuves et des tests. For web design, redesign, dashboard, forms, onboarding, usability and navigation.
---

# UX Psychology — Laws of UX appliquées aux produits réels

Skill indépendant inspiré de l'index public des **30 concepts** de [Laws of UX](https://lawsofux.com/fr/) (Jon Yablonski, traduction du site créditée à Lionel Nolhac). Les méthodes sont originales ; aucune reproduction des textes, affiches ou illustrations. Ce skill n'est ni officiel ni affilié à Laws of UX.

## Quand l'utiliser
Audit UX, refonte, création d'interface, amélioration de navigation, formulaire, catalogue, tableau de bord, onboarding, retours d'erreur, performance perçue, accessibilité ou parcours produit. Être concret et conserver les fonctionnalités qui marchent.

## Chargement progressif — lire seulement le nécessaire
- `references/principles.md` : les 30 concepts, signaux, actions, validation et limites.
- `references/audit-workflow.md` : audit, notation des problèmes, priorisation et matrice de tests.
- `references/patterns.md` : scénarios précis et arbitrage entre principes.
- `references/sources.md` : crédits, liens, droits et limites scientifiques.
Ne jamais précharger tous ces fichiers. Le routeur Agent Commons découvre d'abord les seules métadonnées ; ce fichier est chargé sur demande ; les références sont optionnelles.

## Méthode impérative
1. **Cadrer** : utilisateur (novice/expert), objectif, parcours complet, appareil, contraintes produit et technique. Exploiter le contexte existant. Ne pas inventer de captures, tests ou données utilisateur.
2. **Observer** : inspecter l'interface réelle/code quand accessibles. Parcourir le chemin nominal ET chargement, vide, erreur, annulation et succès. Distinguer `observé`, `hypothèse`, `non vérifié`.
3. **Diagnostiquer** : `indice précis → friction → 1 ou 2 principes pertinents → conséquence`. Sélectionner 2–5 principes adaptés, pas les 30. Identifier les conflits entre heuristiques.
4. **Hiérarchiser** : P0 sécurité/perte de données/blocage majeur ; P1 parcours bloqué ou accessibilité grave ; P2 friction fréquente ; P3 cosmétique. Ne pas prétendre mesurer une gravité sans preuve.
5. **Proposer / réaliser** : optimiser architecture de l'information, hiérarchie, libellés, densité, interactions, états, recherche, feedback, navigation clavier et tactile. Respecter stack, identité, composants, sécurité, permissions et demandes d'approbation. Pas de refonte décorative générique en cartes.
6. **Tester** : parcours principal, responsive (dont mobile), focus clavier, noms accessibles, contrastes, zoom, erreurs, réduction des animations, état initial/chargement/vide/succès et régression. Lister les tests réellement effectués et ceux impossibles.
7. **Rendre** : constat, preuve, loi utile, correction ciblée, critère d'acceptation, limites. Ne jamais annoncer un gain de conversion, un score UX ou la conformité WCAG sans mesure.

## Arbitrages non négociables
- **Jakob vs singularité** : garder les conventions compréhensibles pour les actions ; innover sur identité, composition et expression.
- **Hick vs Tesler** : réduire les choix immédiats sans masquer le métier ; accès avancé possible.
- **Fitts vs densité** : bonnes zones de clic sans interfaces grotesquement gonflées.
- **Esthétique vs utilisabilité** : le WOW visuel ne suffit pas ; réussite des tâches et accessibilité priment.
- **Miller** : ne jamais appliquer de limite arbitraire de sept éléments.
- **Pareto** : ne jamais supposer empiriquement le ratio 80/20.
- **Doherty** : 400 ms est un repère historique, pas une SLA universelle ; jamais de latence ou de progression simulée.
- **Postel** : tolérance de saisie encadrée, sans affaiblir les validations de sécurité.
- **Éthique** : pas de dark patterns, pression artificielle, consentement manipulé ou exclusivité visuelle trompeuse.

## Formats de sortie
Audit : `Écran | Preuve | Friction | Principe | Priorité | Action | Vérification`.
Implémentation : fichiers modifiés, comportement préservé, tests effectués, restrictions restantes. Si absence de preuve : dire « hypothèse à valider ».

### Prompts d'exemple
- « Audite l'UX du catalogue de skills, les parcours d'installation et de synchronisation ; classe les corrections. »
- « Refonte premium et originale, mais conserve accessibilité, conventions et fonctions existantes. »
- « Vérifie la navigation clavier, la densité d'un dashboard, les états de chargement et la gestion des erreurs. »

Aucun script, hook, MCP, exécution, téléchargement ou modification automatique n'est déclenché par ce skill. Lire `references/sources.md` pour l'attribution complète.
