import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  createEnvironmentContext, readPublicCatalog, searchPublicCatalog,
  previewCatalogInstall, installCatalogSkill, verifyCatalogSkills,
  routeSmartSkills, loadSkill, previewCatalogUninstall
} from '../index.js';
import type { FetchJson } from '../commands/skill-install.js';

const pin = 'a0561f868d9c642d92c667294d98b98c367a45ab';
const source = 'https://github.com/ecapri-dev/simulab-skill';
const selected = [
  'SKILL.md', 'CATALOGO.md', 'PROMPTS.md', 'LICENSE', 'package.json',
  'requirements.txt', 'assets', 'demos', 'kit', 'tools'
];
const fixture = new Map<string, Buffer>([
  ['SKILL.md', Buffer.from('---\nname: simulab\ndescription: Interactive 3D lab with an offline HTML output.\n---\n# SimuLab\n')],
  ['CATALOGO.md', Buffer.from('# Reusable isometric assets\n')],
  ['PROMPTS.md', Buffer.from('# SimuLab prompt examples\n')],
  ['LICENSE', Buffer.from('MIT License\n')],
  ['package.json', Buffer.from('{"name":"simulab","devDependencies":{"playwright":"^1.63.0"}}\n')],
  ['requirements.txt', Buffer.from('numpy\nscipy\n')],
  ['assets/core.js', Buffer.from('export const assets = {};\n')],
  ['demos/blink/demo.js', Buffer.from('export const demo = {};\n')],
  ['demos/blink/cover.jpg', Buffer.from([0xff,0xd8,0xff,0xd9])],
  ['kit/main.js', Buffer.from('export const kit = {};\n')],
  ['kit/fonts/LICENSE-caveat.txt', Buffer.from('SIL OPEN FONT LICENSE\n')],
  ['kit/fonts/caveat-latin-700-normal.woff2', Buffer.from([0,97,1,2,3])],
  ['tools/build.mjs', Buffer.from('export const build = true;\n')],
  ['tools/video.sh', Buffer.from('#!/bin/bash\nexit 0\n')],
  ['docs/espresso.gif', Buffer.from([71,73,70,56])],
  ['README.md', Buffer.from('# Duplicate upstream marketing intro\n')]
]);
const sha = (bytes: Buffer): string => crypto.createHash('sha1')
  .update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const upstream: FetchJson = async url => {
  if (url.includes('/git/trees/')) {
    assert.ok(url.includes('/git/trees/' + pin));
    return { truncated: false, tree: [...fixture].map(([name,bytes]) => ({
      path:name,type:'blob',mode:'100644',sha:sha(bytes),size:bytes.length
    })) };
  }
  if (url.includes('/git/blobs/')) {
    const bytes = [...fixture.values()].find(b => url.endsWith(sha(b)));
    assert.ok(bytes, 'unexpected upstream blob');
    return { sha: sha(bytes), size: bytes.length, encoding: 'base64', content: bytes.toString('base64') };
  }
  throw new Error('Unexpected URL');
};

describe('SimuLab pinned catalog integration', () => {
  let home: string;
  beforeEach(() => { home = fs.mkdtempSync(path.join(os.tmpdir(),'commons-simulab-')); });
  afterEach(() => { fs.rmSync(home,{recursive:true,force:true}); });

  it('keeps upstream provenance, exact reviewed file allowlist and separate font license', () => {
    const entry = readPublicCatalog().catalog.skills.find(x => x.id === 'simulab');
    assert.ok(entry);
    assert.equal(entry.repository, source);
    assert.equal(entry.path, '.');
    assert.equal(entry.ref, pin);
    assert.equal(entry.source, source + '/tree/' + pin);
    assert.equal(entry.licenseEvidence, source + '/blob/' + pin + '/LICENSE');
    assert.match(entry.license, /MIT/);
    assert.match(entry.license, /OFL/);
    assert.deepEqual(entry.installPaths, selected);
    assert.ok(entry.dependencies.some(x => /Playwright/.test(x)));
    assert.equal(searchPublicCatalog(createEnvironmentContext({homeDir:home}),{query:'simulab'})[0]?.installed,false);
  });

  it('previews only reviewed sources without writing or executing; install needs explicit approval', async () => {
    const ctx = createEnvironmentContext({homeDir:home});
    const routed = routeSmartSkills(ctx,'simulab interactive 3d educational lab');
    assert.deepEqual(routed.loaded,[]);
    assert.ok(routed.absent.some(x=>x.id==='simulab'));
    assert.equal(fs.existsSync(ctx.commonsDir),false);
    const preview = await previewCatalogInstall(ctx,'simulab',upstream);
    assert.equal(preview.commit,pin);
    assert.deepEqual(new Set(preview.files.map(x=>x.relativePath)),
      new Set([...fixture.keys()].filter(p=>!p.startsWith('docs/')&&p!=='README.md')));
    assert.equal(preview.files.some(x=>x.relativePath.startsWith('docs/')),false);
    assert.equal(fs.existsSync(ctx.commonsDir),false);
    const refused = await installCatalogSkill(ctx,'simulab',{fetchJson:upstream});
    assert.equal(refused.installed,false);
    assert.equal(fs.existsSync(ctx.commonsDir),false);

    const approved = await installCatalogSkill(ctx,'simulab',{yes:true,fetchJson:upstream});
    assert.equal(approved.installed,true);
    const dest = path.join(ctx.centralSkillsDir,'simulab');
    assert.ok(fs.existsSync(path.join(dest,'demos','blink','cover.jpg')));
    assert.ok(fs.existsSync(path.join(dest,'kit','fonts','LICENSE-caveat.txt')));
    assert.ok(fs.existsSync(path.join(dest,'tools','build.mjs')));
    assert.equal(fs.existsSync(path.join(dest,'docs','espresso.gif')),false);
    assert.match(loadSkill(ctx,'simulab').content,/Interactive 3D/);
    assert.match(loadSkill(ctx,'simulab','PROMPTS.md').content,/prompt examples/);
    assert.match(loadSkill(ctx,'simulab','CATALOGO.md').content,/Reusable/);
    assert.equal(verifyCatalogSkills(ctx,'simulab').healthy,true);
    assert.equal(previewCatalogUninstall(ctx,'simulab').clean,true);
  });
});
