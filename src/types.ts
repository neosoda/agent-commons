export type McpFormat = 'standard-json' | 'opencode-jsonc' | 'codex-toml' | 'copilot-json';

export interface EnvironmentContext {
  homeDir: string;
  localAppDataDir: string;
  commonsDir: string;
  centralSkillsDir: string;
  centralMcpPath: string;
  backupsDir: string;
  platform: NodeJS.Platform;
}

export interface AgentMcpConfigDef {
  path: (ctx: EnvironmentContext) => string;
  altPaths?: (ctx: EnvironmentContext) => string[];
  format: McpFormat;
}

export interface AgentDefinition {
  id: string;
  name: string;
  detectPaths: (ctx: EnvironmentContext) => string[];
  skillsDir: (ctx: EnvironmentContext) => string;
  skillsSupported?: boolean;
  /**
   * The client natively scans the shared `~/.agents/skills` library (verified against its official
   * documentation). Agent Commons then creates no per-agent links: they would only duplicate every
   * skill (Gemini CLI prints a conflict warning per duplicate), and per-agent profiles cannot hide
   * central skills from such a client.
   */
  readsCentralSkills?: boolean;
  mcpConfig?: AgentMcpConfigDef;
}

export interface DetectedAgent {
  definition: AgentDefinition;
  installed: boolean;
  detectedAt: string | null;
  skillsDirPath: string;
  skillsDirExists: boolean;
  mcpConfigPath: string | null;
  mcpConfigExists: boolean;
  mcpFormat: McpFormat | null;
}

export interface McpServerOverride {
  type?: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  startupTimeoutSec?: number;
  toolTimeoutSec?: number;
  enabled?: boolean;
}

export interface McpServerSpec extends McpServerOverride {
  agents?: string[];
  excludeAgents?: string[];
  agentOverrides?: Record<string, McpServerOverride>;
}

export interface CentralMcpManifest {
  mcpServers: Record<string, McpServerSpec>;
}

export interface PathInspection {
  state: 'missing' | 'link' | 'directory' | 'file';
  linkTarget?: string;
  resolvedTarget?: string;
  targetExists?: boolean;
}

export type SkillSyncAction =
  | 'already-synced'
  | 'created-link'
  | 'repaired-link'
  | 'replaced-identical-copy'
  | 'replaced-forced'
  | 'conflict-skipped'
  | 'adopted-to-central'
  | 'unmanaged-local'
  | 'native-shared'
  | 'deduplicated'
  | 'error';

export interface SkillSyncResultItem {
  agentId: string;
  agentName: string;
  skillName: string;
  targetPath: string;
  action: SkillSyncAction;
  message: string;
}

export type McpSyncAction =
  | 'added'
  | 'unchanged'
  | 'updated-forced'
  | 'conflict-preserved'
  | 'corrupted-config'
  | 'error';

export interface McpSyncResultItem {
  agentId: string;
  agentName: string;
  serverName: string;
  configPath: string;
  action: McpSyncAction;
  message: string;
}

export interface BackupEntry {
  agentId: string;
  kind: 'mcp-config' | 'mcp-profile' | 'xerj-roots' | 'skill-entry' | 'central-skill';
  originalPath: string;
  stateBefore: 'missing' | 'file' | 'directory' | 'link';
  backupRelativePath?: string;
  linkTarget?: string;
}

export interface BackupManifest {
  id: string;
  version: 1;
  createdAt: string;
  reason: 'manual' | 'pre-sync';
  platform: NodeJS.Platform;
  entries: BackupEntry[];
}

export interface SyncOptions {
  /** Explicit subset of central skills; empty/undefined keeps existing full-sync behavior. */
  skillFilter?: string[];
  /** Agent-specific selection for saved profiles. All agents preflighted before any changes. */
  skillFilterByAgent?: Record<string, string[]>;
  dryRun?: boolean;
  force?: boolean;
  adopt?: boolean;
  agentFilter?: string[];
  skillsOnly?: boolean;
  mcpOnly?: boolean;
  mcpServerFilterByAgent?: Record<string, string[]>;
}

export interface SyncReport {
  dryRun: boolean;
  snapshotId: string | null;
  rolledBack: boolean;
  centralSkillsCount: number;
  centralMcpServersCount: number;
  detectedAgentsCount: number;
  skillResults: SkillSyncResultItem[];
  mcpResults: McpSyncResultItem[];
  errors: string[];
}

export interface AgentDoctorStatus {
  id: string;
  name: string;
  installed: boolean;
  skillsSupported: boolean;
  mcpSupported: boolean;
  mcpFormat: McpFormat | null;
  skillsDir: string;
  linkedSkillsCount: number;
  brokenLinksCount: number;
  physicalSkillsCount: number;
  conflictSkillsCount: number;
  mcpConfigPath: string | null;
  mcpStatus: 'not-supported' | 'missing' | 'valid' | 'corrupted';
  mcpServersCount: number;
  /** Approximate tokens of skill names/descriptions the client loads at session start. */
  skillMetadataTokens: number;
  /** The client reads ~/.agents/skills itself (all central skills visible, no links needed). */
  readsCentralSkills: boolean;
  /** Links in the client's own folder that duplicate a central skill it already reads natively. */
  redundantLinksCount: number;
  issues: string[];
}

export interface DoctorReport {
  healthy: boolean;
  platform: NodeJS.Platform;
  nodeVersion: string;
  linkStrategy: 'ntfs-junction' | 'posix-symlink';
  linkCapabilityVerified: boolean;
  linkCapabilityError?: string;
  commonsDir: string;
  centralSkillsDir: string;
  centralSkillsCount: number;
  centralMcpPath: string;
  centralMcpStatus: 'missing' | 'valid' | 'corrupted';
  centralMcpServersCount: number;
  agents: AgentDoctorStatus[];
  issues: string[];
  /** Problems that do not corrupt state but make a skill or MCP server unusable by a client. */
  warnings: string[];
  prerequisites: Array<{ name: string; found: boolean; detail?: string }>;
  mcpLaunch: Array<{ scope: string; server: string; status: string; message: string }>;
  skillLint: Array<{ scope: string; skill: string; errors: string[]; advisories: string[] }>;
}

export interface ListReport {
  commonsDir: string;
  centralSkills: string[];
  centralMcpServers: string[];
  agents: Array<{
    id: string;
    name: string;
    installed: boolean;
    skillsSupported: boolean;
    readsCentralSkills: boolean;
    mcpSupported: boolean;
    linkedSkills: string[];
    localPhysicalSkills: string[];
    brokenLinks: string[];
    mcpServers: string[];
  }>;
  backups: Array<{
    id: string;
    createdAt: string;
    reason: 'manual' | 'pre-sync';
    entriesCount: number;
  }>;
}
