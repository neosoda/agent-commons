/**
 * Real Chromium smoke test for the local Skill Hub, run only in isolated CI.
 * npm install --no-save playwright@<pinned-version> before running.
 * Screenshots contain a synthetic empty home, never the runner's own agents.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { startWebServer } from '../dist/web/server.js';
import { createEnvironmentContext } from '../dist/core/context.js';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-commons-visual-'));
const artifacts = path.resolve('artifacts/web-qa');
fs.mkdirSync(artifacts, { recursive: true });
let browser;
let server;
const errors = [];
const sizes = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'laptop-1280', width: 1280, height: 720 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 }
];
const sections = ['overview', 'catalog', 'agents', 'integrity', 'backups'];
try {
  server = await startWebServer({
    context: createEnvironmentContext({ homeDir: home }),
    openBrowser: false, port: 0
  });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', err => errors.push('JavaScript: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && /Content Security Policy|Refused to/i.test(msg.text())) {
      errors.push('CSP: ' + msg.text());
    }
  });
  // Keyboard-only entry, skip link and section focus must work before mouse paths.
  await page.goto(server.url, { waitUntil: 'networkidle' });
  await page.keyboard.press('Tab');
  assert.ok(await page.locator('.skip-link').evaluate(el => el === document.activeElement),
    'skip link is the first keyboard stop');
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#main-content').evaluate(el => el === document.activeElement),
    'skip link moves focus to main content');
  await page.locator('[data-page="catalog"]').click();
  assert.equal(await page.locator('[data-page="catalog"]').getAttribute('aria-current'), 'page');
  assert.equal(await page.locator('[data-page="catalog"]').getAttribute('aria-controls'), 'page-catalog');
  assert.equal(await page.locator('[data-page="overview"]').getAttribute('aria-current'), null);
  assert.ok(await page.locator('#page-catalog h1').evaluate(el => el === document.activeElement),
    'navigating sections moves focus to the section heading');

  // WCAG 2.2 AA non-text contrast: fields, outlined controls, dialog perimeter.
  // Computed styles are checked in real Chromium, not from guessed stylesheet values.
  const controlContrast = await page.evaluate(() => {
    const luminance = color => {
      const values = color.match(/[0-9.]+/g)?.slice(0, 3).map(Number) ?? [];
      if (values.length !== 3) throw Error('Unsupported CSS colour: ' + color);
      const linear = values.map(c => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const ratio = (a, b) => {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    return ['#catalog-search', '#catalog-category', '#profile-agent',
      '#refresh'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return {selector, ratio: ratio(style.borderTopColor, style.backgroundColor)};
    });
  });
  for (const {selector, ratio} of controlContrast) {
    assert.ok(ratio >= 3, selector + ': insufficient non-text contrast ' + ratio.toFixed(2));
  }
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.locator('[data-page="integrity"]').click();
  await page.locator('#verify-again').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.locator('[data-page="catalog"]').click();

  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await page.locator('#metrics .metric').first().waitFor();
    assert.equal(await page.locator('#metrics .metric').count(), 4);
    for (const section of sections) {
      await page.locator('[data-page="' + section + '"]').click();
      assert.equal(await page.locator('#page-' + section).isVisible(), true);
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 2, viewport.name + ' ' + section + ': horizontal overflow of ' + overflow + 'px');
      await page.screenshot({
        path: path.join(artifacts, viewport.name + '-' + section + '.png'),
        fullPage: true
      });
    }
    await page.locator('[data-page="catalog"]').click();
    const search = page.locator('#catalog-search');
    await search.fill('no-skill-could-ever-match-this-string-999');
    assert.ok((await page.locator('#catalog-count').innerText()).startsWith('0 skills'));
    await search.fill('');
    await page.locator('#catalog-cards .skill-card').first().waitFor();
    const opener = page.locator('#catalog-cards .skill-card button').first();
    await opener.click();
    const dialog = page.getByRole('dialog');
    assert.ok(await dialog.isVisible());
    const modalContrast = await dialog.evaluate(el => {
      const rgb = value => value.match(/[0-9.]+/g).slice(0, 3).map(Number);
      const lum = value => rgb(value).map(n => {const c=n/255;return c <= .04045?c/12.92:((c+.055)/1.055)**2.4})
        .reduce((acc, c, i) => acc+c*[.2126,.7152,.0722][i],0);
      const style=getComputedStyle(el), a=lum(style.borderTopColor), b=lum(style.backgroundColor);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    });
    assert.ok(modalContrast >= 3, 'modal perimeter contrast below 3:1');

    assert.equal(await page.locator('.layout').evaluate(el => el.inert), true,
      'the background is inert while a dialog is open');
    assert.ok(await dialog.getByRole('button', { name: 'Close' })
      .evaluate(el => el === document.activeElement), 'dialog receives initial focus');
    const first = dialog.locator('a[href]').first();
    const last = dialog.locator('button').last();
    await last.focus();
    await page.keyboard.press('Tab');
    assert.ok(await first.evaluate(el => el === document.activeElement),
      'Tab wraps from last to first focusable control');
    await page.keyboard.press('Shift+Tab');
    assert.ok(await last.evaluate(el => el === document.activeElement),
      'Shift+Tab wraps from first to last focusable control');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.ok(await opener.evaluate(el => el === document.activeElement),
      'Escape restores focus to the invoking control');
    assert.equal(await page.locator('.layout').evaluate(el => el.inert), false);
  }
  // FR/EN is a local-only preference; test language changes, persistence and
  // dynamic catalog actions before returning to the English MCP smoke path.
  await page.locator('#language-select').selectOption('fr');
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal(await page.locator('[data-page="catalog"] span').last().innerText(),'Catalogue de compétences');
  await page.locator('[data-page="catalog"]').click();
  assert.equal(await page.locator('#catalog-search').getAttribute('placeholder'),
    'Rechercher compétences, tags, auteurs…');
  assert.equal(await page.locator('#catalog-cards .skill-card button').first().innerText(),'Voir les détails');
  assert.equal(await page.evaluate(() => localStorage.getItem('agent-commons-ui-language')),'fr');
  assert.match(await page.locator('#catalog-count').innerText(),/compétences · références épinglées/);
  assert.match(await page.locator('#catalog-cards .skill-card button').first().getAttribute('aria-label'),/^Voir les détails de /);
  await page.locator('[data-page="overview"]').click();
  assert.match(await page.locator('#overview-health').innerText(),/installations vérifiées du catalogue/);
  assert.match(await page.locator('#overview-health').innerText(),/éléments à examiner/);
  await page.locator('[data-page="backups"]').click();
  await page.locator('#backup-create').click();
  let backupDialog=page.getByRole('dialog');
  assert.equal(await backupDialog.getByRole('heading').innerText(),'Créer une sauvegarde complète');
  await backupDialog.getByRole('button',{name:'Créer une sauvegarde'}).click();
  const restoreButton=page.locator('#backup-items').getByRole('button',{name:/^Restaurer l’instantané snapshot-/});
  await restoreButton.waitFor();
  await restoreButton.click();
  backupDialog=page.getByRole('dialog');
  assert.match(await backupDialog.getByRole('heading').innerText(),/^Restaurer snapshot-/);
  assert.match(await backupDialog.locator('p.subtle:not([role="alert"])').innerText(),/^Saisissez snapshot-/);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  // A user-provided server identifier named like a navigation label must stay unchanged.
  await page.locator('[data-page="agents"]').click();
  await page.locator('#mcp-add').click();
  let previewDialog=page.getByRole('dialog');
  await previewDialog.locator('input.field').first().fill('Backups');
  await previewDialog.getByRole('button',{name:'Prévisualiser'}).click();
  previewDialog=page.getByRole('dialog');
  assert.equal(await previewDialog.getByRole('heading').innerText(),'Confirmer MCP : création');
  assert.match(await previewDialog.locator('p.copy').innerText(),/^Backups · Créer un instantané/);
  await previewDialog.getByRole('button',{name:'Annuler'}).click();
  assert.equal(await page.getByRole('dialog').count(),0);

  await page.locator('[data-page="agents"]').click();
  await page.locator('#mcp-add').click();
  let frenchDialog=page.getByRole('dialog');
  await frenchDialog.getByRole('button',{name:'Prévisualiser'}).click();
  await page.locator('#toast[role="alert"]').waitFor({state:'visible'});
  assert.match(await page.locator('#toast').innerText(),/Identifiant MCP invalide/);
  await page.locator('#toast').waitFor({state:'hidden',timeout:7000});
  assert.equal(await page.getByRole('dialog').count(),0);

  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal(await page.locator('#language-select').inputValue(),'fr');
  assert.equal(await page.locator('[data-page="overview"] span').last().innerText(),'Accueil');
  await page.locator('#language-select').selectOption('en');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('[data-page="overview"] span').last().innerText(),'Overview');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#language-select').inputValue(),'en');


  // Manual refresh must not erase unsaved profile selections or orphan keyboard focus.
  fs.mkdirSync(path.join(home,'.claude'),{recursive:true});
  await page.locator('#refresh').click();
  await page.locator('#profile-agent option[value="claude-code"]').waitFor({state:'attached'});
  await page.locator('[data-page="agents"]').click();
  await page.locator('#profile-agent').selectOption('claude-code');
  const draftCheckbox=page.locator('#profile-categories input[type="checkbox"]').first();
  await draftCheckbox.check();
  await draftCheckbox.focus();
  await page.evaluate(() => document.getElementById('refresh').click());
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  assert.equal(await draftCheckbox.isChecked(),true,'manual refresh discarded unsaved profile draft');
  assert.ok(await draftCheckbox.evaluate(el=>el===document.activeElement),
    'rerendered profile checkbox lost keyboard focus');
  await page.locator('[data-page="catalog"]').click();
  const focusedSkill=page.locator('#catalog-cards .skill-card button').first();
  await focusedSkill.focus();
  await page.evaluate(() => document.getElementById('refresh').click());
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  assert.ok(await focusedSkill.evaluate(el=>el===document.activeElement),
    'catalog refresh lost focused action');

  // The older, artificially delayed response must not clobber newer API state.
  const expectedSkills=Number(await page.locator('#metrics .metric .value').first().innerText());
  let requests=0, firstSeen;
  const firstRequest=new Promise(resolve=>{firstSeen=resolve});
  await page.route('**/api/state', async route=>{
    const call=++requests;
    const response=await route.fetch();
    const body=await response.json();
    if(call===1){firstSeen();body.catalog=[];await new Promise(resolve=>setTimeout(resolve,800))}
    await route.fulfill({response,json:body});
  });
  await page.evaluate(() => document.getElementById('refresh').click());
  await firstRequest;
  await page.evaluate(() => document.getElementById('refresh').click());
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.waitForTimeout(900);
  assert.equal(Number(await page.locator('#metrics .metric .value').first().innerText()),
    expectedSkills,'a stale refresh replaced the latest catalog');
  await page.unroute('**/api/state');

  // Partial refresh must not announce complete success if the MCP endpoint failed.
  await page.route('**/api/mcp',async route=>{
    await route.fulfill({status:400,contentType:'application/json',
      body:JSON.stringify({error:'Local operation failed. Check Agent Commons CLI diagnostics for details.'})});
  });
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace refreshed; MCP status unavailable.').waitFor();
  assert.equal(await page.locator('#toast').getAttribute('role'),'alert');
  await page.unroute('**/api/mcp');
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();

  // A pending destructive action must not be closed or submitted twice.
  await page.locator('[data-page="backups"]').click();
  let delayedBackups=0;
  await page.route('**/api/action',async route=>{
    const body=route.request().postDataJSON();
    if(body?.action==='backup'){
      delayedBackups++;
      const response=await route.fetch();
      await new Promise(resolve=>setTimeout(resolve,400));
      await route.fulfill({response});
    }else await route.continue();
  });
  await page.locator('#backup-create').click();
  let busyDialog=page.getByRole('dialog');
  await busyDialog.getByRole('button',{name:'Create backup'}).click();
  assert.equal(await busyDialog.getAttribute('aria-busy'),'true');
  assert.equal(await busyDialog.getByRole('button',{name:'Cancel'}).isDisabled(),true);
  await page.keyboard.press('Escape');
  assert.ok(await busyDialog.isVisible(),'Escape closed a pending operation');
  await busyDialog.waitFor({state:'detached',timeout:7000});
  assert.equal(delayedBackups,1,'backup operation was issued more than once');
  await page.unroute('**/api/action');

  // Failed confirmation stays open, exposes an inline alert, and can be cancelled.
  await page.route('**/api/action',async route=>{
    if(route.request().postDataJSON()?.action==='backup') {
      await route.fulfill({status:400,contentType:'application/json',
        body:JSON.stringify({error:'Local operation failed. Check Agent Commons CLI diagnostics for details.'})});
    }else await route.continue();
  });
  await page.locator('#backup-create').click();
  let failedDialog=page.getByRole('dialog');
  await failedDialog.getByRole('button',{name:'Create backup'}).click();
  const inlineAlert=failedDialog.getByRole('alert');
  await inlineAlert.waitFor({state:'visible'});
  assert.match(await inlineAlert.innerText(),/Local operation failed/);
  assert.ok(await inlineAlert.evaluate(el=>el===document.activeElement),
    'action error was not focused for keyboard users');
  assert.ok(await failedDialog.getByRole('button',{name:'Cancel'}).isEnabled());
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.ok(await page.locator('#backup-create').evaluate(el=>el===document.activeElement));
  await page.unroute('**/api/action');

  // Exercise the actual browser-to-HTTP MCP editor, not merely rendered controls.
  await page.setViewportSize({width: 1280, height: 720});
  await page.locator('[data-page="agents"]').click();
  await page.locator('#mcp-add').click();
  let dialog=page.getByRole('dialog');
  assert.ok(await dialog.isVisible());
  assert.ok(await dialog.locator('input.field').first()
    .evaluate(el => el === document.activeElement), 'MCP dialog focuses the first field');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.ok(await page.locator('#mcp-add').evaluate(el => el === document.activeElement),
    'MCP escape restores focus to Add MCP server');
  await page.locator('#mcp-add').click();
  dialog=page.getByRole('dialog');
  // A rejected preview must be announced and must not strand keyboard focus.
  await dialog.getByRole('button',{name:'Preview change'}).click();
  await page.locator('#toast[role="alert"]').waitFor({state:'visible'});
  assert.ok((await page.locator('#toast').innerText()).includes('Invalid MCP server identifier.'));
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.ok(await page.locator('#mcp-add').evaluate(el => el === document.activeElement));
  await page.locator('#mcp-add').click();
  dialog=page.getByRole('dialog');
  await dialog.locator('input.field').nth(0).fill('browser-sample');
  await dialog.locator('input.field').nth(1).fill('npx');
  await dialog.locator('input.field').nth(2).fill('-y\nsafe-package');
  await dialog.getByRole('button',{name:'Preview change'}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Apply change'}).click();
  await page.locator('#mcp-items').getByText('browser-sample').waitFor();
  await page.locator('#mcp-items .row-item').first().getByRole('button',{name:'Edit routing for browser-sample'}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Preview change'}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Apply change'}).click();
  await page.locator('#mcp-items').getByText('browser-sample').waitFor();
  await page.locator('#mcp-items .row-item').first().getByRole('button',{name:'Remove MCP server browser-sample'}).click();
  dialog=page.getByRole('dialog');
  await dialog.locator('input.field').fill('browser-sample');
  await dialog.getByRole('button',{name:'Apply change'}).click();
  await page.locator('#mcp-items .empty').waitFor();
  assert.deepEqual(errors, []);

  console.log('PASS: responsive Skill Hub, i18n, concurrency-safe refresh, focus/draft preservation, pending and failed dialogs, keyboard/MCP workflows; no JS/CSP errors.');
  console.log('Screenshots: ' + artifacts);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  fs.rmSync(home, { recursive: true, force: true });
}
