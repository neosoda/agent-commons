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

**Décisions à conserver :** local-only sur `127.0.0.1`, sans télémétrie ni CDN ; protection Host/Origin/CSRF/CSP ; ne jamais exposer le dashboard sur Internet (il **n'a pas d'authentification distante**). Aucune installation, synchronisation, suppression ou restauration implicite. Les chemins privés et secrets ne doivent jamais remonter dans les réponses HTTP. Les skills locaux non gérés ne doivent pas être écrasés. Les snapshots et liens doivent être traités avec précaution (symlinks, junctions, différences Windows/macOS/Linux). Réutiliser la logique métier CLI, ne pas la dupliquer dans le serveur web. Ne pas prétendre que l'analyse de licence garantit la sûreté d'un skill.

### État actuel vérifié — release v0.2.0

- **`main` vérifiée le 2026-10-30 : `4301f0d4cac11479ef0b36bfc86ecaaa9eccc082`** (fusion [#28](https://github.com/neosoda/agent-commons/pull/28)). [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41032270458), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41032270455) et [ZIP Windows](https://github.com/neosoda/agent-commons/actions/runs/41032270468) sont tous terminés avec `success` sur ce SHA. Ce constat ne couvre pas les fichiers locaux non commités du PC utilisateur.

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
| **P1** | Renforcer la sûreté des opérations sur fichiers MCP/skills | Tests isolation, symlinks/junctions parents, fichiers changés entre preview/apply, écritures concurrentes, permissions, rollback impossible ; pas de perte de contenu non géré | M | Premier scénario clos via #28 (CI + Chromium + Windows verts) ; races/permissions/rollback restent P1 |
| **P1** | Tester l'installation de release de bout en bout | Depuis le **ZIP publié** sur Windows non préparé : vérifier checksum, démarrage/arrêt, navigateurs, profil vide, agent de test ; refaire source npm après publication | M | CI portable uniquement |
| **P1** | Audit accessibilité et messages d'erreur UI | Tests focus, clavier, confirmation destructive, lecteurs d'écran, contraste, responsive ; corriger seulement les problèmes vérifiés | S-M | Partiellement testé |
| **P2** | Internationalisation FR/EN sans framework lourd | Centraliser les chaînes, traduire les parcours clés, tester la persistance du choix de langue, absence de régression CSP | M | À faire |
| **P2** | Terminer les champs avancés de l'éditeur MCP ([#18](https://github.com/neosoda/agent-commons/issues/18)) | Permettre mise à jour prudente des commandes, URL et références d'env **sans afficher les secrets existants**, avec preview et tests | M-L | Partiel |
| **P2** | Améliorer revue/catalogue | Détection de doublons, provenance, licences, dépendances, politique de sélection ; aucun install automatique ni garantie infondée | M | À faire |
| **P3** | Mesurer performances et envisager signatures Windows | Benchmark si catalogue volumineux ; signature du ZIP/exécutable uniquement si compte et certificat légitimes disponibles | M-L | Optionnel |

## 5. Feuille de route et dépendances

1. **Nettoyage post-release terminé** : PR #26 (normalisation `bin`, retrait du workflow one-shot), #27 (handoff) fusionnées ; `main` `c4f16ad` vert sur CI 6/6, Chromium et Windows portable.
2. **Bootstrap npm (propriétaire requis)** : sur compte npm autorisé et scope existant, publier le premier `@neosoda/agent-commons@0.2.0` depuis le tag stable (après vérification du contenu réel du tarball et normalisation CLI si nécessaire). Vérifier `npm view @neosoda/agent-commons@0.2.0 version`, puis configurer Trusted Publisher pour les **prochaines** releases et valider un vrai run OIDC.
3. **Durcissement en cours :** préflight des liens imbriqués dans les payloads réalisé via #28. Poursuivre sur les écritures concurrentes, fautes d'E/S et échecs de rollback, en environnement isolé et PR courte avec CI complète.
4. **UX/I18n (indépendant)** : audit clavier et textes, FR/EN, QA navigateur.
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

**En attendant le compte npm :** #28 est fusionnée et `main` verte. **Prochaine action autonome P1 :** reproduire avec un test isolé une faute d'E/S ou une modification concurrente entre la prévalidation et l'application d'une restauration, vérifier qu'aucun fichier non géré n'est perdu, puis apporter une correction ciblée si le test révèle une régression. Faire ensuite la validation complète PR → main. Installation du ZIP sur un poste Windows réel à organiser séparément.

## Prompt de reprise

> Reprends le projet https://github.com/neosoda/agent-commons. **Lis ce fichier `PROJECT_HANDOFF.md` intégralement** puis le README et les modules concernés, et revérifie en direct GitHub : `main`, branches/PR, issues #18/#19, release et les workflows sur le dernier SHA. À la fin de la session du 30/10/2026, `main` était à **`4301f0d`** : [CI 6/6](https://github.com/neosoda/agent-commons/actions/runs/41032270458), [Chromium](https://github.com/neosoda/agent-commons/actions/runs/41032270455) et [Windows portable](https://github.com/neosoda/agent-commons/actions/runs/41032270468) `success`. **Ne refais pas #28** : la protection contre les liens imbriqués dans les payloads de restore a été fusionnée et testée. La GitHub Release `v0.2.0` est publique sur le tag historique `6ad617d` à préserver. Le paquet npm `@neosoda/agent-commons@0.2.0` reste non confirmé à cause d'un E404 de publication ; bootstrap npm/2FA/Trusted Publisher exigent le compte autorisé du propriétaire. **Prochaine tâche réalisable : P1 sécurité, tester la concurrence et les erreurs d'E/S avant et pendant restore**, préserver les modifications tierces, corriger sans suringénierie, puis ouvrir une PR petite et vérifier les six jobs CI + Chromium + portable avant merge. Tester le ZIP publié sur un Windows réel ensuite. Ne touche pas aux agents réels ni aux secrets, conserve localhost et confirme le worktree local avant toute action locale. En fin de session, mets ce handoff à jour (commit, PR, tests, blocages, prochaine action) et push via branche relue.