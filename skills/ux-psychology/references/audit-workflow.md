# Audit UX reproductible

## 1. Point de départ
Identifier utilisateur novice/expert, tâche principale, entrée et sortie, appareil, contraintes métier et confidentialité. Se concentrer sur **un parcours complet** plutôt que compter les composants. Une bonne tâche pour Agent Commons : trouver un skill → vérifier source/licence → prévisualiser → approuver explicitement → synchroniser les bons agents → constater l'état réel.

## 2. Source et niveau de certitude
- **Observé** : code, capture, parcours exécuté, événement, log ou retour utilisateur réellement consulté.
- **Hypothèse** : friction vraisemblable selon une heuristique, non validée.
- **Inconnu** : environnement, utilisateur, mesure ou état inaccessible.
Toujours distinguer ces trois niveaux ; n'inventer ni captures, ni temps, ni conversions.

## 3. Inspection orientée tâches
- Entrée, repérage de l'action, hiérarchie, vocabulaire et navigation.
- Affordance de chaque bouton et statut, labels, groupement visuel et sémantique.
- Recherche, filtrage, comparaison, détails, raccourcis experts, réversibilité.
- Formulaire : validation, erreur associée au champ, préservation de saisie, confirmation.
- États initial, chargement, vide, erreur, succès, annulation, reprise, hors ligne et permission refusée.
- Responsive : largeur mobile 320–390 px, zoom et overflow ; zones tactiles.
- Clavier : Tab, ordre et visibilité du focus, Entrée/Espace, Escape dans les dialogues.
- Accessibilité : noms/rôles, structure de titres, statut annoncé, contraste, mouvement réduit.
- Opérations risquées : confirmation, permissions réelles, annulation et non-manipulation du consentement.

## 4. Barème de gravité
- **P0** : perte de données, action dangereuse trompeuse, barrière critique démontrée.
- **P1** : parcours central bloqué, erreur fréquente bloquante, obstacle majeur d'accessibilité.
- **P2** : friction régulière de compréhension, navigation ou feedback.
- **P3** : incohérence ou finition d'impact limité.
Si les preuves manquent, écrire `hypothèse à confirmer` au lieu de certifier la gravité.

## 5. Livrable d'audit
| ID/écran | Preuve/reproduction | Impact sur la tâche | 1–2 principes | P0–P3 | Correction la plus simple | Test d'acceptation |
|:--|:--|:--|:--|:--|:--|:--|
| Ex. C-01 Catalogue | Hypothèse : options uniformes | Décision plus lente | Hick, Similarité | P2 (provisoire) | Rechercher, filtrer, distinguer statuts | Retrouver un skill et comprendre son statut |

Privilégier les 3 à 5 constats les plus utiles. Ne jamais créer des scores arbitraires d'UX.

## 6. Conception et validation
Définir : architecture de l'information, contrat d'interaction (clic/touche/clavier/focus), hiérarchie, typographie, états, adaptation mobile, non-objectifs et régressions à éviter. Réutiliser les composants existants et préserver les contrôles opérationnels.

Matrice de vérification : tâche de bout en bout, tablette/mobile, clavier, zoom, contrastes pertinents, `prefers-reduced-motion`, formulaire et erreurs, chargement lent, permissions et annulations, non-régression de l'ancien parcours. Vérifier les critères applicables du [WCAG 2.2](https://www.w3.org/TR/WCAG22/) ; **ne pas dire “conforme WCAG” sur la base d'un lint automatique**.

Mesures possibles **si collectées** : taux d'accomplissement, mauvaises actions, durée, retours arrière, demandes d'aide et blocages. Préciser dispositif et échantillon. Zéro pourcentage d'amélioration inventé.

## 7. Restitution
Faits prouvés, hypothèses non vérifiées, corrections priorisées, fichiers réellement changés, tests exécutés et risques résiduels. Ne jamais lancer d'installation, modification de production ou test destructif du seul fait de ce skill.
