# Sélection Hermes : six skills utiles, pas un catalogue chargé en bloc

**Sélection : 20 novembre 2026.** Point de départ : [frankxai/awesome-hermes-agent-skills](https://github.com/frankxai/awesome-hermes-agent-skills), un **annuaire** d'outils indépendants, et non un paquet installable unique. Nous reprenons sa discipline de sélection, vérification et installation ciblée.

## Ce qui entre dans Agent Commons

| Skill | Pourquoi | Origine |
|:--|:--|:--|
| `todo-discipline` | Éviter les fins de tâches annoncées alors que le suivi est faux | [FrankX](https://github.com/frankxai/awesome-hermes-agent-skills) |
| `bounded-orchestration-contract` | Déléguer à plusieurs agents avec droits, fichiers et vérifications clairement bornés | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `compaction-survival` | Garder un handoff court et solide entre sessions sans gonfler les tokens | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `skill-health-audit` | Évaluer déclenchements, doublons, coût en contexte et preuves avant promotion | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `local-inference-tuning` | Optimiser un agent/LLM local selon CPU, GPU, RAM, stockage et endpoint privé | [ABVX](https://github.com/markoblogo/abvx-agent-skills) |
| `skill-inspector` | Examiner une compétence tierce, avec SkillSpector si disponible, **sans exécuter** sa source | [NVIDIA](https://github.com/NVIDIA/SkillSpector) |

Ce sont **six références épinglées, non installées**. Aucune copie vendored, dépendance Python, cron, hook, permission MCP, exécution ou modification des agents n'est introduite. Les sources et licences MIT / Apache-2.0 ont été lues à leurs commits précis ; cela ne vaut **ni test dynamique ni audit exhaustif**. Les états expérimentaux d'ABVX ne sont pas présentés comme des garanties de production.

## Découvrir et activer à la demande

```bash
agent-commons catalog search hermes-curated
agent-commons catalog info bounded-orchestration-contract
agent-commons catalog install bounded-orchestration-contract       # aperçu sans écriture
agent-commons catalog install bounded-orchestration-contract --yes # après contrôle de la source
agent-commons catalog verify bounded-orchestration-contract
agent-commons sync --skill bounded-orchestration-contract --agent codex --dry-run
agent-commons sync --skill bounded-orchestration-contract --agent codex
agent-commons skills route "Coordonne Codex et Claude" --json
agent-commons skills load bounded-orchestration-contract --json
```

La synchronisation se limite au skill choisi et à l'agent visé. Installer seulement ce qui sert ; ne pas charger les six `SKILL.md` en permanence. Les commandes `skills route` ne renvoient que des **métadonnées** ; `skills load` charge explicitement le texte d'un skill **déjà installé**, dans les limites du routeur. Aucun appel à un modèle cloud n'est ajouté.

**Contrôle de sûreté :** examiner d'abord les instructions et les droits, puis lancer `skill-inspector` si installé. Le scanner externe NVIDIA SkillSpector est **facultatif**, non provisionné ici et ne remplace pas la relecture humaine. En absence du CLI, le skill passe à une revue manuelle et le signale. Les décisions de déploiement, suppression, secrets, argent et publication restent sous validation humaine.

## Choix écartés et pourquoi

- `coding-agents-superpack` : contient des exemples d'approbation automatique et du contenu déjà couvert par nos routeurs ; éviter les permissions élargies et les doublons.
- `ecc-session-guard` : nécessite des hooks/scripts à activer séparément ; ne pas imposer des hooks natifs à Claude, Codex ou Hermes.
- `planning-with-files` : puissant, mais ses hooks de cycle de vie et ses scripts dépendent de l'hôte ; nos handoffs + `compaction-survival` suffisent pour commencer.
- `hermes-incident-commander` : contient des remédiations automatiques de services, paramètres système, purge de fichiers et un délai d'approbation implicite ; incompatible avec notre politique **autorisation explicite**.
- `hermes-skill-factory` et les annuaires massifs : pas d'ingestion ni d'auto-promotion de skills sans tests, preuve d'origine et revue.

**Crédits :** sélection initiale [Frank Riemer / FrankX](https://github.com/frankxai/awesome-hermes-agent-skills) (MIT) ; skills spécifiques [Anton Biletskiy-Volokh / ABVX](https://github.com/markoblogo/abvx-agent-skills) (MIT) et [NVIDIA SkillSpector](https://github.com/NVIDIA/SkillSpector) (Apache-2.0). Consultez les sources et licences épinglées dans [l'index](skills/README.md). Nous n'incorporons aucun code tiers.

