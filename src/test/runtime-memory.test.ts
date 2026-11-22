import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { PersistentMissionMemory } from '../runtime/memory.js';
import { MissionStore } from '../runtime/mission.js';

const hash = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-memory-'));
  const db = path.join(root, 'memory');
  return { root, db, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}
describe('P3 SQLite persistent verified memory', () => {
  it('retains explicitly approved decisions after restart with FTS5 keyword search', () => {
    const f = fixture(), id = hash('project-a');
    try {
      const first = new PersistentMissionMemory(f.db, id);
      first.approve('decision', 'Use Vitest for frontend regression tests');
      first.approve('project', 'Network protocol diagrams are located in docs');
      assert.equal(first.search('frontend regression').length, 1);
      first.close();
      const second = new PersistentMissionMemory(f.db, id);
      const hits = second.search('frontend regression');
      assert.equal(hits.length, 1);
      assert.equal(hits[0]!.verified, true);
      assert.equal(hits[0]!.source, 'operator');
      assert.match(hits[0]!.text, /Vitest/);
      assert.deepEqual(second.search('unrelated topic'), []);
      second.close();
    } finally { f.cleanup(); }
  });
  it('never leaks information between separately bound workspaces', () => {
    const f = fixture();
    try {
      const a = new PersistentMissionMemory(f.db, hash('a'));
      const b = new PersistentMissionMemory(f.db, hash('b'));
      a.approve('project', 'Zabbix topology is recorded locally');
      assert.equal(b.search('Zabbix topology').length, 0);
      assert.equal(b.recent().length, 0);
      b.approve('project', 'Different project uses independent notes');
      assert.equal(a.search('independent notes').length, 0);
      a.close(); b.close();
    } finally { f.cleanup(); }
  });
  it('does not promote model success claims or failures into verified knowledge', () => {
    const f = fixture(), id = hash('project');
    try {
      const store = new MissionStore(path.join(f.root, 'missions'));
      const memory = new PersistentMissionMemory(f.db, id);
      const state = store.create('Repair a local repository bug', id);
      state.status = 'blocked'; state.reason = 'Model claimed success without inspection';
      memory.recordOutcome(state);
      assert.equal(memory.recent()[0]!.verified, false);
      assert.equal(memory.search('Mission stopped').length, 0);
      state.status = 'completed'; state.inspected = true; state.evidence = 2;
      state.changed = true; state.tested = false;
      memory.recordOutcome(state);
      assert.equal(memory.recent()[0]!.verified, false);
      state.tested = true;
      memory.recordOutcome(state);
      assert.equal(memory.recent()[0]!.verified, true);
      assert.equal(memory.recent()[0]!.kind, 'result');
      assert.ok(!memory.recent().some(x => x.text.includes('Repair a local repository bug')));
      assert.throws(() => memory.recordOutcome({ ...state, workspaceId: hash('other') }), /mismatch/);
      memory.close();
    } finally { f.cleanup(); }
  });
  it('rejects probable credentials, overlong entries and untrusted database links', () => {
    const f = fixture(), id = hash('safe');
    try {
      const memory = new PersistentMissionMemory(f.db, id);
      assert.throws(() => memory.approve('decision', 'x'.repeat(5000)), /4096/);
      assert.throws(() => memory.approve('project', ''), /4096/);
      assert.throws(() => memory.search('frontend', 100), /limit/);
      memory.close();
      const link = path.join(f.root, 'link');
      try {
        fs.symlinkSync(f.db, link, 'dir');
        assert.throws(() => new PersistentMissionMemory(link, id), /Unsafe memory directory/);
      } catch (e) { if (process.platform !== 'win32') throw e; }
    } finally { f.cleanup(); }
  });
});
