import path from 'node:path';
import type { AgentDefinition } from '../types.js';

/**
 * Verified catalog of the 17 supported AI coding agents and their exact directory conventions.
 * An agent only declares `mcpConfig` when its file-based MCP schema is implemented and tested.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.claude'), path.join(ctx.homeDir, '.claude.json')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.claude', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.claude.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'codex',
    name: 'Codex',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.codex')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.codex', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.codex', 'config.toml'),
      format: 'codex-toml'
    }
  },
  {
    id: 'cursor',
    name: 'Cursor',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.cursor')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.cursor', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.cursor', 'mcp.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.gemini')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.gemini', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.gemini', 'settings.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'gemini-config',
    name: 'Gemini Config',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.gemini', 'config')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.gemini', 'config', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.gemini', 'config', 'mcp_config.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'gemini-antigravity',
    name: 'Gemini Antigravity',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.gemini', 'antigravity')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.gemini', 'antigravity', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.gemini', 'antigravity', 'mcp_config.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    detectPaths: (ctx) => [
      path.join(ctx.homeDir, '.opencode'),
      path.join(ctx.homeDir, '.config', 'opencode')
    ],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.opencode', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.config', 'opencode', 'opencode.json'),
      altPaths: (ctx) => [path.join(ctx.homeDir, '.config', 'opencode', 'opencode.jsonc')],
      format: 'opencode-jsonc'
    }
  },
  {
    id: 'cline',
    name: 'Cline',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.cline')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.cline', 'skills')
  },
  {
    id: 'hermes-home',
    name: 'Hermes (.hermes)',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.hermes')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.hermes', 'skills')
  },
  {
    id: 'hermes-appdata',
    name: 'Hermes (AppData)',
    detectPaths: (ctx) => [path.join(ctx.localAppDataDir, 'hermes')],
    skillsDir: (ctx) => path.join(ctx.localAppDataDir, 'hermes', 'skills')
  },
  {
    id: 'minimax',
    name: 'Minimax',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.minimax')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.minimax', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.minimax', 'mcp.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'kimi',
    name: 'Kimi',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.kimi-work')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.kimi-work', 'skills')
  },
  {
    id: 'continue',
    name: 'Continue',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.continue')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.continue', 'skills')
  },
  {
    id: 'aider-desk',
    name: 'Aider Desk',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.aider-desk')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.aider-desk', 'skills')
  },
  {
    id: 'roo-code',
    name: 'Roo Code',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.roo')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.roo', 'skills')
  },
  {
    id: 'kiro',
    name: 'Kiro',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.kiro')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.kiro', 'skills'),
    mcpConfig: {
      path: (ctx) => path.join(ctx.homeDir, '.kiro', 'settings', 'mcp.json'),
      format: 'standard-json'
    }
  },
  {
    id: 'grok',
    name: 'Grok',
    detectPaths: (ctx) => [path.join(ctx.homeDir, '.grok')],
    skillsDir: (ctx) => path.join(ctx.homeDir, '.grok', 'skills')
  }
];
