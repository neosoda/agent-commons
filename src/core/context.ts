import os from 'node:os';
import path from 'node:path';
import type { EnvironmentContext } from '../types.js';

export interface ContextOptions {
  homeDir?: string;
  localAppDataDir?: string;
  platform?: NodeJS.Platform;
}

/**
 * Builds the runtime environment context without any hardcoded machine paths.
 * Supports isolated test roots via `homeDir` or `AGENT_COMMONS_HOME`.
 */
export function createEnvironmentContext(options: ContextOptions = {}): EnvironmentContext {
  const platform = options.platform ?? process.platform;
  const envHome = process.env['AGENT_COMMONS_HOME'];
  const isCustomHome = Boolean(options.homeDir || envHome);

  const homeDir = path.resolve(options.homeDir ?? envHome ?? os.homedir());

  let localAppDataDir: string;
  if (options.localAppDataDir) {
    localAppDataDir = path.resolve(options.localAppDataDir);
  } else if (!isCustomHome && platform === 'win32' && process.env['LOCALAPPDATA']) {
    localAppDataDir = path.resolve(process.env['LOCALAPPDATA']);
  } else if (platform === 'win32') {
    localAppDataDir = path.join(homeDir, 'AppData', 'Local');
  } else if (platform === 'darwin') {
    localAppDataDir = path.join(homeDir, 'Library', 'Application Support');
  } else {
    localAppDataDir = path.join(homeDir, '.local', 'share');
  }

  const commonsDir = path.join(homeDir, '.agents');
  const centralSkillsDir = path.join(commonsDir, 'skills');
  const centralMcpPath = path.join(commonsDir, 'mcp.json');
  const backupsDir = path.join(commonsDir, 'backups');

  return {
    homeDir,
    localAppDataDir,
    commonsDir,
    centralSkillsDir,
    centralMcpPath,
    backupsDir,
    platform
  };
}
