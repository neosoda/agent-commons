import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createEnvironmentContext } from '../core/context.js';
import { startWebServer, type WebInstance } from '../web/server.js';

describe('local Skill Hub HTTP security and user workflows', () => {
  let home: string;
  let instance: WebInstance;
  let csrf: string;
  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-web-'));
    instance = await startWebServer({ context: createEnvironmentContext({ homeDir: home }), port: 0, openBrowser: false });
    const page = await (await fetch(instance.url)).text();
    csrf = page.match(/name="csrf-token" content="([0-9a-f]+)"/)?.[1] ?? '';
    assert.match(csrf, /^[0-9a-f]{64}$/);
  });
  afterEach(async () => {
    await instance.close();
    fs.rmSync(home, { recursive: true, force: true });
  });
  async function post(body: object, headers: Record<string,string> = {}) {
    return fetch(instance.url + '/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json',
        'x-agent-commons-csrf': csrf, ...headers },
      body: JSON.stringify(body)
    });
  }

  it('serves the dashboard with strict security headers, no CDN and an ephemeral token', async () => {
    const response = await fetch(instance.url);
    const page = await response.text();
    assert.equal(response.status, 200);
    assert.match(page, /Skill catalog/);
    assert.match(page, /Profile editor/);
    assert.match(response.headers.get('content-security-policy') ?? '', /default-src 'none'/);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(page, /<script src=|fonts\.googleapis\.com|unpkg\.com/);
  });

  it('returns a safe catalog and agent inventory without absolute local paths or secrets', async () => {
    const response = await fetch(instance.url + '/api/state');
    const body = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.catalog), true);
    assert.equal(Array.isArray(body.categories), true);
    assert.equal(Array.isArray((body.inventory as Record<string,unknown>).agents), true);
    assert.equal(JSON.stringify(body).includes(home), false);
  });

  it('refuses foreign hosts, cross-origin requests, missing token and GET mutations', async () => {
    const badHostStatus = await new Promise<number>((resolve, reject) => {
      const url = new URL(instance.url);
      const req = http.request({ hostname: '127.0.0.1', port: Number(url.port),
        path: '/api/state', headers: { Host: 'evil.example' } }, response => {
        response.resume(); response.on('end', () => resolve(response.statusCode ?? 0));
      });
      req.on('error', reject); req.end();
    });
    assert.equal(badHostStatus, 403);
    const badOrigin = await fetch(instance.url + '/api/state', { headers: { origin: 'http://evil.example' } });
    assert.equal(badOrigin.status, 403);
    const noToken = await post({ action: 'backup', approved: true }, {'x-agent-commons-csrf': 'bad'});
    assert.equal(noToken.status, 403);
    const crossSite = await post({ action: 'backup', approved: true }, {origin:'https://evil.example'});
    assert.equal(crossSite.status, 403);
    const noApproval = await post({ action: 'backup' });
    assert.equal(noApproval.status, 400);
    assert.equal((await fetch(instance.url + '/api/action')).status, 404);
    assert.equal(fs.existsSync(path.join(home,'.agents','backups')), false);
  });

  it('saves private profiles without syncing, and rejects uninstalled-agent sync', async () => {
    const profile = await post({action:'profile-save',agent:'codex',skills:['skill-creator'],categories:[],approved:true});
    assert.equal(profile.status,200);
    const stored = JSON.parse(fs.readFileSync(path.join(home,'.agents','agent-profiles.json'),'utf8')) as {
      profiles: {codex: {skills:string[]}};
    };
    assert.deepEqual(stored.profiles.codex.skills,['skill-creator']);
    assert.equal(fs.existsSync(path.join(home,'.codex')),false);
    assert.equal((await post({action:'sync-preview'})).status,400);
    assert.equal((await post({action:'sync-apply',approved:true})).status,400);
    const clear = await post({action:'profile-clear',agent:'codex',approved:true});
    assert.equal(clear.status,200);
    assert.equal(fs.existsSync(path.join(home,'.codex')),false);
  });

  it('creates a manual snapshot and permits only a known explicit restore', async () => {
    const make = await post({action:'backup',approved:true});
    assert.equal(make.status,200);
    const result = await make.json() as {id:string};
    assert.match(result.id,/^snapshot-/);
    assert.equal((await post({action:'restore',snapshot:'../private',approved:true})).status,400);
    assert.equal((await post({action:'restore',snapshot:result.id})).status,400);
    const restore = await post({action:'restore',snapshot:result.id,approved:true});
    assert.equal(restore.status,200);
  });

  it('rejects unsafe ids, oversized and wrong-type JSON and write attempts disguised as preview', async () => {
    assert.equal((await fetch(instance.url+'/api/preview?id=..%2Fprivate&op=uninstall')).status,400);
    assert.equal((await fetch(instance.url+'/api/preview?id=skill-creator&op=unknown')).status,400);
    assert.equal((await post({action:'install',id:'../private',approved:true})).status,400);
    assert.equal((await post({action:'profile-save',agent:'codex',skills:'wrong',categories:[],approved:true})).status,400);
    const large = await fetch(instance.url+'/api/action',{method:'POST',
      headers:{'content-type':'application/json','x-agent-commons-csrf':csrf},
      body:JSON.stringify({action:'profile-save',payload:'x'.repeat(18000)})});
    assert.equal(large.status,400);
    const text = await fetch(instance.url+'/api/action',{method:'POST',
      headers:{'content-type':'text/plain','x-agent-commons-csrf':csrf},body:'hello'});
    assert.equal(text.status,400);
  });
});
