# Windows — MCP Control Center / LM Studio

This guide covers LM Studio's native MCP file and client synchronization. It does not automatically launch third-party servers: the separate [Extension Manager](EXTENSION_MANAGER.md) can explicitly install approved pinned packages after preview and confirmation.

## Local paths

- LM Studio: %USERPROFILE%\.lmstudio\mcp.json
- Shared Agent Commons manifest: %USERPROFILE%\.agents\mcp.json
- Custom MCP profiles: %USERPROFILE%\.agents\mcp-profiles.json

These paths are automatically resolved from the user's home directory. If LM Studio stores a different file, open Program > Install > Edit mcp.json and inspect the path before synchronizing.

## Recommended workflow

1. Verify Node.js 22+ and the MCP server's exact official requirements separately.
2. Start the existing local Skill Hub with agent-commons web.
3. Use Shared MCP servers to create a reviewed entry, avoiding credentials in the manifest.
4. Open MCP Control Center, select a predefined or custom profile and target client(s).
5. Preview additions/conflicts. Only approve when the exact plan is understood.
6. In LM Studio, refresh the MCP list if required.

Native servers not managed by Agent Commons remain in place. JSON syntax errors prevent native updates. File backup and recovery is handled through the existing snapshot system; the system does not remove any MCP packages by profile switch.

PowerShell read-only inspection:

    $mcp = Join-Path $HOME '.lmstudio\mcp.json'
    Test-Path -LiteralPath $mcp
    if (Test-Path -LiteralPath $mcp) {
      (Get-Content -LiteralPath $mcp -Raw | ConvertFrom-Json).mcpServers.PSObject.Properties.Name
    }

This intentionally prints only server names. Do not paste or upload the full file if it contains credentials.

## Limits

Do not use a profile as a security sandbox. Restrict filesystem allowed paths and Docker permissions in the actual MCP server. Unselected native servers can remain available in LM Studio. Package installation, pinned updates, repair and uninstall **are implemented** for selected approved packages in the Skill Hub's [Extension Manager](EXTENSION_MANAGER.md). These actions are separate from MCP profiles and do not remove existing native-client entries.

Official LM Studio references: https://lmstudio.ai/docs/app/mcp
