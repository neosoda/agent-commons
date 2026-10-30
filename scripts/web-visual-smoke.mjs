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
  assert.equal(await page.locator('[data-page="overview"]').getAttribute('aria-current'), null);
  assert.ok(await page.locator('#page-catalog h1').evaluate(el => el === document.activeElement),
    'navigating sections moves focus to the section heading');

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
  await page.locator('#mcp-items .row-item').first().getByRole('button',{name:'Routing…'}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Preview change'}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Apply change'}).click();
  await page.locator('#mcp-items').getByText('browser-sample').waitFor();
  await page.locator('#mcp-items .row-item').first().getByRole('button',{name:'Remove…'}).click();
  dialog=page.getByRole('dialog');
  await dialog.locator('input.field').fill('browser-sample');
  await dialog.getByRole('button',{name:'Apply change'}).click();
  await page.locator('#mcp-items .empty').waitFor();
  assert.deepEqual(errors, []);

  console.log('PASS: 5 viewports × 5 sections, keyboard skip link/navigation, focus-trapped dialogs, Escape/restoration, alert announcements, MCP editor, no JS/CSP errors.');
  console.log('Screenshots: ' + artifacts);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  fs.rmSync(home, { recursive: true, force: true });
}
