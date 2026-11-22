import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { redactSecrets } from '../security/scrubber.js';

export type MissionStatus = 'running' | 'completed' | 'partial' | 'blocked' | 'needs-approval';
export type ToolName = 'list_files' | 'read_file' | 'write_file' | 'verify';
export interface ToolRequest { name: ToolName; arguments: Record<string, unknown> }
export interface ToolResult { ok: boolean; output: string; progress: boolean; changed?: boolean; tested?: boolean }
export interface ModelTurn { call?: ToolRequest; finish?: string; text?: string; tokens?: number }
export interface ModelClient {
  next(input: { goal: string; observations: string[] }): Promise<ModelTurn>;
  /** Advisory-only fallback; never grants the cloud permission to execute workspace tools. */
  advise?(input: { goal: string; observations: string[] }): Promise<{ text: string; tokens?: number }>;
}
export interface ToolExecutor { execute(request: ToolRequest): Promise<ToolResult> }
export interface Limits {
  maxSteps: number;
  maxToolCalls: number;
  maxTokens: number;
  maxDurationMs: number;
  maxIdleSteps: number;
  maxCloudCalls: number;
}
export const DEFAULT_LIMITS: Limits = {
  maxSteps: 30, maxToolCalls: 24, maxTokens: 24000,
  maxDurationMs: 20 * 60_000, maxIdleSteps: 3, maxCloudCalls: 2
};
export interface MissionState {
  version: 1;
  id: string;
  goal: string;
  workspaceId?: string;
  status: MissionStatus;
  reason: string;
  steps: number;
  calls: number;
  tokens: number;
  cloudCalls: number;
  idleSteps: number;
  changed: boolean;
  tested: boolean;
  evidence: number;
  inspected: boolean;
  startedAt: number;
  updatedAt: number;
  observations: string[];
  fingerprints: Record<string, number>;
  /** Hashed file paths and recent content versions; no source or paths in checkpoints. */
  writeHistory?: Record<string, string[]>;
  revision: number;
}
const SHA = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const short = (v: string, n = 700) => redactSecrets(v).slice(0, n);
const validId = /^[a-f0-9]{24}$/;

/** Checkpoint contains short, redacted evidence summaries; never raw model messages or file contents. */
export class MissionStore {
  constructor(readonly base: string) {}
  private ensure(): void {
    // A compromised ~/.agents junction must not redirect checkpoint writes elsewhere.
    const parent = path.dirname(this.base);
    if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink()) throw new Error('Unsafe mission storage parent');
    if (fs.existsSync(this.base)) {
      if (!fs.lstatSync(this.base).isDirectory() || fs.lstatSync(this.base).isSymbolicLink()) throw new Error('Unsafe mission storage');
    } else fs.mkdirSync(this.base, { recursive: true, mode: 0o700 });
  }
  private file(id: string): string {
    if (!validId.test(id)) throw new Error('Invalid mission id');
    return path.join(this.base, `${id}.json`);
  }
  create(goal: string, workspaceId?: string): MissionState {
    if (!goal.trim() || goal.length > 4000) throw new Error('Goal must be 1-4000 characters');
    if (workspaceId !== undefined && !/^[a-f0-9]{64}$/.test(workspaceId)) throw new Error('Invalid workspace fingerprint');
    const now = Date.now();
    const state: MissionState = { version: 1, id: crypto.randomBytes(12).toString('hex'), goal: short(goal, 4000), workspaceId,
      status: 'running', reason: '', steps: 0, calls: 0, tokens: 0, cloudCalls: 0,
      idleSteps: 0, changed: false, tested: false, evidence: 0, inspected: false, startedAt: now, updatedAt: now,
      observations: [], fingerprints: {}, writeHistory: {}, revision: 0 };
    this.save(state); return state;
  }
  load(id: string, workspaceId?: string): MissionState {
    this.ensure();
    const file = this.file(id);
    if (fs.lstatSync(file).isSymbolicLink() || fs.statSync(file).size > 256 * 1024) throw new Error('Unsafe mission checkpoint');
    const data: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || (data as MissionState).version !== 1 || (data as MissionState).id !== id ||
        typeof (data as MissionState).goal !== 'string' || !Array.isArray((data as MissionState).observations)) {
      throw new Error('Invalid mission checkpoint');
    }
    const state = data as MissionState;
    if (workspaceId !== undefined && state.workspaceId !== workspaceId) {
      throw new Error('Mission checkpoint belongs to another workspace or predates workspace binding');
    }
    // Re-reading after interruption is legitimate; retain budgets and evidence.
    state.fingerprints = {}; state.idleSteps = 0;
    if (!state.writeHistory || typeof state.writeHistory !== 'object' || Array.isArray(state.writeHistory)) state.writeHistory = {};
    return state;
  }
  save(state: MissionState): void {
    this.ensure();
    const file = this.file(state.id);
    if (fs.existsSync(file) && fs.lstatSync(file).isSymbolicLink()) throw new Error('Unsafe mission checkpoint');
    const tmp = path.join(this.base, `.${state.id}-${crypto.randomBytes(5).toString('hex')}.tmp`);
    state.updatedAt = Date.now();
    try {
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      fs.renameSync(tmp, file);
    } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
  }
}

