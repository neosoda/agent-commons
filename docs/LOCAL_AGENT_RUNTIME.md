# Agent Commons — expérimentation du moteur autonome local (P0)

Cette extension ajoute **un exécuteur de missions bornées** indépendant du gestionnaire de skills et MCP. Elle ne transforme pas encore Agent Commons en orchestrateur multi-agent complet.

## Installation et premier essai

Depuis **v0.6.0**, le moteur est déjà intégré dans le dépôt ; aucun patch n'est nécessaire. Utilisez une **branche dédiée** dans un dépôt fiable, puis exécutez :

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

Dans LM Studio, charger un modèle qui prend réellement en charge les appels d'outils (`tool_calls` au format OpenAI) et activer le serveur local sur `127.0.0.1:1234`. Récupérer son identifiant exact depuis `http://127.0.0.1:1234/v1/models`.

Test lecture seule (une seule ligne PowerShell) :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --task "Lis le projet, relève les défauts vérifiables et résume-les sans rien modifier" --model "ID_EXACT_DU_MODELE_LM_STUDIO"
```

Autoriser des modifications dans **un dépôt de démonstration ou un worktree jetable**, pas dans une branche de production :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --task "Identifie et corrige un petit bug, puis vérifie les tests" --model "ID_EXACT_DU_MODELE_LM_STUDIO" --allow-write --allow-tests
```

