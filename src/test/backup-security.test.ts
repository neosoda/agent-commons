import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext,
  createFullBackup,
  restoreBackup,
  removePhysicalDirectorySafe
} from '../index.js';

describe('Backup restore preflight: no destructive writes on invalid snapshots', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-restore-security-'));
  });

  afterEach(() => {
    if (fs.existsSync(home)) removePhysicalDirectorySafe(home);
  });

  function setupMcpFile(): { ctx: ReturnType<typeof createEnvironmentContext>; original: string } {
    const ctx = createEnvironmentContext({ homeDir: home });
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    const original = path.join(home, '.claude.json');
    fs.writeFileSync(original, '{"mcpServers":{"old":{"command":"before"}}}\n');
    return { ctx, original };
  }

  it('does not delete existing files when backup payload was lost', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const entry = snapshot.entries.find((e) => e.originalPath === original)!;
    assert.ok(entry?.backupRelativePath);
    fs.unlinkSync(path.join(ctx.backupsDir, snapshot.id, entry.backupRelativePath!));
    fs.writeFileSync(original, 'important current data');

    assert.throws(() => restoreBackup(ctx, snapshot.id), /payload is missing/);
    assert.equal(fs.readFileSync(original, 'utf8'), 'important current data');
  });

  it('validates every entry before touching even the first destination', () => {
    const { ctx, original } = setupMcpFile();
    const codexDir = path.join(home, '.codex');
    fs.mkdirSync(codexDir);
    const codexConfig = path.join(codexDir, 'config.toml');
    fs.writeFileSync(codexConfig, '[mcp_servers.sample]\ncommand = "old"\n');

    const snapshot = createFullBackup(ctx);
    const codexEntry = snapshot.entries.find((e) => e.originalPath === codexConfig)!;
    assert.ok(codexEntry?.backupRelativePath);
    fs.unlinkSync(path.join(ctx.backupsDir, snapshot.id, codexEntry.backupRelativePath!));
    fs.writeFileSync(original, 'modified but must survive');
    fs.writeFileSync(codexConfig, 'also must survive');

    assert.throws(() => restoreBackup(ctx, snapshot.id), /payload is missing/);
    assert.equal(fs.readFileSync(original, 'utf8'), 'modified but must survive');
    assert.equal(fs.readFileSync(codexConfig, 'utf8'), 'also must survive');
  });

  it('rejects a forged backup entry targeting unrelated files inside home', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const unrelated = path.join(home, 'personal-document.txt');
    fs.writeFileSync(unrelated, 'never overwrite me');
    const manifestPath = path.join(ctx.backupsDir, snapshot.id, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.entries[0].originalPath = unrelated;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    fs.writeFileSync(original, 'updated value');

    assert.throws(() => restoreBackup(ctx, snapshot.id), /Security violation/);
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'never overwrite me');
    assert.equal(fs.readFileSync(original, 'utf8'), 'updated value');
  });

  it('rejects mismatched snapshot IDs and forged payload path traversal', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const manifestPath = path.join(ctx.backupsDir, snapshot.id, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.id = 'different-snapshot';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    fs.writeFileSync(original, 'preserve this');

    assert.throws(() => restoreBackup(ctx, snapshot.id), /ID mismatch/);
    assert.equal(fs.readFileSync(original, 'utf8'), 'preserve this');

    manifest.id = snapshot.id;
    manifest.entries[0].backupRelativePath = '../outside';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    assert.throws(() => restoreBackup(ctx, snapshot.id), /payload path/);
    assert.equal(fs.readFileSync(original, 'utf8'), 'preserve this');
  });

  it('rejects a linked ancestor rather than following it during restore', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-linked-'));
    try {
      // The backup of .claude.json is valid, but its parent is the home root.
      // Exercise a nested MCP destination by swapping a real agent config parent
      // after taking a snapshot.
      const codex = path.join(home, '.codex');
      fs.mkdirSync(codex);
      const cfg = path.join(codex, 'config.toml');
      fs.writeFileSync(cfg, 'original');
      const second = createFullBackup(ctx);
      fs.rmSync(codex, { recursive: true });
      const externalCfg = path.join(external, 'config.toml');
      fs.writeFileSync(externalCfg, 'untouched');
      fs.symlinkSync(external, codex, process.platform === 'win32' ? 'junction' : 'dir');

      fs.writeFileSync(original, 'current');
      assert.throws(() => restoreBackup(ctx, second.id), /linked ancestor/);
      assert.equal(fs.readFileSync(original, 'utf8'), 'current');
      assert.equal(fs.readFileSync(externalCfg, 'utf8'), 'untouched');
      // Preserve the original first snapshot as well.
      assert.ok(snapshot.id);
    } finally {
      // removePhysicalDirectorySafe(home) will detach the junction.
      removePhysicalDirectorySafe(external);
    }
  });

  it('rejects linked nested snapshot payloads before modifying any existing destination', () => {
    const { ctx, original } = setupMcpFile();
    const skillDir = path.join(ctx.centralSkillsDir, 'my-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    const skillFile = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillFile, '# Before backup');

    const snapshot = createFullBackup(ctx);
    const entry = snapshot.entries.find((e) => e.originalPath === skillDir);
    assert.ok(entry?.backupRelativePath);
    const payload = path.join(ctx.backupsDir, snapshot.id, entry.backupRelativePath!);
    const nested = path.join(payload, 'nested');
    const external = path.join(home, 'external-data');
    fs.mkdirSync(nested);
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(external, 'keep.txt'), 'external must survive');
    fs.symlinkSync(external, path.join(nested, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir');

    fs.writeFileSync(original, 'newer MCP settings must survive');
    fs.writeFileSync(skillFile, '# Newer skill must survive');

    assert.throws(() => restoreBackup(ctx, snapshot.id), /payload contains a linked entry/);
    assert.equal(fs.readFileSync(original, 'utf8'), 'newer MCP settings must survive');
    assert.equal(fs.readFileSync(skillFile, 'utf8'), '# Newer skill must survive');
    assert.equal(fs.readFileSync(path.join(external, 'keep.txt'), 'utf8'), 'external must survive');
  });


  it('preserves current files when preparing the replacement fails with an I/O error', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    fs.writeFileSync(original, 'preserve newer content');
    const copy = fs.copyFileSync;
    fs.copyFileSync = ((source, destination, mode) => {
      if (String(source).includes(snapshot.id) &&
          path.basename(String(destination)) === 'replacement') {
        throw Object.assign(new Error('simulated disk EIO'), { code: 'EIO' });
      }
      return copy(source, destination, mode);
    }) as typeof fs.copyFileSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /simulated disk EIO/);
    } finally {
      fs.copyFileSync = copy;
    }
    assert.equal(fs.readFileSync(original, 'utf8'), 'preserve newer content');
    assert.equal(fs.readdirSync(home).some(name => name.startsWith('.agent-commons-restore-')), false);
  });

  it('rolls back all previously swapped entries if a later commit fails', () => {
    const { ctx, original } = setupMcpFile();
    const codexDir = path.join(home, '.codex');
    fs.mkdirSync(codexDir);
    const codexConfig = path.join(codexDir, 'config.toml');
    fs.writeFileSync(codexConfig, 'codex before backup');
    const snapshot = createFullBackup(ctx);
    fs.writeFileSync(original, 'MCP newer content');
    fs.writeFileSync(codexConfig, 'Codex newer content');

    const rename = fs.renameSync;
    let injected = false;
    fs.renameSync = ((source, destination) => {
      if (!injected && String(destination) === original &&
          path.basename(String(source)) === 'replacement') {
        injected = true;
        throw Object.assign(new Error('simulated commit EACCES'), { code: 'EACCES' });
      }
      return rename(source, destination);
    }) as typeof fs.renameSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /simulated commit EACCES/);
    } finally {
      fs.renameSync = rename;
    }
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(original, 'utf8'), 'MCP newer content');
    assert.equal(fs.readFileSync(codexConfig, 'utf8'), 'Codex newer content');
    for (const dir of [home, codexDir]) {
      assert.equal(fs.readdirSync(dir).some(name => name.startsWith('.agent-commons-restore-')), false);
    }
  });

  it('refuses a target modified concurrently during replacement preparation', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const copy = fs.copyFileSync;
    let injected = false;
    fs.copyFileSync = ((source, destination, mode) => {
      const result = copy(source, destination, mode);
      if (!injected && String(source).includes(snapshot.id) &&
          path.basename(String(destination)) === 'replacement') {
        injected = true;
        fs.writeFileSync(original, 'modified while staging replacement');
      }
      return result;
    }) as typeof fs.copyFileSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /changed during preparation/);
    } finally {
      fs.copyFileSync = copy;
    }
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(original, 'utf8'), 'modified while staging replacement');
  });

  it('restores prepared content and removes staging directories on success', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    const saved = fs.readFileSync(original, 'utf8');
    fs.writeFileSync(original, 'edited after snapshot');
    restoreBackup(ctx, snapshot.id);
    assert.equal(fs.readFileSync(original, 'utf8'), saved);
    assert.equal(fs.readdirSync(home).some(name => name.startsWith('.agent-commons-restore-')), false);
  });

  it('keeps the old file recoverable when rollback itself fails', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    fs.writeFileSync(original, 'newer content to rescue');
    const realRename = fs.renameSync;
    fs.renameSync = ((source, destination) => {
      if (String(destination) === original && path.basename(String(source)) === 'replacement') {
        throw Object.assign(new Error('simulated commit EIO'), { code: 'EIO' });
      }
      if (String(destination) === original && path.basename(String(source)) === 'original') {
        throw Object.assign(new Error('simulated rollback EACCES'), { code: 'EACCES' });
      }
      return realRename(source, destination);
    }) as typeof fs.renameSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /rollback was incomplete/);
    } finally {
      fs.renameSync = realRename;
    }
    const stages = fs.readdirSync(home).filter(name => name.startsWith('.agent-commons-restore-'));
    assert.equal(stages.length, 1);
    assert.equal(fs.readFileSync(path.join(home, stages[0]!, 'original'), 'utf8'),
      'newer content to rescue');
  });

  it('detects edits to a nested skill file even when the directory inode is unchanged', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const skillDir = path.join(ctx.centralSkillsDir, 'my-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    const skillFile = path.join(skillDir, 'SKILL.md');
    fs.writeFileSync(skillFile, 'original text');
    const snapshot = createFullBackup(ctx);
    fs.writeFileSync(skillFile, 'current text!');
    const realCopy = fs.copyFileSync;
    let injected = false;
    fs.copyFileSync = ((source, destination, mode) => {
      const result = realCopy(source, destination, mode);
      if (!injected && String(source).includes(snapshot.id) &&
          path.basename(String(destination)) === 'SKILL.md') {
        injected = true;
        fs.writeFileSync(skillFile, 'newer edit!!!');
        fs.utimesSync(skillFile, new Date(1000), new Date(1000));
      }
      return result;
    }) as typeof fs.copyFileSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /changed during preparation/);
    } finally {
      fs.copyFileSync = realCopy;
    }
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(skillFile, 'utf8'), 'newer edit!!!');
    assert.deepEqual(fs.readdirSync(ctx.centralSkillsDir).sort(), ['my-skill']);
  });

  it('never overwrites a target recreated by a concurrent writer during commit or rollback', () => {
    const { ctx, original } = setupMcpFile();
    const snapshot = createFullBackup(ctx);
    fs.writeFileSync(original, 'edited since snapshot');
    const realRename = fs.renameSync;
    let injected = false;
    fs.renameSync = ((source, destination) => {
      const value = realRename(source, destination);
      if (!injected && String(source) === original &&
          path.basename(String(destination)) === 'original') {
        injected = true;
        fs.writeFileSync(original, 'created by another process');
      }
      return value;
    }) as typeof fs.renameSync;
    try {
      assert.throws(() => restoreBackup(ctx, snapshot.id), /rollback was incomplete/);
    } finally {
      fs.renameSync = realRename;
    }
    assert.equal(injected, true);
    assert.equal(fs.readFileSync(original, 'utf8'), 'created by another process');
    const stage = fs.readdirSync(home).find(name => name.startsWith('.agent-commons-restore-'));
    assert.ok(stage);
    assert.equal(fs.readFileSync(path.join(home, stage, 'original'), 'utf8'), 'edited since snapshot');
  });

  it('refuses a lossy backup of a physical skill containing nested links', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const nestedTarget = path.join(home, 'nested-target');
    fs.mkdirSync(nestedTarget);
    fs.writeFileSync(path.join(nestedTarget, 'keep.txt'), 'safe');
    const skillDir = path.join(ctx.centralSkillsDir, 'my-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# My skill');
    fs.symlinkSync(nestedTarget, path.join(skillDir, 'nested'), process.platform === 'win32' ? 'junction' : 'dir');

    assert.throws(() => createFullBackup(ctx), /nested link/);
    assert.equal(fs.readFileSync(path.join(nestedTarget, 'keep.txt'), 'utf8'), 'safe');
  });
});
