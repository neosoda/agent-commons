/**
 * Reviewed offline MCP metadata (2026-11-14). This is NOT an execution list.
 * No package is downloaded, launched or installed while browsing.
 */
export interface McpCatalogEntry {
  id: string;
  name: string;
  description: string;
  repository: string;
  maintainer: string;
  version: string | null;
  checkedAt: string;
  requirements: string[];
  platforms: Array<'win32'|'linux'|'darwin'>;
  transport: 'stdio';
  risk: 'medium'|'high'|'critical';
  installation: 'manual'|'reviewed-npm'|'reviewed-uv'|'unavailable';
  packageName?: string;
  example?: { command: string; args: string[] };
}
const allPlatforms: Array<'win32'|'linux'|'darwin'> = ['win32','linux','darwin'];
export const MCP_CATALOG: readonly McpCatalogEntry[] = [
  {
    id:'playwright',name:'Playwright',description:'Browser navigation and automation with isolated profile.',
    repository:'https://github.com/microsoft/playwright-mcp',maintainer:'Microsoft',
    version:'0.0.85',checkedAt:'2026-11-14',requirements:['Node.js >=22','Chromium'],
    platforms:allPlatforms,transport:'stdio',risk:'high',installation:'reviewed-npm',
    packageName:'@playwright/mcp',
    example:{command:'node',args:['<installed-package>/cli.js','--browser','chromium']}
  },
  {
    id:'fetch',name:'Fetch',description:'Read public web pages; content is untrusted.',
    repository:'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
    maintainer:'Model Context Protocol',version:'2026.11.11',checkedAt:'2026-11-14',
    requirements:['Python','uv'],platforms:allPlatforms,transport:'stdio',
    risk:'high',installation:'reviewed-uv',packageName:'mcp-server-fetch',
    example:{command:'uvx',args:['--from','mcp-server-fetch==2026.11.11','mcp-server-fetch']}
  },
  {
    id:'web-search',name:'Web Search',description:'Web search provider adapter; no audited generic package.',
    repository:'https://github.com/modelcontextprotocol/servers',maintainer:'Provider dependent',
    version:null,checkedAt:'2026-11-14',requirements:['Specific provider review'],
    platforms:allPlatforms,transport:'stdio',risk:'high',installation:'unavailable'
  },
  {
    id:'osint',name:'OSINT',description:'DNS, WHOIS and archives; requires a vetted provider.',
    repository:'https://github.com/modelcontextprotocol/servers',maintainer:'Provider dependent',
    version:null,checkedAt:'2026-11-14',requirements:['Provenance and permission review'],
    platforms:allPlatforms,transport:'stdio',risk:'high',installation:'unavailable'
  },
  {
    id:'docker-mcp-gateway',name:'Docker MCP Gateway',description:'Gateway into explicitly configured Docker MCP profiles, not unrestricted Docker administration.',
    repository:'https://github.com/docker/mcp-gateway',maintainer:'Docker',
    version:null,checkedAt:'2026-11-14',requirements:['Docker CLI','docker mcp plugin','Restricted Docker MCP profile'],
    platforms:allPlatforms,transport:'stdio',risk:'critical',installation:'manual',
    example:{command:'docker',args:['mcp','gateway','run','--profile','infrastructure']}
  },
  {
    id:'filesystem',name:'Filesystem',description:'Local file operations limited to explicit allowed roots.',
    repository:'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
    maintainer:'Model Context Protocol',version:'2.3.0',checkedAt:'2026-11-14',
    requirements:['Node.js >=22','Approved filesystem roots'],platforms:allPlatforms,
    transport:'stdio',risk:'high',installation:'reviewed-npm',
    packageName:'@modelcontextprotocol/server-filesystem',
    example:{command:'node',args:['<installed-package>/dist/index.js','<allowed-root>']}
  },
  {
    id:'github',name:'GitHub',description:'Official GitHub MCP server. Credential provisioning remains external.',
    repository:'https://github.com/github/github-mcp-server',maintainer:'GitHub',
    version:null,checkedAt:'2026-11-14',requirements:['Reviewed official binary or container','Credential store'],
    platforms:allPlatforms,transport:'stdio',risk:'high',installation:'manual'
  },
  {
    id:'git',name:'Git',description:'Local Git operations with explicitly scoped repositories.',
    repository:'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
    maintainer:'Model Context Protocol',version:'2026.11.11',checkedAt:'2026-11-14',
    requirements:['Git','Python','uv'],platforms:allPlatforms,transport:'stdio',
    risk:'high',installation:'reviewed-uv',packageName:'mcp-server-git',
    example:{command:'uvx',args:['--from','mcp-server-git==2026.11.11','mcp-server-git']}
  }
];
export const MCP_PRESETS: Readonly<Record<string,readonly string[]>> = {
  osint:['playwright','fetch','web-search','osint'],
  development:['filesystem','git','github','playwright'],
  infrastructure:['docker-mcp-gateway','filesystem']
};
