# Diagnostic et vérification réelle — `doctor` et `mcp probe`

[English](DIAGNOSTICS.en.md)

Une configuration présente dans un fichier JSON ou TOML **n'est pas** la preuve qu'un serveur MCP démarre, ni qu'un skill est chargé par un client. Agent Commons distingue quatre niveaux :

| Niveau | Signification | Outil |
|---|---|---|
| Détecté | Le dossier ou fichier de configuration du client existe | `doctor` |
| Installé | Le skill est lié / le serveur MCP est déclaré dans la configuration du client | `doctor`, `list` |
| Accessible | L'exécutable du serveur MCP est trouvé, son script existe, le `SKILL.md` est valide pour les clients | `doctor` (lecture seule) |
| Fonctionnel | Le serveur répond au protocole MCP (`initialize`, `tools/list`) et, si demandé, à un appel d'outil | `mcp probe` (exécution explicite) |

## `agent-commons doctor` — lecture seule

Ne démarre aucun serveur et n'écrit rien (hormis une sonde de jonction dans le dossier temporaire). En plus des liens et de la syntaxe MCP, il vérifie :

- **Prérequis sur le PATH** : `node` (22+), `npm`, `npx`, `git`, `uv`, `uvx`, `python`, `docker`. Recherche dans le PATH uniquement, sans exécution.
- **Cibles de lancement MCP** du manifeste central et de chaque client installé : commande trouvée (PATH + PATHEXT sous Windows), exécutable absolu toujours présent, script absolu (`.js`, `.mjs`, `.py`…) existant. Les serveurs HTTP distants sont signalés comme non testés.
- **Frontmatter des `SKILL.md`** : YAML invalide, `name`/`description` manquants, description de plus de 1 024 caractères (Codex refuse alors le skill). Les écarts de convention (nom en majuscules, nom différent du dossier) sont des avis, pas des erreurs.
- **Coût en tokens** par agent : estimation des noms et descriptions de skills que le client charge à chaque session (divulgation progressive : le corps des `SKILL.md` n'est pas chargé).

Les problèmes qui rendent un skill ou un MCP inutilisable sont des **avertissements** (`warnings` en JSON) ; `healthy` reste réservé aux états corrompus (liens cassés, configurations illisibles).

```bash
agent-commons doctor
agent-commons doctor --json
```

## `agent-commons mcp probe` — exécution explicite

**Démarre réellement** les serveurs sélectionnés, effectue la poignée de main MCP (`initialize`, `notifications/initialized`, `tools/list`), peut appeler un outil, puis arrête l'arbre de processus. À n'utiliser que pour des serveurs de confiance : la commande configurée est exécutée. Disponible uniquement en ligne de commande, jamais depuis l'interface Web.

```bash
# Manifeste central (~/.agents/mcp.json)
agent-commons mcp probe
# Configuration native d'un client
agent-commons mcp probe --agent codex
# Un serveur précis et un appel d'outil non destructif
agent-commons mcp probe agent-commons-demo --call echo --arg text=bonjour
```

`--arg clé=valeur` (répétable) transmet des arguments texte sans guillemets JSON, ce qui évite les problèmes de guillemets de Windows PowerShell 5.1 ; `--arguments '<json>'` reste disponible.

Résultats : `OK` (handshake réussi, liste des outils), `FAIL` (introuvable, arrêt prématuré avec la ligne d'erreur utile de stderr, délai dépassé, outil absent), `AUTH` (serveur HTTP joignable mais qui exige des identifiants : **non vérifié**, pas en échec). La sonde n'utilise jamais de jeton ; les valeurs d'environnement sont transmises au serveur mais jamais affichées.

Sous Windows, les lanceurs `.cmd`/`.bat` (`npx`, `uvx`…) passent par `cmd.exe /d /s /c` avec arguments entre guillemets ; un argument contenant `"`, `%`, `!`, `^` ou un saut de ligne est refusé plutôt qu'échappé.

## Serveur MCP de démonstration sans secret

`agent-commons mcp demo-config` affiche une entrée prête à copier dans `~/.agents/mcp.json` pour un serveur stdio sans dépendance (outils `echo` et `time`, aucun réseau, aucun accès fichier). Parcours de bout en bout :

```bash
agent-commons mcp demo-config            # copier l'entrée dans ~/.agents/mcp.json
agent-commons sync --mcp-only --dry-run --agent claude-code
agent-commons sync --mcp-only --agent claude-code
agent-commons mcp probe agent-commons-demo --agent claude-code --call echo --arg text=ok
claude mcp list                          # vérification par le client lui-même
```

## Particularités Windows constatées

- **Compte standard** : jonctions NTFS sans droits administrateur ni mode développeur. Les liens symboliques de fichiers exigent un privilège ; Agent Commons ne les utilise pas.
- **Chemins longs** : `git clone` dans un chemin de plus de 260 caractères échoue sans `git config --global core.longpaths true`. Agent Commons gère les dossiers de travail profonds (installations de paquets MCP, restauration).
- **Runtimes mis à jour** : une configuration MCP qui pointe vers un `node.exe` absolu d'une ancienne version (par exemple sous `WinGet\Packages\…node-v24…`) cesse de fonctionner après une mise à jour ; `doctor` le signale. Préférer `node` (résolu via le PATH).
- **uv** : requis pour les MCP Fetch et Git (`winget install astral-sh.uv`).
- **Redémarrage** : relancer le client IA après une synchronisation pour qu'il relise skills et MCP.
- **Restauration complète d'une synchronisation** : utiliser le snapshot automatique `pre-sync`, qui mémorise aussi les chemins absents avant la synchronisation ; un `backup` manuel ne mémorise que ce qui existait.
