# Improve — audits et plans pour d'autres agents

**Source :** [shadcn/improve](https://github.com/shadcn/improve/tree/cac56e1ebd3c279aa9153616cfeac7b174ab90f9/skills/improve) · **Auteur :** shadcn · **Licence :** [MIT](https://github.com/shadcn/improve/blob/cac56e1ebd3c279aa9153616cfeac7b174ab90f9/LICENSE.md) · **Commit épinglé :** `cac56e1ebd3c279aa9153616cfeac7b174ab90f9` · **Revue :** 15/11/2026.

Le skill analyse le dépôt **en lecture seule** (bugs, sécurité, performance, tests, dette, dépendances, DX, documentation et roadmap), vérifie chaque constat et produit des plans d'implémentation autonomes. Il ne modifie **jamais les sources**. Les seules écritures du conseiller sont dans `plans/` ou `advisor-plans/` ; chaque plan inclut preuves, étapes, vérifications et conditions d'arrêt. La source installée possède quatre fichiers : `SKILL.md` et `references/audit-playbook.md`, `references/plan-template.md`, `references/closing-the-loop.md`.

### Installer et activer

```bash
agent-commons catalog info improve
agent-commons catalog install improve             # aperçu
agent-commons catalog install improve --yes       # accord requis
agent-commons catalog verify improve
agent-commons skills route "audit du dépôt" --json # métadonnées seules
agent-commons skills load improve                 # instructions à la demande
agent-commons sync --skill improve --agent codex --dry-run
```

L'installation puis la synchronisation demandent chacune une approbation. Invocations : `/improve quick`, `/improve deep`, `/improve security`, `/improve branch`, `/improve next`, `/improve plan <objectif>`, `/improve review-plan <fichier>`, `/improve reconcile`. Claude Code : `/improve` ; Codex : `$improve` si le client gère les skills ; Gemini CLI : découverte native.

`execute <plan>` exige un hôte capable de lancer un **exécuteur séparé en worktree isolé** : le conseiller vérifie le diff mais n'effectue ni commit, ni push, ni merge. À défaut, transmettre manuellement les plans. `--issues` publie sur GitHub uniquement sur demande ; vérifier et faire confirmer toute divulgation sensible dans un dépôt public.

**Limites :** revue de provenance/licence uniquement, pas audit de sécurité complet. Aucun téléchargement, installation, exécution ou rapport sur les dépôts de l'utilisateur n'a lieu lors de la découverte.
