#!/usr/bin/env node
import path from 'node:path';
import { createEnvironmentContext } from '../core/context.js';
import { PersistentMissionMemory } from './memory.js';
import { DelegatedCliAdvisor, loadDelegate, type DelegateName } from './delegate.js';
import { MissionQueue } from './queue.js';
import { LocalQueueWorker, serveQueue, workerEventFile } from './worker.js';
import {
  adaptExecutionProfile,
  inspectHundredX,
  inspectWorkspaceHundredX,
  isExecutionProfile,
  type ExecutionProfileName
} from '../extensions/hundredx.js';
import { MissionToolsWithMcp, prepareApprovedMcp, selectMissionSkills } from './extensions.js';
import { MissionRunner, MissionStore, DEFAULT_LIMITS, type ExecutionControl, type Limits } from './mission.js';
import { openWorkspace } from './remote-workspace.js';
import { OpenAICompatibleModel } from './provider.js';

function getOptions(argv: string[]): {args:Record<string,string>; flags:Set<string>} {
  const args:Record<string,string> = {};
  const flags = new Set<string>();
  const values = new Set(['task','workspace','resume','model','url','profile','max-steps','max-tokens','max-tool-calls','max-minutes','max-cloud-calls','allow-mcp-tool','pause','cancel','acknowledge-pending','remember','memory-kind','memory-search','queue-requeue','queue-cancel','priority','delay-minutes','delegate','delegate-test']);
  const booleans = new Set(['allow-write','allow-tests','allow-paid-review','cloud','allow-cloud-source','help','worker','once','enqueue','queue-list']);
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
Profiles: --profile lite|standard|deep (default: lite). Paid review/cloud calls remain off unless --allow-paid-review / --cloud / --delegate is explicitly passed.
Budgets: --max-steps 18..60 --max-tool-calls 14..48 --max-tokens 12000..64000 --max-minutes 10..45 --max-cloud-calls 0..2.
Writes and project-script execution are disabled unless explicitly enabled. Never run project scripts from untrusted repos.
Installed relevant skills are selected automatically. To authorize an MCP tool per mission, repeat --allow-mcp-tool server/tool (only trusted tools; may have side effects).
Lifecycle: --workspace <repo> --pause <id> | --cancel <id> | --acknowledge-pending <id> (reconcile side effects manually before acknowledgement).
Memory: --workspace <repo> --remember "approved decision" --memory-kind decision|project|strategy, or --memory-search "topic" (no model required).
Durable queue: --workspace <repo> --task "goal" --model <id> --enqueue [--priority 5] [--delay-minutes 30].
Worker: --worker [--once] (runs while PC is on); --queue-list, --workspace <repo> --queue-requeue <job-id> or --queue-cancel <job-id>.
A stale job requires explicit operator reconciliation: no automatic replay of uncertain effects.
Optional cloud CLI advice: --delegate codex|claude|gemini|opencode|orchestrator, configured in ~/.agents/delegates.json.
The default remains one local agent. Consultation occurs only after stagnation and local execution resumes.
Explicit physical CLI smoke test: --delegate-test codex (may consume provider quota; no project data shared).
`;
export async function main(argv = process.argv.slice(2), control?: ExecutionControl): Promise<number> {
  try {
    const {args,flags}=getOptions(argv);
    if (flags.has('help')) {console.log(help);return 0;}
    const ctx = createEnvironmentContext();
    if (args['delegate-test']) {
      if (args['delegate'] || flags.has('worker') || args['workspace'] || args['task']) {
        throw new Error('Delegate smoke test cannot run a project mission');
      }
      const client = args['delegate-test']!;
      const advisor = new DelegatedCliAdvisor(client as DelegateName, loadDelegate(ctx, client));
      const answer = await advisor.advise({ goal: 'Return one sentence confirming you can provide read-only advice.', observations: [] });
      console.log('Adviser responded: ' + answer.text.slice(0, 350));
      return 0;
    }
    if (flags.has('cloud') && args['delegate']) throw new Error('Choose HTTP cloud or CLI delegate, not both');
    if (flags.has('worker')) {
      if (flags.has('enqueue') || args['workspace'] || args['task'] || args['resume']) {
        throw new Error('Worker cannot also run or enqueue a mission');
      }
      const queue = new MissionQueue(ctx.commonsDir);
      const worker = new LocalQueueWorker(queue, async (job, lease) => {
        const workspace = openWorkspace(ctx, job.workspace, job.allowWrite, job.allowTests).tools;
        if (workspace.workspaceId !== job.workspaceId) throw new Error('Workspace identity has changed');
        const options = ['--workspace', job.workspace, '--resume', job.missionId, '--model', job.model];
        if (job.profile) options.push('--profile', job.profile);
        if (job.allowWrite) options.push('--allow-write');
        if (job.allowTests) options.push('--allow-tests');
        for (const name of job.allowMcp) options.push('--allow-mcp-tool', name);
        if (job.delegate) options.push('--delegate', job.delegate);
        if (job.allowCloudSource) options.push('--allow-cloud-source');
        await main(options, lease);
        const state = new MissionStore(path.join(ctx.commonsDir, 'missions')).load(job.missionId, job.workspaceId);
        return state.status;
      }, workerEventFile(ctx.commonsDir));
      let stopping = false;
      const stop = () => { stopping = true; };
      process.on('SIGINT', stop); process.on('SIGTERM', stop);
      try { await serveQueue(worker, flags.has('once'), () => stopping); }
      finally {
        process.off('SIGINT', stop); process.off('SIGTERM', stop);
        queue.close();
      }
      return 0;
    }
    if (flags.has('queue-list')) {
      if (args['workspace'] || args['task'] || args['resume']) throw new Error('Queue list does not take a workspace or task');
      const queue = new MissionQueue(ctx.commonsDir);
      try {
        console.log(JSON.stringify(queue.list().map(j => ({
          id: j.id, mission: j.missionId, workspace: j.workspace,
          priority: j.priority, runAt: new Date(j.runAt).toISOString(),
          status: j.status, attempts: j.attempts
        })), null, 2));
      } finally { queue.close(); }
      return 0;
    }
    if (!args['workspace']) throw new Error('Specify --workspace');
    const controls = ['pause','cancel','acknowledge-pending','remember','memory-search','queue-requeue','queue-cancel'].filter(k => args[k] !== undefined);
    if (controls.length > 1 || (controls.length && (args['task'] || args['resume'])) || (args['memory-kind'] && !args['remember'])) {
      throw new Error('Use one lifecycle command at a time');
    }
    const opened = openWorkspace(ctx, args['workspace'], flags.has('allow-write'), flags.has('allow-tests'));
    const workspace = opened.tools;
    const store = new MissionStore(path.join(ctx.commonsDir, 'missions'));
    if (controls[0] === 'queue-requeue' || controls[0] === 'queue-cancel') {
      const queue = new MissionQueue(ctx.commonsDir);
      try {
        const job = queue.get(args[controls[0]]!);
        if (job.workspaceId !== workspace.workspaceId) throw new Error('Queue job is bound to another workspace');
        if (controls[0] === 'queue-requeue') {
          const state = store.load(job.missionId, job.workspaceId);
          queue.requeue(job.id, job.workspaceId, Boolean(state.pendingAction));
        } else {
          queue.cancel(job.id, job.workspaceId);
        }
        console.log('Queue action applied: ' + controls[0]);
      } finally { queue.close(); }
      return 0;
    }
    if (controls.length && (controls[0] === 'remember' || controls[0] === 'memory-search')) {
      const memory = new PersistentMissionMemory(ctx.commonsDir, workspace.workspaceId);
      try {
        if (controls[0] === 'remember') {
          const kind = args['memory-kind'] ?? 'project';
          if (kind !== 'decision' && kind !== 'project' && kind !== 'strategy') {
            throw new Error('Memory kind must be decision, project or strategy');
          }
          const id = memory.approve(kind, args['remember']!);
          console.log('Approved workspace memory #' + id + ' saved');
        } else {
          const records = memory.search(args['memory-search']!, 8);
          console.log(JSON.stringify(records.map(({ id, kind, text, source }) => ({
            id, kind, text, source
          })), null, 2));
        }
        return 0;
      } finally { memory.close(); }
    }
    if (controls.length) {
      const control = controls[0]!;
      const id = args[control]!;
      if (control === 'acknowledge-pending') {
        store.acknowledgePending(id, workspace.workspaceId);
        console.log('Action reconciled by operator; resume the mission explicitly.');
      } else {
        store.requestControl(id, workspace.workspaceId, control as 'pause' | 'cancel');
        console.log('Mission ' + control + ' requested: ' + id);
      }
      return 0;
    }
    if ((!args['task'] && !args['resume']) || (args['task'] && args['resume'])) {
      throw new Error('Specify exactly one of --task or --resume');
    }
    const model=args['model'] ?? process.env['AGENT_COMMONS_LOCAL_MODEL'];
    if (!model) throw new Error('Select a local model with --model or AGENT_COMMONS_LOCAL_MODEL');
    if (flags.has('enqueue')) {
      if (args['resume'] || !args['task'] || flags.has('cloud') ||
          (flags.has('allow-cloud-source') && !args['delegate']) || args['url'] || controls.length) {
        throw new Error('Enqueue requires a new local-only task; remote endpoints/cloud are not queued');
      }
      const priority = Number(args['priority'] ?? '5');
      const delay = Number(args['delay-minutes'] ?? '0');
      if (!Number.isSafeInteger(priority) || priority < 0 || priority > 9 ||
          !Number.isSafeInteger(delay) || delay < 0 || delay > 43200) {
        throw new Error('Invalid queue priority or delay');
      }
      const profileArg = args['profile'] ?? 'lite';
      if (!isExecutionProfile(profileArg)) throw new Error('Profile must be lite, standard or deep');
      if (args['delegate']) loadDelegate(ctx, args['delegate']);
      const state = store.create(args['task']!, workspace.workspaceId);
      state.profile = profileArg;
      store.save(state);
      const queue = new MissionQueue(ctx.commonsDir);
      try {
        const id = queue.add({
          missionId: state.id, workspace: opened.label, workspaceId: workspace.workspaceId,
          model, allowWrite: flags.has('allow-write'), allowTests: flags.has('allow-tests'),
          allowMcp: (args['allow-mcp-tool'] ?? '').split(',').filter(Boolean),
          profile: profileArg,
          delegate: args['delegate'], allowCloudSource: flags.has('allow-cloud-source'),
          priority, runAt: Date.now() + delay * 60000
        });
        console.log('Queued: ' + id + ' | mission: ' + state.id + ' | profile: ' + profileArg);
      } finally { queue.close(); }
      return 0;
    }
    if (args['priority'] || args['delay-minutes']) throw new Error('Priority/delay apply only to --enqueue');
    const state = args['resume'] ? store.load(args['resume'], workspace.workspaceId) : store.create(args['task']!, workspace.workspaceId);
    const requestedProfile: ExecutionProfileName = args['profile']
      ? (isExecutionProfile(args['profile']) ? args['profile'] : (() => { throw new Error('Profile must be lite, standard or deep'); })())
      : (state.profile && isExecutionProfile(state.profile) ? state.profile : 'lite');
    state.profile = requestedProfile;
    const allowPaidReview = flags.has('allow-paid-review') || flags.has('cloud') || Boolean(args['delegate']);
    const adapted = adaptExecutionProfile(requestedProfile, {
      allowWrite: flags.has('allow-write'),
      allowTests: flags.has('allow-tests'),
      allowPaidReview
    });
    const skills = selectMissionSkills(ctx, state.goal);
    const hundredxInfo = inspectHundredX(ctx);
    // A remote workspace has no local files to inspect.
    const workspace100x = opened.remote ? { present: false } as ReturnType<typeof inspectWorkspaceHundredX>
      : inspectWorkspaceHundredX(opened.label);
    const hundredxGuidance = (hundredxInfo.managed && hundredxInfo.healthy) || workspace100x.present
      ? [
          '100x VERIFICATION CONTEXT (metadata only, no automatic privilege escalation):',
          `Profile=${requestedProfile} (maxTokens=${adapted.limits.maxTokens}, maxSteps=${adapted.limits.maxSteps}, paidReview=${adapted.paidConsumptionAuthorized}).`,
          workspace100x.present
            ? `Workspace 100x state: stage=${workspace100x.stage ?? 'none'}, invariants(holds=${workspace100x.invariantCounts.holds}, stale=${workspace100x.invariantCounts.stale}, broken=${workspace100x.invariantCounts.broken}).`
            : 'Workspace has no .100x/ or verify/ledger.tsv yet.'
        ].join(' ')
      : '';
    const memory = new PersistentMissionMemory(ctx.commonsDir, workspace.workspaceId);
    let memoryGuidance = '';
    try {
      const selected = memory.search(state.goal, 3);
      memoryGuidance = selected.map(item =>
        'APPROVED ' + item.kind + ' (stored knowledge, verify against live project): ' +
        item.text.slice(0, 500)).join('\n');
    } finally { memory.close(); }
    const permissions = (args['allow-mcp-tool'] ?? '').split(',').map(x => x.trim()).filter(Boolean);
    const approved = await prepareApprovedMcp(ctx, permissions);
    const executor = new MissionToolsWithMcp(workspace, approved);
    const limits: Limits = {
      ...DEFAULT_LIMITS,
      maxSteps: adapted.limits.maxSteps,
      maxToolCalls: adapted.limits.maxToolCalls,
      maxTokens: adapted.limits.maxTokens,
      maxDurationMs: adapted.limits.maxDurationMs,
      maxIdleSteps: adapted.limits.maxIdleSteps,
      maxCloudCalls: adapted.limits.maxCloudCalls
    };
    const budgets:[string,keyof Limits,number][]=[['max-steps','maxSteps',1],['max-tool-calls','maxToolCalls',1],['max-tokens','maxTokens',1],['max-minutes','maxDurationMs',60000],['max-cloud-calls','maxCloudCalls',1]];
    for (const [option,key,mult] of budgets) if(args[option] !== undefined) {
      const n=Number(args[option]);if(!Number.isSafeInteger(n)||n<1||n>100000) throw new Error(`Invalid --${option}`);
      limits[key]=n*mult;
    }
    const local=new OpenAICompatibleModel({url:args['url']??process.env['AGENT_COMMONS_LOCAL_URL']??'http://127.0.0.1:1234/v1/chat/completions',model,apiKey:process.env['AGENT_COMMONS_LOCAL_API_KEY']});
    const cloud = args['delegate'] ?
      new DelegatedCliAdvisor(args['delegate'] as DelegateName,
        loadDelegate(ctx, args['delegate']), flags.has('allow-cloud-source')) :
      flags.has('cloud') ? new OpenAICompatibleModel({
        url:process.env['AGENT_COMMONS_CLOUD_URL']??'',model:process.env['AGENT_COMMONS_CLOUD_MODEL']??'',apiKey:process.env['AGENT_COMMONS_CLOUD_API_KEY'],allowRemote:true
      }):undefined;
    console.log(`Mission: ${state.id} | profile: ${requestedProfile} | workspace: ${opened.label}`);
    console.log('Selected skills: ' + (skills.ids.join(', ') || 'none') +
      ' | approved MCP tools: ' + approved.allowed.length);
    const result=await new MissionRunner(store,local,executor,limits,cloud,flags.has('allow-cloud-source'),{
      guidance:[skills.instructions, hundredxGuidance, memoryGuidance].filter(Boolean).join('\n\n'), skillIds:skills.ids, mcpTools:approved.allowed, plan:true, control
    }).run(state);
    const outcomeMemory = new PersistentMissionMemory(ctx.commonsDir, workspace.workspaceId);
    try { outcomeMemory.recordOutcome(result); } finally { outcomeMemory.close(); }
    console.log(`Status: ${result.status} | reason: ${result.reason} | steps=${result.steps}, tools=${result.calls}, tokens=${result.tokens}, cloud=${result.cloudCalls}, mcp=${result.mcpCalls ?? 0}`);
    return result.status === 'completed' ? 0 : result.status === 'partial' ? 2 : 1;
  } catch(err) {console.error(err instanceof Error ? err.message : 'Unexpected error');return 1;}
}
if (process.argv[1] && /(?:^|[/\\])(?:agent-commons-agent|cli)(?:\.js)?$/.test(process.argv[1])) {
  void main().then(code=>{process.exitCode=code;});
}