Le programme affiche l'identifiant de mission. Après interruption :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --resume "IDENTIFIANT_AFFICHE" --model "ID_EXACT_DU_MODELE_LM_STUDIO" --allow-write --allow-tests
```

Les checkpoints sont conservés sous `~/.agents/missions/` avec leurs compteurs et des résumés hachés des observations ; pas de journalisation complète des contenus lus. Le modèle peut devoir relire certains fichiers après reprise.

## Garanties et limites

- **Bornes configurables** : étapes, appels d'outils, tokens signalés par l'API, durée, absence de progrès et appels cloud. Le plafond de tokens est **indicatif si le serveur ne renvoie pas `usage`**. Pas de contrôle financier en euros à ce stade.
- **Anti-boucle** : empreinte de l'action et de ses arguments, comptabilisation des tentatives, progression calculée à partir des résultats d'outils et arrêt d'une action identique répétée. Les retours du modèle ne sont pas traités comme des preuves.
- **Privilèges** : commandes génériques et shell arbitraire interdits. Lectures bornées, blocage des chemins de secrets connus, des traversées et liens symboliques ; écriture uniquement avec `--allow-write` et dans le worktree désigné. Les scripts `npm test` / `npm run typecheck` ne s'exécutent qu'avec `--allow-tests` : **les scripts d'un dépôt restent du code arbitraire** et exigent donc une base de confiance préalable.
- **Fin honnête** : inspection obligatoire, code modifié = test `npm test` réussi requis pour déclarer `completed`, sinon statut `partial`. Un test réussi n'est pas une garantie de correction complète.
- **Cloud facultatif, en lecture conseil uniquement** : `--cloud`, avec variables `AGENT_COMMONS_CLOUD_URL`, `AGENT_COMMONS_CLOUD_MODEL`, `AGENT_COMMONS_CLOUD_API_KEY`. Sur stagnation constatée, le cloud fournit une suggestion textuelle **sans outils** ; le modèle local reprend ensuite l'exécution et vérifie les résultats. Par défaut, le cloud reçoit l'objectif de mission et des résumés de résultats hachés, pas les contenus des fichiers ; le transfert explicite des observations contenant du code nécessite `--allow-cloud-source`. Les recommandations cloud ne prouvent aucune réussite et ne sont pas enregistrées en clair dans le checkpoint. Un abonnement ChatGPT/Claude/Gemini n'est pas automatiquement une clé API facturable.
- **Pas encore intégré** : MCP comme outils de la boucle, skills à la demande, Agent Orchestrator/OpenCode/Claude/Codex/Gemini comme exécutants, benchmark multi-modèles sur RTX 5070 Ti, daemon 24/7, UI des missions et recette Windows réelle. Ne pas annoncer ces fonctionnalités opérationnelles.
- **Sécurité résiduelle** : pas de véritable sandbox OS, ni d'isolation des scripts npm, ni de terminaison garantie des processus enfants lors des timeouts. Ne pas lancer sur des dépôts non fiables, avec un compte administrateur, ou contre des données sensibles sans isolation supplémentaire. Les filtres de secrets ne peuvent garantir l'absence absolue de fuite.

Tests automatisés du module : `node --test dist/test/agent-runtime.test.js`. Un serveur HTTP LM Studio simulé permet de valider l'enchaînement de vrais appels `fetch`; ce n'est pas un test de performance ou d'intelligence d'un modèle réel.

## Durcissement des reprises (20 novembre 2026)

Chaque nouvelle mission CLI est liée à l'empreinte SHA-256 du chemin canonique du dépôt : la reprise sur un autre checkout est refusée (et les anciens checkpoints non liés doivent être recréés). Les limites de tours, tokens, outils et appels cloud restent cumulatives ; le plafond de durée concerne chaque exécution séparée, afin de permettre la reprise après une longue pause.

Les noms de périphériques Windows et flux NTFS alternatifs (ADS) sont refusés. Le cloud ne peut plus effectuer de `write_file`, même avec `--allow-cloud-source` : ce paramètre contrôle uniquement le partage des observations de code. Un client cloud injecté qui tente un appel d'outil au lieu d'un conseil est arrêté sans exécution. Toute modification reste réalisée par l'agent local avec les autorisations locales explicites. Cela ne constitue pas encore une sandbox OS.


## Correction locale-first (22 novembre 2026)

En cas d'escalade, un seul appel consultatif cloud est effectué par tentative. Le modèle local conserve la responsabilité des outils et du résultat final. Une nouvelle escalade exige une progression vérifiable depuis le dernier conseil. Le budget de tokens signalé par la réponse cloud est comptabilisé, mais il ne garantit pas la maîtrise du coût financier : configurer un plafond côté fournisseur. Les tests HTTP du client ne remplacent pas une recette sur le PC Windows et un véritable endpoint LM Studio.

## P1 — Skills et outils MCP pendant une mission (PR #106 fusionnée ; pas de nouvelle release)

Au démarrage de chaque mission, le moteur utilise le routeur de skills existant pour sélectionner au plus deux skills physiques installés dans `~/.agents/skills`. Seules les instructions sélectionnées sont fournies au modèle, avec un budget estimé de 1 600 tokens. Aucun script de skill n'est exécuté ou installé automatiquement.

Le moteur sait maintenant appeler un véritable outil MCP **uniquement sur autorisation explicite** par couple serveur/outil. Le serveur doit être déclaré dans le manifeste central `~/.agents/mcp.json`, puis répondre à `initialize` et `tools/list`. Exemple, après avoir configuré le serveur `demo` qui expose `echo` :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --task "Analyse le code et utilise l'outil MCP echo pour vérifier la connexion" --model "ID_EXACT_LM_STUDIO" --allow-mcp-tool demo/echo
```

Plusieurs `--allow-mcp-tool serveur/outil` peuvent être indiqués ; chaque outil est contrôlé avant la mission et à l'exécution. Aucun autre outil MCP n'est exposé au modèle. Les résultats sont traités comme entrées non fiables et seuls des métadonnées et condensats sont conservés dans les checkpoints. MCP stdio et Streamable HTTP (HTTPS ou loopback HTTP) sont pris en charge sans secrets HTTP ; les endpoints nécessitant une authentification ne sont pas validés par ce chemin.

**Limites :** les autorisations sont des options CLI, pas encore des validations interactives à l'argument près. N'autorisez donc que des outils dont les effets de bord sont acceptables pour la mission, idéalement en lecture seule. Chaque appel MCP réalise son propre handshake plutôt qu'une connexion conservée. Pas de sandbox système, ni de recette avec la RTX 5070 Ti / LM Studio à distance. Ne pas confondre les tests HTTP simulant une API modèle avec une vraie inférence locale. PR #106 fusionnée sur main au commit a661fed8996737df24d6984532b33efeb6918725 : 8/8 validations PR et 8/8 validations main réussies. Aucune recette physique sur LM Studio/RTX 5070 Ti n'est revendiquée.


