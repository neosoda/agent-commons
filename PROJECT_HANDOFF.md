# PROJECT_HANDOFF — Agent Commons

> **Mémoire opérationnelle pour toute reprise IA.** Lire ce document **avant** toute modification et vérifier les données GitHub en direct : les SHA, runs CI et états de publication ci-dessous sont des **instantanés**, pas une preuve permanente. Le [README](README.md) est la documentation utilisateur ; ce fichier concerne la maintenance, l'audit, la feuille de route et la reprise.
>
> **Dernière revue : 2026-10-30 (Europe/Paris).** Dépôt : https://github.com/neosoda/agent-commons · branche de référence : `main`. Cette revue repose sur le code et les statuts GitHub accessibles par connecteur et sur les exécutions CI publiées ; **aucun accès direct à un worktree Windows utilisateur ou à un environnement npm authentifié** n'a été établi.

## 1. Projet, architecture et maturité

**Finalité.** Agent Commons est un gestionnaire **local-first** qui mutualise des skills IA et des définitions MCP entre plusieurs assistants de programmation, sans écraser leurs paramètres existants. Les modifications du système de fichiers et des configurations doivent être prévisualisées, explicitement approuvées et sauvegardées quand elles sont destructrices.

**Fonctions présentes :**
- Détection de **17 environnements d'agents** enregistrés ; ne pas confondre *enregistré*, *installé* et *synchronisé*.
- Bibliothèque centrale de skills, liens symboliques/jonctions NTFS, contrôle des chemins et des conflits.
- Catalogue public de références **épinglées** (103 skills au dernier contrôle du catalogue) : recherche, inspection de provenance/licence, prévisualisation d'installation/mise à jour/retrait, reçus et vérification d'intégrité. Métadonnées révisées ≠ audit de sécurité du code tiers.
- Manifeste MCP commun, adaptateurs JSON/JSONC/TOML selon les agents, aperçu des changements et synchronisation explicite.
- Profils de skills par agent, prévisualisation, backups/snapshots et restauration.
- **Skill Hub Web local** : overview, catalogue, agents/profils, diagnostics, snapshots et éditeur MCP restreint. Dans l'éditeur, création stdio/HTTP/SSE, routage/activation d'entrées existantes et suppression ; les commandes, URL et valeurs d'environnement **existantes** ne sont pas exposées au navigateur. L'édition ne synchronise pas automatiquement les agents.
- Distribution Windows portable (ZIP avec runtime Node officiel épinglé et vérifié SHA-256) assemblée et testée par GitHub Actions.

**Stack et répertoires :** TypeScript strict, Node.js **>=22**, modules ESM/NodeNext, npm, dépendance d'exécution `jsonc-parser` ; pas de framework web/frontend ni de base de données. Code : `src/agents/` (registre/détection), `src/commands/` (CLI et opérations), `src/core/` (contexte, liens et snapshots), `src/security/`, `src/sync/` (skills et MCP), `src/web/` (serveur, UI et éditeur), `src/test/`. Scripts de build/catalogue/QA/portable : `scripts/`. Documentation/catalogue : `docs/`, `catalog/`. Entrée CLI : `src/cli/index.ts` -> `dist/cli/index.js`.

**Maturité :** **GitHub Release v0.2.0 officielle publiée**, avec ZIP Windows portable et SHA-256 vérifiés. La CI du tag est verte, mais **la distribution npm est bloquée** lors de sa première publication ; le lancement Windows portable n'a été validé qu'en CI, pas sur chaque PC réel.

## 2. Travaux intégrés et choix importants

