# 100x Engineer — intégration optionnelle (v0.1.1)

[100x Engineer](https://github.com/DeadInternetStudios/100x-engineer-skill) (`v0.1.1`, commit épinglé `8b43a726e3114882061f4b0b5dc1887bb96cefa3`, licence **MIT**) est intégré à Agent Commons comme extension CLI/skills **optionnelle** (`src/extensions/hundredx.ts`).

Son absence n'empêche ni Agent Commons, ni le moteur de missions, ni `universal-product-engineering` de fonctionner.

## Catalogue et compétences

Les **13 compétences** amont (`100x`, `100x-mockup`, `100x-wrapup`, `100x-overnight`, `100x-solo`, `100x-judge`, `100x-grind`, `100x-continue`, `100x-status`, `100x-report`, `100x-adhd`, `100x-setup`, `100x-bakeoff`) sont référencées en métadonnées dans `catalog/skills.json` et routables hors ligne par `agent-commons skills route`. Référence de catalogue ≠ installation.

## Gestionnaire d'extensions et CLI

Installation isolée sous `~/.agents/extensions/100x` avec reçu `~/.agents/extensions/100x-installation.json`, vérification **SHA-256** de l'archive officielle `.tgz` (`1a745ddade5db30a413baafe8dc7e1ef91bc9b8c4486d8be220b047013257118`), extraction Pure Node sans exécuter de scripts post-install tiers, contrôle de traversée de chemin/liens symboliques et snapshot de restauration :

```bash
node dist/cli/index.js 100x status --json
node dist/cli/index.js 100x modes
node dist/cli/index.js 100x doctor
node dist/cli/index.js 100x preview install
node dist/cli/index.js 100x install --yes
node dist/cli/index.js 100x configure --profile lite --yes
node dist/cli/index.js 100x sync --agent claude-code --yes
node dist/cli/index.js 100x uninstall --yes
```

- L'interface Web locale (`#page-catalog`, panneau `#hundredx-panel`) expose statut, prérequis (`Node >=22`, `git`, cache Chromium local), modes (13), prévisualisation/installation/réparation/mise à jour/désinstallation, configuration de profil et synchronisation vers les clients compatibles.
- Aucune installation silencieuse de Playwright ou `@cursor/sdk` : les prérequis sont simplement diagnostiqués (`doctor`).

## Profils d'exécution et maîtrise des coûts

| Profil | Plafond jetons | Étapes / outils | Revues second modèle / cloud | Usage |
|---|---:|---:|---:|---|
| `lite` (défaut) | 12 000 | 18 / 14 | 0 (désactivé par défaut) | Développement quotidien, coût maîtrisé |
| `standard` | 24 000 | 30 / 24 | 0 (1 si autorisé explicitement) | Fonctionnalités complexes et livraisons importantes |
| `deep` | 48 000 | 48 / 38 | 0 (2 si autorisé explicitement) | Vérification approfondie et pré-production |

`adaptExecutionProfile` resserre dynamiquement le budget d'étapes et de polish selon le périmètre et maintient **0 appel cloud/relecture payante** tant que l'utilisateur n'autorise pas explicitement `--allow-paid-review`, `--cloud` ou `--delegate`.

## Synergie avec Universal Product Engineering

[universal-product-engineering](../skills/universal-product-engineering/SKILL.md) reste l'**orchestrateur principal** :
- Sans 100x, UPE exécute sa boucle native sans erreur.
- Avec 100x actif et autorisé : vérification des invariants et contrats (`verify/ledger.tsv`), détection des preuves `stale`/`broken`/`unproven`, preuves rouges de non-régression (`verify/red/<id>.txt`), captures/relecture indépendante bornées et reprise via `.100x/STATE.md` sans boucle récursive imbriquée ni duplication de tests.

## Mission Control et sécurité

- Mission Control (`#page-missions`) affiche le profil, les plafonds adaptés, l'étape/verdict 100x, le décompte et le détail des invariants (`holds`, `stale`, `broken`, `unproven`, `waived`), les contrôles *must-not-break*, les conclusions de relecture, les anomalies et un visionnage sécurisé des captures (`.100x/hero.png`, planche contact via `/api/mission-artifact` avec contrôle canonique sans traversée).
- `runHundredXCli` n'autorise que la liste blanche `status`, `doctor`, `config print|validate|path` et `verify` ; l'exécution de scripts via `100x verify run` est refusée sans `--allow-tests` / `--yes`.
- **Limite importante :** une vérification bornée ou échantillonnée dans `verify/ledger.tsv` ne constitue pas une preuve exhaustive ni une garantie absolue d'absence de défauts.

## Recette vérifiée et limites par plateforme

- **Testé réellement sur Windows 11 (Node v24.22.2) :** suite complète `npm test` + recette locale dans un environnement isolé sur l'archive officielle `100x-engineer-skill-0.1.1.tgz` (installation, contrôle d'intégrité des 13 skills, jonctions NTFS Claude Code, configuration/rollback, réparation après suppression d'entrée, CLI `verify add/run/sync`, détection `stale`/`broken` et désinstallation propre).
- **Non exécuté localement :** Linux et macOS (dépendent des jobs GitHub Actions de la PR), Playwright Chromium live en l'absence du paquet `playwright` dans les dépendances locales du dépôt, ainsi que la relecture par un second modèle payant réel.
