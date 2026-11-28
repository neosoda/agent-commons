import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { isExecutionProfile, type ExecutionProfileName } from '../extensions/hundredx.js';

export type QueueStatus = 'queued' | 'running' | 'paused' | 'completed' | 'blocked' |
  'partial' | 'failed' | 'cancelled' | 'needs_review' | 'waiting_for_model';
export interface QueueEntry {
  id: string;
  missionId: string;
  workspace: string;
  workspaceId: string;
  model: string;
  allowWrite: boolean;
  allowTests: boolean;
  allowMcp: string[];
  profile?: ExecutionProfileName;
  /** Optional explicitly authorized cloud CLI adviser, never a coding worker. */
  delegate?: string;
  allowCloudSource?: boolean;
  priority: number;
  runAt: number;
  status: QueueStatus;
  attempts: number;
  leaseUntil: number | null;
  owner: string | null;
}
interface SqlEntry {
  id: string; mission_id: string; workspace: string; workspace_id: string; model: string;
  permissions: string; priority: number; run_at: number; status: QueueStatus;
  attempts: number; lease_until: number | null; owner: string | null;
}
const idPattern = /^[a-f0-9]{24}$/;
const workspacePattern = /^[a-f0-9]{64}$/;
const fromRow = (row: SqlEntry): QueueEntry => {
  const opts = JSON.parse(row.permissions) as {
    allowWrite: boolean; allowTests: boolean; allowMcp: string[];
    profile?: ExecutionProfileName; delegate?: string; allowCloudSource?: boolean;
  };
  return {
    id: row.id, missionId: row.mission_id, workspace: row.workspace,
    workspaceId: row.workspace_id, model: row.model,
    allowWrite: opts.allowWrite, allowTests: opts.allowTests, allowMcp: opts.allowMcp,
    profile: isExecutionProfile(opts.profile) ? opts.profile : 'lite',
    delegate: opts.delegate, allowCloudSource: opts.allowCloudSource,
    priority: row.priority, runAt: row.run_at, status: row.status, attempts: row.attempts,
    leaseUntil: row.lease_until, owner: row.owner
  };
};

