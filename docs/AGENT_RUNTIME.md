# Moteur agentique local — mode opératoire vérifié dans le code

**Statut : expérimental sur `main`**, ajouts P1–P6 postérieurs à la release `v0.6.0`. Code : `src/runtime/` ; détail des garanties : [sécurité](../SECURITY.md) ; matrice de preuves : [capacités](CAPABILITIES.md).

## Démarrer en lecture seule

Dans un checkout Git fiable avec Node.js >=22 :

```bash
npm ci
npm run build
node dist/runtime/cli.js --workspace "/chemin/vers/un-depot-git" --task "Inspecte les défauts vérifiables, sans modifier" --model "ID_EXACT_LM_STUDIO"
```

Le défaut est `http://127.0.0.1:1234/v1/chat/completions` ; charger dans LM Studio un modèle compatible `tool_calls`, vérifier son ID via `/v1/models`. Les paramètres `--url` ou `AGENT_COMMONS_LOCAL_URL` sélectionnent un autre endpoint compatible OpenAI : ils **ne prouvent pas** sa sécurité, sa disponibilité ou son existence. Une recette modèle/RTX 5070 Ti sur PC réel reste à faire.

Dans **un worktree jetable et fiable uniquement** :

```bash
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --task "Corrige ce bug simple et vérifie les tests" --model "ID_EXACT_LM_STUDIO" --allow-write --allow-tests
```

Les scripts du dépôt (`npm test` / `npm run typecheck`) sont du **code arbitraire** : `--allow-tests` est une autorisation à réserver à un dépôt de confiance. Aucun shell générique n'est exposé au modèle ; la sandbox OS reste absente.

## Skills et MCP pendant une mission

- Le moteur choisit par métadonnées **au plus deux skills physiquement installés** et borne leurs instructions à ~1 600 tokens estimés. Il ne charge pas les 210 références publiques en contexte et n'exécute jamais un script de skill par simple découverte.
- Pour les MCP, chaque `--allow-mcp-tool serveur/outil` n'accorde l'accès qu'à cet outil précis, depuis `~/.agents/mcp.json`, après découverte/handshake. Exemple : `--allow-mcp-tool demo/echo` après configuration effective du serveur. Une référence MCP dans le catalogue ne suffit pas. **L'outil peut avoir des effets de bord** ; le filtrage par nom n'inspecte pas chaque argument ni les permissions intrinsèques du serveur. Pas de secrets HTTP transmis dans la sonde.
- La sélection de skills d'un client et les profils MCP de synchronisation ne sont **pas** les permissions du runtime. Voir [SKILLS_AND_MCP](SKILLS_AND_MCP.md).

## Exécution bornée, preuves et reprises

États : `queued`, `planning`, `running`, `verifying`, `paused`, `needs_approval`, `partial`, `blocked`, `failed`, `cancelled`, `completed`. Plan local limité à 5 étapes ; le texte du modèle n'est pas une preuve. Checkpoints dans `~/.agents/missions/` et liaison à l'identité canonique du checkout. Limites par défaut : 30 étapes, 24 outils, 24 000 tokens **signalés**, 20 minutes par exécution, 2 conseils cloud maximum. Le comptage tokens dépend de l'API ; aucun plafond financier garanti.

L'anti-boucle bloque l'action répétée sans progression et l'oscillation de contenu. Pour déclarer `completed` après modification, le runner exige une inspection vérifiée et un `npm test` réussi ; un résultat de tests ne prouve pas l'absence d'autres défauts. Les intentions d'écriture, de test ou d'appel MCP pouvant produire un effet sont checkpointées **avant** exécution. Si l'état final est incertain : `needs_approval`, aucune répétition automatique.

```bash
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --pause "ID_MISSION"
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --cancel "ID_MISSION"
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --resume "ID_MISSION" --model "ID_EXACT_LM_STUDIO"
# Seulement APRÈS inspection et réconciliation manuelle des effets de bord :
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --acknowledge-pending "ID_MISSION"
```

Pause/annulation coopératives entre actions, sans interruption OS garantie d'une action bloquée. `--acknowledge-pending` ne relance ni ne valide une opération incertaine.

## Mémoire, file et Mission Control