## P2 — Plan, états persistants et reprise conservatrice (travail en cours)

Chaque mission CLI démarre désormais en état `queued`, puis le modèle **local** propose au maximum cinq étapes lors d'un appel de planification sans outils. Le plan est conservé dans le checkpoint ; il ne constitue **pas** une preuve de réussite. Les états `planning`, `running`, `verifying`, `paused`, `cancelled`, `needs_approval`, `partial`, `blocked` et `completed` reflètent les étapes réelles du moteur.

Commandes coopératives depuis un second terminal, avec le même espace de travail :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --pause "ID_MISSION"
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --cancel "ID_MISSION"
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --resume "ID_MISSION" --model "ID_EXACT_LM_STUDIO"
```

Une demande de pause/annulation est enregistrée indépendamment du checkpoint ; le worker la prend en compte entre deux actions, pas instantanément au milieu d'un outil bloqué.

Avant une écriture, un appel MCP ou un test de projet susceptible d'avoir des effets de bord, le moteur inscrit une intention dans le checkpoint. Après un crash ou un résultat ambigu, il s'arrête en `needs_approval` et ne rejoue **jamais automatiquement** cette action. Après inspection réelle de l'état du projet, le responsable peut confirmer la réconciliation :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT-TEST" --acknowledge-pending "ID_MISSION"
```

Cette confirmation **n'exécute pas** l'action et ne garantit pas sa réussite ; une écriture incertaine reste marquée comme modification non testée. Les actions longues ne sont pas interruptibles au niveau OS, et le processus ne dispose pas d'une sandbox. Ce P2 ne constitue pas encore un worker 24/7, un scheduler, un système de verrouillage multi-processus ou un dashboard.

## P3 — Mémoire de mission SQLite, sélective et vérifiée (incrément en cours)

Agent Commons conserve désormais une mémoire **locale par dépôt** dans `~/.agents/memory.sqlite` (SQLite FTS5 ; aucun service ou vecteur externe). Les recherches sont lexicales et limitées à quatre résultats par défaut. Une mission reçoit uniquement les notes approuvées pertinentes ; tout contexte mémorisé doit être revérifié sur les fichiers actuels. Les connaissances d'un dépôt ne sont jamais proposées à un autre checkout.