| PR / commit de fusion | Livraison intégrée sur `main` |
|---|---|
| [#17](https://github.com/neosoda/agent-commons/pull/17) — `b20d5ae` | Skill Hub local, protection HTTP, tests Chromium multi-viewport, fabrication du ZIP Windows |
| [#20](https://github.com/neosoda/agent-commons/pull/20) — `7514148` | Éditeur MCP prudent : prévisualisation, révision SHA-256, écriture JSONC, snapshot/rollback et tests |
| [#21](https://github.com/neosoda/agent-commons/pull/21) — `87836d1` | Workflow pour joindre ZIP Windows et checksum aux GitHub Releases |
| [#22](https://github.com/neosoda/agent-commons/pull/22) — `7b4b78a` | Version **0.2.0** dans `package.json` et `package-lock.json`, checklist de release |
| [#23](https://github.com/neosoda/agent-commons/pull/23) — `2230970` | Workflow npm OIDC renforcé, vérification préalable du contenu réel du tarball |
| [#25](https://github.com/neosoda/agent-commons/pull/25) — `0fd31b5` | `PROJECT_HANDOFF.md`, `AGENTS.md`, audit et feuille de route pérenne |
| [#24](https://github.com/neosoda/agent-commons/pull/24) — `6ad617d` | Workflow sécurisé de publication v0.2.0, notes de release, reprise après publication partielle |
| [#26](https://github.com/neosoda/agent-commons/pull/26) — `555643b` | Correction de la déclaration `bin` npm, test de régression, suppression du workflow one-shot et actualisation du handoff |
| [#28](https://github.com/neosoda/agent-commons/pull/28) — `4301f0d` | Vérification récursive des payloads de sauvegarde avant restauration, refus des liens imbriqués et test anti-perte de données |
| [#30](https://github.com/neosoda/agent-commons/pull/30) — `5a65a02` | Restauration préparée sur le volume cible, permutation avec originaux récupérables et rollback multi-entrée ; injections EIO/EACCES et tests de concurrence |
| [#32](https://github.com/neosoda/agent-commons/pull/32) — `b288427` | Empreintes récursives des dossiers, refus d'écrasement concurrent au commit/rollback, tests de sauvegarde récupérable et guide de secours |
| [#34](https://github.com/neosoda/agent-commons/pull/34) — `3cc5b2d` | Réponses d'erreur HTTP sur messages sûrs explicitement autorisés, retours génériques pour exceptions arbitraires, tests de restauration et rollback |
| [#36](https://github.com/neosoda/agent-commons/pull/36) — `dacb85c` | Navigation clavier et modales accessibles (focus, inert, Escape, Tab), labels ARIA, alertes et tests Chromium multi-écrans |
| [#38](https://github.com/neosoda/agent-commons/pull/38) — `9b7696e` | Contraste non textuel des commandes et modales, tests Chromium des couleurs calculées, annonces de rafraîchissement |
| [#39](https://github.com/neosoda/agent-commons/pull/39) — `2c8ef2e` | Sélecteur local FR/EN, préférence persistante navigateur, dictionnaire de libellés UI, tests Chromium traduction/toast/persistance et README |

**Décisions à conserver :** local-only sur `127.0.0.1`, sans télémétrie ni CDN ; protection Host/Origin/CSRF/CSP ; ne jamais exposer le dashboard sur Internet (il **n'a pas d'authentification distante**). Aucune installation, synchronisation, suppression ou restauration implicite. Les chemins privés et secrets ne doivent jamais remonter dans les réponses HTTP. Les skills locaux non gérés ne doivent pas être écrasés. Les snapshots et liens doivent être traités avec précaution (symlinks, junctions, différences Windows/macOS/Linux). Réutiliser la logique métier CLI, ne pas la dupliquer dans le serveur web. Ne pas prétendre que l'analyse de licence garantit la sûreté d'un skill.

### État actuel vérifié — release v0.2.0

- **`main` vérifiée le 2026-10-30 : `2c8ef2e6587fcd1b80ebaf1df48e61037c77327a`** (fusion [#39](https://github.com/neosoda/agent-commons/pull/39)). [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41045018969), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41045018942) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41045018972) tous `success`. Revue des agents locaux non effectuée. Ce constat ne couvre pas les fichiers locaux non commités du PC utilisateur.

- **Tag `v0.2.0` :** `6ad617d5aeb4fea07b348f458dc0c8c3842ebaff` (tag léger pointant exactement sur ce commit ; ne pas le déplacer). La [release GitHub v0.2.0](https://github.com/neosoda/agent-commons/releases/tag/v0.2.0) a été publiée le **2026-10-29 à 17:17 UTC**, avec `AgentCommons-win-x64-portable.zip` et `AgentCommons-win-x64-portable.zip.sha256`.
- **Validations historiques du commit de release `6ad617d` :** [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/40919654232), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/40919654286) et [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/40919654268) : tous `completed/success`. Le workflow [Verified v0.2.0 release](https://github.com/neosoda/agent-commons/actions/runs/40919820995) a abouti.
- **npm : PAS PUBLIÉ / NON CONFIRMÉ.** Les [runs npm OIDC #40919949448](https://github.com/neosoda/agent-commons/actions/runs/40919949448) et [#40920030835](https://github.com/neosoda/agent-commons/actions/runs/40920030835) ont tous deux échoué avec **E404** pendant `npm publish --provenance --access public` : registre ne trouvant pas `@neosoda/agent-commons@0.2.0` ou autorisation/scope inexistant. Les étapes build, tests, audit et tarball étaient vertes. Le job affichait aussi un avertissement de normalisation du chemin `bin` à cause de `./dist/cli/index.js` ; ne pas confondre cet avertissement avec la cause E404. Vérifier le `bin` du tarball avant première publication.
- **Nettoyage post-release terminé :** PR [#26](https://github.com/neosoda/agent-commons/pull/26) fusionnée en `555643b`, après CI 6/6 + Chromium + Windows portable réussis. Déclaration npm `bin` normalisée en `dist/cli/index.js`, test de régression ajouté, workflow one-shot `release-v0.2.0.yml` retiré. Le tag `v0.2.0` demeure volontairement sur le commit original `6ad617d` ; **ne pas le déplacer**.
- **Blocage externe réel :** le propriétaire npm doit s'assurer qu'il contrôle le scope `@neosoda`, effectuer si nécessaire la **première publication authentifiée avec 2FA** pour créer le paquet, puis configurer le Trusted Publisher pour les versions suivantes (`neosoda`, `agent-commons`, `publish.yml`, environnement `npm`, droit `npm publish`). Ne pas générer de token ni contourner l'autorisation ; ne pas prétendre que le paquet est présent avant `npm view @neosoda/agent-commons@0.2.0 version`.
- **Attention aux workflows :** une release créée par `GITHUB_TOKEN` ne déclenche pas automatiquement les workflows sur `release.published`. Le workflow spécifique #24 a publié les assets et dispatché npm. Son retrait post-release empêche de réessayer indéfiniment un bootstrap npm bloqué ; conserver `publish.yml` et `release-assets.yml` pour le futur.
- **Conditions de fin :** publication vérifiée du paquet par son propriétaire, mise en place et essai de Trusted Publishing à la prochaine version, installation CLI/npx testée depuis le registre. Une release GitHub publiée n'est pas synonyme d'une publication npm.

### Session 2026-10-30 — durcissement de la restauration (PR #28)

- **Base vérifiée avant modification :** `main` `c4f16ad`, trois workflows terminés avec succès (CI 6/6, Chromium, Windows). Aucune PR ouverte au début de session ; la release GitHub v0.2.0 est inchangée. Les tentatives précédentes de publication npm restent bloquées en E404 ; la disponibilité publique du paquet n'est pas confirmée.
- **Problème identifié :** la restauration d'un dossier sauvegardé vérifiait le chemin de payload lui-même, mais non ses descendants. Un lien symbolique/jonction ajouté sous ce payload *après le backup* pouvait déclencher une erreur de copie après suppression de la destination actuelle.
- **Correction fusionnée dans [#28](https://github.com/neosoda/agent-commons/pull/28) :** `src/core/backup.ts` prévalide récursivement les dossiers sauvegardés avec `lstatSync`, refuse liens et types non pris en charge **avant toute suppression**. `src/test/backup-security.test.ts` injecte un lien dans une sauvegarde puis vérifie la conservation des fichiers MCP/skill modifiés et des données externes. Pas de nouvelle dépendance.
- **Validation confirmée :** tête PR `51f16f305c008970fcee474d32507e2ceaa6f490` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41032058754), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41032058869) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41032058886) tous `success`. Squash merge `4301f0d` ; trois workflows `main` confirmés verts ci-dessus. Aucun test effectué sur le PC Windows réel de l'utilisateur.
- **Restant P1 :** vérifier les échecs de permissions et les races entre preflight et application, les liens de parents et le rollback d'écritures concurrentes ; puis installation du ZIP de release sur un Windows réel. La vérification npm reste une action du propriétaire.

### Session complémentaire 2026-10-30 — restauration préparée avec rollback (#30 fusionnée)

- **Point de départ contrôlé :** `main` `b5aa8e6bc6f2f31f50bbb0f052133b6b340a0262` (PR #29), sans PR ouverte. **Nouvelle base validée : `main` `5a65a02c8dfefdf772be325b017035c11abb2a56`** (squash PR [#30](https://github.com/neosoda/agent-commons/pull/30)). Les jobs post-merge [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41033773069), [QA Chromium](https://github.com/neosoda/agent-commons/actions/runs/41033772967) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41033773110) sont terminés **success** sur ce SHA.
- **Risque reproduit par revue de code :** l'ancien `restoreBackup` supprimait sa destination puis copiait le payload ; un EIO/EACCES ou un échec plus tard dans une restauration multi-entrée pouvait laisser les anciens contenus perdus ou partiellement restaurés.
- **Modification fusionnée dans la PR #30 :** tous les remplacements sont d'abord copiés dans un staging physique créé à côté de chaque destination (même volume). L'état de la cible est vérifié avant la permutation ; l'ancienne cible est déplacée dans le staging plutôt que supprimée immédiatement. En cas d'erreur lors des permutations, les anciennes cibles sont remises en place en ordre inverse ; si ce rollback échoue lui-même, les répertoires de staging contenant les originaux sont **conservés**. Nettoyage seulement après succès complet.
- **Tests ajoutés :** défaut EIO durant la préparation, défaut EACCES lors de la seconde permutation avec rollback multi-entrée, modification concurrente d'un fichier pendant préparation, restauration nominale sans résidu de staging.
- **Limites :** sécurité best-effort ; aucune garantie transactionnelle contre coupure d'alimentation, changement concurrent ultra-rapide après le dernier contrôle, modifications profondes dans un répertoire ou panne de stockage pendant rollback. Les tests injectent des erreurs de FS ; ils ne simulent pas une panne matérielle réelle.
- **Validation PR :** head `3a86e5ce1a7857c9cb1c88717035dcfa05267c96` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41033589514), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41033589603) et [ZIP portable](https://github.com/neosoda/agent-commons/actions/runs/41033589529) **success**. Merge effectué après vérification des 6 jobs. Revalidation sur `main` également **success** (voir ci-dessus). Pas de test sur le vrai PC Windows de l'utilisateur.

### Session complémentaire 2026-10-30 — modifications concurrentes et récupération (PR #32 fusionnée)

- **Base vérifiée avant travaux :** `main` `81f3cf40be61ca44ce47efa548137df9f1f90acd` (fusion #31), CI 6/6, Chromium et ZIP Windows `success` ; aucune PR ouverte au début de session.
- **P1 fusionné via [#32](https://github.com/neosoda/agent-commons/pull/32) (`b288427`) :** l'empreinte de la destination de restauration inclut maintenant récursivement les métadonnées de chaque fichier et dossier, sans suivre les liens. Les éditions de fichiers *dans* un dossier sont donc détectées lors de la préparation, sans refaire une copie supplémentaire des fichiers utilisateurs.
- **Protection supplémentaire :** avant une permutation, refuse qu'une destination ait réapparu ; lors du rollback, refuse de supprimer une destination modifiée par un autre processus ou d'écraser un nouveau fichier. En cas de rollback incomplet, le staging avec les originaux est conservé. Guide de récupération manuelle ajouté dans le README.
- **Tests ajoutés :** injection d'une panne de rollback `EACCES` après `EIO` de commit (preuve de l'original en staging), édition concurrente de `SKILL.md` pendant la préparation, création concurrente d'un nouveau fichier pendant la permutation.
- **Validation confirmée :** tête PR `c88ecfff807e2777ff94d80af1b03dc152dded1d` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41035500194), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41035500272) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41035500213) tous `success`. Revalidation après fusion sur `main` également `success` (voir ci-dessus). **Limite connue :** le digest repose sur les métadonnées (ctime/mtime/taille/inode), pas un hash intégral des octets ; aucune garantie contre un TOCTOU après le dernier contrôle ni une coupure électrique.

### Session 2026-10-30 — confidentialité des erreurs API Web (PR #34 fusionnée)

- **Base vérifiée :** `main` `0b76f30a37d673ecf6fcc6d7317ba68642f7e9c4` (#33), aucun PR ouvert, CI 6/6, QA Chromium et ZIP Windows verts avant modification.
- **Faille identifiée :** `src/web/server.ts:publicError` renvoyait les messages d'exception inconnus si aucun chemin local connu ni format de secret prédéfini n'y était reconnu. Des messages système tiers pouvaient donc exposer des valeurs confidentielles imprévues via `/api/action`, `/api/mcp` ou les warnings HTTP.
- **Correctif fusionné en [#34](https://github.com/neosoda/agent-commons/pull/34), SHA `3cc5b2d` :** liste explicite de messages statiques autorisés, réponse générique pour toute exception inconnue, indication non sensible de récupération quand le rollback restauration/MCP échoue. Ne modifie ni les erreurs CLI ni les logs locaux, ne dépend d'aucun nouveau paquet.
- **Tests HTTP :** injection d'un message FS arbitraire sur `GET /api/mcp`, erreur inconnue en cours de restauration `POST /api/action`, et rollback doublement défaillant avec `original` conservé dans un staging local. Vérifier que ni chemins/valeurs privées ni messages d'exception ne sont renvoyés, et que les validations d'entrée connues restent explicites.
- **Preuves CI :** dernier head PR `0a14d81fbcd22b54310eafcf2fe2cfb97a715372` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41037758789), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41037758673), [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41037758693) `success` ; après squash merge, trois workflows verts sur `main` `3cc5b2d` (voir plus haut). Aucun test Windows physique ni publication npm.
- **Prochain P1 indépendant :** audit UX/accessibilité au clavier et tests de la release ZIP officielle sur Windows réel ; les races TOCTOU très étroites et les coupures matérielles ne sont pas couvertes.

### Session 2026-10-30 — accessibilité clavier du Skill Hub (PR #36 fusionnée)

- **Base contrôlée :** `main` `5a8741da28a9f66e304a5ca552f1fda441c0af53`, aucune PR ouverte ; CI 6/6, Chromium et package Windows success. Pas d'accès direct au Windows utilisateur.
- **Constats corrigés dans `src/web/ui.ts` :** absence de Skip-to-main, page courante sans `aria-current` ni changement de focus, boîtes de dialogue sans Échap/Tab trap/retour focus, arrière-plan accessible au clavier sous un dialogue, erreurs annoncées seulement en statut poli, actions répétées sans contexte pour lecteurs d'écran.
- **Corrections :** lien d'évitement visible au clavier ; navigation `aria-controls`/`aria-current` avec focus sur le titre ; fenêtre modale légendée, arrière-plan `inert`, confinement du focus Tab/Shift+Tab, fermeture Escape/clic dehors et restauration du focus ; messages d'erreurs en `role=alert`, rapports et compte catalogue avec `aria-live`. Boutons de skills, routing MCP et snapshots identifiés nominativement. Aucune dépendance, aucun changement API, aucune exposition réseau.
- **Tests :** `scripts/web-visual-smoke.mjs` ajoute vérifications Chromium du lien d'évitement, navigation par titre, dialogues sur les 5 tailles d'écran, focus cyclique, fermeture/restauration et annonce d'erreur MCP ; `src/test/web.test.ts` protège les attributs ARIA structurants.
- **Résultats vérifiés :** dernier head PR `9d2dbbd7ac739a02fdd550d63266c7ef75ec7966` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41042366686), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41042366929) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41042366739) **success**. Squash merge #36 `dacb85c` ; [CI post-merge](https://github.com/neosoda/agent-commons/actions/runs/41042529208), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41042528952), [portable](https://github.com/neosoda/agent-commons/actions/runs/41042528867) aussi **success**. Le support lecteur d'écran approfondi (NVDA/VoiceOver) et une revue de contraste systématique restent non démontrés.

### Session 2026-10-30 — contrastes et annonces dynamiques (PR #38 fusionnée)

- **Base contrôlée :** `main` `e0b42fed7533dc8d5fba7a28dd0aebc175c88c8b` (#37), sans PR ouverte ; six tests CI, Chromium et Windows portable verts.
- **Mesures de contraste :** les textes principaux analysés (dont sidebar, navigation, muted, footer, tags) atteignaient ≥ 4,5:1 sur leurs fonds solides (ex. sidebar 5,04:1, texte secondaire 7,21:1). En revanche les contours de champs #33435a sur #0b1527 n'atteignaient que ~1,82:1 : échec du repère graphique WCAG AA 3:1.
- **Correctif :** bordures des champs, listes de sélection, boutons contourés et modales rehaussées à #7189ab ; bordures danger renforcées ; zone SR-only `workspace-status` avec annonce asynchrone quand l'utilisateur lance manuellement Refresh ou Verify (sans exposer de chemins/secrets).
- **Tests nouveaux :** mesure des couleurs CSS réellement calculées dans Chromium (seuil 3:1 pour contours de commande et de modale) ; test des annonces de réactualisation, invariant DOM ARIA. Ne prétend pas couvrir tous les pixels ni le contraste du texte sur fond dégradé.
- **Validation confirmée :** PR #38 tête `28c9d9cf7d48daec306cf3b5273bc7034272cd38` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41043753158), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41043753154), [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/41043753004) tous `success`. Fusion `main` `9b7696e`, [CI](https://github.com/neosoda/agent-commons/actions/runs/41043921214), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41043921296) et [portable](https://github.com/neosoda/agent-commons/actions/runs/41043921230) aussi `success`. Revue NVDA/VoiceOver sur poste réel hors CI.

### Session complémentaire 2026-10-30 — première couche FR/EN (PR #39 fusionnée)

- **Base :** `main` `9b7696e` (PR #38 fusionnée, trois workflows verts). Branche `feat/skill-hub-fr-en-20261030` consacrée au bilingue côté navigateur, sans changements API.
- **Mise en œuvre :** sélecteur English/Français en en-tête, attribut `html.lang` mis à jour, choix `en`/`fr` dans `localStorage` uniquement (sans secret et sans appel réseau) ; dictionnaire explicite d'environ 130 libellés courants, navigation, cartes, commandes, états et messages d'erreur ; conservation de l'anglais sur les métadonnées de tiers et certains messages techniques. Toute injection de texte passe par `textContent`, CSP identique.
- **Tests :** Chromium change la langue, vérifie nav/placeholder/boutons dynamiques et la persistance après reload puis revient en anglais avant parcours MCP ; tests Node protègent la présence du sélecteur et la CSP ; README décrit la couverture honnêtement.
- **Limite :** cette première couche couvre principalement l'interface, mais la traduction exhaustive des messages composés et le contenu tiers restent à compléter lors d'un audit ultérieur ; pas de qualification NVDA/VoiceOver.
- **Validation confirmée :** dernier head PR #39 `c3a61c7d4e2ae761e03b9d799049e60255e09584` : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41044746524), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41044746441) et [portable Windows](https://github.com/neosoda/agent-commons/actions/runs/41044746417) **success**. Après squash merge `2c8ef2e`, trois workflows post-merge [CI](https://github.com/neosoda/agent-commons/actions/runs/41045018969), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41045018942), [portable](https://github.com/neosoda/agent-commons/actions/runs/41045018972) également **success**. Un bug de toast restant affiché après traduction a été corrigé par minuterie versionnée et couvert en Chromium.

### Session complémentaire 2026-10-30 — finitions FR des messages composés (PR en validation)

- **Base confirmée au départ :** `main` `2fb88326ba983dac71db8400c32a0be0a14af8a1` (#40), CI 6/6, navigateur Chromium, Windows portable `success` ; aucune PR ouverte.
- **Problème :** la couche #39 traduisait les libellés fixes mais laissait les chaînes construites avec nombres/identifiants en anglais. Les noms d'agents/serveurs et étiquettes tierces pouvaient accidentellement correspondre à un libellé de traduction.
- **Correction dans `src/web/ui.ts` :** dictionnaire de messages composés avec motifs ancrés, traduction réversible FR↔EN des comptages, confirmations, descriptions MCP, labels d'actions, sauvegardes et synthèses de statut ; gestion des aperçus multilignes. `data-no-i18n` préserve les identifiants, noms d'agents, catégories, descriptions, licences et données de catalogues externes sans les traduire. Aucun changement backend, CSP ni dépendance.
- **Tests Chromium ajoutés :** compteur catalogue, indicateurs de santé, libellés ARIA des cartes, boîte de sauvegarde et confirmation restaurer sans effet, confirmation MCP avec serveur nommé `Backups` (valeur conservée), annulation et parcours MCP anglais historique. Documentation README clarifiée.
- **Validation à effectuer :** exiger les six jobs CI + QA Chromium + Windows portable sur **dernier SHA de PR**, squash merge puis revérifier ces trois workflows sur `main` ; ne pas marquer terminé avant leurs succès.
- **Limites :** aucune traduction automatique des données utilisateur et tiers, rapports techniques parfois en anglais ; tests NVDA/VoiceOver réels et installation ZIP GitHub sur poste Windows physique non réalisés.

## 3. Vérifications et état réel

**Validations automatisées en place :**
1. `.github/workflows/ci.yml` — 3 OS (Windows, Ubuntu, macOS 15 Intel) × Node 22/24 ; `npm ci`, typecheck, build/tests/catalogue, `npm audit --audit-level=high` et `npm pack --dry-run` (Linux Node 24).
2. `.github/workflows/web-qa.yml` — Chromium réel, **5 sections × 5 viewports**, recherche, dialogue, création/routage/suppression MCP, détection des erreurs JavaScript/CSP et débordement horizontal ; captures réalisées avec un `HOME` de test synthétique.
3. `.github/workflows/windows-portable.yml` — archive npm + dépendances de production + Node Windows épinglé depuis nodejs.org, SHA-256 du runtime, lancement CLI et HTTP localhost, ZIP + checksum en artifact.
4. `.github/workflows/publish.yml` — publication npm OIDC sur release/dispatch ; nécessite un **Trusted Publisher npm correspondant** et l'environnement GitHub `npm`.
5. `.github/workflows/release-assets.yml` — construction et attachement de ZIP pour les futures releases mainteneur déclenchées par `release.published`. Le workflow **one-shot** `release-v0.2.0.yml` a rempli sa mission et son retrait est prévu dans la PR de nettoyage.

**Limites de preuve :** la CI atteste les tests exécutés sur ses runners, pas un audit pentest exhaustif, une installation Windows sur une machine réelle, la justesse des licences tierces, ni l'état du worktree sur le PC de l'utilisateur. Les métriques de couverture de code, de performance à grande échelle et la validation complète clavier/lecteur d'écran **ne sont pas encore démontrées**. Les chemins locaux, secrets, fichiers utilisateur et installations d'agents de production **n'ont pas été inspectés** lors de cette revue.

**Rejouer localement (Node 22/24 + Git, dans un clone de test) :**

```bash
git fetch --all --prune
git status --short
git log -1 --oneline
npm ci
npm run typecheck
npm test
npm run catalog:check
npm audit --audit-level=high
npm pack --dry-run
node dist/cli/index.js doctor
node dist/cli/index.js sync --dry-run
# Tester le dashboard avec un HOME temporaire ; ne pas utiliser ses vrais agents :
node dist/cli/index.js web --home /path/to/temporary/home --no-open
```

Pour Windows, le script de création est `scripts/build-windows-portable.ps1` (PowerShell, depuis la racine). Dans la CI, les tests Playwright s'exécutent via `node scripts/web-visual-smoke.mjs` après installation isolée de Chromium.

## 4. Audit statique ciblé et dette restante

**Architecture :** modules métier séparés, faible dépendance runtime, ESM moderne et tests spécialisés. Une recherche statique dans **28 fichiers TypeScript/scripts** n'a relevé ni `TODO`/`FIXME` persistant, ni emploi évident de `eval`, `execSync` ou `shell: true` ; ce contrôle ne prouve pas l'absence de code mort ou de vulnérabilités. Aucun fichier n'a été supprimé sans preuve de son inutilité. Les deux plus gros points de maintenance sont `src/web/ui.ts` (fichier unique HTML/CSS/JS de ~38 Ko) et `src/sync/parsers.ts` (~23 Ko), avec tests associés ; les refactoriser uniquement si une régression, une difficulté de maintenance concrète ou un besoin de traduction le justifie. L'interface peut être améliorée sans migration imposée vers un framework.

**Sécurité :** bonnes protections locales (loopback, CSRF, refus de chemins liés, backups, validation stricte de l'éditeur MCP), mais l'application manipule des répertoires réels. Priorité aux tests de concurrence entre aperçu et écriture, aux parents symlink/junction, aux fautes d'E/S, aux rollbacks défaillants et à la confidentialité des erreurs. Aucune affirmation de sécurité exhaustive.

**Performance / fiabilité :** pas de benchmark représentatif du chargement d'un catalogue massif, de plusieurs installations simultanées ou de milliers de configurations. Les traitements restent essentiellement locaux et les APIs doivent continuer à limiter tailles et écritures. Éviter toute infrastructure additionnelle sans mesure de besoin.

**UX :** l'interface est en anglais et a été testée en Chromium à plusieurs résolutions. Un mode français, le support clavier/focus et les états d'erreur/annulation méritent un audit d'usage, sans modifier le modèle local et explicite.

| Priorité | Action précise | Justification et critère d'acceptation | Complexité | Statut |
|---|---|---|---|---|
| **P0** | Bootstrap npm `@neosoda/agent-commons` | Le propriétaire du scope npm doit créer/autoriser la première version 0.2.0 via publication authentifiée et 2FA, vérifier le `bin` et la disponibilité du registre ; **E404 confirmé** en CI | S (action externe) | Bloqué — propriétaire npm |
| **P1** | Préparer le prochain `npm` OIDC vérifié | Après bootstrap du scope, enregistrer Trusted Publisher (`neosoda/agent-commons`, `publish.yml`, environnement `npm`, action publish) et vérifier son premier succès au cours d'une version ultérieure ; ne pas réécrire le tag 0.2.0 | S-M | À faire après bootstrap |
| **P1** | Renforcer la sûreté des opérations sur fichiers MCP/skills | Tests isolation, symlinks/junctions parents, fichiers changés entre preview/apply, écritures concurrentes, permissions, rollback impossible ; pas de perte de contenu non géré | M | #28/#30/#32/#34 fusionnées et CI vertes ; restent TOCTOU étroits, tests Windows réel et revue UX |
| **P1** | Tester l'installation de release de bout en bout | Depuis le **ZIP publié** sur Windows non préparé : vérifier checksum, démarrage/arrêt, navigateurs, profil vide, agent de test ; refaire source npm après publication | M | CI portable uniquement |
| **P1** | Audit accessibilité et messages d'erreur UI | Tests focus, clavier, confirmation destructive, lecteurs d'écran, contraste, responsive ; corriger seulement les problèmes vérifiés | S-M | #36 clavier/focus terminé ; contrôles WCAG non-texte + live status en validation ; NVDA/VoiceOver reste externe |
| **P2** | Internationalisation FR/EN sans framework lourd | Centraliser les chaînes, traduire les parcours clés, tester la persistance du choix de langue, absence de régression CSP | M | PR #39 fusionnée et CI/Chromium/portable verts ; première couverture UI FR/EN + persistance, finitions de contenus composés encore à faire |
| **P2** | Terminer les champs avancés de l'éditeur MCP ([#18](https://github.com/neosoda/agent-commons/issues/18)) | Permettre mise à jour prudente des commandes, URL et références d'env **sans afficher les secrets existants**, avec preview et tests | M-L | Partiel |
| **P2** | Améliorer revue/catalogue | Détection de doublons, provenance, licences, dépendances, politique de sélection ; aucun install automatique ni garantie infondée | M | À faire |
| **P3** | Mesurer performances et envisager signatures Windows | Benchmark si catalogue volumineux ; signature du ZIP/exécutable uniquement si compte et certificat légitimes disponibles | M-L | Optionnel |

## 5. Feuille de route et dépendances

1. **Nettoyage post-release terminé** : PR #26 (normalisation `bin`, retrait du workflow one-shot), #27 (handoff) fusionnées ; `main` `c4f16ad` vert sur CI 6/6, Chromium et Windows portable.
2. **Bootstrap npm (propriétaire requis)** : sur compte npm autorisé et scope existant, publier le premier `@neosoda/agent-commons@0.2.0` depuis le tag stable (après vérification du contenu réel du tarball et normalisation CLI si nécessaire). Vérifier `npm view @neosoda/agent-commons@0.2.0 version`, puis configurer Trusted Publisher pour les **prochaines** releases et valider un vrai run OIDC.
3. **Durcissement :** #28/#30/#32/#34 fusionnées et vérifiées. Contrôler les races TOCTOU résiduelles et les installations Windows physiques sans surpromettre une atomicité totale ; continuer avec l'accessibilité.
4. **UX/I18n (indépendant)** : #36 clavier, #38 contraste/live announcements et #39 FR/EN persistant fusionnés et validés ; prochaine passe libellés dynamiques composés, audits lecteurs d'écran réels.
5. **Extensions secondaires** : MCP avancé, revue des nouveaux skills, benchmark si nécessaire.

**Critères de sortie pour chaque PR :** changements ciblés, typecheck, tests réels utiles, audit dépendances, workflows Chromium/portable et **6/6 matrix** sur SHA exact, puis squash merge ; vérifier aussi les runs `main`. Ne pas faire une succession de commits après validation sans relancer les contrôles.

### Instruction aux agents

Le fichier racine **`AGENTS.md`** référence ce handoff et fixe les garde-fous pour les assistants qui le reconnaissent. Les autres assistants doivent ouvrir `PROJECT_HANDOFF.md` eux-mêmes.

## 6. Instructions de reprise d'une nouvelle session IA

1. **Lire ce fichier**, puis `README.md`, `package.json`, `CHANGELOG.md`, `SECURITY.md`, `docs/releases/v0.2.0.md` et `docs/releases/v0.2.0-release-notes.md` si présents.
2. Vérifier en direct les branches, PR ouvertes, leur SHA, la dernière release, les **runs par SHA** et les issues #18/#19. Toujours consulter les logs d'échec et différencier **queued**, **failed**, **cancelled**, **success**.
3. Vérifier **la branche locale de l'utilisateur** et `git status` **avant** checkout/reset/rebase. Le connecteur GitHub ne voit pas les changements non commités sur le PC de l'utilisateur. Ne jamais écraser de données ni supposer un worktree propre.
4. Lire `src/web/server.ts`, `src/web/mcp-editor.ts`, `src/web/ui.ts`, `src/core/backup.ts`, `src/core/links.ts`, `src/commands/skill-install.ts`, `src/sync/mcp.ts` et leurs tests avant de modifier les opérations.
5. Respecter les choix de sécurité : localhost uniquement, pas de serveur public, secrets jamais dans API/logs, pas d'écrasement des installations non gérées, backups et confirmations, Windows symlinks/junctions, **pas de services ni de téléchargements imposés**.
6. Après chaque phase : reprendre le tableau des tâches, confirmer résultats sur commits exacts, mettre ce document à jour **avec état courant et blocages**, puis commit/push et merge après validation.

### Prochaine action concrète

**Priorité P0 : bootstrap du paquet npm par le propriétaire du scope `@neosoda`.** Sur un environnement propre et autorisé, inspecter le tarball, se connecter au compte npm qui possède le scope, publier la version initiale `0.2.0` avec authentification/2FA si le paquet n'existe pas, vérifier `npm view @neosoda/agent-commons@0.2.0 version` et la commande `npx`. Le code normalisé sur `main` contient déjà le correctif `bin` ; ne pas changer/retagger la release GitHub `v0.2.0`. Configurer ensuite Trusted Publisher (`neosoda`, `agent-commons`, `publish.yml`, environnement `npm`, **autoriser `npm publish`**) pour la prochaine version. La relation de confiance doit être établie après la création du paquet et validée par une publication réelle. Si le compte ou le scope ne sont pas autorisés, documenter le refus exact sans utiliser de jeton inventé.

**En attendant le compte npm :** valider sur GitHub la PR `fix/skill-hub-composed-french-20261030` (phrases FR composées, préservation des identifiants) ; si CI verte, merger et vérifier `main`. **Prochaine tâche utile :** inspecter les derniers textes de diagnostics sans les traduire automatiquement, tester navigation/clavier sous FR, étudier accessibilité contraste des contenus dynamiques. NVDA/VoiceOver, ZIP v0.2.0 sur un vrai Windows et bootstrap npm restent des validations/actions externes.

## Prompt de reprise

> Reprends https://github.com/neosoda/agent-commons et **lis intégralement `PROJECT_HANDOFF.md`**. Vérifie en direct `main`, PR ouvertes, issues et workflows par SHA, sans supposer le worktree utilisateur propre. Au départ du lot : `main` `2fb8832` (#40), CI 6/6, Chromium, Windows portable verts ; les PR #28/#30/#32/#34 (sécurité), #36 (clavier), #38 (contraste), #39 (premier bilingue) sont fusionnées, ne pas recommencer. **Priorité immédiate : vérifier/terminer la PR `fix/skill-hub-composed-french-20261030`** qui traite les messages FR avec nombres/identifiants, les confirmations multi-lignes, la conservation stricte des noms d'agents/serveurs et données tierces (`data-no-i18n`), et ajoute des tests Chromium. Corriger tout échec sans contourner les tests ; fusionner seulement si six jobs CI, Chromium et Windows portable `success` sur la tête PR exacte, puis confirmer le SHA `main` et ses trois workflows. Compléter cet état de reprise avec commits, liens de runs et suite. Ne jamais exposer l'UI hors 127.0.0.1, toucher aux agents réels ou exposer secrets. Tests NVDA/VoiceOver et installation physique du ZIP GitHub v0.2.0 encore à faire. Ne pas modifier son tag historique `6ad617d`. Publication npm initiale toujours non confirmée (E404), nécessite le compte/2FA du propriétaire.