`~/.agents/memory.sqlite` : SQLite WAL/FTS5, recherche lexicale, isolée par identité de checkout, résultats limités. Les résultats automatiques restent des **métadonnées**, non des connaissances injectées automatiquement. Approbation explicite d'une décision : `--workspace ... --remember "Décision vérifiée" --memory-kind decision` ; interrogation : `--memory-search "terme"`. Contrôle de secrets et limite par note 4 Kio ; consulter/révérifier la source à chaque usage.

```bash
node dist/runtime/cli.js --workspace "/chemin/worktree-test" --task "Analyse la qualité" --model "ID_EXACT_LM_STUDIO" --enqueue --priority 7 --delay-minutes 15
node dist/runtime/cli.js --worker
node dist/runtime/cli.js --queue-list
node dist/runtime/cli.js --worker --once
```

La file `~/.agents/queue.sqlite` persiste permissions, objectifs et modèle ; un seul worker détient le bail. Sur crash, un job à effet incertain bascule en revue humaine (`needs_review`) plutôt qu'être rejoué. Commandes `--queue-requeue ID_JOB` et `--queue-cancel ID_JOB` avec `--workspace`. Les scripts de démarrage Windows utilisateur et systemd utilisateur sont optionnels, non une garantie 24/7. Les tâches de la file n'activent pas automatiquement le cloud ni une URL distante. Les événements structurés sont dans `queue-events.jsonl` sans sortie brute du modèle.

`agent-commons web` affiche **Mission Control** sur `127.0.0.1` : état réel du worker/queue et checkpoints, plan et compteurs, enqueue, pause, annulation, remise en file avec approbations. L'interface n'exécute pas un worker en arrière-plan et **n'est pas authentifiée pour le LAN**.

## Autres IA : consultation ≠ délégation de travail

Par défaut un seul modèle local reste exécutant. `--cloud` (API et quota séparés) ou `--delegate codex|claude|gemini|opencode|orchestrator` apporte, sur stagnation, **un avis textuel sans outils** ; le modèle local reprend la main. Une CLI doit être installée, authentifiée et déclarée dans le fichier privé `~/.agents/delegates.json` avec commande, arguments et `readOnlyAdvice: true` ; cette déclaration n'est **pas** une sandbox garantie. `--delegate-test codex` vérifie un appel ponctuel éventuellement facturé, sans source projet. Timeout maximal : 90 s par avis, entrée/sortie bornées, environnement filtré, pas de shell. Transfert d'observations de code uniquement avec `--allow-cloud-source`, décision explicite. Ni sous-agents concurrents, ni distribution automatisée de tâches, ni merge/push distant délégué.

**Limites restantes :** vrais modèles LM Studio/RTX, clients CLI et authentifications spécifiques, isolation OS, isolation réseau/sandbox MCP, coût réel et mesures GPU, interruption immédiate des outils, exposition LAN avec identité et contrôle d'accès. [Priorités](ROADMAP.md).


## Indisponibilité du fournisseur

Le worker met en attente une mission lorsque le fournisseur est inaccessible, expire ou répond 502, 503 ou 504. La file SQLite réessaie après 30 secondes, puis augmente ce délai jusqu'à cinq minutes. Les checkpoints, permissions et budgets restent conservés. Les requêtes sans réponse sont comptées séparément dans `modelUnavailableCount` ; leur consommation éventuelle de tokens côté fournisseur est inconnue. Les réponses d'authentification et les erreurs de protocole ne déclenchent pas ce mécanisme. Un bail expiré ou une action à effet incertain exige toujours une revue humaine.

Pour un fournisseur distant, configurer `AGENT_COMMONS_LOCAL_URL` avec HTTPS et fournir `AGENT_COMMONS_LOCAL_API_KEY` dans l'environnement du service, sans enregistrer le secret dans Git. Le certificat doit être approuvé par Node.js. Les redirections sont refusées. Le fournisseur distant, son modèle et le réseau restent à qualifier sur les machines réelles ; aucun service n'est déployé par cette modification.

Le renouvellement du bail est transactionnel : le verrou et la mission doivent encore appartenir au worker et ne pas être expirés. Un ancien propriétaire ne peut pas enregistrer une fin après expiration. Cette protection ne termine pas un outil déjà lancé : une isolation et une interruption au niveau système restent nécessaires avant toute exécution distribuée fiable.

Les empreintes des actions répétées et le compteur de stagnation restent présents après rechargement du checkpoint. Un test interrompt réellement un processus entre deux tours ; la reprise automatique après perte du bail reste volontairement soumise à réconciliation.