/** Durable single-worker queue with conservative crash reconciliation. */
export class MissionQueue {
  private readonly db: DatabaseSync;
  constructor(directory: string) {
    if (fs.existsSync(directory)) {
      if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) {
        throw new Error('Unsafe queue directory');
      }
    } else fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const file = path.join(directory, 'queue.sqlite');
    if (fs.existsSync(file) && (fs.lstatSync(file).isSymbolicLink() || !fs.lstatSync(file).isFile())) {
      throw new Error('Unsafe queue database');
    }
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
    this.db.exec([
      "CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL UNIQUE, workspace TEXT NOT NULL, workspace_id TEXT NOT NULL, model TEXT NOT NULL, permissions TEXT NOT NULL, priority INTEGER NOT NULL, run_at INTEGER NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER, owner TEXT, updated_at INTEGER NOT NULL);",
      "CREATE INDEX IF NOT EXISTS idx_queue_due ON jobs(status,run_at,priority DESC);",
      "CREATE TABLE IF NOT EXISTS worker_lock (name TEXT PRIMARY KEY, owner TEXT NOT NULL, lease_until INTEGER NOT NULL);",
      // Liveness only (no owner id): an idle worker holds no lease, so Mission Control needs a separate signal.
      "CREATE TABLE IF NOT EXISTS worker_presence (name TEXT PRIMARY KEY, seen_at INTEGER NOT NULL);",
      // Deployment drain gate: keep producers online while preventing new claims.
      "CREATE TABLE IF NOT EXISTS worker_maintenance (name TEXT PRIMARY KEY, enabled INTEGER NOT NULL CHECK (enabled IN (0,1)));"
    ].join('\n'));
  }
  close(): void { this.db.close(); }
  /** Records that a worker loop is alive; called on every poll and lease heartbeat. */
  markWorkerSeen(now = Date.now()): void {
    this.db.prepare(
      'INSERT INTO worker_presence(name,seen_at) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET seen_at=excluded.seen_at'
    ).run('default', now);
  }
  /** Last time any worker polled or renewed a lease, or null if none ever ran. */
  workerSeenAt(): number | null {
    const row = this.db.prepare('SELECT seen_at FROM worker_presence WHERE name=?').get('default') as { seen_at: number } | undefined;
    return row ? row.seen_at : null;
  }
  add(entry: Omit<QueueEntry,'id'|'status'|'attempts'|'leaseUntil'|'owner'>): string {
    if (!idPattern.test(entry.missionId) || !workspacePattern.test(entry.workspaceId) ||
        !path.isAbsolute(entry.workspace) || entry.workspace.length > 1024 ||
        !entry.model.trim() || entry.model.length > 200 ||
        !Number.isSafeInteger(entry.priority) || entry.priority < 0 || entry.priority > 9 ||
        !Number.isSafeInteger(entry.runAt) || entry.runAt < 0 ||
        entry.allowMcp.length > 8 || entry.allowMcp.some(v => !/^[\w.-]+\/[\w.-]+$/.test(v)) ||
        (entry.profile !== undefined && !isExecutionProfile(entry.profile)) ||
        (entry.delegate !== undefined && !['codex','claude','gemini','opencode','orchestrator'].includes(entry.delegate)) ||
        (entry.allowCloudSource === true && !entry.delegate)) {
      throw new Error('Invalid durable mission queue entry');
    }
    const id = crypto.randomBytes(12).toString('hex');
    const permissions = JSON.stringify({
      allowWrite: entry.allowWrite, allowTests: entry.allowTests, allowMcp: entry.allowMcp,
      profile: entry.profile ?? 'lite',
      delegate: entry.delegate, allowCloudSource: entry.allowCloudSource === true
    });
    this.db.prepare(
      "INSERT INTO jobs(id,mission_id,workspace,workspace_id,model,permissions,priority,run_at,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
    ).run(id, entry.missionId, entry.workspace, entry.workspaceId, entry.model,
      permissions, entry.priority, entry.runAt, 'queued', Date.now());
    return id;
  }
  list(limit = 30): QueueEntry[] {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid list limit');
    return (this.db.prepare(
      "SELECT * FROM jobs ORDER BY CASE status WHEN 'running' THEN 0 WHEN 'queued' THEN 1 ELSE 2 END,priority DESC,run_at,id LIMIT ?"
    ).all(limit) as unknown as SqlEntry[]).map(fromRow);
  }
  get(id: string): QueueEntry {
    if (!idPattern.test(id)) throw new Error('Invalid queue job id');
    const row = this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id) as SqlEntry | undefined;
    if (!row) throw new Error('Queue job not found');
    return fromRow(row);
  }
  /**
   * Atomically claims one process-wide worker slot and one ready job.
   * An expired lease is quarantined as needs_review, NEVER blindly reexecuted.
   */
  claim(owner: string, leaseMs = 30000, now = Date.now()): QueueEntry | null {
    if (!idPattern.test(owner) || leaseMs < 10000 || leaseMs > 120000) throw new Error('Invalid worker lease');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      // The deployment gate shares the claim transaction, eliminating the idle-check race.
      // It never blocks enqueue, heartbeats or completion of an already running mission.
      const maintenance = this.db.prepare('SELECT enabled FROM worker_maintenance WHERE name=?').get('default') as
        { enabled: number } | undefined;
      if (maintenance?.enabled === 1) { this.db.exec('COMMIT'); return null; }
      const active = this.db.prepare('SELECT owner,lease_until FROM worker_lock WHERE name=?').get('default') as
        { owner: string; lease_until: number } | undefined;
      if (active && active.owner !== owner && active.lease_until > now) {
        this.db.exec('COMMIT'); return null;
      }
      this.db.prepare(
        'INSERT INTO worker_lock(name,owner,lease_until) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,lease_until=excluded.lease_until'
      ).run('default', owner, now + leaseMs);
      this.db.prepare(
        "UPDATE jobs SET status='needs_review',owner=NULL,lease_until=NULL,updated_at=? WHERE status='running' AND lease_until <= ?"
      ).run(now, now);
      // Never run a second job while any active lease still belongs to an earlier worker.
      const running = this.db.prepare("SELECT id FROM jobs WHERE status='running' LIMIT 1").get();
      if (running) { this.db.exec('COMMIT'); return null; }
      const due = this.db.prepare(
        "SELECT * FROM jobs WHERE status IN ('queued','waiting_for_model') AND run_at<=? ORDER BY priority DESC,run_at,id LIMIT 1"
      ).get(now) as SqlEntry | undefined;
      if (!due) {
        this.db.exec('COMMIT'); return null;
      }
      this.db.prepare(
        "UPDATE jobs SET status='running',owner=?,lease_until=?,attempts=attempts+1,updated_at=? WHERE id=?"
      ).run(owner, now + leaseMs, now, due.id);
      this.db.exec('COMMIT');
      return this.get(due.id);
    } catch (error) {
      this.db.exec('ROLLBACK'); throw error;
    }
  }
  heartbeat(owner: string, jobId: string, now = Date.now(), leaseMs = 30000): boolean {
    if (!idPattern.test(owner) || !idPattern.test(jobId) || !Number.isSafeInteger(now) ||
        !Number.isSafeInteger(leaseMs) || leaseMs < 10000 || leaseMs > 120000) throw new Error('Invalid worker lease');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const lock = this.db.prepare('UPDATE worker_lock SET lease_until=? WHERE name=? AND owner=? AND lease_until>?')
        .run(now + leaseMs, 'default', owner, now);
      const job = this.db.prepare(
        "UPDATE jobs SET lease_until=?,updated_at=? WHERE id=? AND status='running' AND owner=? AND lease_until>?"
      ).run(now + leaseMs, now, jobId, owner, now);
      if (lock.changes !== 1 || job.changes !== 1) {
        this.db.exec('ROLLBACK');
        return false;
      }
      this.markWorkerSeen(now);
      this.db.exec('COMMIT');
      return true;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  finish(owner: string, jobId: string, status: Exclude<QueueStatus,'queued'|'running'|'needs_review'>): void {
    const now = Date.now();
    const updated = this.db.prepare(
      "UPDATE jobs SET status=?,owner=NULL,lease_until=NULL,updated_at=? WHERE id=? AND owner=? AND status='running' AND lease_until>? AND EXISTS (SELECT 1 FROM worker_lock WHERE name='default' AND owner=? AND lease_until>?)"
    ).run(status, now, jobId, owner, now, owner, now);
    if (updated.changes !== 1) throw new Error('Queue ownership lost; result not recorded');
  }
  /** Retry only a mission that returned before dispatching a tool. */
  waitForModel(owner: string, jobId: string, now = Date.now()): void {
    const job = this.get(jobId);
    const delay = Math.min(300000, 30000 * 2 ** Math.min(Math.max(job.attempts - 1, 0), 4));
    const updated = this.db.prepare(
      "UPDATE jobs SET status='waiting_for_model',run_at=?,owner=NULL,lease_until=NULL,updated_at=? WHERE id=? AND owner=? AND status='running' AND lease_until>? AND EXISTS (SELECT 1 FROM worker_lock WHERE name='default' AND owner=? AND lease_until>?)"
    ).run(now + delay, now, jobId, owner, now, owner, now);
    if (updated.changes !== 1) throw new Error('Queue ownership lost; result not recorded');
  }
  release(owner: string): void {
    this.db.prepare('DELETE FROM worker_lock WHERE name=? AND owner=?').run('default', owner);
  }
  /** Explicit operator action after checking a stale job's mission checkpoint. */
  requeue(id: string, workspaceId: string, pendingAction = false): void {
    const job = this.get(id);
    if (job.workspaceId !== workspaceId) throw new Error('Queue job belongs to another workspace');
    if (pendingAction) throw new Error('Reconcile pending side effect before requeue');
    if (!['paused','blocked','partial','failed','needs_review'].includes(job.status)) {
      throw new Error('Job cannot be requeued from its current state');
    }
    this.db.prepare(
      "UPDATE jobs SET status='queued',run_at=?,lease_until=NULL,owner=NULL,updated_at=? WHERE id=?"
    ).run(Date.now(), Date.now(), id);
  }
  cancel(id: string, workspaceId: string): void {
    const job = this.get(id);
    if (job.workspaceId !== workspaceId) throw new Error('Queue job belongs to another workspace');
    if (job.status === 'running') throw new Error('Use mission --cancel for an active job');
    if (job.status === 'completed' || job.status === 'cancelled') return;
    this.db.prepare(
      "UPDATE jobs SET status='cancelled',updated_at=? WHERE id=?"
    ).run(Date.now(), id);
  }
}
