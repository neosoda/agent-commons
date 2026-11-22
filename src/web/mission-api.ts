import path from 'node:path';
import { MissionQueue, type QueueEntry } from '../runtime/queue.js';
import { MissionStore, type MissionState } from '../runtime/mission.js';
import { WorkspaceTools } from '../runtime/workspace.js';
import type { EnvironmentContext } from '../types.js';

const JOB_ID = /^[a-f0-9]{24}$/;
type MissionAction = 'mission-enqueue' | 'mission-pause' | 'mission-cancel' | 'mission-requeue';
export interface MissionWebAction {
  action: MissionAction;
  approved?: unknown;
  workspace?: unknown;
  goal?: unknown;
  model?: unknown;
  priority?: unknown;
  delayMinutes?: unknown;
  allowWrite?: unknown;
  allowTests?: unknown;
  jobId?: unknown;
}
const safeObservation = /^(?:list_files|read_file|write_file|verify|mcp_call): (?:ok|failed); output_sha256=[a-f0-9]{12}; bytes=\d+; changed=(?:true|false); tested=(?:true|false)$/;
function missionView(job: QueueEntry, state: MissionState | null) {
  return {
    id: job.id,
    missionId: job.missionId,
    status: job.status,
    missionStatus: state?.status ?? 'unavailable',
    model: job.model,
    priority: job.priority,
    scheduledFor: job.runAt,
    attempts: job.attempts,
    plan: (state?.plan ?? []).slice(0, 6).map(p => p.slice(0, 200)),
    skills: (state?.skillIds ?? []).slice(0, 8),
    steps: state?.steps ?? 0,
    calls: state?.calls ?? 0,
    cloudCalls: state?.cloudCalls ?? 0,
    mcpCalls: state?.mcpCalls ?? 0,
    tokens: state?.tokens ?? 0,
    verifiedObservations: state?.evidence ?? 0,
    changed: Boolean(state?.changed),
    tested: Boolean(state?.tested),
    pendingReview: Boolean(state?.pendingAction) || job.status === 'needs_review',
    safeLogs: (state?.observations ?? []).filter(x => safeObservation.test(x)).slice(-12),
    updatedAt: state?.updatedAt ?? 0
  };
}
function withQueue<T>(ctx: EnvironmentContext, use: (queue: MissionQueue, store: MissionStore) => T): T {
  const queue = new MissionQueue(ctx.commonsDir);
  const store = new MissionStore(path.join(ctx.commonsDir, 'missions'));
  try { return use(queue, store); } finally { queue.close(); }
}
/** Never return user source, model completions, filesystem paths, secrets or raw MCP output to HTTP. */
export function listMissionViews(ctx: EnvironmentContext): { jobs: ReturnType<typeof missionView>[] } {
  return withQueue(ctx, (queue, store) => ({
    jobs: queue.list(50).map(job => {
      let state: MissionState | null = null;
      try { state = store.load(job.missionId, job.workspaceId); } catch { /* corrupt/missing checkpoint */ }
      return missionView(job, state);
    })
  }));
}
export function getMissionView(ctx: EnvironmentContext, jobId: string) {
  if (!JOB_ID.test(jobId)) throw new Error('Invalid mission job identifier.');
  return withQueue(ctx, (queue, store) => {
    const job = queue.get(jobId);
    let state: MissionState | null = null;
    try { state = store.load(job.missionId, job.workspaceId); } catch { /* no private diagnostic over HTTP */ }
    return missionView(job, state);
  });
}

/** Every mutation uses the existing loopback-only Origin and CSRF checks in server.ts. */
export function applyMissionWebAction(ctx: EnvironmentContext, input: MissionWebAction) {
  if (input.approved !== true) throw new Error('Explicit approval is required.');
  return withQueue(ctx, (queue, store) => {
    if (input.action === 'mission-enqueue') {
      if (typeof input.workspace !== 'string' || input.workspace.length > 1024 ||
          !path.isAbsolute(input.workspace) ||
          typeof input.goal !== 'string' || !input.goal.trim() || input.goal.length > 2000 ||
          typeof input.model !== 'string' || !input.model.trim() || input.model.length > 200 ||
          (input.allowWrite !== undefined && typeof input.allowWrite !== 'boolean') ||
          (input.allowTests !== undefined && typeof input.allowTests !== 'boolean')) {
        throw new Error('Invalid mission parameters.');
      }
      const priority = input.priority ?? 5;
      const delay = input.delayMinutes ?? 0;
      if (typeof priority !== 'number' || !Number.isInteger(priority) || priority < 0 || priority > 9 ||
          typeof delay !== 'number' || !Number.isInteger(delay) || delay < 0 || delay > 43200) {
        throw new Error('Invalid mission scheduling.');
      }
      const workspace = new WorkspaceTools(path.resolve(input.workspace), input.allowWrite === true, input.allowTests === true);
      const state = store.create(input.goal, workspace.workspaceId);
      const id = queue.add({
        missionId: state.id, workspace: path.resolve(input.workspace), workspaceId: workspace.workspaceId,
        model: input.model, priority, runAt: Date.now() + delay * 60000,
        allowWrite: input.allowWrite === true, allowTests: input.allowTests === true, allowMcp: []
      });
      return { queued: true, id, missionId: state.id };
    }
    if (typeof input.jobId !== 'string' || !JOB_ID.test(input.jobId)) {
      throw new Error('Invalid mission job identifier.');
    }
    const job = queue.get(input.jobId);
    if (input.action === 'mission-pause') {
      if (job.status !== 'running') throw new Error('Mission is not currently running.');
      store.requestControl(job.missionId, job.workspaceId, 'pause');
      return { requested: true, id: job.id };
    }
    if (input.action === 'mission-cancel') {
      if (job.status === 'running') store.requestControl(job.missionId, job.workspaceId, 'cancel');
      else queue.cancel(job.id, job.workspaceId);
      return { requested: true, id: job.id };
    }
    if (input.action === 'mission-requeue') {
      const state = store.load(job.missionId, job.workspaceId);
      queue.requeue(job.id, job.workspaceId, Boolean(state.pendingAction));
      return { queued: true, id: job.id };
    }
    throw new Error('Unsupported mission action.');
  });
}
