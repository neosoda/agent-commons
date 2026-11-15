# Agent Desktop — contrôle du bureau à la demande

**Amont :** [Vercel Labs / agent-desktop](https://github.com/vercel-labs/agent-desktop) (Apache-2.0). **Skill épinglé :** `8ffecc1d3d088727f8d84baf4dde0224aab2e8ad`, dossier `skills/agent-desktop/` (SKILL.md + quatre références, 78 663 octets). Référence dans le catalogue, pas un exécutable embarqué.

## Installer le skill de manière contrôlée

```powershell
agent-commons catalog info agent-desktop
agent-commons catalog install agent-desktop                # Prévisualisation
agent-commons catalog install agent-desktop --yes          # Approbation explicite
agent-commons catalog verify agent-desktop                 # Vérification hors ligne
agent-commons sync --skill agent-desktop --agent codex --dry-run
agent-commons sync --skill agent-desktop --agent codex
```

Utiliser `claude-code` ou `gemini-cli` à la place de `codex` si nécessaire. Le Smart Skill Router ne charge que les métadonnées par défaut ; demander `agent-commons skills load agent-desktop` pour lire les instructions complètes uniquement au besoin.

## Installer séparément le moteur natif

Sur **le poste hébergeant les applications**, après examen du paquet amont :

```powershell
npm install -g agent-desktop
agent-desktop status
agent-desktop skills get desktop
agent-desktop skills get platform
```

Vérifier et limiter les permissions d'accessibilité au niveau OS. L'amont annonce Windows 10 1809+, macOS 13+ et Ubuntu 24.04+ (selon la session X11/Wayland). Les guides `skills get` sont spécifiques à la version du CLI. Sous PowerShell, **citer les références** : `agent-desktop click '@s8f3k2p9:e8'`.

## Ajouter le MCP uniquement après validation

Déclarer dans le manifeste privé `~/.agents/mcp.json` (ou via l'éditeur du Skill Hub) :

```json
{
  "mcpServers": {
    "agent-desktop": {
      "type": "stdio",
      "command": "agent-desktop",
      "args": ["mcp"],
      "agents": ["codex", "claude-code", "gemini-cli"]
    }
  }
}
```

Vérifier le `PATH` de chaque client. Dans le MCP Control Center, choisir le profil **`desktop-control`** et les agents cibles, visualiser la prévisualisation puis confirmer. **Ce profil n'installe pas le CLI et ne désactive pas les MCP déjà configurés.** Le client IA pourra démarrer `agent-desktop mcp` après synchronisation.

## Sécurité

- **Risque critique :** l'agent peut lire la fenêtre, cliquer, taper, consulter le presse-papiers et agir avec les droits de l'utilisateur. Exiger une validation humaine avant tout envoi, achat, suppression, changement système ou accès à des secrets.
- Ne pas mixer `agent-desktop` et `fetch`, `web-search` ou `osint` dans les profils personnalisés : les documents, pages et applications peuvent contenir des instructions malveillantes.
- Les snapshots, captures, journaux, arbres d'accessibilité, presse-papiers et sorties JSON peuvent contenir des données privées. Ne pas les exposer à un service distant ou dans des journaux publics.
- Boucle recommandée : **observer** (`snapshot`), **agir** avec une référence qualifiée, **observer à nouveau**. Sur `STALE_REF` ou `AMBIGUOUS_TARGET`, refaire un snapshot plutôt que forcer une action.
- Pas d'élévation de privilèges, contrôle distant, service permanent ou autorisation automatique fournis par Agent Commons.

[Documentation officielle](https://agent-browser.dev/desktop) · [Licence épinglée Apache-2.0](https://github.com/vercel-labs/agent-desktop/blob/8ffecc1d3d088727f8d84baf4dde0224aab2e8ad/LICENSE).

**Limite :** cette intégration du dépôt GitHub n'installe rien sur le PC de l'utilisateur et ne teste pas un vrai bureau.
