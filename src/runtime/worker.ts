import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { MissionStatus } from './mission.js';
import { MissionQueue, type QueueEntry, type QueueStatus } from './queue.js';

export interface WorkerEvent {
  time: string;
  event: 'started' | 'finished' | 'error' | 'lease_lost';
  jobId: string;
  status?: QueueStatus;
}

/**
 * A single local worker slot with bounded SQLite leases.
 * A stale/uncertain job is quarantined for manual review, never auto-replayed.
 */
export class LocalQueueWorker {
  readonly owner = crypto.randomBytes(12).toString('hex');
  private active = false;
  constructor(readonly queue: MissionQueue, readonly execute: (job: QueueEntry) => Promise<MissionStatus>,
    readonly eventFile?: string) {}
  private log(event: WorkerEvent): void {
    if (!this.eventFile) return;
    if (fs.existsSync(this.eventFile) && fs.lstatSync(this.eventFile).isSymbolicLink()) {
      throw new Error('Unsafe worker event log');
    }
    fs.appendFileSync(this.eventFile, JSON.stringify(event) + '\n', { mode: 0o600 });
  }
  async tick(now = Date.now()): Promise<boolean> {
    if (this.active) throw new Error('Worker is already executing a mission');
    this.queue.markWorkerSeen(now);
    const job = this.queue.claim(this.owner, 30000, now);
    if (!job) { this.queue.release(this.owner); return false; }
    this.active = true;
    let lostLease = false;
    const heartbeat = setInterval(() => {
      try {
        if (!this.queue.heartbeat(this.owner, job.id)) lostLease = true;
      } catch { lostLease = true; }
    }, 5000);
    heartbeat.unref();
    this.log({ time: new Date().toISOString(), event: 'started', jobId: job.id });
    try {
      let status: MissionStatus;
      try {
        status = await this.execute(job);
      } catch {
        // Unknown effects require a human review before the same job can be resumed.
        status = 'blocked';
        this.log({ time: new Date().toISOString(), event: 'error', jobId: job.id });
      }
      if (lostLease) {
        this.log({ time: new Date().toISOString(), event: 'lease_lost', jobId: job.id });
        throw new Error('Worker heartbeat lease lost; operator review is required');
      }
      if (status === 'waiting_for_model') {
        this.queue.waitForModel(this.owner, job.id);
        this.log({ time: new Date().toISOString(), event: 'finished', jobId: job.id, status });
        return true;
      }
      const final: Exclude<QueueStatus, 'queued' | 'running' | 'needs_review'> =
        status === 'completed' || status === 'partial' || status === 'paused' ||
        status === 'cancelled' || status === 'failed' ? status : 'blocked';
      this.queue.finish(this.owner, job.id, final);
      this.log({ time: new Date().toISOString(), event: 'finished', jobId: job.id, status: final });
      return true;
    } finally {
      clearInterval(heartbeat);
      this.queue.release(this.owner);
      this.active = false;
    }
  }
}

export async function serveQueue(worker: LocalQueueWorker, oneShot = false, isStopping = () => false): Promise<void> {
  do {
    await worker.tick();
    if (oneShot || isStopping()) break;
    await new Promise<void>(resolve => setTimeout(resolve, 1500));
  } while (!isStopping());
}

export function workerEventFile(base: string): string {
  return path.join(base, 'queue-events.jsonl');
}
