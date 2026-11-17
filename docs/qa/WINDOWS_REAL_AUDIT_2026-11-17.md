# Audit Windows réel — 2026-11-17

Poste Windows 11 Pro (compte utilisateur standard, sans mode développeur), Node.js 26.13.1, npm 11.20, Git 2.56, Python 3.15. Absents : uv/uvx, Docker, pnpm, WSL configuré, Gemini CLI (binaire), OpenCode, LM Studio. Branche `fix/windows-real-audit-20261117` depuis `main` `1c18385`.

Tous les essais d'écriture ont eu lieu dans des HOME synthétiques (`--home`) placés dans des chemins avec espaces, accents et jusqu'à 281 caractères. Le profil réel n'a été lu qu'en lecture seule (`doctor`, `mcp probe` = handshake sans appel d'outil). Aucun secret n'a été lu ni affiché. La configuration de Claude Desktop n'a pas été lue.

## Matrice de compatibilité

États : **Détecté / Installé / Accessible / Fonctionnel** (voir [DIAGNOSTICS.md](../DIAGNOSTICS.md)).

| Client | Détecté | Skills | MCP | Synchronisation | Test réel | Résultat |
|---|---|---|---|---|---|---|
| Claude Code 2.1.325 | Oui | 144 liés (jonctions) | 1 natif | OK (HOME synthétique) | `claude -p` a invoqué un skill servi par jonction (`AGENT-COMMONS-DEMO-OK`) ; `claude mcp list` : MCP synchronisé `√ Connected` ; appel réel `echo` et `filesystem/read_text_file` via le manifeste central | **Fonctionnel** |
| Codex CLI 0.168 | Oui | 143 liés | 4 natifs (1 cassé) | OK (TOML et commentaires préservés) | `codex exec` lit un skill synchronisé (find-skills, 1 seule occurrence) ; appel MCP réel `echo` réussi ; un skill local refusé (YAML invalide) | **Fonctionnel** (1 skill, 1 MCP à corriger côté utilisateur) |
| Gemini CLI | Dossier `~/.gemini` seulement | 144 liés | 1 natif (HTTP, auth requise) | OK (JSONC et commentaires préservés) | Binaire absent : pas d'invocation possible | **Installé, non vérifiable** |
| Gemini Config | Oui | dossier skills = jonction vers `~/.agents/skills` | 2 natifs (1 cassé) | Refuse de toucher la jonction (signalé) | — | **Accessible** |
| Antigravity | Oui (application + `~/.gemini/antigravity`) | 144 liés | aucun | — | Pas d'interface CLI | **Installé, non vérifiable** |
| Claude Desktop | Application présente | — | — | Non géré par Agent Commons | Configuration exclue de l'audit, non lue | **Non évalué** |
| Codex Desktop | Non détecté séparément du CLI | — | — | — | — | — |
| LM Studio | Non installé | — | — | Écriture `~/.lmstudio/mcp.json` testée en synthétique | — | **Non testé en réel** |
| OpenCode | Non installé | — | — | — | — | — |

## Serveurs MCP

| Serveur | Où | Résultat réel |
|---|---|---|
| brevo (stdio, npx) | Claude Code | OK, 299 outils (impact tokens important) |
| context7 (HTTP) | Codex, Gemini Config | OK, 2 outils |
| node_repl (stdio) | Codex | OK, 4 outils |
| rea (stdio) | Codex, Gemini Config | **Cassé** : `node.exe` absolu d'un ancien Node 24 WinGet supprimé par la mise à jour |
| brevo (HTTP) | Codex, Gemini CLI | Joignable, identifiants requis : non vérifié |
| Filesystem 2.3.0 (géré) | HOME synthétique | Installé, configuré, synchronisé **via l'UI**, connecté et appelé par Claude Code |
| agent-commons-demo | HOME synthétique | Synchronisé vers Claude Code et Codex, appels `echo`/`time` réussis |

## Défauts trouvés et corrigés

| Priorité | Défaut | Correction |
|---|---|---|
| P1 | Installation MCP npm/uv impossible depuis un HOME profond (« package manager is unavailable ») : `cwd` de spawn > MAX_PATH | `cwd` court, cibles absolues |
| P1 | Restauration, installation/mise à jour de skills et réparation centrale en échec (ENOENT) au-delà de MAX_PATH : `fs.mkdtempSync` ignore le préfixe `\\?\` | `mkdtempSafe` |
| P1 | `doctor` « Healthy » alors que des MCP ne pouvaient pas démarrer (exécutable disparu, script absent) | Vérification des cibles de lancement |
| P1 | Aucun moyen de prouver qu'un MCP répond | `mcp probe` (handshake + appel d'outil) |
| P1 | Skills refusés par Codex non signalés | Validation du frontmatter, calibrée sur le refus réel de Codex |
| P2 | Désinstaller un paquet MCP encore référencé cassait silencieusement les clients | Avertissement listant les références |
| P2 | 3 suites de tests en échec (EPERM) sur compte Windows standard | Jonctions pour les tests |
| P2 | Statut « Reference only » pour un paquet installé ; « valid » ambigu dans le Control Center | Libellés corrigés, mention « config valid, not started » |
| P2 | `--arguments '<json>'` inutilisable depuis Windows PowerShell 5.1 | `--arg clé=valeur` |
| P3 | Coût en tokens des skills invisible | Estimation par agent dans `doctor` |

## Constats non corrigés (hors périmètre du dépôt)

- `misconception-diagnostic-designer` (bibliothèque locale) : frontmatter YAML invalide, refusé par Codex.
- MCP `rea` de Codex et Gemini Config : chemin `node.exe` obsolète ; remplacer par `node`.
- `~/.gemini/config/skills` est une jonction vers la bibliothèque centrale : Gemini Config voit les 240 skills.
- `git clone` dans un chemin > 260 caractères exige `core.longpaths`.
- Le bac à sable lecture seule de Codex n'a pas pu lire un skill de projet via jonction depuis un dossier au nom accentué (comportement de Codex).
- Lancer un client avec un `USERPROFILE` synthétique le fait recopier ses identifiants de compte dans ce HOME : à ne faire que dans des dossiers jetables.

## Qualité

- `npm ci`, `npm run typecheck`, `npm test` (191 tests, 0 échec, compte standard), `catalog:check`, `npm audit --audit-level=high` (0 vulnérabilité), `npm pack --dry-run`.
- Installation fraîche validée deux fois : clone → `npm ci` → build → `npm pack` → installation globale isolée (`--prefix`) → `agent-commons.cmd` depuis PowerShell.
- Restauration du snapshot `pre-sync` : configurations identiques octet pour octet, liens créés supprimés.
- CI GitHub (6 jobs, Chromium, Windows portable) : à vérifier sur la PR.

## Non vérifié

NVDA/lecteur d'écran, SmartScreen sur le ZIP portable, Gemini CLI (binaire absent), LM Studio, OpenCode, Docker MCP Gateway, MCP Fetch/Git (uv absent), Playwright MCP, invocation réelle depuis Antigravity et Claude Desktop.
