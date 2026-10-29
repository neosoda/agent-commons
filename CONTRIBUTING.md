# Contributing to Agent Commons

Thank you for your interest in contributing to **Agent Commons**.

## Design Philosophy

- **Zero Runtime Dependencies**: Keep the runtime dependency tree completely empty (`dependencies: {}`). Rely on Node.js 22+ built-in modules (`node:fs`, `node:path`, `node:util`, `node:crypto`, `node:test`).
- **Safety Over Magic**: Never overwrite diverged user files or conflicting MCP server entries silently. Always require explicit `--force` and record a backup snapshot first.
- **Verified Agent Support Only**: Only add an agent or MCP configuration path to `src/agents/registry.ts` if its real file path and dialect (`standard-json`, `opencode-jsonc`, `codex-toml`) have been verified and covered by automated tests.

## Development Setup

```bash
git clone https://github.com/neosoda/agent-commons.git
cd agent-commons
npm install
npm run typecheck
npm test
```

## Testing Guidelines

- All tests must run inside isolated temporary directories (`fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-test-'))`).
- **Never** write tests that read or mutate the developer's actual `~/.agents`, `~/.claude`, or `~/.codex` directories.
- Ensure all tests pass across Windows, Linux, and macOS.

## Adding a New Agent

1. Add the agent definition to `src/agents/registry.ts`.
2. If the agent supports file-based MCP configuration, specify its `mcpConfig` path and format (`standard-json`, `opencode-jsonc`, or `codex-toml`). If it only supports a `skills/` folder, omit `mcpConfig`.
3. Add detection and synchronization test cases in `src/test/agent-commons.test.ts`.
4. Update the compatibility matrix in `README.md`.
