import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { createDirectoryLink, inspectPath, removePhysicalDirectorySafe } from '../core/links.js';
import { runDoctor } from '../commands/doctor.js';
import { runSync } from '../commands/sync.js';
import { previewCentralRepair, repairCentralSkills } from '../commands/repair-central.js';

describe('central circular junction recovery (synthetic HOME only)', () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-central-repair-'));
  });
  afterEach(() => {
    if (inspectPath(home).state === 'directory') removePhysicalDirectorySafe(home);
  });

  function writeSource(parts: string[], text = '# intact source'): string {
    const ctx = createEnvironmentContext({ homeDir: home });
    const dir = path.join(ctx.centralSkillsDir, '.sources', ...parts);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), text, 'utf8');
    return dir;
  }

  function brokenSelfLink(name: string): string {
    const ctx = createEnvironmentContext({ homeDir: home });
    fs.mkdirSync(ctx.centralSkillsDir, { recursive: true });
    const link = path.join(ctx.centralSkillsDir, name);
    fs.symlinkSync(link, link, process.platform === 'win32' ? 'junction' : 'dir');
    assert.equal(inspectPath(link).state, 'link');
    return link;
  }

  it('rejects self and descendant cycles at the link-creation boundary', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const source = writeSource(['safe-skill']);
    const nestedLink = path.join(source, 'nested');
    assert.throws(() => createDirectoryLink(source, source), /circular|self|cycle/i);
    assert.throws(() => createDirectoryLink(nestedLink, source), /circular|self|cycle/i);
    assert.equal(inspectPath(source).state, 'directory');
    assert.equal(inspectPath(nestedLink).state, 'missing');
  });

  it('previews and repairs only self-referential central links with unique physical sources', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const source = writeSource(['collection', 'skills', 'antislop']);
    fs.writeFileSync(path.join(source, 'extra.txt'), 'preserve this', 'utf8');
    const broken = brokenSelfLink('antislop');
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    const doctor = runDoctor(ctx);
    assert.equal(doctor.healthy, false);
    assert.ok(doctor.issues.some(msg => /circular central skill link/i.test(msg)));

    const preview = repairCentralSkills(ctx);
    assert.equal(preview.items[0]?.status, 'repairable');
    assert.equal(preview.applied, false);
    assert.equal(inspectPath(broken).state, 'link');
    assert.equal(inspectPath(ctx.backupsDir).state, 'missing');
    const dry = repairCentralSkills(ctx, { yes: true, dryRun: true });
    assert.equal(dry.applied, false);

    const outcome = repairCentralSkills(ctx, { yes: true });
    assert.equal(outcome.errors.length, 0);
    assert.equal(outcome.items[0]?.status, 'repaired');
    assert.ok(outcome.recoveryDir);
    assert.equal(inspectPath(broken).state, 'directory');
    assert.equal(fs.readFileSync(path.join(broken, 'SKILL.md'), 'utf8'), '# intact source');
    assert.equal(fs.readFileSync(path.join(broken, 'extra.txt'), 'utf8'), 'preserve this');
    assert.equal(fs.readFileSync(path.join(source, 'SKILL.md'), 'utf8'), '# intact source');
    assert.equal(inspectPath(path.join(outcome.recoveryDir!, 'antislop')).state, 'link');

    const sync = runSync(ctx, { skillsOnly: true });
    assert.deepEqual(sync.errors, []);
    assert.equal(inspectPath(path.join(home, '.codex', 'skills', 'antislop')).state, 'link');
    assert.equal(runDoctor(ctx).healthy, true);
    assert.equal(previewCentralRepair(ctx).items.length, 0);
  });

  it('never alters a physical central skill or a valid external link', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const physical = writeSource(['antislop']);
    fs.mkdirSync(path.join(ctx.centralSkillsDir, 'antislop'), { recursive: true });
    fs.writeFileSync(path.join(ctx.centralSkillsDir, 'antislop', 'SKILL.md'), '# user edit');
    const external = writeSource(['other-skill']);
    const link = path.join(ctx.centralSkillsDir, 'other-skill');
    createDirectoryLink(link, external);
    const result = repairCentralSkills(ctx, { yes: true });
    assert.equal(result.applied, false);
    assert.equal(result.items[0]?.status, 'skipped');
    assert.equal(fs.readFileSync(path.join(ctx.centralSkillsDir, 'antislop', 'SKILL.md'), 'utf8'), '# user edit');
    assert.equal(inspectPath(link).state, 'link');
    assert.equal(fs.readFileSync(path.join(physical, 'SKILL.md'), 'utf8'), '# intact source');
  });

  it('skips ambiguous sources and missing sources without deleting broken links', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    writeSource(['pack-a', 'skills', 'antislop']);
    writeSource(['pack-b', 'skills', 'antislop']);
    const ambiguous = brokenSelfLink('antislop');
    const missing = brokenSelfLink('not-found');
    const outcome = repairCentralSkills(ctx, { yes: true });
    assert.equal(outcome.applied, false);
    assert.equal(outcome.items.length, 2);
    assert.ok(outcome.items.every(item => item.status === 'skipped'));
    assert.equal(inspectPath(ambiguous).state, 'link');
    assert.equal(inspectPath(missing).state, 'link');
  });

  it('rejects a nested link inside a source before moving the original junction', () => {
    const ctx = createEnvironmentContext({ homeDir: home });
    const source = writeSource(['antislop']);
    const other = writeSource(['other']);
    createDirectoryLink(path.join(source, 'nested'), other);
    const circular = brokenSelfLink('antislop');
    const outcome = repairCentralSkills(ctx, { yes: true });
    assert.equal(outcome.items[0]?.status, 'error');
    assert.equal(outcome.applied, false);
    assert.equal(inspectPath(circular).state, 'link');
    assert.equal(inspectPath(path.join(source, 'nested')).state, 'link');
  });
});
