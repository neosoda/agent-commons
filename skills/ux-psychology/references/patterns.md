# Playbooks de design UX et arbitrages

Ces exemples sont des combinaisons **originales** et non des composants/scripts à installer. Adapter à la stack et aux observations.

## Catalogue de skills / Extension Manager
- **Lois** : Hick, surcharge des choix, proximité, Jakob, Fitts, peak-end.
- **Concevoir** : recherche et filtres pertinents, lignes denses et comparables plutôt qu'une avalanche de cartes ; source/licence/état vérifié près de l'action ; aperçu et confirmation d'installation distincts ; retour post-action exact.
- **Éviter** : installation automatique, badges santé non prouvés, source de metadata traitée comme audit de sécurité.
- **Tester** : recherche → détail → licence → aperçu → refus → approbation → vérification, sans surprise.

## Dashboard professionnel
- **Lois** : attention, Pareto, modèle mental, Tesler, esthétique.
- **Concevoir** : exceptions actionnables d'abord, regroupement par intention, tableau quand plusieurs éléments comparables, tri et recherche, densité adaptable et commandes clavier.
- **Éviter** : grille de KPI décoratifs, signaux faux, tout peindre en couleur d'alerte.
- **Tester** : diagnostiquer un item réellement problématique et accéder à sa résolution.

## Onboarding et premier succès
- **Lois** : utilisateur actif, gradation, Zeigarnik, Hick.
- **Concevoir** : une tâche significative dès le départ, indices contextuels, progression honnête, reprise de brouillon.
- **Éviter** : visite guidée forcée, chronomètre fictif, consentement contraint.
- **Tester** : novice réussit sans lire un manuel ; quitte puis reprend.

## Formulaires et réglages risqués
- **Lois** : proximité, chunking, mémoire de travail, Fitts, Postel.
- **Concevoir** : labels toujours proches, messages d'erreur associés, saisie récupérable, tolérance sûre de format, confirmation lisible pour action irréversible.
- **Éviter** : effacer sur erreur, accepter des formats qui contournent validation de sécurité, boutons destructifs trop proches.
- **Tester** : clavier seul, mauvaise saisie, erreur serveur, annulation sans effet, reprise.

## Recherche et comparateurs
- **Lois** : surcharge des choix, Hick, modèle mental, Von Restorff.
- **Concevoir** : critères comparables, facettes et tri transparents, état de recherche conservé, une emphase justifiée.
- **Éviter** : “meilleur choix” inventé, options cachées, tarifs non comparables.
- **Tester** : filtrer, comparer, revenir sans perdre les critères.

## États asynchrones
- **Lois** : Doherty, peak-end, Zeigarnik.
- **Concevoir** : accusé de clic immédiat, chargement réel, anti-double-soumission, erreur avec récupération, résultat explicite.
- **Éviter** : progression simulée, attente volontaire, spinner sans issue.
- **Tester** : lenteur, interruption, panne et retry, en vérifiant qu'aucun succès n'est inventé.

## UI premium sans “vibe coding”
- **Lois** : Jakob, esthétique, Prägnanz, Similarité.
- **Concevoir** : identité typo/grille/matières/mouvement distinctive ; conventions de navigation et états conservés, contraste et focus maîtrisés, vrais jeux de densités.
- **Éviter** : “card pour chaque donnée”, icônes mystérieuses, effets de verre permanents, motion obligatoire.
- **Tester** : premier visiteur sait où cliquer ; expert termine la tâche aussi vite ou plus vite.

## Tactile et accessibilité
- **Lois** : Fitts, proximité, Tesler.
- **Concevoir** : zones activables confortables sans gonfler tous les visuels, flux responsive préservant les fonctions, focus visible, zoom et mouvement réduit.
- **Éviter** : masquer les commandes essentielles sur mobile, coder états uniquement par couleur.
- **Tester** : touch, clavier, zoom, AT quand disponible ; indiquer explicitement ce qui n'a pas été testé.

## Comment arbitrer les contradictions
- Hick vs expert : réduire le premier écran, conserver les fonctions avancées accessibles.
- Fitts vs densité : augmenter les hitboxes avant la taille visuelle de tous les contrôles.
- Jakob vs identité : laisser la créativité dans l'expression visuelle, pas dans les actions de base.
- Esthétique vs performance : mesurer les parcours plutôt que juger seulement la beauté.
- Sécurité vs rapidité : confirmer les vraies conséquences, pas les opérations anodines.
