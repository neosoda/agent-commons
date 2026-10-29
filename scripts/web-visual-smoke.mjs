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
    await page.locator('#catalog-cards .skill-card button').first().click();
    assert.ok(await page.getByRole('dialog').isVisible());
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: 5 viewports × 5 sections + catalog filters/modal, no JS errors or CSP violations.');
  console.log('Screenshots: ' + artifacts);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  fs.rmSync(home, { recursive: true, force: true });
}
