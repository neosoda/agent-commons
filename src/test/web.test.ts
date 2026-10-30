import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import { renderWebUi } from '../web/ui.js';
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

  it('renders all five navigation views and ships syntactically valid client JavaScript', () => {
    const page = renderWebUi('sample-nonce', 'test-csrf');
    const scripts = [...page.matchAll(/<script nonce="sample-nonce">([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1, 'exactly one inline application script');
    assert.doesNotThrow(() => new vm.Script(scripts[0]![1]!));
    for (const section of ['overview', 'catalog', 'agents', 'integrity', 'backups']) {
      assert.ok(page.includes('id="page-' + section + '"'), 'missing page ' + section);
      assert.ok(page.includes('data-page="' + section + '"'), 'missing navigation ' + section);
    }
    for (const control of ['full-sync-preview', 'full-sync-apply', 'doctor-run',
      'profile-save', 'profile-clear', 'backup-create', 'verify-again']) {
      assert.ok(page.includes('id="' + control + '"'), 'missing action ' + control);
    }
    assert.ok(!page.includes('onerror='), 'no inline event handler execution');
    assert.doesNotMatch(page, /\sstyle="/, 'CSP forbids inline style attributes');
    assert.doesNotMatch(page, /<[^>]+\sclass="[^"]*"[^>]+\sclass="/, 'no duplicate class attributes');
  });

  it('provides a keyboard skip link, labelled sections and accessible status channels', () => {
    const page = renderWebUi('unit-nonce', 'unit-csrf');
    assert.match(page, /<a class="skip-link" href="#main-content">Skip to main content<\/a>/);
    assert.match(page, /<main class="main" id="main-content" tabindex="-1">/);
    assert.match(page, /data-page="overview" aria-controls="page-overview" class="active" aria-current="page"/);
    assert.match(page, /id="toast"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(page, /id="workspace-status"[^>]*role="status"[^>]*aria-live="polite"/);
    assert.match(page, /id="sync-report" role="status" aria-live="polite"/);
    assert.match(page, /id="full-sync-report" role="status" aria-live="polite"/);
    assert.match(page, /id="doctor-report" role="status" aria-live="polite"/);
  });

  it('ships offline FR/EN UI strings without exposing workspace data in browser storage', () => {
    const html = renderWebUi('language-nonce', 'language-csrf');
    assert.match(html, /id="language-select"[^>]*aria-label="Interface language"/);
    assert.match(html, /<option value="en">English<\/option>/);
    assert.match(html, /<option value="fr">Français<\/option>/);
    assert.match(html, /agent-commons-ui-language/);
    assert.match(html, /Catalogue de compétences/);
    assert.match(html, /Vos outils IA/);
    assert.doesNotMatch(html, /<script src=|fonts\.googleapis\.com/);
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

  it('never echoes absolute private home paths in failing HTTP operations', async () => {
    fs.writeFileSync(path.join(home, '.agents'), 'blocking file');
    for (const url of ['/api/state', '/api/doctor']) {
      const response = await fetch(instance.url + url);
      const body = await response.text();
      assert.equal(body.includes(home), false, url + ' exposed a private home path');
    }
  });

  it('does not disclose unknown filesystem exceptions in read-only MCP API responses', async () => {
    const mcp = path.join(home, '.agents', 'mcp.json');
    fs.mkdirSync(path.dirname(mcp), { recursive: true });
    fs.writeFileSync(mcp, '{"mcpServers":{}}');
    const privateValue = 'unclassified-private-value-829471';
    const read = fs.readFileSync;
    fs.readFileSync = ((file, ...rest) => {
      if (String(file) === mcp) {
        throw new Error('upstream failure ' + privateValue + ' at /custom/private/config');
      }
      return (read as (...args: unknown[]) => unknown)(file, ...rest);
    }) as typeof fs.readFileSync;
    try {
      const result = await fetch(instance.url + '/api/mcp');
      assert.equal(result.status, 400);
      const response = await result.text();
      assert.doesNotMatch(response, /unclassified-private-value-829471|\/custom\/private\/config/);
      assert.equal(JSON.parse(response).error,
        'Local operation failed. Check Agent Commons CLI diagnostics for details.');
    } finally {
      fs.readFileSync = read;
    }
  });

  it('redacts arbitrary restore errors even when no known token or home path is present', async () => {
    const mcp = path.join(home, '.agents', 'mcp.json');
    fs.mkdirSync(path.dirname(mcp), { recursive: true });
    fs.writeFileSync(mcp, '{"mcpServers":{"before":{"command":"npx"}}}');
    const make = await post({ action:'backup', approved:true });
    assert.equal(make.status, 200);
    const { id } = await make.json() as { id:string };
    fs.writeFileSync(mcp, 'current private MCP content');
    const rename = fs.renameSync;
    fs.renameSync = ((from, to) => {
      if (String(from) === mcp && path.basename(String(to)) === 'original') {
        throw new Error('vendor message weirdCredentialValue-6273184 path=private/dev/secret');
      }
      return rename(from, to);
    }) as typeof fs.renameSync;
    try {
      const response = await post({ action:'restore', snapshot:id, approved:true });
      assert.equal(response.status, 400);
      const text = await response.text();
      assert.doesNotMatch(text, /weirdCredentialValue-6273184|private\/dev\/secret|current private MCP content/);
      assert.equal(JSON.parse(text).error,
        'Local operation failed. Check Agent Commons CLI diagnostics for details.');
    } finally {
      fs.renameSync = rename;
    }
    assert.equal(fs.readFileSync(mcp, 'utf8'), 'current private MCP content');
  });

  it('offers safe recovery guidance without leaking originals when rollback is incomplete', async () => {
    const mcp = path.join(home, '.agents', 'mcp.json');
    fs.mkdirSync(path.dirname(mcp), { recursive: true });
    fs.writeFileSync(mcp, '{"mcpServers":{"before":{"command":"npx"}}}');
    const make = await post({ action:'backup', approved:true });
    assert.equal(make.status, 200);
    const { id } = await make.json() as { id:string };
    const privateValue = 'sensitive-operator-data-37729';
    fs.writeFileSync(mcp, privateValue);
    const rename = fs.renameSync;
    fs.renameSync = ((from, to) => {
      if (String(to) === mcp && path.basename(String(from)) === 'replacement') {
        throw new Error('commit EIO ' + privateValue);
      }
      if (String(to) === mcp && path.basename(String(from)) === 'original') {
        throw new Error('rollback EACCES ' + privateValue);
      }
      return rename(from, to);
    }) as typeof fs.renameSync;
    try {
      const response = await post({ action:'restore', snapshot:id, approved:true });
      assert.equal(response.status, 400);
      const text = await response.text();
      assert.doesNotMatch(text, /sensitive-operator-data-37729|agent-commons-web-|\.agents\/mcp/);
      assert.match(JSON.parse(text).error as string, /rollback was incomplete.*staging folders/);
    } finally {
      fs.renameSync = rename;
    }
    const stage = fs.readdirSync(path.dirname(mcp))
      .find(name => name.startsWith('.agent-commons-restore-'));
    assert.ok(stage);
    assert.equal(fs.readFileSync(path.join(path.dirname(mcp), stage, 'original'), 'utf8'), privateValue);
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

  it('exposes on-demand health diagnostics and keeps full sync explicit', async () => {
    const doctor = await fetch(instance.url + '/api/doctor');
    assert.equal(doctor.status, 200);
    const report = await doctor.json() as { agents: unknown[]; issues: string[] };
    assert.equal(Array.isArray(report.agents), true);
    assert.equal(JSON.stringify(report).includes(home), false);
    const preview = await post({action:'sync-all-preview'});
    assert.equal(preview.status, 200);
    assert.equal((await preview.json() as {dryRun: boolean}).dryRun, true);
    assert.equal((await post({action:'sync-all-apply'})).status, 400);
    const apply = await post({action:'sync-all-apply',approved:true});
    assert.equal(apply.status, 200);
  });

  it('previews and confirms MCP creation, routing and removal', async () => {
    const initial=await (await fetch(instance.url+'/api/mcp')).json() as {revision:string;servers:unknown[]};
    assert.equal(initial.servers.length,0);
    const create={operation:'create',name:'sample_mcp',spec:{
      type:'stdio',command:'npx',args:['-y','demo'],agents:['codex']
    }};
    const preview=await post({action:'mcp-preview',...create,expectedRevision:initial.revision});
    assert.equal(preview.status,200);
    assert.equal(fs.existsSync(path.join(home,'.agents','mcp.json')),false);
    assert.equal((await preview.text()).includes('npx'),false);
    assert.equal((await post({action:'mcp-apply',...create,expectedRevision:initial.revision})).status,400);
    const applied=await post({action:'mcp-apply',...create,expectedRevision:initial.revision,approved:true});
    assert.equal(applied.status,200);
    const overview=await (await fetch(instance.url+'/api/mcp')).json() as {revision:string;servers:Array<{name:string}>};
    assert.equal(overview.servers[0]?.name,'sample_mcp');
    assert.equal(JSON.stringify(overview).includes('npx'),false);
    assert.equal((await post({action:'mcp-apply',...create,expectedRevision:initial.revision,approved:true})).status,400);
    const routing=await post({action:'mcp-apply',operation:'configure',name:'sample_mcp',
      routing:{agents:[],excludeAgents:['codex'],enabled:false},expectedRevision:overview.revision,approved:true});
    assert.equal(routing.status,200);
    const later=await (await fetch(instance.url+'/api/mcp')).json() as {revision:string};
    const deletion=await post({action:'mcp-apply',operation:'delete',name:'sample_mcp',
      expectedRevision:later.revision,approved:true});
    assert.equal(deletion.status,200);
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
