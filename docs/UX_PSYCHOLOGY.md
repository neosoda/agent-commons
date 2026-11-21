# UX Psychology — 30 principes UX exploitables

Le skill `ux-psychology` d'Agent Commons applique les [30 notions de Laws of UX](https://lawsofux.com/fr/laws/) à des audits, refontes et constructions d'interfaces : parcours, hiérarchie, navigation, choix, formulaires, dashboards, accessibilité, erreurs, performance perçue et tests.

**Indépendant et original**, non affilié à Laws of UX. Source d'inspiration : Jon Yablonski ; traduction du site créditée à Lionel Nolhac. Aucun visuel ni contenu sous licence tierce recopié. Références : `skills/ux-psychology/references/sources.md`.

Le catalogue référence une version GitHub **épinglée**, avec aperçu et approbation avant installation dans `~/.agents/skills`. Les métadonnées sont proposées sans charger les fichiers ; ensuite le guide principal `SKILL.md`, puis uniquement les références utiles. Aucune installation, exécution, synchronisation ou injection native automatique.

```bash
agent-commons catalog search ux-psychology
agent-commons catalog info ux-psychology
agent-commons catalog install ux-psychology
agent-commons skills route "Audite l'ergonomie du catalogue" --json
agent-commons skills load ux-psychology --json
agent-commons skills load ux-psychology --resource references/principles.md
```

La synchronisation d'un skill installé vers un agent compatible est distincte et nécessite un aperçu et une confirmation. Certains agents lisent directement `~/.agents/skills`.

**Prompt :** « Audite cette interface avec UX Psychology. Identifie cinq frictions vérifiables, propose des corrections hiérarchisées et teste le parcours principal, le clavier et le mobile sans dégrader l'existant. »

Ce skill apporte des hypothèses falsifiables et des critères d'acceptation, pas une certification WCAG ni une promesse de conversion.
