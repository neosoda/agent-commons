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
