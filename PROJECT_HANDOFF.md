# PROJECT_HANDOFF — Agent Commons

> **Mémoire opérationnelle pour toute reprise IA.** Lire ce document **avant** toute modification et vérifier les données GitHub en direct : les SHA, runs CI et états de publication ci-dessous sont des **instantanés**, pas une preuve permanente. Le [README](README.md) est la documentation utilisateur ; ce fichier concerne la maintenance, l'audit, la feuille de route et la reprise.
>
> **Dernière revue : 2026-10-29 (UTC/Europe-Paris).** Dépôt : https://github.com/neosoda/agent-commons · branche de référence : `main`. Cette revue repose sur le code et les statuts GitHub accessibles par connecteur et sur les exécutions CI publiées ; **aucun accès direct à un worktree Windows utilisateur ou à un environnement npm authentifié** n'a été établi.

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

**Maturité :** noyau fonctionnel et largement couvert par la CI ; **release candidate 0.2.0**, pas encore une preuve de publication stable sur npm ou GitHub. Le lancement Windows portable est vérifié en CI, pas sur chaque PC réel.

## 2. Travaux intégrés et choix importants

| PR / commit de fusion | Livraison intégrée sur `main` |
|---|---|
| [#17](https://github.com/neosoda/agent-commons/pull/17) — `b20d5ae` | Skill Hub local, protection HTTP, tests Chromium multi-viewport, fabrication du ZIP Windows |
| [#20](https://github.com/neosoda/agent-commons/pull/20) — `7514148` | Éditeur MCP prudent : prévisualisation, révision SHA-256, écriture JSONC, snapshot/rollback et tests |
| [#21](https://github.com/neosoda/agent-commons/pull/21) — `87836d1` | Workflow pour joindre ZIP Windows et checksum aux GitHub Releases |
| [#22](https://github.com/neosoda/agent-commons/pull/22) — `7b4b78a` | Version **0.2.0** dans `package.json` et `package-lock.json`, checklist de release |
| [#23](https://github.com/neosoda/agent-commons/pull/23) — `2230970` | Workflow npm OIDC renforcé, vérification préalable du contenu réel du tarball |

**Décisions à conserver :** local-only sur `127.0.0.1`, sans télémétrie ni CDN ; protection Host/Origin/CSRF/CSP ; ne jamais exposer le dashboard sur Internet (il **n'a pas d'authentification distante**). Aucune installation, synchronisation, suppression ou restauration implicite. Les chemins privés et secrets ne doivent jamais remonter dans les réponses HTTP. Les skills locaux non gérés ne doivent pas être écrasés. Les snapshots et liens doivent être traités avec précaution (symlinks, junctions, différences Windows/macOS/Linux). Réutiliser la logique métier CLI, ne pas la dupliquer dans le serveur web. Ne pas prétendre que l'analyse de licence garantit la sûreté d'un skill.

### En cours / non fusionné lors de cette revue

- [**PR #24 — v0.2.0 verified publish**](https://github.com/neosoda/agent-commons/pull/24), branche `release/v0.2.0-verified-publish-20261029`, SHA observé **`5769109ad48d18250a7a901fe3c9e883bcdb911e`**. Ajoute notes de release, changelog 0.2.0, README actualisé, et `release-v0.2.0.yml` : déclencheur `workflow_run` sur `main`, vérification des trois workflows et des **6 jobs CI sur le SHA exact**, téléchargement du ZIP validé, vérification SHA-256, création GitHub Release v0.2.0, vérification des assets téléchargés, reprise sûre d'une publication partielle sur le **même tag/SHA**, puis dispatch explicite de `publish.yml` (un `release.published` produit par `GITHUB_TOKEN` ne déclenche normalement pas d'autres workflows).
- **Sur le SHA antérieur à la correction de reprise partielle :** #24 était à **5/6 jobs CI success**, macOS Node 24 en attente, Chromium et Windows portable success. **Le nouveau SHA `5769109` doit être entièrement revalidé** : ne pas reprendre les contrôles du commit précédent. **Ne pas fusionner tant que tous les contrôles du SHA actuel ne sont pas terminés avec success.** Les statuts peuvent évoluer à tout instant.
- La dernière branche `main` vérifiée **avant #24** : `22309707691afa5f7931c99f22a8b863b50a2d14`, avec CI 6/6, Chromium et Windows portable success (runs `40915380536`, `40915380238`, `40915380402`).
- **Dernière release GitHub observée : `v0.1.1`** (pas de release `v0.2.0` au moment de ce constat). La publication de `@neosoda/agent-commons@0.2.0` sur npm n'est **pas vérifiée**. Aucun tag, asset officiel, workflow release ou publication npm ne doit être présumé existant sans interrogation en direct. En cas de release partiellement créée, le workflow #24 doit vérifier que le tag pointe sur le bon SHA, réparer les assets et reprendre le dispatch npm sans créer de tag divergent.

## 3. Vérifications et état réel

**Validations automatisées en place :**
1. `.github/workflows/ci.yml` — 3 OS (Windows, Ubuntu, macOS 15 Intel) × Node 22/24 ; `npm ci`, typecheck, build/tests/catalogue, `npm audit --audit-level=high` et `npm pack --dry-run` (Linux Node 24).
2. `.github/workflows/web-qa.yml` — Chromium réel, **5 sections × 5 viewports**, recherche, dialogue, création/routage/suppression MCP, détection des erreurs JavaScript/CSP et débordement horizontal ; captures réalisées avec un `HOME` de test synthétique.
3. `.github/workflows/windows-portable.yml` — archive npm + dépendances de production + Node Windows épinglé depuis nodejs.org, SHA-256 du runtime, lancement CLI et HTTP localhost, ZIP + checksum en artifact.
4. `.github/workflows/publish.yml` — publication npm OIDC sur release/dispatch ; nécessite un **Trusted Publisher npm correspondant** et l'environnement GitHub `npm`.
5. `.github/workflows/release-assets.yml` — assets pour une release créée avec des permissions permettant de déclencher l'événement normal. La PR #24 prévoit un chemin spécifique pour sa release produite par `GITHUB_TOKEN`.

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
| **P0** | Terminer #24 et publier réellement v0.2.0 | CI 6/6 + QA + portable **sur le même SHA**, fusionner #24, vérifier CI **main**, exécution du gate release, tag/ZIP/SHA256 et npm ; aucune annonce de succès avant vérification | M | En attente CI macOS |
| **P0** | Vérifier les autorisations npm OIDC et workflows release | Contrôler `npm` GitHub Environment, Trusted Publisher (owner `neosoda`, repo `agent-commons`, fichier `publish.yml`, environment `npm`), `actions:write`/contents ; vérifier provenance/registry et erreurs réelles | M | Configuration externe non vérifiée |
| **P1** | Renforcer la sûreté des opérations sur fichiers MCP/skills | Tests isolation, symlinks/junctions parents, fichiers changés entre preview/apply, écritures concurrentes, permissions, rollback impossible ; pas de perte de contenu non géré | M | Partiellement testé |
| **P1** | Tester l'installation de release de bout en bout | Depuis le **ZIP publié** sur Windows non préparé : vérifier checksum, démarrage/arrêt, navigateurs, profil vide, agent de test ; refaire source npm après publication | M | CI portable uniquement |
| **P1** | Audit accessibilité et messages d'erreur UI | Tests focus, clavier, confirmation destructive, lecteurs d'écran, contraste, responsive ; corriger seulement les problèmes vérifiés | S-M | Partiellement testé |
| **P2** | Internationalisation FR/EN sans framework lourd | Centraliser les chaînes, traduire les parcours clés, tester la persistance du choix de langue, absence de régression CSP | M | À faire |
| **P2** | Terminer les champs avancés de l'éditeur MCP ([#18](https://github.com/neosoda/agent-commons/issues/18)) | Permettre mise à jour prudente des commandes, URL et références d'env **sans afficher les secrets existants**, avec preview et tests | M-L | Partiel |
| **P2** | Améliorer revue/catalogue | Détection de doublons, provenance, licences, dépendances, politique de sélection ; aucun install automatique ni garantie infondée | M | À faire |
| **P3** | Mesurer performances et envisager signatures Windows | Benchmark si catalogue volumineux ; signature du ZIP/exécutable uniquement si compte et certificat légitimes disponibles | M-L | Optionnel |

## 5. Feuille de route et dépendances

1. **Release (bloquant)** : inspecter #24, attendre/tester 6/6 sur SHA final, QA et ZIP, fusionner en conservant les protections. Contrôler les **trois runs sur le nouveau `main`**. Le gate `release-v0.2.0.yml` doit créer la release **seulement** après ces runs. Vérifier assets, tag et npm indépendamment.
2. **Distribution (après release)** : télécharger les artifacts finaux ; vérifier checksum, premier démarrage Windows et npm `npm view @neosoda/agent-commons@0.2.0 version`. Si npm OIDC est refusé, documenter l'action propriétaire npm au lieu d'inventer un token.
3. **Durcissement (indépendant après release)** : scénarios de collision, rollback et liens à risques sur environnements isolés, puis PR courte et CI 6/6.
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

**Consulter la PR #24 et son dernier run CI.** Si 6/6+Chromium+Windows sont verts sur son SHA, fusionner. Vérifier les runs déclenchés sur `main`, puis les logs de `Verified v0.2.0 release`, la release et ses assets, et enfin npm OIDC. En cas de blocage externe, conserver le projet en état stable et fournir une action précise au mainteneur ; ne pas refaire d'audit sans motif.

## Prompt de reprise

> Tu reprends **https://github.com/neosoda/agent-commons**. Lis **`PROJECT_HANDOFF.md` à la racine** avant toute modification, vérifie les SHA, PR, CI et releases en direct et considère les chiffres datés comme un instantané. Ton objectif immédiat est de terminer **v0.2.0** : valider la PR #24 sur son SHA exact (6 jobs Windows/Ubuntu/macOS Node 22/24 + QA Chromium + ZIP Windows), fusionner uniquement si tous les contrôles sont `success`, puis vérifier les runs `main` et le workflow de publication. N'annonce ni GitHub Release, ZIP public ni paquet npm sans preuve. Si npm Trusted Publisher ou permissions GitHub bloquent, identifie la seule action nécessaire et ne contourne rien. Ensuite, traite les P1 du tableau (tests d'écriture/rollback et validation de distribution) avant les P2. Préserve les paramètres et skills utilisateur, n'expose pas le dashboard hors localhost, garde les changements petits et testés. **Mets à jour et pousse `PROJECT_HANDOFF.md` en clôture de session avec les vrais statuts, le SHA validé, les blocages et la prochaine étape.**
