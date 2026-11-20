# Agent Commons — expérimentation du moteur autonome local (P0)

Cette extension ajoute **un exécuteur de missions bornées** indépendant du gestionnaire de skills et MCP. Elle ne transforme pas encore Agent Commons en orchestrateur multi-agent complet.

## Installation et premier essai

Depuis une copie de travail Git d'Agent Commons sur une **branche dédiée**, appliquer `agent-commons-local-runtime.patch`, puis exécuter :

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
- **Cloud facultatif** : `--cloud`, avec variables `AGENT_COMMONS_CLOUD_URL`, `AGENT_COMMONS_CLOUD_MODEL`, `AGENT_COMMONS_CLOUD_API_KEY`. L'escalade suit une répétition ou une stagnation vérifiée. Le transfert de contenus de fichiers vers le cloud nécessite **en plus** `--allow-cloud-source`. Un abonnement ChatGPT/Claude/Gemini n'est pas automatiquement une clé API facturable.
- **Pas encore intégré** : MCP comme outils de la boucle, skills à la demande, Agent Orchestrator/OpenCode/Claude/Codex/Gemini comme exécutants, benchmark multi-modèles sur RTX 5070 Ti, daemon 24/7, UI des missions et recette Windows réelle. Ne pas annoncer ces fonctionnalités opérationnelles.
- **Sécurité résiduelle** : pas de véritable sandbox OS, ni d'isolation des scripts npm, ni de terminaison garantie des processus enfants lors des timeouts. Ne pas lancer sur des dépôts non fiables, avec un compte administrateur, ou contre des données sensibles sans isolation supplémentaire. Les filtres de secrets ne peuvent garantir l'absence absolue de fuite.

Tests automatisés du module : `node --test dist/test/agent-runtime.test.js`. Un serveur HTTP LM Studio simulé permet de valider l'enchaînement de vrais appels `fetch`; ce n'est pas un test de performance ou d'intelligence d'un modèle réel.
