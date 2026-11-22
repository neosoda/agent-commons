import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { redactSecrets } from '../security/scrubber.js';
import type { MissionState } from './mission.js';

export type MemoryKind = 'decision' | 'project' | 'strategy' | 'result' | 'failure';
export interface MemoryRecord {
  id: number;
  workspaceId: string;
  kind: MemoryKind;
  text: string;
  verified: boolean;
  source: 'operator' | 'runtime';
  createdAt: number;
}
const validWorkspace = /^[a-f0-9]{64}$/;
const safeKeywords = (input: string) => [...new Set(
  (input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .match(/[a-z0-9]{3,}/g) ?? [])
    .filter(k => !['this','that','with','from','dans','pour','avec','les','des','une','sur','and','the','mon','mes'].includes(k))
)].slice(0, 8);
const digest = (input: string) => crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);

/**
 * Private workspace-scoped SQLite memory. Unverified statements are never included
 * in model context; agent-created source text is never promoted to project knowledge.
 * FTS5 requires no extra vector store or service.
 */
export class PersistentMissionMemory {
  private readonly db: DatabaseSync;
  constructor(directory: string, private readonly workspaceId: string) {
    if (!validWorkspace.test(workspaceId)) throw new Error('Invalid memory workspace identity');
    if (fs.existsSync(directory)) {
      if (!fs.lstatSync(directory).isDirectory() || fs.lstatSync(directory).isSymbolicLink()) {
        throw new Error('Unsafe memory directory');
      }
    } else fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const database = path.join(directory, 'memory.sqlite');
    if (fs.existsSync(database) && (fs.lstatSync(database).isSymbolicLink() || !fs.lstatSync(database).isFile())) {
      throw new Error('Unsafe memory database');
    }
    this.db = new DatabaseSync(database);
    try {
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
      this.db.exec([
        "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, workspace_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('decision','project','strategy','result','failure')), text TEXT NOT NULL, verified INTEGER NOT NULL CHECK(verified IN (0,1)), source TEXT NOT NULL CHECK(source IN ('operator','runtime')), created_at INTEGER NOT NULL);",
        'CREATE INDEX IF NOT EXISTS idx_items_workspace_created ON items(workspace_id, created_at DESC);',
        "CREATE VIRTUAL TABLE IF NOT EXISTS items_search USING fts5(text, content='items', content_rowid='id');",
        'CREATE TRIGGER IF NOT EXISTS items_insert AFTER INSERT ON items BEGIN INSERT INTO items_search(rowid, text) VALUES (new.id, new.text); END;',
        "CREATE TRIGGER IF NOT EXISTS items_delete AFTER DELETE ON items BEGIN INSERT INTO items_search(items_search, rowid, text) VALUES ('delete', old.id, old.text); END;"
      ].join('\n'));
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  close(): void { this.db.close(); }

  /** Explicit user approval, not an inference from a model answer or tool output. */
  approve(kind: 'decision' | 'project' | 'strategy', input: string): number {
    if (typeof input !== 'string' || !input.trim() || Buffer.byteLength(input) > 4096) {
      throw new Error('Memory must contain 1-4096 bytes');
    }
    const text = input.trim();
    if (redactSecrets(text) !== text) throw new Error('Memory contains a potential secret');
    const result = this.db.prepare(
      'INSERT INTO items(workspace_id,kind,text,verified,source,created_at) VALUES (?,?,?,1,?,?)'
    ).run(this.workspaceId, kind, text, 'operator', Date.now());
    this.prune();
    return Number(result.lastInsertRowid);
  }

  /** Stores only objective counters and hashes, never source, prompts or model claims. */
  recordOutcome(state: MissionState): void {
    if (state.workspaceId !== this.workspaceId) throw new Error('Memory workspace mismatch');
    if (state.status !== 'completed' && state.status !== 'blocked' && state.status !== 'failed') return;
    const success = state.status === 'completed' && state.inspected && state.evidence > 0 &&
      (!state.changed || state.tested);
    const kind: MemoryKind = success ? 'result' : 'failure';
    const text = success ?
      'Verified execution evidence: inspection=true, changes=' + state.changed +
      ', test_passed=' + state.tested + ', successful_observations=' + state.evidence +
      ', mcp_calls=' + (state.mcpCalls ?? 0) + ', goal_sha256=' + digest(state.goal) :
      'Mission stopped without verified completion; reason_sha256=' + digest(state.reason) +
      ', goal_sha256=' + digest(state.goal);
    this.db.prepare(
      'INSERT INTO items(workspace_id,kind,text,verified,source,created_at) VALUES (?,?,?,?,?,?)'
    ).run(this.workspaceId, kind, text, Number(success), 'runtime', Date.now());
    this.prune();
  }

  /** Select only manually approved knowledge or objective verified outcomes for this checkout. */
  search(goal: string, limit = 4): MemoryRecord[] {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 12) throw new Error('Invalid memory search limit');
    const terms = safeKeywords(goal);
    if (!terms.length) return [];
    const query = terms.map(term => '"' + term + '"').join(' OR ');
    const rows = this.db.prepare(
      'SELECT i.id, i.workspace_id AS workspaceId, i.kind, i.text, i.verified, i.source, i.created_at AS createdAt FROM items_search f JOIN items i ON i.id=f.rowid WHERE items_search MATCH ? AND i.workspace_id=? AND i.verified=1 ORDER BY bm25(items_search), i.created_at DESC LIMIT ?'
    ).all(query, this.workspaceId, limit) as unknown as Array<MemoryRecord & { verified: number }>;
    return rows.map(row => ({ ...row, verified: row.verified === 1 }));
  }

  recent(limit = 20): MemoryRecord[] {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Invalid memory result limit');
    const rows = this.db.prepare(
      'SELECT id, workspace_id AS workspaceId, kind, text, verified, source, created_at AS createdAt FROM items WHERE workspace_id=? ORDER BY id DESC LIMIT ?'
    ).all(this.workspaceId, limit) as unknown as Array<MemoryRecord & { verified: number }>;
    return rows.map(row => ({ ...row, verified: row.verified === 1 }));
  }

  private prune(): void {
    // Retain a bounded audit trail; never let one busy checkout grow forever.
    this.db.prepare(
      'DELETE FROM items WHERE workspace_id=? AND id NOT IN (SELECT id FROM items WHERE workspace_id=? ORDER BY id DESC LIMIT 1000)'
    ).run(this.workspaceId, this.workspaceId);
  }
}
