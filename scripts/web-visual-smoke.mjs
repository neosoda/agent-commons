/**
 * Real Chromium smoke test for the local Skill Hub, run only in isolated CI.
 * npm install --no-save playwright@<pinned-version> before running.
 * Screenshots contain a synthetic empty home, never the runner's own agents.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
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
    // Switch to MCP catalog, inspect a reference and jump to the existing configuration center.
    await page.locator('[data-kind="mcp"]').click();
    assert.equal(await page.locator('[data-kind="mcp"]').getAttribute('aria-pressed'),'true');
    await page.locator('#catalog-cards .skill-card').first().waitFor();
    assert.match(await page.locator('#catalog-count').innerText(),/MCP servers/);
    const mcpOpener=page.locator('#catalog-cards .skill-card button').first();
    await mcpOpener.click();
    const mcpDialog=page.getByRole('dialog');
    assert.ok(await mcpDialog.getByText('Example prompts').isVisible());
    assert.ok(await mcpDialog.getByRole('button',{name:'Copy prompt 1'}).isVisible());
    await mcpDialog.getByRole('button',{name:'Configure MCP'}).click();
    assert.equal(await page.locator('#page-mcp-center').isVisible(),true);
    await page.locator('[data-page="catalog"]').click();
    await page.locator('[data-kind="all"]').click();
    assert.match(await page.locator('#catalog-count').innerText(),/tools ·/);
    await page.locator('[data-kind="skill"]').click();
  }
  // FR/EN is a local-only preference; test language changes, persistence and
  // dynamic catalog actions before returning to the English MCP smoke path.
  await page.locator('#language-select').selectOption('fr');
  assert.equal(await page.locator('html').getAttribute('lang'),'fr');
  assert.equal(await page.locator('[data-page="catalog"] span').last().innerText(),'Catalogue Skills & MCP');
  await page.locator('[data-page="catalog"]').click();
  assert.equal(await page.locator('#catalog-search').getAttribute('placeholder'),
    'Rechercher noms, catégories et usages…');
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
  assert.equal(await previewDialog.getByRole('heading',{name:'Confirmer MCP : création'}).innerText(),'Confirmer MCP : création');
  assert.match(await previewDialog.locator('p.copy').innerText(),/^Backups · Créer un instantané/);
  await previewDialog.getByRole('button',{name:'Annuler'}).click();
  assert.equal(await page.getByRole('dialog').count(),0);

  await page.locator('[data-page="agents"]').click();
  await page.locator('#mcp-add').click();
  let frenchDialog=page.getByRole('dialog');
  await frenchDialog.getByRole('button',{name:'Prévisualiser'}).click();
  await frenchDialog.getByRole('alert').waitFor({state:'visible'});
  assert.match(await frenchDialog.getByRole('alert').innerText(),/Identifiant MCP invalide/);
  assert.equal(await frenchDialog.locator('input.field').first().inputValue(),'');
  assert.ok(await frenchDialog.getByRole('alert').evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Escape');
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

  // Management fixtures are created only in the synthetic home, after the empty-home captures.
  const catalog=JSON.parse(fs.readFileSync(new URL('../catalog/skills.json',import.meta.url),'utf8')).skills;
  const fixtureSkill=id=>{
    const skill=catalog.find(item=>item.id===id);
    assert.ok(skill,'missing reviewed catalog fixture '+id);
    return skill;
  };
  const managedSkill=fixtureSkill('api-design'),outdatedSkill=fixtureSkill('backend-patterns');
  const modifiedSkill=fixtureSkill('skill-creator'),availableSkill=fixtureSkill('find-skills');
  const writeManagedFixture=(skill,commit=skill.ref)=>{
    const root=path.join(home,'.agents','skills',skill.id);
    fs.mkdirSync(root,{recursive:true});
    const content=Buffer.from('---\nname: '+skill.id+'\ndescription: Synthetic browser QA fixture.\n---\n# '+skill.id+'\n');
    fs.writeFileSync(path.join(root,'SKILL.md'),content);
    fs.writeFileSync(path.join(root,'.agent-commons-source.json'),JSON.stringify({
      schemaVersion:1,managedBy:'agent-commons',skill:skill.id,repository:skill.repository,
      source:skill.repository+'/tree/'+commit+(skill.path==='.'?'':'/'+skill.path),commit,
      files:[{path:'SKILL.md',gitBlobSha1:crypto.createHash('sha1')
        .update('blob '+content.length+'\0').update(content).digest('hex')}]
    }));
    return root;
  };
  writeManagedFixture(managedSkill);
  writeManagedFixture(outdatedSkill,'a'.repeat(40));
  const modifiedRoot=writeManagedFixture(modifiedSkill);
  fs.appendFileSync(path.join(modifiedRoot,'SKILL.md'),'User changes must be preserved.\n');
  const localRoot=path.join(home,'.agents','skills','browser-local-tool');
  fs.mkdirSync(localRoot,{recursive:true});
  fs.writeFileSync(path.join(localRoot,'SKILL.md'),'---\nname: browser-local-tool\ndescription: Local browser fixture.\n---\n');
  fs.mkdirSync(path.join(home,'.claude'),{recursive:true});
  fs.mkdirSync(path.join(home,'.codex'),{recursive:true});
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.locator('[data-page="catalog"]').click();
  const toolCard=id=>page.locator('#catalog-cards [data-tool-kind="skill"][data-tool-id="'+id+'"]');
  await toolCard(managedSkill.id).waitFor();
  await page.locator('#catalog-status').selectOption('managed');
  assert.ok(await toolCard(managedSkill.id).isVisible(),'managed installation missing from managed filter');
  assert.equal(await toolCard('browser-local-tool').count(),0,'unmanaged local skill included in managed filter');
  await page.locator('#catalog-status').selectOption('updates');
  assert.ok(await toolCard(outdatedSkill.id).isVisible(),'outdated managed skill missing from updates filter');
  assert.equal(await toolCard(managedSkill.id).count(),0,'current skill included in updates filter');
  await page.locator('#catalog-status').selectOption('attention');
  assert.ok(await toolCard(modifiedSkill.id).isVisible(),'modified skill missing from attention filter');
  assert.equal(await toolCard(managedSkill.id).count(),0,'intact skill included in attention filter');
  await page.locator('#catalog-category').selectOption(managedSkill.category);
  await page.locator('#catalog-search').fill('no-manager-result-999');
  await page.locator('#catalog-reset').click();
  assert.equal(await page.locator('#catalog-search').inputValue(),'');
  assert.equal(await page.locator('#catalog-category').inputValue(),'');
  assert.equal(await page.locator('#catalog-status').inputValue(),'');
  assert.ok(await toolCard('browser-local-tool').isVisible(),'reset failed to restore local skills');
  assert.ok(await toolCard(availableSkill.id).isVisible(),'reset failed to restore available skills');
  await toolCard(availableSkill.id).getByRole('button',{name:'View details for '+availableSkill.name,exact:true}).click();
  const detailsDialog=page.getByRole('dialog');
  assert.ok(await detailsDialog.getByRole('button',{name:'Preview installation',exact:true}).isVisible());
  assert.ok(await detailsDialog.evaluate(element=>{
    const actions=element.querySelector('.extension-actions');
    const help=element.querySelector('.catalog-usage');
    return !!actions&&!!help&&!!(actions.compareDocumentPosition(help)&Node.DOCUMENT_POSITION_FOLLOWING);
  }),'skill management actions must precede optional usage help');
  await page.keyboard.press('Escape');

  // A foreign package folder needs attention even before it is configured or detected in a client.
  await page.route('**/api/mcp-packages',async route=>{
    const response=await route.fetch();
    const body=await response.json();
    const foreignPackage=body.items.find(item=>item.id==='playwright');
    assert.ok(foreignPackage,'reviewed MCP fixture not found');
    Object.assign(foreignPackage,{managed:false,healthy:false,unmanaged:true,installedVersion:null});
    await route.fulfill({response,json:body});
  });
  await page.locator('[data-kind="mcp"]').click();
  await page.locator('#catalog-status').selectOption('local');
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  const foreignPackageCard=page.locator('#catalog-cards [data-tool-kind="mcp"][data-tool-id="playwright"]');
  await foreignPackageCard.waitFor();
  assert.equal(await foreignPackageCard.locator('[data-focus-key="package:playwright"]').count(),0,
    'an unmanaged package directory exposed a destructive install action');
  await foreignPackageCard.getByRole('button').first().click();
  const foreignPackageDetails=page.getByRole('dialog');
  assert.ok(await foreignPackageDetails.getByText(
    'A package directory exists without an Agent Commons receipt; it will not be overwritten.',{exact:true}).isVisible());
  await page.keyboard.press('Escape');
  await page.locator('#catalog-status').selectOption('attention');
  assert.ok(await foreignPackageCard.isVisible(),'unconfigured unmanaged MCP package missing from attention filter');
  await page.locator('#catalog-status').selectOption('managed');
  assert.equal(await foreignPackageCard.count(),0,'unmanaged MCP package included in managed filter');
  assert.equal(fs.existsSync(path.join(home,'.agents','mcp-packages')),false,
    'GET-only package fixture caused a real package installation');
  await page.unroute('**/api/mcp-packages');
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.locator('[data-kind="skill"]').click();
  await page.locator('#catalog-reset').click();

  // Quick install opens a cancellable read-only preview before any approval or network install.
  let previewCalls=0,previewSeen,releasePreview;
  let previewArrived=new Promise(resolve=>{previewSeen=resolve});
  let previewGate=new Promise(resolve=>{releasePreview=resolve});
  const installationWrites=[];
  await page.route('**/api/action',async route=>{
    installationWrites.push(route.request().postDataJSON());
    await route.fulfill({status:400,contentType:'application/json',
      body:JSON.stringify({error:'No mutation is authorized by this preview test.'})});
  });
  await page.route('**/api/preview?**',async route=>{
    const requestUrl=new URL(route.request().url());
    assert.equal(requestUrl.searchParams.get('op'),'install');
    assert.equal(requestUrl.searchParams.get('id'),availableSkill.id);
    previewCalls++;previewSeen();await previewGate;
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:{
      commit:availableSkill.ref,files:[{relativePath:'SKILL.md',sha:'b'.repeat(40),size:128}],totalBytes:128
    }})});
  });
  const quickInstall=page.locator('[data-focus-key="skill-install:'+availableSkill.id+'"]');
  await quickInstall.click();
  await previewArrived;
  let installPreview=page.getByRole('dialog');
  assert.ok(await installPreview.isVisible(),'quick install did not expose its pending preview');
  assert.ok(await installPreview.getByRole('button',{name:'Cancel',exact:true}).isEnabled());
  await installPreview.getByRole('button',{name:'Cancel',exact:true}).click();
  releasePreview();
  await page.waitForTimeout(100);
  assert.equal(await page.getByRole('dialog').count(),0,'cancelled skill preview revived after its response');
  assert.equal(fs.existsSync(path.join(home,'.agents','skills',availableSkill.id)),false);
  assert.deepEqual(installationWrites,[],'quick preview issued an unapproved mutation');

  // A response from the previous page cannot reopen a modal, even after navigating back.
  previewArrived=new Promise(resolve=>{previewSeen=resolve});
  previewGate=new Promise(resolve=>{releasePreview=resolve});
  await quickInstall.click();
  await previewArrived;
  await page.evaluate(()=>{
    document.querySelector('[data-page="agents"]').click();
    document.querySelector('[data-page="catalog"]').click();
  });
  releasePreview();
  await page.waitForTimeout(100);
  assert.equal(await page.getByRole('dialog').count(),0,'old skill preview reopened after navigation');
  assert.equal(previewCalls,2,'one quick click issued duplicate preview requests');
  assert.deepEqual(installationWrites,[]);
  await page.unroute('**/api/preview?**');
  await page.route('**/api/preview?**',async route=>{
    await route.fulfill({status:400,contentType:'application/json',
      body:JSON.stringify({error:'Preview unavailable for browser QA.'})});
  });
  await quickInstall.click();
  const failedSkillPreview=page.getByRole('dialog');
  await failedSkillPreview.getByRole('alert').waitFor({state:'visible'});
  assert.match(await failedSkillPreview.getByRole('alert').innerText(),/Preview unavailable for browser QA/);
  assert.equal(await failedSkillPreview.getByRole('button',{name:'Install',exact:true}).count(),0,
    'failed preview still exposed installation approval');
  await failedSkillPreview.getByRole('button',{name:'Close',exact:true}).click();
  assert.deepEqual(installationWrites,[],'failed preview issued a mutation');
  await page.unroute('**/api/preview?**');
  await page.unroute('**/api/action');

  // Targeted skill sync selects clients explicitly and changes only the chosen synthetic client.
  const syncRequests=[];
  await page.route('**/api/action',async route=>{
    const body=route.request().postDataJSON();
    if(body?.action?.startsWith('skill-target-sync-'))syncRequests.push(body);
    await route.continue();
  });
  await page.locator('[data-focus-key="skill-sync:'+managedSkill.id+'"] ').click();
  let skillSyncDialog=page.getByRole('dialog');
  await skillSyncDialog.getByRole('heading',{name:'Target agents',exact:true}).waitFor();
  const targetChoices=skillSyncDialog.locator('input[type="checkbox"]');
  assert.ok(await targetChoices.count()>=2,'synthetic installed clients missing from picker');
  assert.equal(await skillSyncDialog.locator('input[type="checkbox"]:checked').count(),0,
    'target clients must start unselected');
  await skillSyncDialog.locator('input[type="checkbox"][value="claude-code"]').check();
  await skillSyncDialog.getByRole('button',{name:'Preview',exact:true}).click();
  skillSyncDialog=page.getByRole('dialog');
  const approveSync=skillSyncDialog.getByRole('button',{name:'Synchronize',exact:true});
  await approveSync.waitFor();
  assert.equal(syncRequests.length,1);
  assert.deepEqual(syncRequests[0].agents,['claude-code']);
  assert.equal(syncRequests[0].id,managedSkill.id);
  assert.equal(fs.existsSync(path.join(home,'.claude','skills',managedSkill.id)),false,
    'targeted preview changed a client before confirmation');
  await approveSync.click();
  await skillSyncDialog.waitFor({state:'detached'});
  assert.equal(syncRequests.length,2);
  assert.equal(syncRequests[1].action,'skill-target-sync-apply');
  assert.equal(syncRequests[1].approved,true);
  assert.match(syncRequests[1].previewToken,/^[a-f0-9]{48}$/);
  assert.deepEqual(syncRequests[1].agents,['claude-code']);
  const linkedSkill=path.join(home,'.claude','skills',managedSkill.id);
  assert.ok(fs.lstatSync(linkedSkill).isSymbolicLink(),'selected client did not receive a skill junction/link');
  assert.equal(fs.realpathSync(linkedSkill),fs.realpathSync(path.join(home,'.agents','skills',managedSkill.id)));
  assert.equal(fs.existsSync(path.join(home,'.codex','skills',managedSkill.id)),false,
    'targeted sync wrote to an unselected native-reading client');
  assert.equal(fs.existsSync(path.join(home,'.agents','mcp.json')),false,'skills-only sync wrote MCP configuration');
  await page.unroute('**/api/action');
  await page.locator('#language-select').selectOption('fr');
  assert.equal(await page.locator('#catalog-status option[value="managed"]').innerText(),'Installations gérées');
  assert.equal(await page.locator('#catalog-status option[value="updates"]').innerText(),'Mises à jour vérifiées');
  await page.locator('[data-focus-key="skill-sync:'+managedSkill.id+'"] ').click();
  const frenchSkillPicker=page.getByRole('dialog');
  await frenchSkillPicker.getByRole('heading',{name:'Agents destinataires',exact:true}).waitFor();
  assert.ok(await frenchSkillPicker.getByText('Lit déjà la bibliothèque partagée',{exact:true}).isVisible());
  assert.ok(await frenchSkillPicker.getByRole('button',{name:'Prévisualiser',exact:true}).isDisabled());
  await frenchSkillPicker.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.locator('#language-select').selectOption('en');
  await page.setViewportSize({width:1440,height:900});
  await page.screenshot({path:path.join(artifacts,'desktop-catalog-management.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  const managementOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(managementOverflow<=2,'management catalog overflows mobile by '+managementOverflow+'px');
  await page.screenshot({path:path.join(artifacts,'mobile-catalog-management.png'),fullPage:true});

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

  // Saving one agent cannot clear another agent's unsaved draft if selection changes mid-request.
  fs.mkdirSync(path.join(home,'.codex'),{recursive:true});
  await page.locator('#refresh').click();
  await page.locator('#workspace-status').getByText('Workspace and integrity results updated.').waitFor();
  await page.locator('[data-page="agents"]').click();
  await page.locator('#profile-agent').selectOption('claude-code');
  const claudeCheck=page.locator('#profile-categories input[type="checkbox"]').first();
  await claudeCheck.check();
  await page.locator('#profile-agent').selectOption('codex');
  const codexCheck=page.locator('#profile-categories input[type="checkbox"]').first();
  await codexCheck.check();
  await page.locator('#profile-agent').selectOption('claude-code');
  let savedProfileRequests=0;
  await page.route('**/api/action',async route=>{
    const data=route.request().postDataJSON();
    if(data?.action==='profile-save'){
      savedProfileRequests++;
      const response=await route.fetch();
      await new Promise(resolve=>setTimeout(resolve,450));
      await route.fulfill({response});
    }else await route.continue();
  });
  await page.locator('#profile-save').click();
  await page.locator('#profile-agent').selectOption('codex');
  assert.ok(await page.locator('#profile-save').isDisabled(),'switching agents re-enabled duplicate save');
  assert.ok(await codexCheck.isChecked(),'Codex draft lost during another agent save');
  await page.waitForTimeout(650);
  assert.equal(savedProfileRequests,1);
  assert.ok(await codexCheck.isChecked(),'Codex draft lost after saving Claude profile');
  const storedProfiles=JSON.parse(fs.readFileSync(path.join(home,'.agents','agent-profiles.json'),'utf8'));
  assert.ok(storedProfiles.profiles['claude-code']?.categories.length>0,
    'a profile save targeted the wrong selected agent');
  assert.equal(storedProfiles.profiles.codex,undefined,'Codex draft was saved without approval');
  await page.unroute('**/api/action');
  await page.locator('[data-page="overview"]').click();

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

  // A slow MCP preview must not lose typed values, close on Escape, or duplicate requests.
  await page.setViewportSize({width:1280,height:720});
  await page.locator('[data-page="agents"]').click();
  let delayedMcpPreviews=0;
  await page.route('**/api/action',async route=>{
    if(route.request().postDataJSON()?.action==='mcp-preview'){
      delayedMcpPreviews++;
      await new Promise(resolve=>setTimeout(resolve,350));
      await route.fulfill({status:400,contentType:'application/json',
        body:JSON.stringify({error:'Local operation failed. Check Agent Commons CLI diagnostics for details.'})});
    }else await route.continue();
  });
  await page.locator('#mcp-add').click();
  let pendingMcp=page.getByRole('dialog');
  await pendingMcp.locator('input.field').first().fill('async-safe');
  await pendingMcp.getByRole('button',{name:'Preview change'}).click();
  assert.equal(await pendingMcp.getAttribute('aria-busy'),'true');
  assert.ok(await pendingMcp.getByRole('button',{name:'Cancel'}).isDisabled());
  await page.keyboard.press('Escape');
  assert.ok(await pendingMcp.isVisible(),'Escape dismissed MCP editor during preview');
  await pendingMcp.getByRole('alert').waitFor({state:'visible'});
  assert.equal(await pendingMcp.locator('input.field').first().inputValue(),'async-safe');
  assert.ok(await pendingMcp.getByRole('button',{name:'Preview change'}).isEnabled());
  assert.ok(await pendingMcp.getByRole('alert').evaluate(el=>el===document.activeElement));
  assert.equal(delayedMcpPreviews,1);
  await page.unroute('**/api/action');
  await pendingMcp.getByRole('button',{name:'Preview change'}).click();
  let retryMcp=page.getByRole('dialog');
  await retryMcp.getByRole('heading',{name:'Confirm MCP create'}).waitFor();
  await retryMcp.getByRole('button',{name:'Cancel'}).click();
  assert.ok(await page.locator('#mcp-add').evaluate(el=>el===document.activeElement),
    'MCP confirmation cancellation failed to return focus');

  // Preview responses arriving after a page change must not open surprise dialogs.
  let delayedSyncPreviews=0;
  await page.route('**/api/action',async route=>{
    if(route.request().postDataJSON()?.action==='sync-preview'){
      delayedSyncPreviews++;
      const response=await route.fetch();
      await new Promise(resolve=>setTimeout(resolve,400));
      await route.fulfill({response});
    }else await route.continue();
  });
  await page.locator('#sync-apply').click();
  assert.ok(await page.locator('#sync-apply').isDisabled());
  assert.equal(await page.locator('#sync-apply').getAttribute('aria-busy'),'true');
  await page.evaluate(()=>document.getElementById('sync-apply').click());
  await page.locator('[data-page="backups"]').click();
  await page.waitForTimeout(550);
  assert.equal(await page.getByRole('dialog').count(),0,'stale sync preview opened a dialog');
  assert.equal(delayedSyncPreviews,1,'duplicate sync preview was sent');
  await page.unroute('**/api/action');

  // Even if the user switches away and back, the navigation generation invalidates the preview.
  await page.locator('[data-page="agents"]').click();
  await page.route('**/api/action',async route=>{
    if(route.request().postDataJSON()?.action==='sync-preview'){
      const response=await route.fetch();
      await new Promise(resolve=>setTimeout(resolve,350));
      await route.fulfill({response});
    }else await route.continue();
  });
  await page.locator('#sync-apply').click();
  await page.locator('[data-page="backups"]').click();
  await page.locator('[data-page="agents"]').click();
  await page.waitForTimeout(470);
  assert.equal(await page.getByRole('dialog').count(),0,'old preview revived after navigating back');
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
  // Invalid MCP preview must leave the fields and focus in the editor for correction.
  await dialog.getByRole('button',{name:'Preview change'}).click();
  await dialog.getByRole('alert').waitFor({state:'visible'});
  assert.ok((await dialog.getByRole('alert').innerText()).includes('Invalid MCP server identifier.'));
  assert.ok(await dialog.getByRole('alert').evaluate(el => el === document.activeElement));
  assert.ok(await dialog.getByRole('button',{name:'Preview change'}).isEnabled());
  await page.keyboard.press('Escape');
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

  console.log('PASS: responsive Skill Hub, management filters/reset, cancellable skill previews, targeted skill sync, i18n, guarded MCP/sync previews, navigation race cancellation, focus/drafts, delayed/error dialogs, keyboard/MCP workflows; no JS/CSP errors.');
  console.log('Screenshots: ' + artifacts);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  fs.rmSync(home, { recursive: true, force: true });
}