/** Trust verified tool observations, never the model's claim that progress happened. */
export class MissionRunner {
  constructor(readonly store: MissionStore, readonly local: ModelClient, readonly tools: ToolExecutor,
    readonly limits: Limits = DEFAULT_LIMITS, readonly cloud?: ModelClient, readonly allowCloudSource = false) {
    for (const value of Object.values(limits)) if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid execution limit');
  }
  async run(state: MissionState): Promise<MissionState> {
    if (state.status === 'completed') return state;
    state.status = 'running';
    // Wall-clock limit applies to this execution, not the time spent paused between sessions.
    // Token, step, tool and cloud budgets remain cumulative in the saved checkpoint.
    const runStartedAt = Date.now();
    let usingCloud = false;
    // A second opinion is useful only if the local run has progressed since the previous one.
    let evidenceAtLastAdvice = -1;
    const liveObservations = state.observations.slice(-12);
    const stop = (status: MissionStatus, reason: string) => { state.status = status; state.reason = short(reason); this.store.save(state); return state; };
    const escalate = (reason: string): boolean => {
      if (!this.cloud || usingCloud || state.cloudCalls >= this.limits.maxCloudCalls ||
          evidenceAtLastAdvice === state.evidence) return false;
      usingCloud = true;
      state.observations.push(`Cloud advice requested: local agent blocked (${short(reason, 180)}).`);
      liveObservations.push(state.observations[state.observations.length - 1]!);
      state.observations = state.observations.slice(-12);
      this.store.save(state);
      return true;
    };
    while (true) {
      if (Date.now() - runStartedAt >= this.limits.maxDurationMs) return stop('blocked', 'Elapsed time budget exhausted');
      if (state.steps >= this.limits.maxSteps) return stop('blocked', 'Step budget exhausted');
      if (state.calls >= this.limits.maxToolCalls) return stop('blocked', 'Tool-call budget exhausted');
      if (state.tokens >= this.limits.maxTokens) return stop('blocked', 'Token budget exhausted');
      if (usingCloud && state.cloudCalls >= this.limits.maxCloudCalls) return stop('blocked', 'Cloud call budget exhausted');
      if (usingCloud) {
        state.steps++;
        state.cloudCalls++;
        // Never expose tool output/source to the cloud unless explicitly opted in.
        const input = { goal: state.goal, observations: (this.allowCloudSource ? liveObservations : state.observations).slice(-6) };
        let advice: { text: string; tokens?: number };
        try {
          if (this.cloud!.advise) advice = await this.cloud!.advise(input);
          else {
            // Compatibility for injected ModelClient implementations from earlier versions.
            const turn = await this.cloud!.next(input);
            if (turn.call) return stop(turn.call.name === 'write_file' ? 'needs-approval' : 'blocked',
              'Cloud adviser attempted a workspace tool instead of providing guidance');
            advice = { text: turn.text ?? turn.finish ?? '', tokens: turn.tokens };
          }
        } catch {
          return stop('blocked', 'Cloud adviser request failed');
        }
        state.tokens += Math.max(0, Math.trunc(advice.tokens ?? 0));
        if (state.tokens > this.limits.maxTokens) return stop('blocked', 'Token budget exhausted');
        const suggestion = short(advice.text, 1600).trim();
        if (!suggestion) return stop('blocked', 'Cloud adviser provided no usable guidance');
        evidenceAtLastAdvice = state.evidence;
        state.observations.push(`Cloud advice received; sha256=${SHA(suggestion).slice(0, 12)}; bytes=${Buffer.byteLength(suggestion)}`);
        state.observations = state.observations.slice(-12);
        liveObservations.push(`Cloud advice (untrusted, must be verified): ${suggestion}`);
        state.idleSteps = 0;
        usingCloud = false; // Return execution and all tool permissions to the local model.
        this.store.save(state);
        continue;
      }
      let turn: ModelTurn;
      state.steps++;
      try { turn = await this.local.next({ goal: state.goal, observations: liveObservations.slice(-6) }); }
      catch {
        state.idleSteps++;
        state.observations.push('Model request failed; no action performed');
        liveObservations.push('Model request failed; no action performed');
        this.store.save(state);
        if (state.idleSteps >= 2 && !escalate('model unavailable')) return stop('blocked', 'Model requests failed repeatedly');
        continue;
      }
      state.tokens += Math.max(0, Math.trunc(turn.tokens ?? 0));
      if (state.tokens > this.limits.maxTokens) return stop('blocked', 'Token budget exhausted');
      if (turn.finish !== undefined) {
        if (state.evidence === 0 || !state.inspected) return stop('blocked', 'Model claimed completion without verified inspection evidence');
        if (state.changed && !state.tested) return stop('partial', 'Files modified, but no successful test run was observed');
        return stop('completed', short(turn.finish, 400));
      }
      if (!turn.call) {
        state.idleSteps++;
        state.observations.push('Model returned no usable action');
        liveObservations.push('Model returned no usable action');
      } else {
        const name = turn.call.name;
        const args = turn.call.arguments;
        // File contents may alternate A -> B -> A while every write appears as progress.
        // Detect a return to any recently written version before executing another write.
        const writePath = name === 'write_file' && typeof args?.['path'] === 'string' &&
          typeof args?.['content'] === 'string' ? SHA(process.platform === 'win32' ?
            (args['path'] as string).replace(/\\/g, '/').toLowerCase() : (args['path'] as string)) : undefined;
        const writeDigest = writePath ? SHA(args['content'] as string) : undefined;
        const priorWrites = writePath ? state.writeHistory?.[writePath] : undefined;
        if (writeDigest && Array.isArray(priorWrites) && priorWrites.includes(writeDigest) &&
            priorWrites.at(-1) !== writeDigest) {
          if (!escalate('file content oscillation')) return stop('blocked', 'Repeated prior file version: oscillation detected');
          continue;
        }
        const fingerprint = SHA(`${state.revision}:${name}:${JSON.stringify(args)}`);
        state.fingerprints[fingerprint] = (state.fingerprints[fingerprint] ?? 0) + 1;
        if (state.fingerprints[fingerprint] >= 2) {
          if (!escalate('identical action repeated without workspace change')) return stop('blocked', 'Repeated identical action detected');
          continue;
        }
        state.calls++;
        let result: ToolResult;
        try { result = await this.tools.execute(turn.call); }
        catch { result = { ok: false, progress: false, output: 'Tool execution failed' }; }
        const progress = result.ok && result.progress;
        if (progress) { state.idleSteps = 0; state.evidence++; if (name === 'read_file' || name === 'list_files') state.inspected = true; }
        else state.idleSteps++;
        if (result.changed) {
          if (writePath && writeDigest) {
            state.writeHistory ??= {};
            const previous = state.writeHistory[writePath];
            state.writeHistory[writePath] = [...(Array.isArray(previous) ? previous : []), writeDigest].slice(-4);
            // Bound checkpoint size regardless of the number of files modified.
            const keys = Object.keys(state.writeHistory);
            if (keys.length > 16) delete state.writeHistory[keys[0]!];
          }
          state.changed = true; state.tested = false; state.revision++; state.fingerprints = {};
        }
        if (result.tested && result.ok) state.tested = true;
        // Persist only metadata and a hash: tool output may contain private source, paths or tokens.
        const digest = SHA(result.output).slice(0, 12);
        state.observations.push(`${name}: ${result.ok ? 'ok' : 'failed'}; output_sha256=${digest}; bytes=${Buffer.byteLength(result.output)}; changed=${!!result.changed}; tested=${!!result.tested}`);
        liveObservations.push(`${name}: ${result.ok ? 'ok' : 'failed'}; ${short(result.output, 11000)}`);
      }
      state.observations = state.observations.slice(-12);
      this.store.save(state);
      if (state.idleSteps >= this.limits.maxIdleSteps) {
        if (!escalate('no measurable progress')) return stop('blocked', 'No measurable progress');
      }
    }
  }
}