Les résultats des missions sont enregistrés automatiquement sous forme de **métadonnées objectives** (états, compteurs de vérification, empreintes de l'objectif), sans conserver le code, les prompts, les sorties MCP ou les conseils cloud. Les échecs et les résultats non suffisamment vérifiés restent non validés et ne sont jamais injectés dans l'IA. Aucun résultat généré par le modèle n'est automatiquement promu au rang de connaissance du projet.

Pour approuver manuellement une décision ou une connaissance :

```powershell
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --remember "Utiliser Vitest pour les tests frontend" --memory-kind decision
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --memory-search "tests frontend"
```

Les entrées sont limitées à 4 Kio et soumises à la détection de secrets existante. Base limitée à 1 000 entrées par checkout, mode WAL et index FTS5. Ce dispositif n'est ni un moteur de recherche sémantique ni une preuve cryptographique du résultat d'un modèle. L'API SQLite native de Node 22 est encore signalée expérimentale par certaines versions de Node ; la compatibilité est vérifiée en CI avant fusion.

## P4 — File de missions persistante et worker local (en développement)

Le moteur peut mettre en file des missions dans `~/.agents/queue.sqlite`, avec priorité (0 à 9) et lancement différé en minutes, sans stocker de clés API dans la file. La file pointe vers des checkpoints créés lors de l'enqueue ; si le worker est interrompu, il ne recrée pas une mission avec un nouvel identifiant.

```powershell
# Planifier une mission (lecture seule par défaut)
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --task "Vérifie les tests et les défauts du projet" --model "ID_EXACT_DU_MODELE" --enqueue --priority 7 --delay-minutes 15

# Démarrer un worker interactif local (arrêt Ctrl+C)
node dist/runtime/cli.js --worker

# Effectuer un seul passage, utile en test
node dist/runtime/cli.js --worker --once

# Suivre la file, relancer manuellement ou annuler un travail en attente
node dist/runtime/cli.js --queue-list
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --queue-requeue "ID_JOB"
node dist/runtime/cli.js --workspace "A:\PROJETS\MON-DEPOT" --queue-cancel "ID_JOB"
```

La file conserve le chemin du checkout, le modèle et les autorisations au moment de l'enqueue. L'exécution reste **locale-first** ; cloud et endpoint distant ne sont pas permis dans les tâches planifiées. Un seul worker et une seule mission active à la fois (verrou SQLite + heartbeat, plafonds d'exécution du moteur). Les journaux structurés sont dans `~/.agents/queue-events.jsonl` sans texte de code ou sorties de modèle.

Si un worker disparaît pendant une mission, son job finit `needs_review` à l'expiration du bail. Il **ne sera pas relancé tout seul**. Inspectez l'état réel du checkout, le checkpoint et les éventuels effets de bord. Si `pendingAction` est présent, réconciliez-le explicitement avec `--acknowledge-pending ID_MISSION` avant `--queue-requeue ID_JOB`. Ne démarrez pas simultanément le worker et une exécution CLI directe de la même mission.

**Démarrage Windows :** depuis le dépôt compilé, `powershell -File scripts/install-worker.ps1` crée une tâche du Planificateur Windows au démarrage de la session de l'utilisateur courant, sans privilèges administrateur. `-Uninstall` la retire. Le poste et la session utilisateur doivent rester actifs.

**Linux :** installez `scripts/agent-commons-worker.service` dans `~/.config/systemd/user/`, ajustez au besoin `ExecStart`, puis `systemctl --user daemon-reload && systemctl --user enable --now agent-commons-worker.service`. Cette unité fonctionne sous le compte utilisateur, sans accès privilégié par défaut.

**Limites :** le worker ne fournit pas une sandbox OS, ne force pas la terminaison immédiate d'une action en cours, ne garantit pas l'exécution si le poste est éteint, ni la reprise automatique des effets de bord incertains. Le dashboard et l'orchestration multi-agents restent des incréments séparés.

## P5 — Mission Control dans le Skill Hub existant (en validation)

Le dashboard local Agent Commons (127.0.0.1 uniquement) possède désormais une rubrique **Missions** : création de mission et ajout à la queue, objectif, dépôt Git autorisé, modèle local, priorité, délai, permissions d'écriture/tests explicites. Les opérations passent par les mécanismes existants de contrôles Host/Origin, jeton CSRF, anti-concurrence et consentement. Les tâches planifiées utilisent le worker de P4 ; ouvrir le dashboard **ne lance pas un worker caché**.

La rubrique lit la file SQLite et les vrais checkpoints : état, étapes du plan, skills sélectionnés, modèle actif, appels MCP, tokens, appels cloud, nombre de contrôles vérifiés et métadonnées de journaux. Rafraîchissement automatique toutes les cinq secondes uniquement lorsque la page est visible. Pause, annulation et remise en file sont disponibles dans la rubrique, avec une confirmation supplémentaire en cas de résultats incertains. Les tentatives non autorisées sont refusées côté serveur.

Les vues HTTP n'affichent **jamais** les chemins complets des dépôts, le contenu des fichiers, les prompts, les secrets ni la sortie MCP brute. Les plans du modèle sont non vérifiés ; leurs textes sont affichés en tant que texte brut, sans interprétation HTML. La consommation RAM/VRAM n'est pas mesurée et n'est pas inventée.

**Périmètre de sécurité :** interface uniquement loopback, aucune exposition LAN/Internet ; pas d'authentification distante dans cette itération. Pour utiliser le dashboard depuis un autre PC sur le LAN, il faudra une passerelle authentifiée et isolée : ne modifiez pas le bind HTTP pour l'ouvrir sans contrôle. Les validations personnelles sur le modèle et le hardware restent à faire.
