# Operating Surface — interface d'Agent Commons / Agent Commons UI

## FR — Direction produit

**Operating Surface** est l'interface locale d'Agent Commons, conçue comme une console de pilotage opérationnelle plutôt qu'un dashboard SaaS générique. Typographie compacte, sections numérotées, fond graphite, surfaces ivoire (thème clair), signal corail pour les actions intentionnelles. Le système conserve les vrais contrôles du catalogue, des profils d'agents, des MCP, de l'intégrité et des sauvegardes.

### Utilisation

- **Ctrl+K** / **⌘K** ou **/** (hors champs de saisie) ouvre le sélecteur rapide : navigation, skills du catalogue, skills locaux, serveurs MCP configurés et agents installés. Les résultats s'appuient exclusivement sur les données réelles déjà chargées dans la session.
- **↑/↓**, **Entrée**, **Échap** et **Tab** permettent la recherche entièrement au clavier. Choisir un outil ouvre le catalogue et applique le filtre réel, sans installer ni synchroniser.
- Le bouton de thème du bandeau commute entre **clair** et **sombre**. Le choix persiste localement sous `agent-commons-ui-theme` (uniquement `light` ou `dark`). Par défaut, la préférence système est respectée.
- Les langues **FR/EN** continuent d'être sélectionnables indépendamment du thème. L'interface reste utilisable sur mobile, tablette et desktop.

### Architecture

L'interface garde sa base **TypeScript + HTML/CSS/JS natif**, sans React, shadcn, polices externes ni nouvelle dépendance d'exécution.

- `src/web/ui.ts` conserve le DOM et tous ses points d'attache de navigation/actions, CSRF et CSP.
- `src/web/operating-surface.ts` regroupe les tokens, styles, thèmes, layouts et responsive.
- `src/web/operating-surface-controls.ts` fournit uniquement la navigation/recherche et le thème. Aucune API ou mutation de configuration n'y est implémentée.

Les CSS/JS sont intégrés au HTML rendu côté serveur dans les blocs existants à **nonce CSP**, sans lien CDN. Les données externes de recherche sont écrites avec `textContent`, jamais en HTML brut. Les identifiants sensibles, arguments MCP et secrets n'entrent pas dans la recherche globale. Aucun mécanisme de fond ni automatisation implicite.

### Vérifications

`npm run typecheck`, `npm test`, `npm audit --audit-level=high` et `npm pack --dry-run` ; CI Node 22/24 sur Windows, Ubuntu, macOS ; navigateur Chromium via `scripts/web-visual-smoke.mjs` (5 largeurs, navigation, focus, contrastes, palette clavier et thème persisté) ; build portable Windows. Conserver la validation des huit jobs sur la **SHA exacte de la PR** avant fusion, puis revérifier `main`.

### Limites assumées

Le sélecteur rapide **ouvre et filtre** ; il ne déclenche aucune action d'installation, de suppression, de synchronisation ou de restauration. Une référence de catalogue ne prouve pas la santé ou la sécurité d'un MCP. L'interface reste strictement locale sur `127.0.0.1`, sans authentification : **ne jamais l'exposer sur Internet**.

---

## EN — Product direction

**Operating Surface** is an operational control plane instead of a generic SaaS dashboard. It uses dense editorial typography, numbered navigation, graphite surfaces, warm porcelain in light mode, and coral signal accents. The existing catalog, profile, MCP, diagnostics and recovery workflows remain backed by the original real APIs.

Use **Ctrl+K**, **⌘K**, or **/** outside text fields to search pages, catalog/local skills, configured MCP inventory and detected agents. Use **↑/↓**, **Enter**, **Escape**, and **Tab** to navigate. Selecting an item opens the real filtered view; no installation or synchronization takes place. The header's appearance toggle stores only `light`/`dark` in `agent-commons-ui-theme` and otherwise follows the operating-system preference. French and English remain available independently.

The UI remains **dependency-free**: `src/web/ui.ts` owns the original action and security bindings, `src/web/operating-surface.ts` provides design tokens and responsive presentation, and `src/web/operating-surface-controls.ts` provides keyboard navigation and appearance. Assets stay in nonce-protected CSP inline blocks. Search renders external names via `textContent` and never exposes MCP commands, arguments or credentials.

Verification must include TypeScript, unit/security tests, npm audit and pack, the six-platform CI matrix, real Chromium viewports and keyboard/theme flows, and portable Windows QA on the exact PR head. The command palette performs **navigation only**: safe preview and approval requirements remain mandatory. The unauthenticated UI must remain bound exclusively to `127.0.0.1`.
