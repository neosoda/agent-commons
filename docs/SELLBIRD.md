# Sellbird — MCP externe optionnel

Sellbird (anciennement Harvey) est un outil de prospection et de gestion commerciale indépendant. Agent Commons référence son MCP stdio natif ; il ne réimplémente pas le moteur, ne fournit pas de service de collecte ou d'envoi et n'importe aucun de ses 17 playbooks.

- Source et crédits : [ethanplusai/sellbird](https://github.com/ethanplusai/sellbird), version déclarée 0.5.0, [révision inspectée](https://github.com/ethanplusai/sellbird/tree/8c743f1c475f61f7b2c04e50501cf6938a126ed6) le 26/11/2026.
- Licence amont : [AGPL-3.0-only](https://github.com/ethanplusai/sellbird/blob/8c743f1c475f61f7b2c04e50501cf6938a126ed6/LICENSE) ; Agent Commons reste MIT. Aucun fichier amont n'est redistribué.
- Prérequis : Python 3.11+, environnement virtuel indépendant, dashboard local Sellbird, compte CLI et configuration selon les besoins. Les services tiers peuvent avoir leurs propres coûts et conditions.
- Statut : catalogue et profil de synchronisation ; pas de package géré par Extension Manager, pas de test réel du serveur dans cette intégration.

## Configuration volontaire

1. Inspecter le checkout amont épinglé, ses dépendances et la [documentation](https://github.com/ethanplusai/sellbird/blob/8c743f1c475f61f7b2c04e50501cf6938a126ed6/docs/configuration.md). Installer séparément selon le guide amont, dans un environnement isolé sans droits administrateur. Ne pas utiliser un checkout dans le projet courant comme module Python implicite.
2. Configurer un espace de test dédié avec données fictives, sans boîte d'envoi ni autopilot. Démarrer le dashboard local depuis cet espace selon le guide amont. Vérifier le port et les autorisations ; ne pas l'exposer au LAN.
3. Depuis cet environnement, la commande amont `sellbird mcp install --print` affiche la configuration (ne pas lancer `sellbird connect` si Agent Commons doit gérer les clients). L'entrée amont utilise Python absolu, `-P -m sellbird mcp` et `SELLBIRD_HOME`.
4. Ajouter uniquement l'entrée centrale `sellbird` à `~/.agents/mcp.json`, sans écraser les autres entrées. Exemple à adapter localement (le chemin Windows de Python est généralement celui du dossier Scripts de la venv ; les chemins POSIX sont absolus) :

```json
{
  "mcpServers": {
    "sellbird": {
      "command": "/absolute/venv/bin/python",
      "args": ["-P", "-m", "sellbird", "mcp"],
      "env": {"SELLBIRD_HOME": "/absolute/sellbird-workspace"}
    }
  }
}
```

Ne pas copier ce fichier dans Git. Si l'éditeur de secrets du Skill Hub refuse une valeur d'environnement littérale, éditer le manifeste local directement. Ne pas y placer de token ; Sellbird gère sa propre clé d'agent. Le chemin doit correspondre au workspace réellement configuré.

5. Dans MCP Control Center, sélectionner `outreach` et seulement le client voulu ; prévisualiser puis confirmer la synchronisation. `agent-commons doctor` est une inspection ; `agent-commons mcp probe --agent codex` lance les MCP configurés de ce client : utiliser un profil client de test ne contenant que Sellbird. Redémarrer le client si nécessaire. Pour retirer l'accès, retirer l'entrée native concernée et révoquer la clé dans Sellbird ; le retrait d'un profil ne désactive pas les serveurs déjà synchronisés.

## Exemples et permissions

Commencer avec `today`, `stats` et `sending_status` (outils confirmés dans [le serveur](https://github.com/ethanplusai/sellbird/blob/8c743f1c475f61f7b2c04e50501cf6938a126ed6/sellbird/mcp_server.py)). Exemple : « Consulte le statut Sellbird et résume les éléments en attente, sans modification ni données personnelles. »

Dans le runtime expérimental, autoriser seulement les noms nécessaires, par exemple `--allow-mcp-tool sellbird/today` ; cela ne configure pas les permissions d'un client externe. Ne pas autoriser par défaut les outils mutateurs (brouillons, contacts, pause, mises à jour), ni les outils ouvrant une session dashboard. Une session de navigateur signée peut approuver des actions même si la clé MCP ne le peut pas : ne pas la confier à un agent autonome. Laisser l'autopilot désactivé et toutes les communications externes sous contrôle humain. Ne jamais importer les données personnelles ou clés dans le RAG partagé. Vérifier la base légale, les demandes de retrait, la minimisation et les règles de prospection applicables avant utilisation réelle.

## Recette et limites

Le test de régression Agent Commons vérifie le catalogue, le refus d'installation automatique et la synchronisation sélective avec un HOME synthétique, sans lancer Python. La recette réelle reste à faire : handshake stdio, trois lectures de test, vérification de la révocation, absence d'envoi et absence d'exposition de données. Le support MCP Apps, les cartes et le rendu natif dépendent du client et ne sont pas fournis par Agent Commons. Aucun compte, modèle, dépendance ou service Sellbird n'est déployé par cette modification.
