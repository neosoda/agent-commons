#!/usr/bin/env node
import path from 'node:path';
import { createEnvironmentContext } from '../core/context.js';
import { MissionToolsWithMcp, prepareApprovedMcp, selectMissionSkills } from './extensions.js';
import { MissionRunner, MissionStore, DEFAULT_LIMITS, type Limits } from './mission.js';
import { WorkspaceTools } from './workspace.js';
import { OpenAICompatibleModel } from './provider.js';

function getOptions(argv: string[]): {args:Record<string,string>; flags:Set<string>} {
  const args:Record<string,string> = {};
  const flags = new Set<string>();
  const values = new Set(['task','workspace','resume','model','url','max-steps','max-tokens','max-tool-calls','max-minutes','max-cloud-calls','allow-mcp-tool']);
  const booleans = new Set(['allow-write','allow-tests','cloud','allow-cloud-source','help']);
  for (let i=0; i<argv.length; i++) {
    const item=argv[i]; if (!item?.startsWith('--')) throw new Error(`Unknown parameter ${item}`);
    const name=item.slice(2);
    if (booleans.has(name)) flags.add(name);
    else if (values.has(name)) {const next=argv[++i];if(!next||next.startsWith('--')) throw new Error(`Missing --${name} value`);args[name]=name==='allow-mcp-tool' && args[name] ? args[name]+','+next : next;}
    else throw new Error(`Unknown option --${name}`);
  }
  return {args,flags};
}
const help = `Agent Commons local runtime (experimental, separate from skills/MCP manager)
Usage:
  agent-commons-agent --workspace A:\\PROJETS\\MYREPO --task "Inspect and fix a bug" --model <local LM Studio ID> [--allow-write] [--allow-tests]
  agent-commons-agent --workspace <repo> --resume <mission-id> --model <id>
Optional --cloud --allow-cloud-source (explicit approval for sharing code) uses AGENT_COMMONS_CLOUD_URL, AGENT_COMMONS_CLOUD_MODEL and AGENT_COMMONS_CLOUD_API_KEY (API billing may apply).
Budgets: --max-steps 30 --max-tool-calls 24 --max-tokens 24000 --max-minutes 20 --max-cloud-calls 2.
Writes and project-script execution are disabled unless explicitly enabled. Never run project scripts from untrusted repos.
Installed relevant skills are selected automatically. To authorize an MCP tool per mission, repeat --allow-mcp-tool server/tool (only trusted tools; may have side effects).
`;
export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    const {args,flags}=getOptions(argv);
    if (flags.has('help')) {console.log(help);return 0;}
    if (!args['workspace'] || (!args['task'] && !args['resume']) || (args['task'] && args['resume'])) throw new Error('Specify workspace and exactly one of task or resume');
    const workspace = new WorkspaceTools(path.resolve(args['workspace']),flags.has('allow-write'),flags.has('allow-tests'));
    const model=args['model'] ?? process.env['AGENT_COMMONS_LOCAL_MODEL'];
    if (!model) throw new Error('Select a local model with --model or AGENT_COMMONS_LOCAL_MODEL');
    const ctx = createEnvironmentContext();
    const store = new MissionStore(path.join(ctx.commonsDir, 'missions'));
    const state = args['resume'] ? store.load(args['resume'], workspace.workspaceId) : store.create(args['task']!, workspace.workspaceId);
    const skills = selectMissionSkills(ctx, state.goal);
    const permissions = (args['allow-mcp-tool'] ?? '').split(',').map(x => x.trim()).filter(Boolean);
    const approved = await prepareApprovedMcp(ctx, permissions);
    const executor = new MissionToolsWithMcp(workspace, approved);
    const limits:Limits={...DEFAULT_LIMITS};
    const budgets:[string,keyof Limits,number][]=[['max-steps','maxSteps',1],['max-tool-calls','maxToolCalls',1],['max-tokens','maxTokens',1],['max-minutes','maxDurationMs',60000],['max-cloud-calls','maxCloudCalls',1]];
    for (const [option,key,mult] of budgets) if(args[option] !== undefined) {
      const n=Number(args[option]);if(!Number.isSafeInteger(n)||n<1||n>100000) throw new Error(`Invalid --${option}`);
      limits[key]=n*mult;
    }
    const local=new OpenAICompatibleModel({url:args['url']??process.env['AGENT_COMMONS_LOCAL_URL']??'http://127.0.0.1:1234/v1/chat/completions',model});
    const cloud=flags.has('cloud') ? new OpenAICompatibleModel({
      url:process.env['AGENT_COMMONS_CLOUD_URL']??'',model:process.env['AGENT_COMMONS_CLOUD_MODEL']??'',apiKey:process.env['AGENT_COMMONS_CLOUD_API_KEY']
    }):undefined;
    console.log(`Mission: ${state.id} | workspace: ${path.resolve(args['workspace'])}`);
    console.log('Selected skills: ' + (skills.ids.join(', ') || 'none') +
      ' | approved MCP tools: ' + approved.allowed.length);
    const result=await new MissionRunner(store,local,executor,limits,cloud,flags.has('allow-cloud-source'),{
      guidance:skills.instructions, skillIds:skills.ids, mcpTools:approved.allowed
    }).run(state);
    console.log(`Status: ${result.status} | reason: ${result.reason} | steps=${result.steps}, tools=${result.calls}, tokens=${result.tokens}, cloud=${result.cloudCalls}, mcp=${result.mcpCalls ?? 0}`);
    return result.status === 'completed' ? 0 : result.status === 'partial' ? 2 : 1;
  } catch(err) {console.error(err instanceof Error ? err.message : 'Unexpected error');return 1;}
}
if (process.argv[1] && /(?:^|[/\\])(?:agent-commons-agent|cli)(?:\.js)?$/.test(process.argv[1])) {
  void main().then(code=>{process.exitCode=code;});
}
