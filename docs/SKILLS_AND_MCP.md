# Skills et MCP — référence d'exploitation

La **bibliothèque locale**, le **catalogue public** et les **configurations clientes** sont trois choses différentes. `catalog/skills.json` référence 211 skills (métadonnées épinglées), `src/mcp/catalog.ts` dix références MCP (XERJ compris) ; cela ne veut dire ni installé, ni actif, ni sécurisé. Les clients détectés sont documentés par [capacités](CAPABILITIES.md) et par le [registre](../src/agents/registry.ts).

## Démarrage et diagnostic

```bash
npm ci && npm run build
node dist/cli/index.js doctor
node dist/cli/index.js list
node dist/cli/index.js sync --dry-run
node dist/cli/index.js backup
# Application seulement après examen de l'aperçu
node dist/cli/index.js sync
# Démarre explicitement un serveur configuré : ne pas confondre avec doctor
node dist/cli/index.js mcp probe --agent codex
```

Pour expérimenter sans toucher au profil réel, préférer `--home <dossier-test>`. `doctor` examine les chemins/launchers sans exécuter les MCP ; `mcp probe` réalise un handshake actif, peut lancer un binaire externe et n'accorde **aucune permission de mission** à lui seul. [Diagnostics détaillés](DIAGNOSTICS.md).

## Skills : découverte légère et activation

```bash
node dist/cli/index.js catalog list
node dist/cli/index.js skills route "audit sécurité TypeScript" --json
node dist/cli/index.js skills load ux-psychology
node dist/cli/index.js sync --skill ux-psychology --agent codex --dry-run
```

`skills route` classe des **descriptions** des skills physiquement présents ; `skills load` charge explicitement un seul `SKILL.md`. `context "tâche"` effectue aussi un routage hors ligne avec `--expand` facultatif, dans un budget estimé. Pas d'injection globale dans les prompts de Codex/Claude/Gemini, pas de hook natif auto-installé. `~/.agents/skill-router.json` permet de limiter le nombre et le budget ; le routeur refuse les fichiers dangereux/trop grands. [Routage détaillé](CONTEXT_ROUTING.md).

Installer un skill public n'est **jamais** un effet secondaire de la recherche. Utiliser l'aperçu, une source GitHub épinglée et une confirmation explicite ; contrôler les licences et les scripts avant exécution. `catalog install <id> --yes` est une décision explicite de l'opérateur, et non un mécanisme de confiance du code. Synchroniser un skill à un client ne retire pas les anciens liens ; les clients qui lisent la bibliothèque commune n'ont pas besoin d'un deuxième lien. [Catalogue et provenance](SKILL_CATALOG.md) · [index complet et crédits](skills/README.md).

## Loop Engineering universel

Le skill [universal-product-engineering](../skills/universal-product-engineering/SKILL.md) est une instruction portable, pas un nouveau moteur runtime. La V2 impose une boucle fermée avec baseline mesurée, scorecard, preuves A/B/C/D, anti-oscillation, budget global, checkpoints, validation finale et critique UX/UI anti-slop sur interface réelle lorsque possible. Elle réutilise l'état de suivi existant ou un seul fichier local `.loop/STATE.md` ; l'arrêt de la boucle ne signifie pas que le produit est validé.

Depuis Agent Commons compilé, installation et synchronisation **sur décision de l'opérateur**, par exemple pour Codex :

```bash
agent-commons catalog info universal-product-engineering
agent-commons catalog install universal-product-engineering --yes
agent-commons sync --skill universal-product-engineering --agent codex --dry-run
# Après inspection du plan :
agent-commons sync --skill universal-product-engineering --agent codex
agent-commons skills load universal-product-engineering
```

Dans le projet cible : « Exécute le skill universal-product-engineering sur le projet courant. » Adapter le client selon les chemins détectés. Le skill route les compétences installées selon chaque tâche ; il ne télécharge ni n'active automatiquement les références tierces. Les agents sans navigateur ou outils de test signalent les validations impossibles, sans prétendre les avoir exécutées.

## MCP : quatre étapes distinctes

1. **Référencer** : inspecter une fiche du catalogue hors ligne ; aucun processus démarré.
2. **Installer** : pour les packages **approuvés**, l'Extension Manager prend en charge Playwright/Filesystem via npm épinglé et Fetch/Git via uv épinglé (installation isolée, preview et confirmation). XERJ : binaire officiel épinglé avec SHA-256 et contrôles locaux explicites (voir [guide XERJ](XERJ.md)). GitHub, Docker Gateway, Agent Desktop : installation manuelle, jamais implicite.
3. **Configurer** : ajouter dans `~/.agents/mcp.json` l'exécutable local et les paramètres utiles (répertoires autorisés pour Filesystem/Git). Les credentials restent hors des pages web.
4. **Synchroniser** : choisir les clients et profils, prévisualiser les révisions, confirmer. Les configurations natives non gérées et les champs inconnus sont conservés ; aucun profil ne désactive rétroactivement un serveur déjà présent chez un client.

`src/mcp/extension-manager.ts` et [guide Extension Manager](EXTENSION_MANAGER.md) décrivent les opérations install/update/repair/uninstall **réellement implémentées**. Le [guide MCP Control Center](MCP_CONTROL_CENTER.md) couvre la sélection/profils ; il n'est pas une référence de gestion des packages. Le fichier natif de LM Studio est `~/.lmstudio/mcp.json` (sous Windows `%USERPROFILE%\.lmstudio\mcp.json`), **sans dossier de skills fictif**. [Guide Windows](MCP_WINDOWS.md).

## Permissions et sécurité

- Un profil MCP de synchronisation limite les **ajouts** : il ne constitue ni un sandbox, ni une liste d'autorisations des outils que le client pourrait invoquer.
- Pendant une mission agentique, seule l'option `--allow-mcp-tool serveur/outil` rend cet outil accessible au runner ; l'outil garde sa propre puissance (fichiers, Docker, réseau). Restreindre les racines, comptes, API et permissions **dans le serveur lui-même**.
- Ne pas mêler OSINT/fetch non fiables et Docker Gateway ou contrôle du bureau dans une même configuration privilégiée ; ne jamais exposer la page locale ni les secrets sur le LAN.
- Ne pas supprimer un package MCP avant d'avoir traité les références résiduelles dans les configurations centrales et natives. Les snapshots réduisent les risques sans rendre les écritures atomiques.

La prise en charge de chaque logiciel ne garantit pas que sa version réelle est installée et testée. Voir [politique de sécurité](../SECURITY.md), [limitations](CAPABILITIES.md) et [roadmap](ROADMAP.md).
