import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, it } from 'node:test';
import { createEnvironmentContext, readPublicCatalog, searchPublicCatalog, previewCatalogInstall, installCatalogSkill, verifyCatalogSkills, routeSmartSkills, loadSkill, previewCatalogUninstall } from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

const prefix = 'skills/improve/';
const files = new Map<string, Buffer>([
  ['SKILL.md', Buffer.from('---\nname: improve\ndescription: Read-only code audit.\n---\n# Improve\nRead references/audit-playbook.md\n')],
  ['references/audit-playbook.md', Buffer.from('# Playbook\n')],
  ['references/plan-template.md', Buffer.from('# Plan Template\n')],
  ['references/closing-the-loop.md', Buffer.from('# Closing the Loop\n')]
]);
const hash = (bytes: Buffer): string => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const fetchMock: FetchJson = async url => {
  if (url.includes('/git/trees/')) return { truncated: false, tree: [
    { path: 'LICENSE.md', type: 'blob', mode: '100644', sha: 'a'.repeat(40), size: 123 },
    ...[...files].map(([name,bytes]) => ({path:prefix+name,type:'blob',mode:'100644',sha:hash(bytes),size:bytes.length}))
  ] };
  if (url.includes('/git/blobs/')) {
    const bytes = [...files.values()].find(x => url.endsWith(hash(x)));
    assert.ok(bytes);
    return {sha:hash(bytes),size:bytes.length,encoding:'base64',content:bytes.toString('base64')};
  }
  throw Error('Unexpected GitHub request');
};
describe('shadcn Improve pinned skill', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(),'commons-improve-')); });
  afterEach(() => fs.rmSync(home,{recursive:true,force:true}));

  it('tracks a reviewed upstream and remains uninstalled on discovery', () => {
    const entry = readPublicCatalog().catalog.skills.find(x=>x.id==='improve');
    assert.ok(entry);
    assert.equal(entry.ref,'cac56e1ebd3c279aa9153616cfeac7b174ab90f9');
    assert.equal(entry.path,'skills/improve');
    assert.equal(entry.license,'MIT');
    assert.ok(entry.licenseEvidence.endsWith(entry.ref+'/LICENSE.md'));
    const ctx=createEnvironmentContext({homeDir:home});
    assert.ok(searchPublicCatalog(ctx,{query:'improve'}).some(x=>x.id==='improve'));
    assert.equal(fs.existsSync(ctx.commonsDir),false);
  });
  it('previews without changes, requires approval and keeps relative references', async () => {
    const ctx=createEnvironmentContext({homeDir:home});
    const preview=await previewCatalogInstall(ctx,'improve',fetchMock);
    assert.deepEqual(new Set(preview.files.map(x=>x.relativePath)),new Set(files.keys()));
    assert.equal(fs.existsSync(ctx.commonsDir),false);
    const denied=await installCatalogSkill(ctx,'improve',{fetchJson:fetchMock});
    assert.equal(denied.installed,false);
    const installed=await installCatalogSkill(ctx,'improve',{yes:true,fetchJson:fetchMock});
    assert.equal(installed.installed,true);
    assert.match(loadSkill(ctx,'improve').content,/Read references\/audit-playbook\.md/);
    assert.match(loadSkill(ctx,'improve','references/plan-template.md').content,/Plan Template/);
    assert.equal(verifyCatalogSkills(ctx,'improve').healthy,true);
    assert.equal(previewCatalogUninstall(ctx,'improve').clean,true);
  });
  it('routes by metadata, without injecting the skill prompt', () => {
    const ctx=createEnvironmentContext({homeDir:home});
    const routed=routeSmartSkills(ctx,'Audit my codebase and write prioritized implementation plans');
    assert.deepEqual(routed.loaded,[]);
    assert.ok(routed.selected.some(s=>s.id==='improve'));
    assert.equal(fs.existsSync(ctx.commonsDir),false);
  });
});
