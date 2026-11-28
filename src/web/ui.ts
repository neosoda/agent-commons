import { OPERATING_SURFACE_STYLES } from './operating-surface.js';
import { OPERATING_SURFACE_CONTROLS } from './operating-surface-controls.js';
import { MISSION_DASHBOARD_CSS, MISSION_DASHBOARD_JS } from './mission-ui.js';

/**
 * Dependency-free local Skill Hub UI. Text from catalog/agents is always rendered
 * with textContent, never inserted as HTML. No external fonts, scripts or CDNs.
 */
export function renderWebUi(nonce: string, csrf: string): string {
  return HTML.replaceAll('__NONCE__', nonce).replace('__CSRF__', csrf)
    .replace('__DESIGN_CSS__', OPERATING_SURFACE_STYLES)
    .replace('__COMMAND_JS__', OPERATING_SURFACE_CONTROLS)
    .replace('__MISSION_CSS__', MISSION_DASHBOARD_CSS)
    .replace('__MISSION_JS__', MISSION_DASHBOARD_JS);
}

const HTML = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111312"><meta name="csrf-token" content="__CSRF__">
<link rel="icon" href="data:,">
<title>Agent Commons · Skill Hub</title>
<style nonce="__NONCE__">
__DESIGN_CSS__
__MISSION_CSS__
</style></head>
<body><a class="skip-link" href="#main-content">Skip to main content</a><div class="layout">
<aside class="sidebar">
<div class="topbar"><div class="brand"><span class="brand-mark" aria-hidden="true">A/</span><span class="brand-lockup">Agent Commons<small>Local agent control plane</small></span></div>
<div class="top-right"><button id="global-search-toggle" type="button" aria-haspopup="dialog" aria-controls="quick-switcher" aria-keyshortcuts="Control+K Meta+K"><span class="search-glyph" aria-hidden="true">⌕</span><span class="search-label">Find anything</span><span class="keycap" aria-hidden="true">Ctrl K</span></button><span class="pill">● Local-first</span><button class="btn small ghost" id="theme-toggle" type="button" aria-label="Switch to light theme" aria-pressed="false" title="Switch theme">◑</button><select id="language-select" aria-label="Interface language" class="lang-select"><option value="en">English</option><option value="fr">Français</option></select><button class="btn small ghost" id="refresh">↻ Refresh</button></div></div>
<div class="side-label">Workspace</div>
<nav class="nav" aria-label="Dashboard sections">
<span class="nav-ind" id="nav-ind" aria-hidden="true"></span>
<button data-page="overview" aria-controls="page-overview" class="active" aria-current="page"><span aria-hidden="true">01</span> <span>Overview</span></button>
<button data-page="catalog" aria-controls="page-catalog"><span aria-hidden="true">02</span> <span>Skills & MCP</span></button>
<button data-page="agents" aria-controls="page-agents"><span aria-hidden="true">03</span> <span>My agents</span></button>
<button data-page="mcp-center" aria-controls="page-mcp-center"><span aria-hidden="true">04</span> <span>MCP Control Center</span></button>
<button data-page="integrity" aria-controls="page-integrity"><span aria-hidden="true">05</span> <span>Integrity</span></button>
<button data-page="backups" aria-controls="page-backups"><span aria-hidden="true">06</span> <span>Backups</span></button>
<button data-page="missions" aria-controls="page-missions"><span aria-hidden="true">07</span> <span>Missions</span></button>
</nav>
<div class="sidebar-bottom"><span class="status-dot"></span>Local workspace<br><span class="subtle">127.0.0.1 only · no cloud account</span></div>
</aside>
<aside class="rail" id="rail" aria-label="Quick actions">
<button type="button" data-rail-action="search" aria-label="Search (Ctrl+K)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="rail-tip">Search · Ctrl K</span></button>
<button type="button" data-rail-go="overview" aria-label="Overview" class="on"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg><span class="rail-tip">Overview</span></button>
<button type="button" data-rail-go="catalog" aria-label="Skills & MCP"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg><span class="rail-tip">Skills & MCP</span></button>
<button type="button" data-rail-go="agents" aria-label="My agents"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg><span class="rail-tip">My agents</span></button>
<button type="button" data-rail-go="mcp-center" aria-label="MCP Control Center"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg><span class="rail-tip">MCP Control Center</span></button>
<button type="button" data-rail-go="integrity" aria-label="Integrity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg><span class="rail-tip">Integrity</span></button>
<button type="button" data-rail-go="backups" aria-label="Backups"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span class="rail-tip">Backups</span></button>
<button type="button" data-rail-go="missions" aria-label="Missions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg><span class="rail-tip">Missions</span></button>
<hr>
<button type="button" data-rail-action="refresh" aria-label="Refresh workspace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/></svg><span class="rail-tip">Refresh</span></button>
<button type="button" data-rail-action="theme" aria-label="Toggle theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg><span class="rail-tip">Theme</span></button>
</aside>
<main class="main" id="main-content" tabindex="-1">
<div class="top"><div class="eyebrow">WORKSPACE / <span id="current-view">Overview</span></div></div>
<section class="page active" id="page-overview">
<div class="hero"><div class="eyebrow">THE LOCAL AGENT CONTROL PLANE</div><h1>Your local agent workspace</h1><p>Skills, MCP servers and snapshots for the AI agents detected on this machine. Nothing is installed or synchronized without a preview and your confirmation.</p><div class="actions"><button class="btn primary" data-go="catalog">Explore tools</button><button class="btn" data-go="agents">Manage agents</button></div></div>
<div class="metrics" id="metrics"></div>
<div class="overview-signal" id="overview-signal" role="status" aria-live="polite"><div><span class="eyebrow">CURRENT WORKSPACE SIGNAL</span><strong id="overview-signal-title">Loading local state…</strong><p id="overview-signal-detail" class="subtle"></p></div><button class="btn small ghost" data-go="integrity">Inspect integrity</button></div>
<div class="split"><div class="panel"><h3>Detected agents</h3><p>Installed environments detected on this machine.</p><div id="overview-agents"></div></div><div class="panel panel-health"><h3>Workspace health</h3><p>Quick read of locally managed skills.</p><div id="overview-health"></div><div id="overview-mix" class="mix-wrap"></div><button class="btn small" data-go="integrity">View integrity report</button></div></div>
</section>
<section class="page" id="page-catalog"><div class="section-head"><div><h1>Skills & MCP catalog</h1><div class="dim">Install and manage reviewed Skills and MCP packages, inspect versions, and choose which agents to synchronize. Every change requires your approval.</div></div></div>
<div class="catalog-guide"><strong>From your library to your agents</strong><span>Install a reviewed tool, choose its agents, then preview and confirm the changes.</span><button type="button" class="btn small ghost" data-go="agents">Manage agents</button></div>
<div class="catalog-toolbar">
<div class="catalog-switch" role="group" aria-label="Catalog type"><button type="button" data-kind="skill" aria-pressed="true" class="active">Skills</button><button type="button" data-kind="mcp" aria-pressed="false">MCP servers</button><button type="button" data-kind="all" aria-pressed="false">All tools</button></div>
<div class="filter-row"><input class="field search" id="catalog-search" type="search" placeholder="Search names, categories and uses…" aria-label="Search catalog"><select class="field" id="catalog-category" aria-label="Filter by category"><option value="">All categories</option></select><select class="field" id="catalog-status" aria-label="Filter by installation"><option value="">All statuses</option><option value="installed">Installed / configured</option><option value="available">Available / reference</option><option value="managed">Managed installations</option><option value="updates">Reviewed updates</option><option value="attention">Needs attention</option><option value="local">Local / unmanaged</option></select></div>
<div class="catalog-results"><span class="subtle" id="catalog-count" role="status" aria-live="polite"></span><button type="button" class="btn small ghost hidden" id="catalog-reset">Clear filters</button><button class="btn small" id="extension-check">↻ Check reviewed updates</button></div>
<p class="subtle" id="extension-summary" role="status" aria-live="polite"></p></div><section class="panel" id="hundredx-panel" aria-label="100x Engineer extension"><div class="section-head"><h3>100x Engineer · formal verification & review suite</h3><span class="tag" id="hundredx-status-tag">Checking…</span></div><p class="subtle" id="hundredx-summary">Loading 100x Engineer extension status…</p><div class="actions" id="hundredx-actions"></div></section><div class="cards mt-14" id="catalog-cards" aria-busy="true"></div></section>
<section class="page" id="page-agents"><div class="eyebrow">PERSONALIZED PER AGENT</div><h1>My agents</h1><p class="dim">Create a local selection of central skills and catalog categories for each installed agent. Saving a profile never synchronizes it automatically.</p><div class="agents-grid" id="agents-grid"></div><div class="agents-absent" id="agents-absent" hidden></div>
<div class="section-head"><h2>Profile editor</h2><span class="tag">Explicit sync only</span></div><p class="dim hidden" id="profile-native-note">This agent reads ~/.agents/skills directly: every shared skill is already visible, and a saved profile cannot hide any of them.</p>
<div class="panel"><div class="filter-row"><select class="field" id="profile-agent" aria-label="Choose agent"></select><input class="field search" id="profile-skill-search" type="search" placeholder="Filter locally installed skills…" aria-label="Filter skills"></div><div class="split"><div><h3>Individual skills</h3><p class="subtle">Only skills already present in your shared library can be linked.</p><div class="checkbox-list" id="profile-skills"></div></div><div><h3>Category profiles</h3><p class="subtle">Categories expand to installed skills at sync time.</p><div class="checkbox-list" id="profile-categories"></div></div></div>
<div class="actions mt-19"><button class="btn primary" id="profile-save">Save profile</button><button class="btn danger" id="profile-clear">Clear saved profile</button></div></div>
<div class="panel"><h3>Synchronization</h3><p>Preview exactly what would change. Applies saved profiles to installed agents; does not change MCP settings or automatically unlink other skills.</p><div class="actions"><button class="btn" id="sync-preview">Preview sync</button><button class="btn primary" id="sync-apply">Apply saved profiles</button></div><pre class="result-box hidden" id="sync-report" role="status" aria-live="polite"></pre></div>
<div class="panel"><div class="section-head"><h3>Shared MCP servers</h3><button class="btn primary small" id="mcp-add">+ Add MCP server</button></div><p>Add MCP servers, edit agent routing or remove entries. Existing commands and environment values stay private. Every change requires a preview and confirmation; synchronization remains separate.</p><div id="mcp-items"></div><div class="actions mt-18"><button class="btn" id="full-sync-preview">Preview skills + MCP sync</button><button class="btn primary" id="full-sync-apply">Apply skills + MCP sync</button></div><pre class="result-box hidden mt-16" id="full-sync-report" role="status" aria-live="polite"></pre></div>
</section>
<section class="page" id="page-mcp-center">
<div class="eyebrow">REVIEWED · LOCAL FIRST</div><h1>MCP Control Center</h1>
<p class="dim">Browse vetted references, inspect native MCP clients, build allowlists and synchronize only selected servers. No third-party package runs automatically.</p>
<div class="split">
<div class="panel"><h2>MCP catalog</h2><div id="center-catalog"></div></div>
<div class="panel"><h2>Client inventory</h2><div id="center-clients"></div></div>
</div>
<p class="dim">A valid configuration is not proof that a server runs. Check launch targets with “agent-commons doctor” and test the MCP handshake with “agent-commons mcp probe”.</p>
<div class="panel" id="xerj-panel">
<h2>XERJ · local knowledge search</h2>
<p class="dim">Optional search node. Index only explicit directories; clients and tools still need separate MCP approval.</p>
<p class="subtle" id="xerj-node-state" role="status">Checking XERJ…</p>
<p class="subtle" id="xerj-indices" role="status"></p>
<div class="filter-row">
<button class="btn small primary" id="xerj-start">Start local node</button>
<button class="btn small" id="xerj-stop">Stop managed node</button>
</div>
<div class="filter-row mt-14"><input class="field" id="xerj-new-root" aria-label="New directory to index" placeholder="Absolute directory to authorize">
<button class="btn" id="xerj-add-root">Authorize directory</button></div>
<div class="filter-row mt-14"><select class="field" id="xerj-root" aria-label="XERJ authorized directory"></select>
<button class="btn" id="xerj-drop-root">Revoke directory</button></div>
<div class="filter-row mt-14">
<button class="btn primary" id="xerj-index">Index / refresh</button>
<button class="btn danger" id="xerj-remove">Delete this index</button>
</div>
<div class="filter-row mt-14"><input class="field" type="search" id="xerj-query" aria-label="Search indexed knowledge" placeholder="Function or code passage to find">
<button class="btn" id="xerj-search">Search</button></div>
<pre class="result-box hidden mt-16" id="xerj-output" role="status" aria-live="polite"></pre>
</div>
<div class="panel"><h2>MCP profiles</h2><p class="dim">Profiles add configured servers; they never remove other native MCPs. Servers not configured centrally are skipped.</p>
<div class="filter-row"><select class="field" id="center-profile" aria-label="Choose MCP profile"></select><button class="btn" id="center-sync-preview">Preview MCP sync</button><button class="btn primary" id="center-sync-apply">Apply MCP sync</button></div>
<h3>Target clients</h3><div id="center-agents" class="filter-row"></div><pre class="result-box hidden mt-16" id="center-report" role="status" aria-live="polite"></pre></div>
<div class="panel"><h2>Custom profile editor</h2><p class="dim">Save a named selection for installed MCP clients. An explicit preview and confirmation are mandatory.</p>
<div class="filter-row"><input class="field" id="center-custom-name" placeholder="Profile name (e.g. documentation)" aria-label="Custom MCP profile name"><button class="btn primary" id="center-custom-save">Preview and save profile</button><button class="btn danger" id="center-custom-delete">Delete profile</button></div>
<div id="center-servers" class="filter-row"></div></div>
</section>
<section class="page" id="page-integrity"><div class="eyebrow">READ-ONLY · OFFLINE</div><h1>Skill integrity</h1><p class="dim">Inspect local managed skills for changed Git blobs, missing files, extra files, unsafe links and invalid receipts. Matching hashes do not certify that third-party code is safe.</p><div class="panel"><div class="actions"><button class="btn primary" id="verify-again">Run verification</button><button class="btn" id="doctor-run">Run agent diagnostics</button></div><div id="integrity-summary" class="integrity-summary hidden" role="status" aria-live="polite"></div><div class="catalog-switch integrity-filters" id="integrity-filters" role="group" aria-label="Integrity filter"><button type="button" data-int-filter="all" aria-pressed="true" class="active">All</button><button type="button" data-int-filter="alerts" aria-pressed="false">Alerts</button><button type="button" data-int-filter="intact" aria-pressed="false">Intact</button></div><pre class="result-box hidden mt-16" id="doctor-report" role="status" aria-live="polite"></pre><div id="integrity-items" class="mt-15"></div></div></section>
<section class="page" id="page-backups"><div class="eyebrow">RECOVERY</div><h1>Snapshots & recovery</h1><p class="dim">Review stored snapshots, create a backup or restore a previous state. Restoring replaces saved managed paths and requires explicit confirmation.</p><div class="panel"><h3>Backup now</h3><p>Create a full point-in-time snapshot of agent skills and MCP configurations.</p><button class="btn primary" id="backup-create">Create backup</button></div><div class="panel"><h3>Available snapshots</h3><div id="backup-items"></div></div></section>
<section class="page" id="page-missions" aria-label="Mission Control">
<div class="eyebrow">AUTONOMOUS OPERATIONS</div>
<h1>Mission Control</h1>
<p class="dim">Schedule local-first missions and follow real plans, tool events and checkpoints. The local worker must be running. No cloud or LAN exposure.</p>
<div class="mission-layout">
  <div class="panel">
    <h3>New mission</h3>
    <form id="mission-create" class="mission-form">
      <label for="mission-workspace">Authorized Git checkout
        <input class="field" id="mission-workspace" type="text" required placeholder="A:\PROJETS\MYREPO" autocomplete="off">
      </label>
      <label for="mission-goal">Goal
        <textarea class="field" id="mission-goal" required maxlength="2000" placeholder="Inspect and verify a bug in the project"></textarea>
      </label>
      <label for="mission-model">Local LM Studio model ID
        <input class="field" id="mission-model" type="text" required maxlength="200" placeholder="exact-local-model-id" autocomplete="off">
      </label>
      <label for="mission-profile">Execution profile
        <select class="field" id="mission-profile">
          <option value="lite" selected>Lite (default · 12k tokens · 10m · 0 cloud)</option>
          <option value="standard">Standard (24k tokens · 20m)</option>
          <option value="deep">Deep (64k tokens · 45m)</option>
        </select>
      </label>
      <label for="mission-priority">Priority (0–9)
        <input class="field" id="mission-priority" type="number" min="0" max="9" value="5" required>
      </label>
      <label for="mission-delay">Delay in minutes
        <input class="field" id="mission-delay" type="number" min="0" max="43200" value="0" required>
      </label>
      <div class="mission-flags">
        <label for="mission-allow-write"><input id="mission-allow-write" type="checkbox"> Allow Git workspace writes</label>
        <label for="mission-allow-tests"><input id="mission-allow-tests" type="checkbox"> Allow project test commands</label>
      </div>
      <button class="btn primary" id="mission-submit" type="submit">Add to queue</button>
      <p class="subtle">Read-only by default. No scripts or third-party MCP tools are approved automatically.</p>
    </form>
  </div>
  <div class="panel">
    <div class="section-head"><h2>Mission queue</h2><button type="button" id="mission-refresh" class="btn small">Refresh</button></div>
    <div id="mission-worker" class="mission-worker"></div>
    <div id="mission-list" aria-live="polite" role="status"><p class="dim">Open Mission Control to load real jobs.</p></div>
  </div>
</div>
</section>
<div class="footer">Agent Commons · Local web UI · No telemetry · No background sync · Source/license review ≠ code security audit</div>
</main>
<div class="dock" id="dock" role="region" aria-label="Workspace summary"><span class="pulse" aria-hidden="true"></span><span class="dock-txt" id="dock-txt">Local workspace ready</span><button type="button" id="dock-btn" data-dock-target="catalog">Explore</button></div>
</div>
<div id="quick-switcher" class="quick-switcher hidden"><section class="quick-switcher-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-switcher-heading"><h2 class="sr-only" id="quick-switcher-heading">Search all sections and local skills</h2><div class="quick-switcher-header"><span class="quick-switcher-icon" aria-hidden="true">⌕</span><input id="quick-switcher-input" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="quick-switcher-results" aria-label="Search navigation and skills" placeholder="Type a page, skill or agent…" /><button class="btn small ghost" type="button" id="quick-switcher-close" aria-label="Close search">Esc</button></div><div id="quick-switcher-results" class="quick-switcher-results" role="listbox" aria-label="Search results"></div><div class="quick-switcher-footer"><span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div></section></div>
<div id="workspace-status" class="sr-only" role="status" aria-live="polite" aria-atomic="true"></div><div id="modal-root"></div><div id="toast" class="toast hidden" role="status" aria-live="polite" aria-atomic="true"></div>
<script nonce="__NONCE__">
'use strict';
const csrf=document.querySelector('meta[name="csrf-token"]').content;
const $=id=>document.getElementById(id);
let state=null, mcpState=null, centerState=null, packagesState=null, xerjState=null, hundredxState=null, activePage='overview', selectedAgent='', profileSavePending=false, profileDrafts=Object.create(null), catalogKind='skill', integrityFilter='all', lastIntegrityCheckAt=null;
const short=x=>String(x||'').slice(0,10);
const mcpGroups={'playwright':'web','fetch':'web','web-search':'web','osint':'web','github':'dev','git':'dev','filesystem':'infra','docker-mcp-gateway':'infra','agent-desktop':'desktop','xerj':'knowledge'};
const mcpGroupNames={web:'Web & research',dev:'Development & Git',infra:'Infrastructure & files',desktop:'Desktop & computer use',knowledge:'Knowledge & retrieval',other:'Other MCPs'};
const skillSamples={
 'agent-desktop':['Utilise agent-desktop pour inspecter l’application au premier plan sans agir. Propose un plan et demande confirmation avant toute action.','Use agent-desktop to inspect the active application first; ask for approval before changing anything.'],
 'improve':['Utilise improve quick pour auditer mon projet sans toucher au code, prioriser les constats vérifiés et préparer trois plans exécutables.','Use improve branch to review changes in this PR and prepare self-contained plans for another agent.'],
 'threat-model':['Utilise threat-model quick pour identifier les menaces de cette API et prioriser les remédiations.','Use threat-model deep to analyze this login flow with concrete mitigations.'],
 'video-engine':['Utilise video-engine pour scénariser une leçon narrée, synchroniser les animations aux mots, puis vérifier la lisibilité avant rendu. Demande mon accord avant tout TTS payant.','Use video-engine for a narrated 9:16 explainer with synchronized subtitles and frame QA.'],
 'remotion-production':['Utilise remotion-production pour planifier les médias et la bande-son de cette vidéo ; explique les fournisseurs et coûts avant tout appel externe.'],
 'create-video':['Utilise create-video pour préparer une vidéo de présentation de 30 secondes avec aperçu Remotion, sans rendu avant validation.'],
 'create-short':['Utilise create-short pour construire un Reel vertical 9:16 avec sous-titres et accroche ; ne publie rien automatiquement.'],
 'add-captions':['Utilise add-captions avec mon fichier SRT pour créer des sous-titres lisibles et compatibles avec les zones de sécurité mobile.'],
 'review-video':['Utilise review-video pour faire une première revue locale des images fixes et me proposer des corrections, sans analyse distante sans accord.'],
 'setup':['Explique les prérequis Remotion Superpowers et les cinq MCP externes sans installer de dépendances ou lire mes clés.'],
 'saas-product-demo-video':['Utilise saas-product-demo-video pour créer une démo 16:9 de 30 secondes à partir des vrais écrans de mon application. Commence par les deux premières scènes.','Use saas-product-demo-video to make a 9:16 social reel from the existing demo.'],
 'lemo-opuscar':['Utilise lemo-opuscar pour concevoir une courte vidéo de présentation. Demande mon accord avant toute installation.'],
 'find-skills':['Utilise find-skills pour sélectionner trois skills utiles à ce projet. Ne les installe pas.'],
 'chief-of-staff':['Utilise chief-of-staff pour classer les tâches ouvertes par impact, dépendances et effort.'],
 'marketing-psychology':['Utilise marketing-psychology pour améliorer la clarté de ma page SaaS sans techniques manipulatoires.'],
 'docker-patterns':['Utilise docker-patterns pour fiabiliser ce Docker Compose en préservant les données et les secrets.'],
 'ui-ux-pro-max':['Utilise ui-ux-pro-max pour améliorer la lisibilité et l’accessibilité de cette interface.']
};
const mcpSamples={
  xerj:['Avec XERJ MCP, cherche une fonction dans les projets indexés et cite les passages et chemins retrouvés avant de générer du code. Ne stocke rien en mémoire sans accord.'],
 playwright:['Utilise Playwright MCP pour vérifier les parcours principaux de cette application sans modifier de données.'],
 fetch:['Utilise Fetch MCP pour lire la documentation publique de cette API et résumer ses paramètres.'],
 'web-search':['Utilise le MCP de recherche web configuré pour vérifier la documentation officielle récente avec sources.'],
 osint:['Avec le MCP OSINT autorisé, réalise une recherche passive sur le domaine dont je suis propriétaire.'],
 filesystem:['Utilise Filesystem MCP uniquement dans les dossiers autorisés pour retrouver les fichiers de configuration, en lecture seule.'],
 git:['Utilise Git MCP pour examiner les modifications locales, sans commit ni push.'],
 github:['Avec GitHub MCP, résume les PR ouvertes et les blocages à la fusion sans modifier le dépôt.'],
 'docker-mcp-gateway':['Utilise Docker MCP Gateway pour inventorier les services autorisés, sans arrêter de conteneurs.'],
 'agent-desktop':['Observe la fenêtre active avec Agent Desktop. Ne clique pas sans accord ; vérifie chaque action par un nouveau snapshot.']
};
// UI-only translation. Never store data or server content; persist only "en"/"fr".
const FR={"Skip to main content":"Aller au contenu principal","Workspace":"Espace de travail","Overview":"Accueil","Skill catalog":"Catalogue de compétences","Skills & MCP":"Catalogue Skills & MCP","Explore tools":"Explorer les outils","My agents":"Mes agents","Integrity":"Intégrité","Backups":"Sauvegardes","Local workspace":"Espace local","127.0.0.1 only · no cloud account":"127.0.0.1 uniquement · sans compte cloud","YOUR AI WORKSPACE / CONTROL CENTER":"VOTRE ESPACE IA / CENTRE DE CONTRÔLE","● Local-first":"● Local uniquement","↻ Refresh":"↻ Actualiser","ONE LIBRARY · EVERY AGENT":"UNE BIBLIOTHÈQUE · TOUS LES AGENTS","Your AI toolkit.":"Vos outils IA.","One place to manage it.":"Un seul endroit pour tout gérer.","Discover skills, organize profiles and synchronize your agents. You stay in control: preview changes before applying them.":"Découvrez des compétences, organisez vos profils et synchronisez vos agents. Gardez le contrôle : prévisualisez les changements avant de les appliquer.","Explore skills":"Explorer les compétences","Manage agents":"Gérer les agents","Installed environments detected on this machine.":"Environnements installés détectés sur cet ordinateur.","Workspace health":"État de l'espace de travail","Quick read of locally managed skills.":"Vue rapide des compétences gérées localement.","View integrity report":"Voir le rapport d'intégrité","PUBLIC, PINNED REFERENCES":"RÉFÉRENCES PUBLIQUES ÉPINGLÉES","Review upstream sources and choose what belongs in your library.":"Examinez les sources et choisissez ce qui entre dans votre bibliothèque.","All categories":"Toutes les catégories","All statuses":"Tous les statuts","Installed":"Installé","Not installed":"Non installé","PERSONALIZED PER AGENT":"PERSONNALISÉ PAR AGENT","Create a local selection of central skills and catalog categories for each installed agent. Saving a profile never synchronizes it automatically.":"Choisissez des compétences et des catégories pour chaque agent installé. Enregistrer un profil ne déclenche jamais de synchronisation automatique.","Profile editor":"Éditeur de profils","Explicit sync only":"Synchronisation explicite uniquement","Individual skills":"Compétences individuelles","Only skills already present in your shared library can be linked.":"Seules les compétences déjà présentes dans la bibliothèque peuvent être liées.","Category profiles":"Profils par catégorie","Categories expand to installed skills at sync time.":"Les catégories sont développées en compétences installées lors de la synchronisation.","Save profile":"Enregistrer le profil","Clear saved profile":"Effacer le profil","Synchronization":"Synchronisation","Preview exactly what would change. Applies saved profiles to installed agents; does not change MCP settings or automatically unlink other skills.":"Prévisualisez les modifications. Applique les profils aux agents installés sans modifier les paramètres MCP ni retirer automatiquement d'autres compétences.","Preview sync":"Prévisualiser la synchronisation","Apply saved profiles":"Appliquer les profils","Shared MCP servers":"Serveurs MCP partagés","+ Add MCP server":"+ Ajouter un serveur MCP","Add MCP servers, edit agent routing or remove entries. Existing commands and environment values stay private. Every change requires a preview and confirmation; synchronization remains separate.":"Ajoutez des serveurs MCP, modifiez leur affectation aux agents ou supprimez-les. Les commandes et variables existantes restent privées. Chaque modification nécessite un aperçu et une confirmation.","Preview skills + MCP sync":"Prévisualiser compétences + MCP","Apply skills + MCP sync":"Synchroniser compétences + MCP","READ-ONLY · OFFLINE":"LECTURE SEULE · HORS LIGNE","Skill integrity":"Intégrité des compétences","Inspect local managed skills for changed Git blobs, missing files, extra files, unsafe links and invalid receipts. Matching hashes do not certify that third-party code is safe.":"Vérifiez les fichiers modifiés, manquants, supplémentaires, les liens dangereux et les reçus invalides. Des empreintes conformes ne garantissent pas la sécurité du code tiers.","Run verification":"Lancer la vérification","Run agent diagnostics":"Diagnostiquer les agents","RECOVERY":"RÉCUPÉRATION","Snapshots & recovery":"Instantanés et récupération","Review stored snapshots, create a backup or restore a previous state. Restoring replaces saved managed paths and requires explicit confirmation.":"Examinez les instantanés, créez une sauvegarde ou restaurez un état précédent. La restauration remplace des chemins gérés et exige une confirmation explicite.","Backup now":"Sauvegarder maintenant","Create a full point-in-time snapshot of agent skills and MCP configurations.":"Créez un instantané complet des compétences et configurations MCP.","Create backup":"Créer une sauvegarde","Available snapshots":"Instantanés disponibles","Search skills, tags, authors…":"Rechercher compétences, tags, auteurs…","Search skills":"Rechercher des compétences","Filter by category":"Filtrer par catégorie","Filter by installation":"Filtrer selon l'installation","Choose agent":"Choisir un agent","Filter locally installed skills…":"Filtrer les compétences locales…","Filter skills":"Filtrer les compétences","Interface language":"Langue de l'interface","Agent Commons · Local web UI · No telemetry · No background sync · Source/license review ≠ code security audit":"Agent Commons · Interface Web locale · Sans télémétrie · Sans synchronisation en arrière-plan · Vérification des sources/licences ≠ audit de sécurité","Public skills":"Compétences publiques","Shared skills":"Compétences partagées","MCP servers":"Serveurs MCP","View details":"Voir les détails","Archived":"Archivé","No skills match these filters.":"Aucune compétence ne correspond à ces filtres.","No supported agents detected on this machine.":"Aucun agent compatible détecté sur cet ordinateur.","Managed skills checked":"Compétences contrôlées","Integrity warnings":"Alertes d'intégrité","Local backups":"Sauvegardes locales","License":"Licence","Pinned Git revision":"Révision Git épinglée","Status":"Statut","Installed revision":"Révision installée","Verified managed installation":"Installation gérée vérifiée","Review upstream source":"Consulter la source","License evidence":"Justificatif de licence","Close":"Fermer","Preview pinned update":"Prévisualiser la mise à jour","Preview removal":"Prévisualiser la suppression","Preview installation":"Prévisualiser l'installation","Cancel":"Annuler","Apply change":"Appliquer","Preview change":"Prévisualiser","New MCP server":"Nouveau serveur MCP","Add MCP server":"Ajouter un serveur MCP","Edit MCP routing":"Modifier les agents MCP","Server ID":"Identifiant du serveur","Transport":"Transport","Executable":"Exécutable","Arguments (one per line)":"Arguments (un par ligne)","HTTP(S) endpoint":"Adresse HTTP(S)","Enabled":"Activé","Include agents (empty = all)":"Inclure des agents (vide = tous)","Exclude agents":"Exclure des agents","Routing…":"Affectation…","Remove…":"Supprimer…","Restore…":"Restaurer…","Create full backup":"Créer une sauvegarde complète","Clear profile":"Effacer le profil","Apply sync":"Appliquer la synchronisation","Synchronize skills + MCP":"Synchroniser compétences + MCP","Apply full sync":"Appliquer la synchronisation complète","Restore":"Restaurer","No snapshots yet.":"Aucun instantané pour le moment.","Nothing available yet.":"Aucun élément disponible.","No shared MCP servers. Add a server to begin.":"Aucun serveur MCP partagé. Ajoutez-en un pour commencer.","No managed public-catalog skill installations found.":"Aucune compétence gérée du catalogue public trouvée.","Workspace and integrity results updated.":"Espace de travail et résultats d'intégrité actualisés.","Refreshing local workspace…":"Actualisation de l'espace local…","Workspace refresh failed.":"Échec de l'actualisation de l'espace de travail.","Invalid MCP server identifier.":"Identifiant MCP invalide.","Profile saved (not synced)":"Profil enregistré (non synchronisé)","Choose at least one skill or category.":"Choisissez au moins une compétence ou catégorie.","Saved profile cleared":"Profil enregistré effacé","Snapshot restored":"Instantané restauré","Profiles synchronized":"Profils synchronisés","Full synchronization completed":"Synchronisation complète terminée","Reviewing pinned skill…":"Examen de la compétence épinglée…","No changes.":"Aucune modification.","Local operation failed. Check Agent Commons CLI diagnostics for details.":"Échec d'une opération locale. Consultez le diagnostic CLI pour les détails.","Type confirmation text":"Saisir le texte de confirmation","This existing directory cannot be updated or removed by the managed catalog installer. Agent Commons preserves local and modified data.":"Ce dossier ne peut être ni mis à jour ni supprimé par le catalogue. Agent Commons préserve les données locales et modifiées.","Do not paste tokens in commands or URLs. Use environment references in the central manifest for secrets.":"Ne collez pas de jetons dans les commandes ou URL. Utilisez des références de variables d'environnement pour les secrets.","Existing commands, secrets and custom options are preserved. Only agent routing can change.":"Les commandes, secrets et options personnalisées sont préservés. Seule l'affectation des agents peut changer."};

Object.assign(FR,{
  'MCP Control Center':'Centre de contrôle MCP',
  'DISCOVER · LEARN · USE':'DÉCOUVRIR · COMPRENDRE · UTILISER',
  'Skills & MCP catalog':'Catalogue Skills & MCP',
  'Find reviewed references and local tools, read usage tips and copy example prompts. Browsing is read-only.':'Explorez les skills et MCP disponibles ou locaux, apprenez à les utiliser et copiez des prompts. La consultation ne change rien.',
  'Install and manage reviewed Skills and MCP packages, inspect versions, and choose which agents to synchronize. Every change requires your approval.':'Installez et gérez les Skills et MCP vérifiés, consultez les versions et choisissez les agents à synchroniser. Chaque modification exige votre accord.',
  '↻ Check reviewed updates':'↻ Vérifier les mises à jour validées',
  'Install':'Installer','Update':'Mettre à jour','Repair':'Réparer',
  'Reviewed update available':'Mise à jour validée disponible',
  'Package installed':'Package installé','Package needs repair':'Package à réparer',
  'Configure for clients':'Configurer pour les clients',
  'Sync to selected clients':'Synchroniser vers les clients choisis',
  'Install reviewed package':'Installer le package validé',
  'Repair managed package':'Réparer le package géré',
  'Update to reviewed version':'Mettre à jour vers la version validée',
  'Uninstall managed package':'Désinstaller le package géré',
  'Managed package':'Package géré','Reviewed version':'Version validée',
  'Not installed':'Non installé','Target clients':'Clients cibles',
  'Preview':'Prévisualiser','Synchronize':'Synchroniser',
  'Allowed filesystem directories (one per line)':'Répertoires autorisés (un par ligne)',
  'Git repository (absolute directory)':'Dépôt Git (chemin absolu)',
  'No healthy MCP client detected.':'Aucun client MCP compatible en bon état détecté.',
  'Catalog type':'Type de catalogue','Skills':'Skills','MCP servers':'Serveurs MCP','All tools':'Tous',
  'Search names, categories and uses…':'Rechercher noms, catégories et usages…',
  'Search catalog':'Rechercher dans le catalogue',
  'Installed / configured':'Installés / configurés','Available / reference':'Disponibles / références',
  'Web & research':'Web et recherche','Development & Git':'Développement et Git',
  'Infrastructure & files':'Infrastructure et fichiers','Desktop & computer use':'Bureau et contrôle graphique','Other MCPs':'Autres MCP',
  'Local skills':'Skills locaux','Skill':'Skill','MCP':'MCP',
  'Example prompts':'Exemples de prompts','How to use':'Comment utiliser',
  'Copy prompt':'Copier le prompt','Prompt copied':'Prompt copié',
  'Configure MCP':'Configurer le MCP',
  'Configured centrally':'Configuré au centre','Detected in client':'Détecté dans un client',
  'Reference only':'Référence uniquement','Provider not vetted':'Fournisseur non vérifié',
  'Local only':'Local uniquement','No tools match these filters.':'Aucun outil ne correspond.',
  'Clipboard unavailable; select the prompt to copy.':'Presse-papiers indisponible : sélectionnez le prompt pour le copier.',
  'Local skill found; its origin has not been reviewed.':'Skill local : origine non vérifiée.',
  'Local MCP name found; commands and credentials are not displayed.':'MCP local : commandes et secrets masqués.',
  'Browse safely; an installed skill is not necessarily linked to an agent. Preview installation and agent sync separately.':'Un skill installé n’est pas nécessairement lié à un agent. Prévisualisez séparément installation et synchronisation.',
  'Configuration is not proof that an MCP server is running. Open MCP Control Center to inspect and preview sync.':'Une configuration MCP ne prouve pas que le serveur est démarré. Vérifiez-le dans le Centre MCP et prévisualisez la synchronisation.',

  'REVIEWED · LOCAL FIRST':'VÉRIFIÉ · LOCAL',
  'MCP catalog':'Catalogue MCP',
  'Client inventory':'Inventaire des clients',
  'MCP profiles':'Profils MCP',
  'Custom profile editor':'Éditeur de profil personnalisé',
  'Choose MCP profile':'Choisir un profil MCP',
  'Target clients':'Clients cibles',
  'Preview MCP sync':'Prévisualiser la synchronisation MCP',
  'Apply MCP sync':'Appliquer la synchronisation MCP',
  'Preview and save profile':'Prévisualiser et enregistrer le profil',
  'Delete profile':'Supprimer le profil',
  'Delete MCP profile':'Supprimer le profil MCP',
  'Profile removed':'Profil supprimé',
  'Profile name (e.g. documentation)':'Nom du profil (ex. documentation)',
  'Custom MCP profile name':'Nom du profil MCP personnalisé',
  'Browse vetted references, inspect native MCP clients, build allowlists and synchronize only selected servers. No third-party package runs automatically.':'Consultez les références vérifiées, les clients MCP et les listes autorisées. Aucun paquet tiers n’est exécuté automatiquement.',
  'Profiles add configured servers; they never remove other native MCPs. Servers not configured centrally are skipped.':'Les profils ajoutent les serveurs configurés sans retirer les MCP natifs. Les serveurs absents du manifeste central sont ignorés.',
  'Save a named selection for installed MCP clients. An explicit preview and confirmation are mandatory.':'Enregistrez une sélection pour les clients MCP installés, avec aperçu et validation obligatoires.',
  'MCP editor unavailable. Check the manifest, then Refresh.':'Éditeur MCP indisponible. Vérifiez le manifeste, puis actualisez.',
  'This only removes the saved selection; existing links stay untouched.':'Supprime uniquement le profil enregistré, sans modifier les liens existants.',
  'Capture agent skill and MCP state now. This may take a moment on large local libraries.':'Enregistrez maintenant les compétences et les configurations MCP. Les grandes bibliothèques peuvent prendre un moment.',
  'This replaces managed paths with their historical state. Create a fresh backup first, and verify that this is the intended snapshot.':'Remplace les chemins gérés par leur état précédent. Créez d’abord une sauvegarde et vérifiez l’instantané sélectionné.',
  'Create a recovery snapshot and write the updated manifest.':'Créer un instantané de récupération et enregistrer le manifeste modifié.',
  'Agent configuration synchronization remains a separate explicit action.':'La synchronisation des agents reste une action explicite et distincte.',
  'The operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.':'L’opération revérifie les fichiers locaux et crée un instantané de récupération si possible. Aucun script tiers n’est exécuté.',
  'Preview reported errors; apply is blocked.':'Des erreurs ont été relevées : application bloquée.',
  'Preview reported errors.':'Des erreurs ont été relevées dans l’aperçu.',
  'PREVIEW':'APERÇU','APPLIED':'APPLIQUÉ','not found':'introuvable',
  'intact':'intact','installed':'installé','available':'disponible',
  'untracked':'non suivi','missing':'manquant','unsafe':'dangereux',
  'modified':'modifié','local':'local','unmanaged':'non géré',
  'outdated':'obsolète','attention':'attention','unverified':'non vérifié',
  'Disabled':'Désactivé','Failed':'Échec','No issues':'Aucun problème',
  'not needed':'inutile','none':'aucun','no receipt':'sans reçu',
  'Remove':'Supprimer','Update':'Mettre à jour','Install':'Installer',
  'Uninstall':'Désinstaller','Create':'Créer','Configure':'Configurer',
  'Agent configuration synchronization remains a separate explicit action.':'La synchronisation des agents reste une opération distincte.',
  'The operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.':'Les fichiers locaux sont revérifiés et un instantané est créé si possible. Aucun script tiers n’est exécuté.',
  'Synchronization changes agent skill links and creates a recovery snapshot when needed. MCP configurations remain untouched.':'La synchronisation modifie les liens de compétences et crée un instantané si nécessaire. Les configurations MCP restent inchangées.',
  'This changes compatible agent skill links and merges MCP server entries. A recovery snapshot is created when there are changes. Conflicts are preserved.':'Les liens de compétences sont mis à jour et les entrées MCP fusionnées. Un instantané est créé en cas de changement. Les conflits sont conservés.',
  'Health: OK':'Santé : OK','Link capability: OK':'Gestion des liens : OK',
  'No changes.':'Aucun changement.'
});
// Translate only anchored UI patterns; preserve captured IDs/names unchanged.
FR['A valid configuration is not proof that a server runs. Check launch targets with “agent-commons doctor” and test the MCP handshake with “agent-commons mcp probe”.']='Une configuration valide ne prouve pas qu’un serveur fonctionne. Vérifiez les exécutables avec « agent-commons doctor » et testez la connexion MCP avec « agent-commons mcp probe ».';
FR['This agent reads ~/.agents/skills directly: every shared skill is already visible, and a saved profile cannot hide any of them.']='Cet agent lit directement ~/.agents/skills : toutes les compétences partagées sont déjà visibles et un profil ne peut pas en masquer.';
FR['Workspace refreshed; MCP status unavailable.']='Espace actualisé, mais état MCP indisponible.';
Object.assign(FR,{
  'From your library to your agents':'De votre bibliothèque à vos agents',
  'Install a reviewed tool, choose its agents, then preview and confirm the changes.':'Installez un outil vérifié, choisissez ses agents, puis prévisualisez et confirmez les changements.',
  'Managed installations':'Installations gérées','Reviewed updates':'Mises à jour vérifiées','Needs attention':'À vérifier',
  'Local / unmanaged':'Locaux / non gérés','No reviewed updates available.':'Aucune mise à jour vérifiée disponible.',
  'Try another search or clear the filters.':'Essayez une autre recherche ou effacez les filtres.',
  'Clear filters':'Effacer les filtres','Try another search or clear the filters to see more tools.':'Essayez une autre recherche ou effacez les filtres pour voir plus d’outils.',
  'Choose agents':'Choisir les agents','Choose clients':'Choisir les clients','Target agents':'Agents destinataires',
  'Preparing preview…':'Préparation de l’aperçu…','Preview skill sync':'Aperçu de synchronisation du skill',
  'Confirm skill sync':'Confirmer la synchronisation du skill','Selected skill agents synchronized':'Skill synchronisé vers les agents choisis',
  'No compatible skill agent detected.':'Aucun agent compatible avec les skills détecté.',
  'Select agents for this skill. Other skills, saved profiles and MCP settings are preserved.':'Choisissez les agents destinataires. Les autres skills, profils enregistrés et paramètres MCP sont conservés.',
  'Already reads the shared library':'Lit déjà la bibliothèque partagée',
  'Agents with native shared-library support already see this skill; no extra link is created.':'Les agents qui lisent nativement la bibliothèque partagée voient déjà ce skill ; aucun lien supplémentaire n’est créé.',
  'Choose installed skill-compatible agents only.':'Choisissez uniquement des agents installés compatibles avec les skills.',
  'Choose a skill from the physical shared library.':'Choisissez un skill physique de la bibliothèque partagée.',
  'Skill sync returned errors.':'Des erreurs sont survenues pendant la synchronisation du skill.',
  'MCP setup steps':'Étapes de configuration MCP','Install package':'Installer le package',
  'Detected in clients':'Détecté dans les clients',
  'install':'installation','update':'mise à jour','repair':'réparation','uninstall':'désinstallation',
  'not installed':'non installé','MCP sync returned errors.':'Des erreurs sont survenues pendant la synchronisation MCP.',
  'Preview a reviewed package':'Prévisualiser un package vérifié','Configure shared server':'Configurer le serveur partagé',
  'Choose permissions and clients':'Choisir les permissions et les clients','Synchronize clients':'Synchroniser les clients',
  'Preview the selected client changes':'Prévisualiser les changements pour les clients choisis',
  'Install MCP':'Installer le MCP','Update MCP':'Mettre à jour le MCP','Repair MCP':'Réparer le MCP','Uninstall MCP':'Désinstaller le MCP',
  'Repair':'Réparer','Manual provisioning':'Configuration manuelle','None':'Aucun','Risk level':'Niveau de risque',
  'No healthy MCP client detected.':'Aucun client MCP sain détecté.','Choose at least one client.':'Choisissez au moins un client.',
  'This creates a reviewed MCP command in the shared manifest. A separate confirmation will be needed to synchronize clients.':'Ajoute une commande MCP vérifiée au manifeste partagé. Une confirmation distincte sera nécessaire pour synchroniser les clients.',
  'Add this configured MCP server only to the clients you select. Existing unrelated MCP entries are preserved.':'Ajoute ce serveur MCP aux seuls clients choisis. Les autres entrées MCP existantes sont conservées.',
  'Git repository (absolute directory)':'Dépôt Git (répertoire absolu)',
  'Allowed filesystem directories (one per line)':'Répertoires autorisés (un par ligne)','Allowed filesystem directories':'Répertoires autorisés',
  'Confirm MCP configuration':'Confirmer la configuration MCP','Confirm targeted MCP sync':'Confirmer la synchronisation MCP ciblée',
  'The package remains inactive until you run an explicit MCP sync.':'Le package reste inactif jusqu’à une synchronisation MCP explicite.',
  'Only the reviewed package is managed in an isolated local folder.':'Seul le package vérifié est géré dans un dossier local isolé.',
  'Existing MCP client configurations are not modified by this operation.':'Cette opération ne modifie pas les configurations des clients MCP.',
  'Review upstream code and permissions before activation.':'Examinez le code source et les permissions avant activation.',
  'After uninstalling, those entries will point to a missing program and the server will fail to start.':'Après désinstallation, ces entrées pointeront vers un programme absent et le serveur ne pourra plus démarrer.',
  'Remove or re-point them first (MCP editor for the central manifest; native entries in each client).':'Supprimez-les ou modifiez leur cible avant de continuer (éditeur MCP pour le manifeste central ; entrées natives dans chaque client).',
  'Selected MCP clients synchronized':'Clients MCP choisis synchronisés'
});
Object.assign(FR,{
  'CURRENT WORKSPACE SIGNAL':'ÉTAT DE L’ESPACE LOCAL',
  'Loading local state…':'Chargement des données locales…',
  'Inspect integrity':'Voir l’intégrité',
  'Managed skill integrity checked':'Intégrité des skills gérés vérifiée',
  'No managed skills to verify':'Aucun skill géré à vérifier',
  'Workspace refresh unavailable':'Actualisation de l’espace local indisponible',
  'The displayed inventory may be stale. Retry refresh to verify local state.':'Les données affichées peuvent être anciennes. Actualisez pour vérifier l’état local.',
  'Review flagged installations before further changes.':'Examinez les installations signalées avant toute modification.',
  'Install reviewed skills to enable integrity checks.':'Installez des skills approuvés pour activer les contrôles d’intégrité.',
  'Local agent control plane':'Plan de contrôle local',
  'Find anything':'Rechercher',
  'THE LOCAL AGENT CONTROL PLANE':'PILOTAGE LOCAL DES AGENTS',
  'Your local agent workspace':'Votre espace local d’agents',
  'AUTONOMOUS OPERATIONS':'OPÉRATIONS AUTONOMES',
  'Mission Control':'Contrôle des missions',
  'Schedule local-first missions and follow real plans, tool events and checkpoints. The local worker must be running. No cloud or LAN exposure.':'Planifiez des missions locales et suivez leurs plans, événements d’outils et checkpoints réels. Le worker local doit être lancé. Aucune exposition cloud ni LAN.',
  'New mission':'Nouvelle mission',
  'Authorized Git checkout':'Checkout Git autorisé',
  'Goal':'Objectif',
  'Local LM Studio model ID':'ID du modèle local LM Studio',
  'Priority (0–9)':'Priorité (0–9)',
  'Delay in minutes':'Délai en minutes',
  'Allow Git workspace writes':'Autoriser les écritures dans le worktree Git',
  'Allow project test commands':'Autoriser les commandes de test du projet',
  'Add to queue':'Ajouter à la file',
  'Read-only by default. No scripts or third-party MCP tools are approved automatically.':'Lecture seule par défaut. Aucun script ni outil MCP tiers n’est approuvé automatiquement.',
  'Mission queue':'File des missions',
  'Refresh':'Actualiser',
  'Inspect and verify a bug in the project':'Inspecter et vérifier un bug du projet',
  'Open Mission Control to load real jobs.':'Ouvrez le contrôle des missions pour charger les tâches réelles.',
  'No queued missions yet. Create one to get started.':'Aucune mission en file. Créez-en une pour commencer.',
  'Mission data unavailable. Check the local worker.':'Données de mission indisponibles. Vérifiez le worker local.',
  'Local worker running':'Worker local actif',
  'Local worker not detected':'Worker local non détecté',
  'Queued missions wait until it starts.':'Les missions en file attendent son démarrage.',
  'Start it in a terminal:':'Lancez-le dans un terminal :',
  'Local plan (unverified)':'Plan local (non vérifié)',
  'Resume':'Reprendre',
  'Operator review required: reconcile any pending side effects with the CLI before restarting.':'Examen requis : rapprochez les effets de bord en attente avec la CLI avant de relancer.',
  'Mission update submitted':'Mise à jour de la mission envoyée',
  'Mission update failed':'Échec de la mise à jour de la mission',
  'Mission added to the local queue':'Mission ajoutée à la file locale',
  'Mission creation failed':'Échec de la création de la mission',
  'Reconcile the real checkpoint and workspace before retrying this mission. Continue?':'Rapprochez le checkpoint réel et le worktree avant de relancer cette mission. Continuer ?',
  'Cancel this queued or running mission?':'Annuler cette mission en file ou en cours ?',
  'This mission will have explicit workspace write/test permissions. Continue?':'Cette mission disposera de permissions explicites d’écriture/test dans le worktree. Continuer ?',
  'queued':'en file',
  'running':'en cours',
  'paused':'en pause',
  'blocked':'bloquée',
  'partial':'partielle',
  'completed':'terminée',
  'cancelled':'annulée',
  'needs_review':'à examiner',
  'Skills, MCP servers and snapshots for the AI agents detected on this machine. Nothing is installed or synchronized without a preview and your confirmation.':'Skills, serveurs MCP et instantanés des agents IA détectés sur cette machine. Rien n’est installé ni synchronisé sans aperçu et sans votre confirmation.',
  'Detected agents':'Agents détectés',
  'not checked':'non vérifié',
  'Supported agents not detected':'Agents pris en charge non détectés',
  'Search all sections and local skills':'Rechercher dans les sections et les skills locaux',
  'Search navigation and skills':'Rechercher dans les vues et les skills',
  'Type a page, skill or agent…':'Saisir une vue, un skill ou un agent…',
  'Search results':'Résultats de recherche',
  'Close search':'Fermer la recherche',
  'Navigate':'Naviguer',
  'Open':'Ouvrir',
  'Close':'Fermer',
  'WORKSPACE / ':'ESPACE / ',
  'Execution profile':'Profil d’exécution',
  'Lite — daily dev (bounded)':'Lite — dev quotidien (borné)',
  'Standard — complex work':'Standard — livraisons complexes',
  'Deep — pre-prod verification':'Deep — pré-production approfondie',
  '100x Engineer · optional formal verification & second-model review':'100x Engineer · vérification formelle et relecture optionnelles',
  '100x Engineer status unavailable.':'Statut de 100x Engineer indisponible.',
  'Unavailable':'Indisponible',
  'Needs repair':'Réparation requise',
  'External CLI':'CLI externe',
  'Install 100x':'Installer 100x',
  'Repair':'Réparer',
  'Update':'Mettre à jour',
  'Sync skills':'Synchroniser les skills',
  'Configure profile':'Configurer le profil',
  'Modes (13)':'Modes (13)',
  '100x Engineer · modes':'100x Engineer · modes',
  'Configure 100x profile':'Configurer le profil 100x',
  'Enable second-model review (when configured)':'Activer la relecture par un second modèle (si configurée)',
  'Enable formal property verification':'Activer la vérification formelle des propriétés',
  'Confirm 100x configuration':'Confirmer la configuration 100x',
  'Apply':'Appliquer',
  '100x profile saved':'Profil 100x enregistré',
  'Sync 100x skills to clients':'Synchroniser les skills 100x vers les clients',
  'Select agents to receive the installed 100x skills.':'Sélectionnez les agents qui recevront les skills 100x installés.',
  'Preview 100x skill sync':'Aperçu de la synchronisation 100x',
  'Confirm 100x skill sync':'Confirmer la synchronisation 100x',
  '100x skills synchronized':'Skills 100x synchronisés',
  '100x verification: not active in this workspace':'Vérification 100x : inactive dans cet espace',
  'Resumable':'Reprenable',
  'View contact sheet':'Voir la planche contact',
  'View hero screenshot':'Voir la capture principale',
  'Hero screenshot':'Capture principale',
  'Checking…':'Vérification…',
  'Theme':'Thème',
  'Toggle theme':'Changer de thème',
  'Refresh workspace':'Actualiser l’espace',
  'Search (Ctrl+K)':'Rechercher (Ctrl+K)',
  'Search · Ctrl K':'Rechercher · Ctrl K',
  'Local workspace ready':'Espace local prêt',
  'Explore':'Explorer',
  'Inspect':'Inspecter',
  'Library mix':'Répartition locale',
  'Shared':'Partagés',
  'Catalog':'Catalogue',
  'Warnings':'Alertes',
  'MCP':'MCP',
  'All':'Tout',
  'Alerts':'Alertes',
  'Intact':'Intacts',
  'Integrity filter':'Filtre d’intégrité',
  'No matching integrity entries.':'Aucune entrée d’intégrité correspondante.',
  'Verifying…':'Vérification…'
});
const FR_PATTERNS=[
  [/^(\d+) checked · (\d+) intact · (\d+) alerts(?: · (\d+) modified\/unsafe)?$/,(t,i,a,m)=>t+' vérifiés · '+i+' intacts · '+a+' alertes'+(m?' · '+m+' modifiés/dangereux':'')],
  [/^Last checked (.+)$/,t=>'Dernière vérification : '+t],
  [/^Integrity check completed: (\d+) intact · (\d+) alerts$/,(i,a)=>'Contrôle d’intégrité terminé : '+i+' intacts · '+a+' alertes'],
  [/^(\d+) agents · (\d+) shared skills$/,(a,s)=>a+' agents · '+s+' skills partagés'],
  [/^(\d+) integrity warnings$/,n=>n+' alertes d’intégrité'],
  [/^(\d+) skill integrity warnings require review$/,n=>n+' alertes d’intégrité à examiner'],
  [/^(\\d+) managed skill installations checked$/,n=>n+' installations gérées vérifiées'],
  [/^Install MCP · (.+)$/,id=>'Installer le MCP · '+id],
  [/^Update MCP · (.+)$/,id=>'Mettre à jour le MCP · '+id],
  [/^Repair MCP · (.+)$/,id=>'Réparer le MCP · '+id],
  [/^Uninstall MCP · (.+)$/,id=>'Désinstaller le MCP · '+id],
  [/^(Install|Update|Uninstall|Configure|Synchronize) (.+)$/, (action,id)=>translateText(action)+' '+id],
  [/^(\d+) reviewed updates available · MCP installation does not enable clients automatically$/,count=>count+' mises à jour vérifiées disponibles · l’installation MCP n’active pas les clients automatiquement'],
  [/^(\d+) reviewed updates available · checked against the local catalog$/,count=>count+' mises à jour vérifiées disponibles · comparaison avec le catalogue local'],
  [/^(Package|Operation|Reviewed|Risk level|Requirements): (.+)$/, (label,value)=>({Package:'Package',Operation:'Opération',Reviewed:'Version vérifiée','Risk level':'Niveau de risque',Requirements:'Prérequis'}[label])+ ' : '+translateText(value)],
  [/^WARNING: still referenced by (.+)\.$/,names=>'ATTENTION : encore référencé par '+names+'.'],
  [/^MCP (.+) configured\. Synchronize it from the catalog\.$/,id=>'MCP '+id+' configuré. Synchronisez-le depuis le catalogue.'],
  [/^MCP package (.+) (install|update|repair|uninstall) completed$/, (id,op)=>'Package MCP '+id+' : '+({install:'installation',update:'mise à jour',repair:'réparation',uninstall:'désinstallation'}[op])+' terminée'],
  [/^(.+) · (\d+) clients · (\d+) allowed directories\.$/,(id,clients,dirs)=>id+' · '+clients+' clients · '+dirs+' répertoires autorisés.'],
  [/^(Mode|Agents|Skill operations|MCP operations|Snapshot): (.+)$/, (label,value)=>({Mode:'Mode',Agents:'Agents','Skill operations':'Opérations skills','MCP operations':'Opérations MCP',Snapshot:'Instantané'}[label])+' : '+translateText(value)],
  [/^(\d+) skills · pinned upstream metadata$/,n=>n+' compétences · références épinglées'],
  [/^(\d+) MCP servers · local inventory and reviewed references$/,n=>n+' serveurs MCP · inventaire local et références vérifiées'],
  [/^(\d+) tools · (\d+) skills · (\d+) MCP$/, (total,skills,mcp)=>total+' outils · '+skills+' skills · '+mcp+' MCP'],
  [/^(\d+) linked skills · (\d+) MCP servers$/, (a,b)=>a+' compétences liées · '+b+' serveurs MCP'],
  [/^(\d+) reviewed-catalog installations$/,n=>n+' installations vérifiées du catalogue'],
  [/^(\d+) items needing attention$/,n=>n+' éléments à examiner'],
  [/^(\d+) available snapshots$/,n=>n+' instantanés disponibles'],
  [/^Last seen (.+)\.$/,t=>'Vu pour la dernière fois le '+t+'.'],
  [/^Steps (\d+) · tool calls (\d+) · tokens (\d+(?: \/ \d+)?) · verified observations (\d+) · MCP (\d+) · cloud (\d+)$/,(a,b,c,d,e,f)=>'Étapes '+a+' · appels d’outils '+b+' · jetons '+c+' · observations vérifiées '+d+' · MCP '+e+' · cloud '+f],
  [/^· profile (.+)$/,p=>'· profil '+p],
  [/^Skills: (\d+)\/13 · Profile: (.+) · (.+)$/, (count,profile,prereq)=>'Compétences : '+count+'/13 · Profil : '+profile+' · '+prereq],
  [/^(Install|Update|Repair|Uninstall) 100x Engineer$/,op=>({Install:'Installer',Update:'Mettre à jour',Repair:'Réparer',Uninstall:'Désinstaller'}[op])+' 100x Engineer'],
  [/^100x (install|update|repair|uninstall) completed$/,op=>'100x : '+({install:'installation',update:'mise à jour',repair:'réparation',uninstall:'désinstallation'}[op])+' terminée'],
  [/^Stage: (.+)$/,s=>'Étape : '+s],
  [/^Verdict: (.+)$/,v=>'Verdict : '+v],
  [/^Next: (.+)$/,n=>'Suivant : '+n],
  [/^Invariants: (\d+) holds · (\d+) stale · (\d+) broken · (\d+) unproven · (\d+) waived$/,(a,b,c,d,e)=>'Invariants : '+a+' valides · '+b+' obsolètes · '+c+' cassés · '+d+' non prouvés · '+e+' levés'],
  [/^Contact sheet \((.+)\)$/,label=>'Planche contact ('+label+')'],
  [/^Scheduled for (.+)$/,t=>'Planifiée pour '+t],
  [/^Verified tool events \((\d+)\)$/,n=>'Événements d’outils vérifiés ('+n+')'],
  [/^· model (.+)$/,m=>'· modèle '+m],
  [/^· priority (\d)$/,p=>'· priorité '+p],
  [/^(\d+) linked · (\d+) local skills · (\d+) MCP servers$/, (a,b,c)=>a+' liées · '+b+' compétences locales · '+c+' serveurs MCP'],
  [/^(\d+) files checked · (.+)$/, (a,b)=>a+' fichiers vérifiés · '+(b==='no receipt'?'sans reçu':b)],
  [/^(.+) · (Enabled|Disabled) · (\d+) args · (\d+) env keys( · overrides preserved)?$/, (transport,enabled,args,keys,overrides)=>transport+' · '+(enabled==='Enabled'?'Activé':'Désactivé')+' · '+args+' arguments · '+keys+' variables d’environnement'+(overrides?' · personnalisations préservées':'')],
  [/^View details for (.+)$/,name=>'Voir les détails de '+name],
  [/^Edit routing for (.+)$/,name=>'Modifier les agents de '+name],
  [/^Remove MCP server (.+)$/,name=>'Supprimer le serveur MCP '+name],
  [/^Restore snapshot (.+)$/,id=>'Restaurer l’instantané '+id],
  [/^Restore (snapshot-.+)$/,id=>'Restaurer '+id],
  [/^Type (.+) to confirm\.$/,token=>'Saisissez '+token+' pour confirmer.'],
  [/^Routing: (.+)$/,name=>'Affectation : '+name],
  [/^Confirm MCP (create|configure|delete)$/,op=>'Confirmer MCP : '+({create:'création',configure:'configuration',delete:'suppression'}[op])],
  [/^(.+) saved\. Snapshot: (.+)$/, (name,id)=>name+' enregistré. Instantané : '+(id==='not needed'?'inutile':id)],
  [/^Backup created: (.+)$/,id=>'Sauvegarde créée : '+id],
  [/^(.+) (installed|updated|uninstalled)$/, (id,verb)=>id+' '+({installed:'installé',updated:'mis à jour',uninstalled:'désinstallé'}[verb])],
  [/^(.+) · (Create a recovery snapshot and write the updated manifest\.|No changes\.)$/, (id,desc)=>id+' · '+translateText(desc)],
  [/^Preview: (\d+) skill result\(s\)\. Synchronization changes agent skill links and creates a recovery snapshot when needed\. MCP configurations remain untouched\.$/,n=>'Aperçu : '+n+' résultats de compétences. La synchronisation modifie les liens des agents et crée un instantané si nécessaire. Les paramètres MCP restent inchangés.'],
  [/^Commit: (.+)$/,commit=>'Commit : '+commit],
  [/^Files: (\d+)$/,count=>'Fichiers : '+count],
  [/^Bytes: (\d+)$/,bytes=>'Octets : '+bytes],
  [/^From: (.+)$/,commit=>'Depuis : '+commit],
  [/^To: (.+)$/,commit=>'Vers : '+commit],
  [/^Added: (\d+)$/,count=>'Ajoutés : '+count],
  [/^Changed: (\d+)$/,count=>'Modifiés : '+count],
  [/^Removed: (\d+)$/,count=>'Supprimés : '+count]
];
function translateText(english){
  if(Object.hasOwn(FR,english))return FR[english];
  if(english.includes('\n'))return english.split('\n').map(translateText).join('\n');
  for(const [pattern,format] of FR_PATTERNS){
    const match=english.match(pattern);
    if(match)return format(...match.slice(1));
  }
  return english;
}
const originalText=new WeakMap(),originalAttributes=new WeakMap();
let language='en';
function tr(english){return language==='fr'?translateText(english):english}
function translateUI(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){
    const n=walker.currentNode;
    if(n.parentElement?.closest('script,style,.result-box,[data-no-i18n],.skill-card h3,.skill-card p,.agent-card h3'))continue;
    if(!originalText.has(n))originalText.set(n,n.textContent);
    const base=originalText.get(n);
    const clean=base.trim();
    n.textContent=base.replace(clean,tr(clean));
  }
  document.querySelectorAll('[placeholder],[aria-label]').forEach(el=>{
    if(!originalAttributes.has(el))originalAttributes.set(el,{placeholder:el.getAttribute('placeholder'),label:el.getAttribute('aria-label')});
    const base=originalAttributes.get(el);
    if(base.placeholder!==null)el.setAttribute('placeholder',tr(base.placeholder));
    if(base.label!==null)el.setAttribute('aria-label',tr(base.label));
  });
}
function setLanguage(next){
  language=next==='fr'?'fr':'en';
  document.documentElement.lang=language;
  $('language-select').value=language;
  try{localStorage.setItem('agent-commons-ui-language',language)}catch{}
  translateUI();
}
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e};
const rawNode=(tag,text,cls)=>{const e=node(tag,text,cls);e.dataset.noI18n='true';return e};
const clear=e=>e.replaceChildren();
let toastSequence=0;
const showToast=(message,error=false)=>{const sequence=++toastSequence;const t=$('toast');t.setAttribute('role',error?'alert':'status');t.setAttribute('aria-live',error?'assertive':'polite');t.textContent=message;t.className='toast'+(error?' error':'');translateUI();setTimeout(()=>{if(toastSequence===sequence)t.classList.add('hidden')},4300)};
async function request(url,body){const opts=body===undefined?{method:'GET'}:{method:'POST',headers:{'content-type':'application/json','x-agent-commons-csrf':csrf},body:JSON.stringify(body)};const response=await fetch(url,opts);let data;try{data=await response.json()}catch{throw Error('Invalid server response')}if(!response.ok)throw Error(data.error||'Request failed');return data}
let navigationGeneration=0;
function go(page){const target=$('page-'+page);if(!target)return;if(activePage!==page){navigationGeneration++;const dialog=$('modal-root').querySelector('[role="dialog"]');if(dialog&&dialog.getAttribute('aria-busy')!=='true')closeDialog()}activePage=page;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e===target));document.querySelectorAll('[data-page]').forEach(e=>{const current=e.dataset.page===page;e.classList.toggle('active',current);if(current)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:'instant'});const heading=target.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
document.querySelectorAll('[data-page],[data-go]').forEach(e=>e.addEventListener('click',()=>go(e.dataset.page||e.dataset.go)));
let modalReturnFocus=null,modalReturnFocusKey=null;
function unmountDialog(){clear($('modal-root'));document.querySelector('.layout').inert=false}
function focusByKey(key){
  return key?[...document.querySelectorAll('[data-focus-key]')].find(el=>el.dataset.focusKey===key&&!el.disabled):null;
}
function focusCurrentPage(){const heading=$('page-'+activePage)?.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true})}}
function closeDialog(){
  unmountDialog();const target=modalReturnFocus,key=modalReturnFocusKey;modalReturnFocus=null;modalReturnFocusKey=null;
  const focus=target?.isConnected&&!target.disabled&&!(target.closest('.page')&&!target.closest('.page.active'))?target:focusByKey(key);
  if(focus)focus.focus({preventScroll:true});else focusCurrentPage();
}
function showDialog(bg,box,initial){if(modalReturnFocus===null){modalReturnFocus=document.activeElement;modalReturnFocusKey=modalReturnFocus?.dataset?.focusKey||null}unmountDialog();const title=box.querySelector('h2');if(title){title.id='modal-title';box.setAttribute('aria-labelledby','modal-title');box.removeAttribute('aria-label')}const description=box.querySelector('p.copy');if(description){description.id='modal-description';box.setAttribute('aria-describedby','modal-description')}bg.append(box);$('modal-root').append(bg);document.querySelector('.layout').inert=true;initial.focus();translateUI()}
document.addEventListener('keydown',event=>{const dialog=$('modal-root').querySelector('[role="dialog"]');if(!dialog)return;if(event.key==='Escape'){event.preventDefault();if(dialog.getAttribute('aria-busy')!=='true')closeDialog();return}if(event.key!=='Tab')return;const focusable=[...dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length>0);if(!focusable.length){event.preventDefault();dialog.focus();return}const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus()}});
function modal(title,details,actionLabel,onConfirm,requiresText,afterConfirm){const root=$('modal-root');clear(root);const bg=node('div',null,'modal-backdrop');const box=node('section',null,'modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);const h=node('h2',title);box.append(h);const p=node('p',details,'copy preview-summary');box.append(p);let input=null;if(requiresText){box.append(node('p','Type '+requiresText+' to confirm.','subtle'));input=node('input');input.className='field';input.placeholder=requiresText;input.setAttribute('aria-label','Type confirmation text');box.append(input)}const actions=node('div',null,'modal-buttons');const cancel=node('button','Cancel','btn');const approve=node('button',actionLabel,'btn '+(/^(Uninstall|Remove|Delete|Clear|Restore)/.test(actionLabel)?'danger':'primary'));
const inlineError=node('p','', 'subtle hidden');inlineError.setAttribute('role','alert');inlineError.tabIndex=-1;
let pending=false;
if(input)approve.disabled=true;
if(input)input.addEventListener('input',()=>approve.disabled=input.value!==requiresText||pending);
cancel.addEventListener('click',()=>{if(!pending)closeDialog()});
approve.addEventListener('click',async()=>{
  if(pending)return;
  pending=true;approve.disabled=true;cancel.disabled=true;box.setAttribute('aria-busy','true');inlineError.classList.add('hidden');inlineError.textContent='';
  try{await onConfirm();closeDialog();if(afterConfirm)afterConfirm()}
  catch(err){
    inlineError.textContent=err instanceof Error?err.message:'Operation failed.';
    inlineError.classList.remove('hidden');approve.disabled=!!input&&input.value!==requiresText;
    cancel.disabled=false;inlineError.focus({preventScroll:true});
  }finally{pending=false;box.removeAttribute('aria-busy')}
});
actions.append(cancel,approve);box.append(inlineError,actions);showDialog(bg,box,input||cancel);
bg.addEventListener('click',e=>{if(e.target===bg&&!pending)closeDialog()})}
function labelStatus(s){const b=node('span',s,'tag '+(s==='intact'||s==='installed'?'good':s==='unsafe'||s==='modified'?'bad':s==='untracked'||s==='missing'?'warn':''));return b}
function row(title,detail,right){const e=node('div',null,'row-item');const l=node('div');l.append(node('strong',title),node('small',detail));e.append(l);if(right)e.append(right);return e}
function renderMetrics(){const installed=state.inventory.agents.filter(a=>a.installed);const values=[['Public skills',state.catalog.length],['Shared skills',state.inventory.centralSkills.length],['Detected agents',installed.length],['MCP servers',state.inventory.centralMcpServers.length]];clear($('metrics'));values.forEach(([name,count])=>{const card=node('div',null,'metric');card.append(node('div',count,'value'),node('div',name,'label'));$('metrics').append(card)})}
function renderOverview(){
  renderMetrics();
  const issues=state.integrity.results.filter(item=>item.status!=='intact').length;
  const scanned=state.integrity.scanned;
  const signal=$('overview-signal');
  signal.classList.toggle('needs-attention',issues>0);
  $('overview-signal-title').textContent=issues>0?
    issues+' skill integrity warnings require review':
    scanned>0?'Managed skill integrity checked':'No managed skills to verify';
  $('overview-signal-detail').textContent=issues>0?
    'Review flagged installations before further changes.':
    scanned>0?scanned+' managed skill installations checked':'Install reviewed skills to enable integrity checks.';
  clear($('overview-agents'));const agents=state.inventory.agents.filter(a=>a.installed);if(!agents.length)$('overview-agents').append(node('p','No supported agents detected on this machine.','dim'));agents.slice(0,8).forEach(a=>{const element=row(a.name,a.linkedSkills.length+' linked skills · '+a.mcpServers.length+' MCP servers',labelStatus('installed'));element.querySelector('strong').dataset.noI18n='true';$('overview-agents').append(element)});clear($('overview-health'));const bad=state.integrity.results.filter(s=>s.status!=='intact');const checked=state.integrity.scanned>0;$('overview-health').append(row('Managed skills checked',state.integrity.scanned+' reviewed-catalog installations',labelStatus(!checked?'not checked':bad.length?'attention':'intact')));$('overview-health').append(row('Integrity warnings',bad.length+' items needing attention',labelStatus(!checked?'not checked':bad.length?'untracked':'intact')));$('overview-health').append(row('Local backups',state.inventory.backups.length+' available snapshots',null));
  const mixHost=$('overview-mix');
  if(mixHost){
    clear(mixHost);
    const sharedCount=state.inventory.centralSkills.length;
    const availCount=Math.max(0,state.catalog.filter(s=>!s.installed).length);
    const mcpCount=state.inventory.centralMcpServers.length;
    const segments=[
      ['Shared',sharedCount,'mix-y'],
      ['Catalog',availCount,'mix-l'],
      ['Warnings',bad.length,'mix-r'],
      ['MCP',mcpCount,'mix-k']
    ].filter(([,v])=>v>0);
    if(segments.length){
      mixHost.append(node('span','Library mix','mix-title'));
      const bar=node('div',null,'mixbar'),leg=node('div',null,'mixleg');
      for(const [lbl,val,cls] of segments){
        const seg=node('span',null,cls);seg.style.flexGrow=String(val);seg.title=lbl+': '+val;bar.append(seg);
        const item=node('span'),dot=node('i',null,cls);item.append(dot,node('span',lbl),rawNode('b',String(val)));leg.append(item);
      }
      mixHost.append(bar,leg);
    }
  }
  const dock=$('dock'),dockTxt=$('dock-txt'),dockBtn=$('dock-btn');
  if(dock&&dockTxt&&dockBtn){
    dock.classList.toggle('has-alert',issues>0);
    if(issues>0){
      dockTxt.textContent=issues+' integrity warnings';
      dockBtn.textContent='Inspect';
      dockBtn.dataset.dockTarget='integrity';
    }else{
      dockTxt.textContent=agents.length+' agents · '+state.inventory.centralSkills.length+' shared skills';
      dockBtn.textContent='Explore';
      dockBtn.dataset.dockTarget='catalog';
    }
  }
}
function discoveredTools(){
  const tools=state.catalog.map(s=>({kind:'skill',id:s.id,name:s.name,description:s.description,category:s.category,
    categoryName:state.categories.find(c=>c.id===s.category)?.label||s.category,installed:s.installed,skill:s,tags:s.tags,author:s.author}));
  const knownSkills=new Set(tools.map(item=>item.id));
  for(const name of state.inventory.centralSkills)if(!knownSkills.has(name))tools.push({
    kind:'skill',id:name,name,description:'Local skill found in shared library.',category:'local-skill',
    categoryName:'Local skills',installed:true,local:true,tags:[]});
  const curated=centerState?.catalog||[],knownMcp=new Set();
  for(const m of curated){
    knownMcp.add(m.id);
    const group=mcpGroups[m.id]||'other';
    const pkg=packagesState?.items?.find(x=>x.id===m.id)||null;
    tools.push({kind:'mcp',id:m.id,name:m.name,description:m.description,category:'mcp-'+group,categoryName:mcpGroupNames[group],
      installed:m.configured||m.detected||!!pkg?.managed,configured:m.configured,detected:m.detected,unavailable:m.installation==='unavailable',
      packageInfo:pkg,installMethod:m.installation,
      source:m.repository,requirements:m.requirements,risk:m.risk,tags:[m.maintainer||'',m.risk]});
  }
  const central=new Set(centerState?.centralNames||[]),native=new Set();
  for(const client of centerState?.clients||[])if(client.installed)for(const name of client.servers)native.add(name);
  for(const name of [...new Set([...central,...native])].sort())if(!knownMcp.has(name))tools.push({
    kind:'mcp',id:name,name,description:'Local MCP server name found in configuration.',category:'mcp-other',
    categoryName:mcpGroupNames.other,installed:true,configured:central.has(name),detected:native.has(name),local:true,tags:[]});
  return tools;
}
function renderCatalog(){filterCatalog()}
function toolManagement(item){
  const audit=item.kind==='skill'?state.integrity.results.find(result=>result.skill===item.id):null;
  const pkg=item.packageInfo;
  const managed=item.kind==='skill'?!!audit?.commit:!!pkg?.managed;
  const intact=item.kind==='skill'?audit?.status==='intact':pkg?.healthy;
  const update=item.kind==='skill'?!item.local&&item.installed&&intact&&item.skill.lifecycle!=='archived'&&audit.commit!==item.skill.ref:
    !!pkg?.updateAvailable;
  return {audit,managed,update,attention:!!audit&&!['intact','unmanaged'].includes(audit.status)||!!pkg?.managed&&!intact||!!pkg?.unmanaged};
}
function catalogAction(label,key,run,primary=false){
  const button=node('button',label,'btn small'+(primary?' primary':''));
  button.type='button';button.dataset.focusKey=key;button.onclick=run;return button;
}
function resetCatalog(){
  $('catalog-search').value='';$('catalog-category').value='';$('catalog-status').value='';filterCatalog();
  $('catalog-search').focus();
}
function filterCatalog(){
  if(!state)return;
  const all=discoveredTools(),scope=all.filter(item=>catalogKind==='all'||item.kind===catalogKind);
  const select=$('catalog-category'),previous=select.value,groups=new Map(scope.map(item=>[item.category,item.categoryName]));
  clear(select);const any=node('option','All categories');any.value='';select.append(any);
  for(const [id,label] of [...groups].sort((a,b)=>a[1].localeCompare(b[1]))){const option=rawNode('option',label);option.value=id;select.append(option)}
  select.value=groups.has(previous)?previous:'';
  const query=$('catalog-search').value.trim().toLowerCase(),cat=select.value,status=$('catalog-status').value;
  const matches=scope.filter(item=>{
    const management=toolManagement(item);
    const statuses={installed:item.installed,available:!item.installed,managed:management.managed,
      updates:management.update,attention:management.attention,local:item.installed&&!management.managed||!!item.packageInfo?.unmanaged};
    return (!cat||cat===item.category)&&(!status||statuses[status])&&
      (!query||[item.id,item.name,item.description,item.categoryName,item.author||'',...(item.tags||[])].join(' ').toLowerCase().includes(query));
  });
  const skills=matches.filter(item=>item.kind==='skill').length,mcps=matches.length-skills;
  $('catalog-count').textContent=catalogKind==='skill'?skills+' skills · pinned upstream metadata':
    catalogKind==='mcp'?mcps+' MCP servers · local inventory and reviewed references':
    matches.length+' tools · '+skills+' skills · '+mcps+' MCP';
  const target=$('catalog-cards');clear(target);
  const updates=all.filter(item=>toolManagement(item).update).length;
  $('extension-summary').textContent=updates+' reviewed updates available · checked against the local catalog';
  $('catalog-reset').classList.toggle('hidden',!query&&!cat&&!status);
  if(!matches.length){
    const empty=node('div',null,'empty catalog-empty');
    empty.append(node('h3',status==='updates'&&!query&&!cat?'No reviewed updates available.':'No tools match these filters.'),
      node('p','Try another search or clear the filters.'));
    const reset=node('button','Clear filters','btn');reset.onclick=resetCatalog;empty.append(reset);target.append(empty);
  }
  for(const item of matches){
    const card=node('article',null,'skill-card'),header=node('div',null,'card-tags');
    card.dataset.toolId=item.id;card.dataset.toolKind=item.kind;
    header.append(node('span',item.kind==='skill'?'Skill':'MCP','tag'),rawNode('span',item.categoryName,'tag'));
    if(item.local)header.append(node('span','Local only','tag warn'));
    if(item.skill?.lifecycle==='archived')header.append(node('span','Archived','tag warn'));
    card.append(header,rawNode('h3',item.name),rawNode('p',item.description));
    const bottom=node('div',null,'bottom');
    const {audit,update}=toolManagement(item);
    const status=item.kind==='skill'?(!item.installed?'available':audit?.status==='intact'?(update?'outdated':'installed'):audit?.status||'local'):mcpStatusLabel(item);
    if(item.kind==='skill'&&!item.local)card.append(rawNode('p',item.author+' · '+item.skill.license,'card-meta dim'));
    if(item.kind==='mcp'&&item.packageInfo?.reviewedVersion){
      const meta=node('p',null,'card-meta dim');
      meta.append(node('span','Reviewed version'),rawNode('span',' '+item.packageInfo.reviewedVersion));card.append(meta);
    }
    bottom.append(labelStatus(status));
    const actions=node('div',null,'card-actions');
    const button=node('button','View details','btn small ghost');
    button.dataset.focusKey='catalog:'+item.kind+':'+item.id;
    button.setAttribute('aria-label','View details for '+item.name);
    button.onclick=()=>item.kind==='mcp'?mcpDetails(item):item.local?localSkillDetails(item):skillDetails(item.skill);
    actions.append(button);
    if(item.kind==='skill'){
      if(!item.installed&&item.skill?.lifecycle!=='archived'&&!item.local)
        actions.append(catalogAction('Install','skill-install:'+item.id,()=>previewSkill('install',item.id),true));
      else if(update)actions.append(catalogAction('Update','skill-update:'+item.id,()=>previewSkill('update',item.id),true));
      else if(item.installed)actions.append(catalogAction('Choose agents','skill-sync:'+item.id,()=>skillClientDialog(item.id),true));
    }
    if(item.kind==='mcp'&&!item.local&&item.packageInfo?.canInstall&&!item.packageInfo?.unmanaged){
      const pkg=item.packageInfo;
      const op=!pkg.managed?'install':!pkg.healthy?'repair':pkg.updateAvailable?'update':null;
      if(op){const quick=node('button',op==='install'?'Install':op==='repair'?'Repair':'Update','btn primary small');
        quick.dataset.focusKey='package:'+item.id;quick.onclick=()=>previewMcpPackage(op,item.id);actions.append(quick)}
      else if(!item.configured&&pkg.managed&&pkg.healthy)
        actions.append(catalogAction('Configure for clients','mcp-configure:'+item.id,()=>managedMcpClientDialog(item.id,true),true));
    }
    if(item.kind==='mcp'&&item.id==='xerj'&&!item.configured&&item.packageInfo?.externalAvailable){
      actions.append(catalogAction('Configure for clients','mcp-configure:'+item.id,()=>managedMcpClientDialog(item.id,true),true));
    }
    if(item.kind==='mcp'&&item.configured){
      actions.append(catalogAction('Choose clients','mcp-sync:'+item.id,()=>managedMcpClientDialog(item.id,false),true));
    }
    bottom.append(actions);card.append(bottom);target.append(card);
  }
  target.setAttribute('aria-busy','false');translateUI();
}
function promptExamples(item,kind){
  const fixed=(kind==='skill'?skillSamples:mcpSamples)[item.id];
  if(fixed)return fixed;
  if(kind==='mcp')return language==='fr'
    ?['Quels outils ce serveur MCP ('+item.id+') expose-t-il dans cet agent ? Explique leurs permissions avant toute action.']
    :['Which tools does MCP server '+item.id+' expose to this agent? Explain permissions before taking any action.'];
  return language==='fr'
    ?['Utilise le skill '+item.id+' pour [objectif précis] dans ce projet. Charge seulement les références nécessaires et ne modifie rien sans validation.']
    :['Use the '+item.id+' skill for [specific goal] in this project. Load only needed references and ask before modifying anything.'];
}
function addUsage(box,item,kind){
  const area=node('section',null,'catalog-usage');area.append(node('h3','How to use'));
  const info=kind==='mcp'?'Configuration is not proof that an MCP server is running. Open MCP Control Center to inspect and preview sync.':
    item.local?'Local skill found; its origin has not been reviewed.':
    'Browse safely; an installed skill is not necessarily linked to an agent. Preview installation and agent sync separately.';
  area.append(node('p',info));
  const command=kind==='mcp'?(language==='fr'?'Centre MCP → configurer → prévisualiser → confirmer la synchronisation':
    'MCP Control Center → configure → preview → confirm sync'):
    item.local?'agent-commons sync --skill '+item.id+' --agent codex --dry-run':
    'agent-commons catalog install '+item.id+'\nagent-commons catalog install '+item.id+' --yes\nagent-commons sync --skill '+item.id+' --agent codex --dry-run';
  area.append(rawNode('pre',command,'catalog-command'));
  if(kind==='skill')area.append(rawNode('p',language==='fr'?'Dans Codex : $'+item.id+' · Claude Code : /'+item.id:
    'In Codex: $'+item.id+' · Claude Code: /'+item.id));
  area.append(node('h3','Example prompts'));
  promptExamples(item,kind).forEach((prompt,i)=>{
    const sample=node('div',null,'catalog-prompt'),paragraph=rawNode('p',prompt),copy=node('button','Copy prompt','btn small');
    copy.setAttribute('aria-label','Copy prompt '+(i+1));
    copy.onclick=async()=>{
      try{
        if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
        await navigator.clipboard.writeText(prompt);showToast('Prompt copied');
      }catch{
        const field=node('textarea');field.className='field';field.value=prompt;field.readOnly=true;
        field.setAttribute('aria-label','Prompt to copy');sample.replaceChild(field,paragraph);
        field.focus();field.select();showToast('Clipboard unavailable; select the prompt to copy.',true);
      }
    };
    sample.append(paragraph,copy);area.append(sample);
  });
  box.append(area);
}
function localSkillDetails(item){
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(rawNode('h2',item.name),node('p','Local skill found; its origin has not been reviewed.','copy'));
  const sync=node('button','Choose agents','btn primary');
  sync.onclick=()=>skillClientDialog(item.id);box.append(sync);
  addUsage(box,item,'skill');
  const buttons=node('div',null,'modal-buttons'),close=node('button','Close','btn');
  close.onclick=closeDialog;buttons.append(close);box.append(buttons);showDialog(bg,box,close);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
function mcpStatusLabel(item){
  return item.packageInfo?.updateAvailable?'Reviewed update available':item.packageInfo?.managed?(item.packageInfo.healthy?'Package installed':'Package needs repair'):
    item.configured?'Configured centrally':item.packageInfo?.externalAvailable?'Existing local binary':item.detected?'Detected in client':item.unavailable?'Provider not vetted':'Reference only';
}
function mcpDetails(item){
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(rawNode('h2',item.name),rawNode('p',item.description,'copy'));
  const status=mcpStatusLabel(item);
  box.append(row('Status',status,labelStatus(status)));
  if(item.risk)box.append(row('Risk',item.risk),row('Requirements',(item.requirements||[]).join(', ')||'None'));
  if(item.local)box.append(node('p','Local MCP name found; commands and credentials are not displayed.','copy'));
  const pkg=item.packageInfo;
  const linked=(centerState?.clients||[]).filter(client=>client.installed&&client.servers.includes(item.id)).map(client=>client.name);
  const steps=node('ol',null,'extension-steps');steps.setAttribute('aria-label','MCP setup steps');
  for(const [label,complete,detail] of [
    ['Install package',!!(pkg?.healthy||pkg?.externalAvailable),pkg?.healthy?'Package installed':pkg?.externalAvailable?'External XERJ executable detected':pkg?.canInstall?'Preview a reviewed package':'Manual provisioning'],
    ['Configure shared server',!!item.configured,item.configured?'Configured centrally':'Choose permissions and clients'],
    ['Detected in clients',false,linked.length?linked.join(', '):'Preview the selected client changes']
  ]){
    const step=node('li'),title=node('strong',label),status=node('span',detail,complete?'step-complete':'');
    if(label==='Detected in clients'&&linked.length)status.dataset.noI18n='true';
    step.append(title,status);steps.append(step);
  }
  box.append(steps);
  if(pkg){box.append(row('Managed package',pkg.managed?(pkg.healthy?'Installed '+pkg.installedVersion:'Repair required'):'Not installed'),
    row('Reviewed version',pkg.reviewedVersion||'Manual provisioning'));
    if(pkg.unmanaged)box.append(node('p','A package directory exists without an Agent Commons receipt; it will not be overwritten.','copy'));
    if(pkg.canInstall&&!pkg.unmanaged){const actions=node('div',null,'actions mt-14');
      const op=!pkg.managed?'install':!pkg.healthy?'repair':pkg.updateAvailable?'update':null;
      if(op){const act=node('button',op==='install'?'Install reviewed package':op==='repair'?'Repair managed package':'Update to reviewed version','btn primary small');
        act.onclick=()=>{unmountDialog();previewMcpPackage(op,item.id)};actions.append(act)}
      if(pkg.managed){const remove=node('button','Uninstall managed package','btn danger small');
        remove.onclick=()=>{unmountDialog();previewMcpPackage('uninstall',item.id)};actions.append(remove)}
      if(((pkg.managed&&pkg.healthy)||(item.id==='xerj'&&pkg.externalAvailable))&&!item.configured){const activate=node('button','Configure for clients','btn primary small');
        activate.onclick=()=>{unmountDialog();managedMcpClientDialog(item.id,true)};actions.append(activate)}
      box.append(actions);
    }
  }
  if(item.configured){const connect=node('button','Sync to selected clients','btn primary small');
    connect.onclick=()=>{unmountDialog();managedMcpClientDialog(item.id,false)};box.append(connect)}
  if(linked.length)box.append(row('Detected in',linked.join(', ')));
  addUsage(box,item,'mcp');
  if(item.source){const links=node('div',null,'links'),link=node('a','Review upstream source');
    link.href=item.source;link.target='_blank';link.rel='noopener noreferrer';links.append(link);box.append(links)}
  const buttons=node('div',null,'modal-buttons'),close=node('button','Close','btn'),configure=node('button','Configure MCP','btn primary');
  close.onclick=closeDialog;configure.onclick=()=>{closeDialog();go('mcp-center')};
  buttons.append(close,configure);box.append(buttons);showDialog(bg,box,close);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
function skillDetails(s){
  const root=$('modal-root');clear(root);
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',s.name);
  const audit=state.integrity.results.find(item=>item.skill===s.id);
  const managed=!!s.installed&&audit?.status==='intact';
  box.append(rawNode('h2',s.name),rawNode('p',s.description,'copy'));
  const details=node('div');
  const licenseRow=row('License',s.license);licenseRow.querySelector('small').dataset.noI18n='true';
  details.append(licenseRow,row('Pinned Git revision',short(s.ref)),
    row('Status',!s.installed?'Not installed':managed?'Verified managed installation':'Local installation · '+(audit?.status||'unverified'),
      labelStatus(!s.installed?'available':audit?.status||'unmanaged')));
  if(managed)details.append(row('Installed revision',short(audit.commit),labelStatus(audit.commit===s.ref?'intact':'outdated')));
  box.append(details);
  if(s.installed&&!managed)box.append(node('p','This existing directory cannot be updated or removed by the managed catalog installer. Agent Commons preserves local and modified data.','copy'));
  const links=node('div',null,'links'),link=node('a','Review upstream source');
  link.href=s.source;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
  const license=node('a','License evidence');license.href=s.licenseEvidence;license.target='_blank';license.rel='noopener noreferrer';links.append(license);box.append(links);
  const actions=node('div',null,'extension-actions'),close=node('button','Close','btn');
  close.onclick=closeDialog;actions.append(close);
  if(managed){
    if(audit.commit!==s.ref&&s.lifecycle!=='archived'){
      const update=node('button','Preview pinned update','btn');
      update.onclick=()=>{unmountDialog();previewSkill('update',s.id)};actions.append(update);
    }
    const remove=node('button','Preview removal','btn danger');
    remove.onclick=()=>{unmountDialog();previewSkill('uninstall',s.id)};actions.append(remove);
  }else if(!s.installed&&s.lifecycle!=='archived'){
    const install=node('button','Preview installation','btn primary');
    install.onclick=()=>{unmountDialog();previewSkill('install',s.id)};actions.append(install);
  }
  if(s.installed){const sync=node('button','Choose agents','btn primary');sync.onclick=()=>skillClientDialog(s.id);actions.append(sync)}
  box.append(actions);addUsage(box,s,'skill');showDialog(bg,box,close);
  bg.onclick=e=>{if(e.target===bg)closeDialog()}
}
function openToolDetails(kind,id){
  const item=discoveredTools().find(tool=>tool.kind===kind&&tool.id===id);
  if(item)kind==='mcp'?mcpDetails(item):item.local?localSkillDetails(item):skillDetails(item.skill);
}
async function prepareCatalogPreview(title,load,ready){
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  const loading=node('p',null,'copy preview-loading');loading.setAttribute('role','status');
  const spinner=node('span',null,'spinner');spinner.setAttribute('aria-hidden','true');
  loading.append(spinner,node('span','Preparing preview…'));
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn');
  cancel.onclick=closeDialog;buttons.append(cancel);box.append(node('h2',title),loading,buttons);
  const page=activePage,nav=navigationGeneration;
  const current=()=>box.isConnected&&activePage===page&&navigationGeneration===nav;
  showDialog(bg,box,cancel);bg.onclick=e=>{if(e.target===bg)closeDialog()};
  try{const result=await load();if(current())ready(result)}
  catch(err){if(current()){
    loading.replaceChildren(node('span',err.message));loading.setAttribute('role','alert');
    cancel.textContent='Close';translateUI();
  }}finally{
    // A cancelled request may finish after another dialog has opened.
    if(box.isConnected&&(activePage!==page||navigationGeneration!==nav))closeDialog();
  }
}
function skillClientDialog(id){
  const clients=(state.inventory.agents||[]).filter(agent=>agent.installed&&agent.skillsSupported);
  if(!clients.length){showToast('No compatible skill agent detected.',true);return}
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(node('h2','Target agents'),rawNode('p',id,'copy'),
    node('p','Select agents for this skill. Other skills, saved profiles and MCP settings are preserved.','copy'));
  const list=node('div',null,'checkbox-list');
  for(const agent of clients){
    const label=node('label',null,'check'),choice=node('input'),caption=node('span');
    choice.type='checkbox';choice.value=agent.id;
    caption.append(rawNode('span',agent.name));
    if(agent.readsCentralSkills)caption.append(node('small','Already reads the shared library','subtle'));
    label.append(choice,caption);list.append(label);
  }
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),next=node('button','Preview','btn primary');
  next.disabled=true;list.onchange=()=>{next.disabled=!list.querySelector('input:checked')};
  cancel.onclick=closeDialog;
  next.onclick=()=>{
    const agents=[...list.querySelectorAll('input:checked')].map(input=>input.value);
    prepareCatalogPreview('Preview skill sync',()=>request('/api/action',{action:'skill-target-sync-preview',id,agents}),result=>{
      if(result.errors.length){modal('Preview skill sync',formatSync(result),'Close',async()=>{});return}
      const names=clients.filter(client=>agents.includes(client.id)).map(client=>client.name).join(', ');
      const summary=id+'\n'+names+'\n\n'+formatSync(result)+'\n\n'+
        tr('Agents with native shared-library support already see this skill; no extra link is created.');
      modal('Confirm skill sync',summary,'Synchronize',async()=>{
        const applied=await request('/api/action',{action:'skill-target-sync-apply',id,agents,approved:true,previewToken:result.previewToken});
        if(applied.errors.length)throw Error('Skill sync returned errors.');
        showToast('Selected skill agents synchronized');await refresh();
      });
    });
  };
  buttons.append(cancel,next);box.append(list,buttons);showDialog(bg,box,cancel);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
function managedMcpClientDialog(id,provision){
  const clients=(centerState?.clients||[]).filter(x=>x.installed&&x.status!=='corrupted');
  if(!clients.length){showToast('No healthy MCP client detected.',true);return}
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(node('h2',provision?'Configure '+id:'Synchronize '+id),
    node('p',provision?'This creates a reviewed MCP command in the shared manifest. A separate confirmation will be needed to synchronize clients.':
      'Add this configured MCP server only to the clients you select. Existing unrelated MCP entries are preserved.','copy'));
  const list=node('div',null,'checkbox-list');
  clients.forEach(client=>{const label=node('label',null,'check'),choice=node('input');
    choice.type='checkbox';choice.value=client.id;
    choice.checked=false;
    label.append(choice,rawNode('span',client.name));list.append(label)});
  box.append(node('h3','Target clients'),list);
  let roots=null;
  if(provision&&(id==='filesystem'||id==='git')){
    roots=mcpField(id==='git'?'Git repository (absolute directory)':'Allowed filesystem directories (one per line)');
    if(id==='filesystem'){
      const textarea=node('textarea');textarea.className='field';textarea.rows=3;textarea.setAttribute('aria-label','Allowed filesystem directories');
      roots.wrapper.replaceChild(textarea,roots.input);roots.input=textarea;
    }
    box.append(roots.wrapper);
  }
  const message=node('p','','subtle');message.setAttribute('role','alert');
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),next=node('button','Preview','btn primary');
  cancel.onclick=closeDialog;
  next.onclick=async()=>{
    const agents=[...list.querySelectorAll('input:checked')].map(x=>x.value);
    const dirs=roots?roots.input.value.split('\n').map(x=>x.trim()).filter(Boolean):[];
    if(!agents.length){message.textContent='Choose at least one client.';return}
    next.disabled=true;box.setAttribute('aria-busy','true');
    const page=activePage,nav=navigationGeneration;
    const current=()=>box.isConnected&&activePage===page&&navigationGeneration===nav;
    try{
      if(provision){
        const proposal=await request('/api/action',{action:'mcp-provision-preview',id,agents,roots:dirs});
        if(!current())return;
        unmountDialog();
        modal('Confirm MCP configuration',id+' · '+agents.length+' clients · '+dirs.length+' allowed directories.\nThe package remains inactive until you run an explicit MCP sync.','Configure',async()=>{
          await request('/api/action',{action:'mcp-provision-apply',id,agents,roots:dirs,
            expectedRevision:proposal.plan.expectedRevision,approved:true});
          showToast('MCP '+id+' configured. Synchronize it from the catalog.');await refresh()
        },undefined,()=>openToolDetails('mcp',id));
      }else{
        const result=await request('/api/action',{action:'mcp-target-sync-preview',id,agents});
        if(!current())return;
        if(result.errors.length)throw Error('Preview reported errors; apply is blocked.');
        unmountDialog();
        modal('Confirm targeted MCP sync',formatSync(result),'Synchronize',async()=>{
          const applied=await request('/api/action',{action:'mcp-target-sync-apply',id,agents,approved:true,
            previewToken:result.previewToken});
          if(applied.errors.length)throw Error('MCP sync returned errors.');
          showToast('Selected MCP clients synchronized');await refresh()
        });
      }
    }catch(err){if(current()){message.textContent=err.message;translateUI()}}
    finally{if(box.isConnected){next.disabled=false;box.removeAttribute('aria-busy')}}
  };
  buttons.append(cancel,next);box.append(message,buttons);showDialog(bg,box,next);
  bg.onclick=e=>{if(e.target===bg)closeDialog()}
}
async function previewMcpPackage(op,id){
  const title=op==='uninstall'?'Uninstall MCP':op==='repair'?'Repair MCP':op==='update'?'Update MCP':'Install MCP';
  await prepareCatalogPreview(title+' · '+id,
    ()=>request('/api/mcp-package-preview?op='+encodeURIComponent(op)+'&id='+encodeURIComponent(id)),result=>{
    const p=result.plan;
    const description=['Package: '+p.packageName,'Operation: '+op,
      'From: '+(p.previousVersion||'not installed'),'Reviewed: '+p.reviewedVersion,
      'Risk level: '+p.risk,'Requirements: '+p.requirements.join(', '),
      '', 'Only the reviewed package is managed in an isolated local folder.',
      'Existing MCP client configurations are not modified by this operation.',
      'Review upstream code and permissions before activation.'];
    if(p.referencedBy&&p.referencedBy.length)description.push('','WARNING: still referenced by '+p.referencedBy.join(', ')+'.',
      'After uninstalling, those entries will point to a missing program and the server will fail to start.',
      'Remove or re-point them first (MCP editor for the central manifest; native entries in each client).');
    const text=description.join('\n');
    modal(title+' · '+id,text,title.split(' ')[0],async()=>{
      await request('/api/action',{action:'mcp-package-apply',id,operation:op,expectedRevision:p.revision,approved:true});
      showToast('MCP package '+id+' '+op+' completed');await refresh();
    },op==='uninstall'?id:undefined,op==='uninstall'?undefined:()=>openToolDetails('mcp',id));
  });
}
async function previewSkill(op,id){
  const action=op==='install'?'Install':op==='update'?'Update':'Uninstall';
  await prepareCatalogPreview(action+' '+id,()=>request('/api/preview?op='+encodeURIComponent(op)+'&id='+encodeURIComponent(id)),preview=>{
    const payload=preview.preview;
    const lines=op==='update'?['From: '+short(payload.previousCommit),'To: '+short(payload.proposedCommit),
      'Added: '+payload.added.length,'Changed: '+payload.changed.length,'Removed: '+payload.removed.length]:
      ['Commit: '+short(payload.commit),'Files: '+payload.files.length,'Bytes: '+payload.totalBytes];
    modal(action+' '+id,lines.join('\n')+'\n\nThe operation will revalidate local files and create a recovery snapshot where supported. No third-party scripts are executed.',action,async()=>{
      await request('/api/action',{action:op,id,approved:true});
      showToast(id+' '+(op==='install'?'installed':op==='update'?'updated':'uninstalled'));await refresh();
    },op==='uninstall'?id:undefined,op==='uninstall'?undefined:()=>openToolDetails('skill',id));
  });
}
function agentCard(a){const e=node('div',null,'agent-card');const h=node('div',null,'head');h.append(rawNode('h3',a.name),labelStatus(a.installed?'installed':'not found'));e.append(h);if(a.installed)e.append(node('p',a.linkedSkills.length+' linked · '+a.localPhysicalSkills.length+' local skills · '+a.mcpServers.length+' MCP servers'));return e}
function renderAgents(){clear($('agents-grid'));const agents=state.inventory.agents;const absent=agents.filter(a=>!a.installed);agents.filter(a=>a.installed).forEach(a=>$('agents-grid').append(agentCard(a)));const holder=$('agents-absent');clear(holder);holder.hidden=!absent.length;if(absent.length){const d=node('details');const sum=node('summary');sum.append(node('span','Supported agents not detected'),document.createTextNode(' ('+absent.length+')'));const grid=node('div',null,'agents-grid');absent.forEach(a=>grid.append(agentCard(a)));d.append(sum,grid);holder.append(d)}const select=$('profile-agent');const was=selectedAgent;clear(select);agents.filter(a=>a.installed).forEach(a=>{const op=rawNode('option',a.name);op.value=a.id;select.append(op)});selectedAgent=agents.some(a=>a.id===was&&a.installed)?was:(select.options[0]?.value||'');select.value=selectedAgent;renderProfileEditor()}
function renderMcp(){
  const target=$('mcp-items');clear(target);
  if(!mcpState){target.append(node('div','MCP editor unavailable. Check the manifest, then Refresh.','empty'));return}
  if(!mcpState.servers.length){target.append(node('div','No shared MCP servers. Add a server to begin.','empty'));return}
  mcpState.servers.forEach(s=>{
    const buttons=node('div',null,'actions');
    const edit=node('button','Routing…','btn small');edit.dataset.focusKey='mcp-routing:'+s.name;edit.setAttribute('aria-label','Edit routing for '+s.name);edit.onclick=()=>mcpDialog('configure',s);
    const remove=node('button','Remove…','btn danger small');remove.dataset.focusKey='mcp-remove:'+s.name;remove.setAttribute('aria-label','Remove MCP server '+s.name);remove.onclick=()=>mcpChange({operation:'delete',name:s.name});
    buttons.append(edit,remove);
    const element=row(s.name,s.transport+' · '+(s.enabled?'Enabled':'Disabled')+' · '+s.argsCount+' args · '+s.envKeyCount+' env keys'+(s.hasOverrides?' · overrides preserved':''),buttons);element.querySelector('strong').dataset.noI18n='true';target.append(element);
  })
}
function mcpField(label,value=''){
  const wrapper=node('label',null,'check'),caption=node('span',label,'subtle'),input=node('input');
  input.className='field';input.value=value;
  wrapper.append(caption,input);return {wrapper,input}
}
function mcpAgentPicker(label,selected=[]){
  const wrap=node('div'),list=node('div',null,'checkbox-list');wrap.append(node('h3',label),list);
  mcpState.agents.forEach(a=>{const row=node('label',null,'check'),input=node('input');
    input.type='checkbox';input.value=a.id;input.checked=selected.includes(a.id);
    row.append(input,rawNode('span',a.name));list.append(row)});
  return {wrap,get:()=>[...list.querySelectorAll('input:checked')].map(x=>x.value)}
}
async function mcpChange(payload,editor=null){
  const page=activePage,navAtStart=navigationGeneration;
  const stillCurrent=()=>activePage===page&&navigationGeneration===navAtStart;
  if(editor){
    if(editor.box.getAttribute('aria-busy')==='true')return;
    editor.box.setAttribute('aria-busy','true');
    editor.preview.disabled=true;editor.cancel.disabled=true;
    editor.error.textContent='';editor.error.classList.add('hidden');
  }
  try{
    const revision=mcpState.revision;
    const preview=await request('/api/action',{action:'mcp-preview',...payload,expectedRevision:revision});
    if(!stillCurrent()||(editor&&!editor.box.isConnected))return;
    const p=preview.plan;
    modal('Confirm MCP '+p.operation,p.name+' · '+(p.changed?'Create a recovery snapshot and write the updated manifest.':'No changes.')+'\nAgent configuration synchronization remains a separate explicit action.','Apply change',async()=>{
      const result=await request('/api/action',{action:'mcp-apply',...payload,expectedRevision:p.expectedRevision,approved:true});
      showToast(p.name+' saved. Snapshot: '+(result.result.snapshotId||'not needed'));await refresh()
    },p.operation==='delete'?p.name:undefined);
  }catch(err){
    if(!stillCurrent())return;
    if(editor&&editor.box.isConnected){
      editor.error.textContent=err instanceof Error?err.message:'Operation failed.';
      editor.error.classList.remove('hidden');
      translateUI();editor.error.focus({preventScroll:true});
    }else showToast(err.message,true);
  }finally{
    if(editor&&editor.box.isConnected){
      editor.preview.disabled=false;editor.cancel.disabled=false;
      editor.box.removeAttribute('aria-busy');
    }
  }
}
function mcpDialog(operation,server){
  if(!mcpState)return;
  const root=$('modal-root');clear(root);
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.setAttribute('aria-label',operation==='create'?'Add MCP server':'Edit MCP routing');
  box.append(node('h2',operation==='create'?'New MCP server':'Routing: '+server.name));
  box.append(node('p',operation==='create'?'Do not paste tokens in commands or URLs. Use environment references in the central manifest for secrets.':'Existing commands, secrets and custom options are preserved. Only agent routing can change.','copy'));
  const name=mcpField('Server ID',server?.name||'');box.append(name.wrapper);
  if(operation==='configure')name.input.disabled=true;
  let transport,command,args,url;
  if(operation==='create'){
    const transportRow=node('label',null,'check');
    transport=node('select');transport.className='field';
    ['stdio','http','sse'].forEach(v=>{const opt=node('option',v);opt.value=v;transport.append(opt)});
    transportRow.append(node('span','Transport','subtle'),transport);box.append(transportRow);
    command=mcpField('Executable','npx');args=mcpField('Arguments (one per line)','');
    url=mcpField('HTTP(S) endpoint','https://');
    box.append(command.wrapper,args.wrapper,url.wrapper);
    const toggle=()=>{const isLocal=transport.value==='stdio';command.wrapper.classList.toggle('hidden',!isLocal);args.wrapper.classList.toggle('hidden',!isLocal);url.wrapper.classList.toggle('hidden',isLocal)};
    transport.onchange=toggle;toggle()
  }
  const enabledRow=node('label',null,'check'),enabled=node('input');
  enabled.type='checkbox';enabled.checked=server?.enabled!==false;
  enabledRow.append(enabled,node('span','Enabled'));box.append(enabledRow);
  const include=mcpAgentPicker('Include agents (empty = all)',server?.agents||[]),
    exclude=mcpAgentPicker('Exclude agents',server?.excludeAgents||[]);
  box.append(include.wrap,exclude.wrap);
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),preview=node('button','Preview change','btn primary');
  const inlineError=node('p','','subtle hidden');inlineError.setAttribute('role','alert');inlineError.tabIndex=-1;
  buttons.append(cancel,preview);box.append(inlineError,buttons);
  cancel.onclick=()=>{if(box.getAttribute('aria-busy')!=='true')closeDialog()};
  bg.onclick=e=>{if(e.target===bg&&box.getAttribute('aria-busy')!=='true')closeDialog()};
  preview.onclick=()=>{
    const route={agents:include.get(),excludeAgents:exclude.get(),enabled:enabled.checked};
    const payload={operation,name:name.input.value.trim()};
    if(operation==='create'){
      const spec={type:transport.value,...route};
      if(transport.value==='stdio'){spec.command=command.input.value.trim();spec.args=args.input.value.split('\n').map(x=>x.trim()).filter(Boolean)}
      else spec.url=url.input.value.trim();
      payload.spec=spec;
    }else payload.routing=route;
    mcpChange(payload,{box,preview,cancel,error:inlineError});
  };
  showDialog(bg,box,name.input.disabled?cancel:name.input)
}
function readSelections(container){return [...container.querySelectorAll('input[type="checkbox"]:checked')].map(e=>e.value)}
function choicesInto(container,items,selected){clear(container);if(!items.length){container.append(node('p','Nothing available yet.','dim'));return}items.forEach(item=>{const row=node('label',null,'check');const input=node('input');input.type='checkbox';input.value=item.id;input.dataset.focusKey='profile:'+container.id+':'+item.id;input.checked=selected.includes(item.id);row.append(input,rawNode('span',item.label));container.append(row)})}
function renderProfileEditor(){if(!state)return;const saved=state.profiles.profiles[selectedAgent]||{skills:[],categories:[]};const draft=profileDrafts[selectedAgent]||(profileDrafts[selectedAgent]={skills:[...saved.skills],categories:[...saved.categories]});const query=$('profile-skill-search').value.toLowerCase().trim();choicesInto($('profile-skills'),state.inventory.centralSkills.filter(id=>!query||id.toLowerCase().includes(query)).map(id=>({id,label:id})),draft.skills);choicesInto($('profile-categories'),state.categories.map(c=>({id:c.id,label:c.label})),draft.categories);for(const [container,key] of [[$('profile-skills'),'skills'],[$('profile-categories'),'categories']]){container.querySelectorAll('input[type="checkbox"]').forEach(check=>check.addEventListener('change',()=>{const all=new Set(draft[key]);if(check.checked)all.add(check.value);else all.delete(check.value);draft[key]=[...all].sort()}))}const nativeAgent=(state.inventory.agents||[]).find(a=>a.id===selectedAgent);$('profile-native-note').classList.toggle('hidden',!nativeAgent?.readsCentralSkills);$('profile-save').disabled=!selectedAgent||profileSavePending;$('profile-clear').disabled=profileSavePending||!state.profiles.profiles[selectedAgent]}
function formatSync(r){const lines=['Mode: '+(r.dryRun?'PREVIEW':'APPLIED'),'Agents: '+r.detectedAgentsCount,'Skill operations: '+r.skillResults.length,'MCP operations: '+r.mcpResults.length,'Snapshot: '+(r.snapshotId||'none')];r.skillResults.forEach(s=>{if(s.action!=='already-synced')lines.push('['+s.agentId+'] '+s.skillName+': '+s.action)});r.mcpResults.forEach(s=>lines.push('['+s.agentId+'] '+s.serverName+': '+s.action));r.errors.forEach(e=>lines.push('ERROR: '+e));if(!r.skillResults.length&&!r.errors.length)lines.push('No skill changes proposed.');return lines.join('\n')}
function showSync(r){const p=$('sync-report');p.classList.remove('hidden');p.textContent=formatSync(r)}
function renderIntegrity(){
  const host=$('integrity-items'),summary=$('integrity-summary');
  clear(host);
  if(!state.integrity.scanned){
    if(summary){summary.classList.add('hidden');clear(summary)}
    host.append(node('div','No managed public-catalog skill installations found.','empty'));
    return;
  }
  const results=state.integrity.results;
  const intactCount=results.filter(r=>r.status==='intact').length;
  const alertCount=results.length-intactCount;
  const severeCount=results.filter(r=>!['intact','unmanaged'].includes(r.status)).length;
  if(summary){
    summary.classList.remove('hidden');
    clear(summary);
    const counts=node('div',null,'integrity-summary-counts');
    counts.append(
      node('strong',results.length+' checked · '+intactCount+' intact · '+alertCount+' alerts'+(severeCount?' · '+severeCount+' modified/unsafe':'')),
      labelStatus(severeCount?'unsafe':alertCount?'untracked':'intact')
    );
    summary.append(counts);
    if(lastIntegrityCheckAt){
      summary.append(node('span','Last checked '+new Date(lastIntegrityCheckAt).toLocaleTimeString(),'subtle'));
    }
  }
  const filtered=results.filter(r=>integrityFilter==='all'?true:integrityFilter==='intact'?r.status==='intact':r.status!=='intact');
  if(!filtered.length){
    host.append(node('div','No matching integrity entries.','empty'));
    return;
  }
  filtered.forEach(r=>{
    const e=row(r.skill,r.checkedFiles+' files checked · '+(r.commit?short(r.commit):'no receipt'),labelStatus(r.status));
    e.querySelector('strong').dataset.noI18n='true';
    host.append(e);
    if(r.issues.length){
      const issues=node('div',r.issues.map(i=>i.type+': '+i.reason+(i.path?' ('+i.path+')':'')).join('\n'),'result-box');
      host.append(issues);
    }
  });
}
function renderBackups(){clear($('backup-items'));if(!state.inventory.backups.length){$('backup-items').append(node('div','No snapshots yet.','empty'));return}state.inventory.backups.forEach(b=>{const btn=node('button','Restore…','btn danger small');btn.dataset.focusKey='restore:'+b.id;btn.setAttribute('aria-label','Restore snapshot '+b.id);btn.onclick=()=>modal('Restore '+b.id,'This replaces managed paths with their historical state. Create a fresh backup first, and verify that this is the intended snapshot.','Restore',async()=>{await request('/api/action',{action:'restore',snapshot:b.id,approved:true});showToast('Snapshot restored');await refresh()},b.id);$('backup-items').append(row(b.id,b.createdAt+' · '+b.reason+' · '+b.entriesCount+' entries',btn))})}
function renderAll(){renderOverview();renderHundredX();renderCatalog();renderAgents();renderMcp();renderMcpCenter();renderXerj();renderIntegrity();renderBackups();translateUI()}
function renderHundredX(){
  const tag=$('hundredx-status-tag'),summary=$('hundredx-summary'),actions=$('hundredx-actions');
  if(!tag||!summary||!actions)return;
  clear(actions);
  if(!hundredxState?.extension){
    tag.textContent='Unavailable';tag.className='tag warn';
    summary.textContent='100x Engineer status unavailable.';
    return;
  }
  const ext=hundredxState.extension;
  const statusText=ext.managed?(ext.healthy?'Installed v'+ext.installedVersion:'Needs repair'):ext.externalAvailable?'External CLI':'Not installed';
  tag.textContent=statusText;
  tag.className='tag '+(ext.healthy?'good':ext.unmanaged||ext.managed?'warn':'');
  const prereq=['Node >=22: '+(ext.prerequisites.node22Plus?'OK':'missing'),'git: '+(ext.prerequisites.git?'OK':'missing'),'Playwright: '+(ext.prerequisites.chromiumCache?'cached':'absent')].join(' · ');
  summary.textContent='Skills: '+ext.skillsInstalled.length+'/13 · Profile: '+ext.config.profile+' · '+prereq;
  const addBtn=(label,cls,fn)=>{const b=node('button',label,'btn small'+(cls?' '+cls:''));b.type='button';b.onclick=fn;actions.append(b)};
  if(!ext.managed&&!ext.unmanaged){
    addBtn('Install 100x','primary',()=>previewHundredXOp('install'));
  }else if(ext.managed){
    if(!ext.healthy)addBtn('Repair','primary',()=>previewHundredXOp('repair'));
    else if(ext.updateAvailable)addBtn('Update','primary',()=>previewHundredXOp('update'));
    addBtn('Uninstall','danger',()=>previewHundredXOp('uninstall'));
  }
  if(ext.skillsInstalled.length>0)addBtn('Sync skills','primary',()=>hundredxSyncDialog());
  addBtn('Configure profile','',()=>hundredxConfigDialog());
  addBtn('Modes (13)','ghost',()=>hundredxModesDialog());
}
async function previewHundredXOp(op){
  const title=(op==='uninstall'?'Uninstall':op==='repair'?'Repair':op==='update'?'Update':'Install')+' 100x Engineer';
  await prepareCatalogPreview(title,()=>request('/api/100x-preview?op='+encodeURIComponent(op)+'&skills=1'),result=>{
    const p=result.plan;
    const lines=['Package: 100x-engineer-skill v'+p.version,'Commit: '+short(p.commit),'SHA-256: '+short(p.tarballSha256),
      op==='uninstall'?'Skills to remove: '+p.skillsToRemove.length:'Skills to stage: '+p.skillsToStage.length];
    if(p.linkedClients&&p.linkedClients.length)lines.push('Linked clients: '+p.linkedClients.join(', '));
    modal(title,lines.join('\n')+'\n\nNo third-party install scripts are executed; a backup snapshot is created first.',title.split(' ')[0],async()=>{
      await request('/api/action',{action:'100x-apply',operation:op,expectedRevision:p.revision,includeSkills:true,approved:true});
      showToast('100x '+op+' completed');await refresh();
    },op==='uninstall'?'100x':undefined);
  });
}
function hundredxModesDialog(){
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(node('h2','100x Engineer · modes'));
  const list=node('div');
  for(const m of (hundredxState?.extension?.modes||[])){
    list.append(row(m.id+' ['+m.kind+']',m.summary+(m.requiresSecondModel?' · second model':''),null));
  }
  box.append(list);
  const buttons=node('div',null,'modal-buttons'),close=node('button','Close','btn');
  close.onclick=closeDialog;buttons.append(close);box.append(buttons);showDialog(bg,box,close);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
function hundredxConfigDialog(){
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(node('h2','Configure 100x profile'));
  const ext=hundredxState?.extension;
  const selWrap=node('label',null,'check'),sel=node('select');sel.className='field';
  for(const p of (hundredxState?.profiles||[{id:'lite',label:'Lite'},{id:'standard',label:'Standard'},{id:'deep',label:'Deep'}])){
    const o=rawNode('option',p.label+' — '+p.usage);o.value=p.id;sel.append(o);
  }
  sel.value=['lite','standard','deep'].includes(ext?.config?.profile)?ext.config.profile:'lite';
  selWrap.append(node('span','Execution profile','subtle'),sel);box.append(selWrap);
  const revRow=node('label',null,'check'),revCheck=node('input');revCheck.type='checkbox';revCheck.checked=ext?.config?.reviewEnabled!==false;
  revRow.append(revCheck,node('span','Enable second-model review (when configured)'));box.append(revRow);
  const verRow=node('label',null,'check'),verCheck=node('input');verCheck.type='checkbox';verCheck.checked=ext?.config?.verifyEnabled!==false;
  verRow.append(verCheck,node('span','Enable formal property verification'));box.append(verRow);
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),next=node('button','Preview','btn primary');
  cancel.onclick=closeDialog;
  next.onclick=async()=>{
    const profile=sel.value,reviewEnabled=revCheck.checked,verifyEnabled=verCheck.checked;
    try{
      const preview=(await request('/api/action',{action:'100x-configure-preview',profile,reviewEnabled,verifyEnabled})).plan;
      unmountDialog();
      modal('Confirm 100x configuration','Profile: '+profile+'\nChanged: '+(preview.changed?'yes':'no')+'\nA backup snapshot is created before writing global 100x config.','Apply',async()=>{
        await request('/api/action',{action:'100x-configure-apply',profile,reviewEnabled,verifyEnabled,expectedRevision:preview.revision,approved:true});
        showToast('100x profile saved');await refresh();
      });
    }catch(err){showToast(err.message,true)}
  };
  buttons.append(cancel,next);box.append(buttons);showDialog(bg,box,sel);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
function hundredxSyncDialog(){
  const clients=(state.inventory.agents||[]).filter(agent=>agent.installed&&agent.skillsSupported);
  if(!clients.length){showToast('No compatible skill agent detected.',true);return}
  const bg=node('div',null,'modal-backdrop'),box=node('section',null,'modal');
  box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.append(node('h2','Sync 100x skills to clients'),node('p','Select agents to receive the installed 100x skills.','copy'));
  const list=node('div',null,'checkbox-list');
  for(const agent of clients){
    const label=node('label',null,'check'),choice=node('input');
    choice.type='checkbox';choice.value=agent.id;
    label.append(choice,rawNode('span',agent.name));list.append(label);
  }
  const buttons=node('div',null,'modal-buttons'),cancel=node('button','Cancel','btn'),next=node('button','Preview','btn primary');
  next.disabled=true;list.onchange=()=>{next.disabled=!list.querySelector('input:checked')};
  cancel.onclick=closeDialog;
  next.onclick=()=>{
    const agents=[...list.querySelectorAll('input:checked')].map(i=>i.value);
    prepareCatalogPreview('Preview 100x skill sync',()=>request('/api/action',{action:'100x-sync-preview',agents}),result=>{
      modal('Confirm 100x skill sync',formatSync(result),'Synchronize',async()=>{
        const applied=await request('/api/action',{action:'100x-sync-apply',agents,approved:true,previewToken:result.previewToken});
        if(applied.errors.length)throw Error('Skill sync returned errors.');
        showToast('100x skills synchronized');await refresh();
      });
    });
  };
  buttons.append(cancel,next);box.append(list,buttons);showDialog(bg,box,cancel);
  bg.onclick=e=>{if(e.target===bg)closeDialog()};
}
let refreshGeneration=0;
async function refresh(announce=false){
  const generation=++refreshGeneration;
  const verifyBtn=$('verify-again'),refreshBtn=$('refresh');
  if(announce){
    $('workspace-status').textContent='Refreshing local workspace…';
    if(verifyBtn)verifyBtn.setAttribute('aria-busy','true');
    if(refreshBtn)refreshBtn.setAttribute('aria-busy','true');
    translateUI();
  }
  try{
    const nextState=await request('/api/state');
    let nextMcp=null,nextCenter=null,nextPackages=null,nextXerj=null,nextHundredX=null,mcpError=null;
    try{nextPackages=await request('/api/mcp-packages')}catch(err){mcpError=err}
    try{nextMcp=await request('/api/mcp')}catch(err){mcpError=err}
    try{nextCenter=await request('/api/mcp-center')}catch(err){mcpError=mcpError||err}
    try{nextXerj=await request('/api/xerj')}catch(err){mcpError=mcpError||err}
    try{nextHundredX=await request('/api/100x')}catch{/* non-fatal */}
    if(generation!==refreshGeneration)return; // An older response must never replace newer state.
    state=nextState;mcpState=nextMcp;centerState=nextCenter;packagesState=nextPackages;xerjState=nextXerj;hundredxState=nextHundredX;
    lastIntegrityCheckAt=Date.now();
    const focused=document.activeElement;
    const focusedInDynamic=!!focused?.closest('#catalog-cards,#mcp-items,#backup-items,#profile-skills,#profile-categories');
    const focusKey=focusedInDynamic?focused?.dataset?.focusKey:null;
    // A read-only refresh never discards unsaved profile selections.
    renderAll();
    if(focusedInDynamic&&!focused.isConnected){
      const replacement=focusByKey(focusKey);
      if(replacement)replacement.focus({preventScroll:true});else focusCurrentPage();
    }
    if(mcpError)showToast(mcpError.message,true);
    if(state.warnings?.length)showToast(state.warnings[0],true);
    if(announce){
      $('workspace-status').textContent=mcpError?'Workspace refreshed; MCP status unavailable.':'Workspace and integrity results updated.';
      if(!mcpError&&!state.warnings?.length){
        if(activePage==='integrity'){
          const res=state.integrity?.results||[];
          const intact=res.filter(r=>r.status==='intact').length;
          showToast('Integrity check completed: '+intact+' intact · '+(res.length-intact)+' alerts');
        }else{
          showToast('Workspace and integrity results updated.');
        }
      }
      translateUI();
    }
  }catch(err){
    if(generation!==refreshGeneration)return;
    $('overview-signal').classList.add('needs-attention');
    $('overview-signal-title').textContent='Workspace refresh unavailable';
    $('overview-signal-detail').textContent='The displayed inventory may be stale. Retry refresh to verify local state.';
    showToast(err.message,true);
    translateUI();
    if(announce){$('workspace-status').textContent='Workspace refresh failed.';translateUI()}
  }finally{
    if(generation===refreshGeneration){
      if(verifyBtn)verifyBtn.removeAttribute('aria-busy');
      if(refreshBtn)refreshBtn.removeAttribute('aria-busy');
    }
  }
}
$('language-select').onchange=e=>setLanguage(e.target.value);
$('refresh').onclick=()=>refresh(true);
$('extension-check').onclick=async()=>{
  await refresh(true);
  const n=(packagesState?.items||[]).filter(x=>x.updateAvailable).length+state.integrity.results.filter(x=>x.status==='intact'&&state.catalog.some(s=>s.id===x.skill&&s.ref!==x.commit)).length;
  showToast(n?n+' reviewed update(s) available':'No reviewed catalog updates available');
};
$('mcp-add').onclick=()=>mcpDialog('create');
$('catalog-search').oninput=filterCatalog;$('catalog-category').onchange=filterCatalog;$('catalog-status').onchange=filterCatalog;
$('catalog-reset').onclick=resetCatalog;
document.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{
  catalogKind=button.dataset.kind;$('catalog-category').value='';
  document.querySelectorAll('[data-kind]').forEach(tab=>{
    const active=tab===button;tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
  });
  filterCatalog();
});
$('profile-agent').onchange=e=>{selectedAgent=e.target.value;$('profile-skill-search').value='';renderProfileEditor()};
$('profile-skill-search').oninput=renderProfileEditor;
$('profile-save').onclick=async()=>{
  const agent=selectedAgent;
  if(!agent||profileSavePending)return;
  profileSavePending=true;
  const draft=profileDrafts[agent]||{skills:[],categories:[]};
  // Capture immutable values at click time: switching agents while HTTP is in flight
  // must never clear another agent's draft or accidentally save later selections.
  const skills=[...draft.skills],categories=[...draft.categories];
  if(!skills.length&&!categories.length){showToast('Choose at least one skill or category.',true);return}
  const button=$('profile-save');button.disabled=true;button.setAttribute('aria-busy','true');
  try{
    await request('/api/action',{action:'profile-save',agent,skills,categories,approved:true});
    if(profileDrafts[agent]===draft&&
       JSON.stringify(draft.skills)===JSON.stringify(skills)&&
       JSON.stringify(draft.categories)===JSON.stringify(categories))delete profileDrafts[agent];
    showToast('Profile saved (not synced)');await refresh()
  }catch(err){showToast(err.message,true)}
  finally{profileSavePending=false;button.removeAttribute('aria-busy');renderProfileEditor()}
};
$('profile-clear').onclick=()=>{
  const agent=selectedAgent;
  if(!agent||profileSavePending)return;
  modal('Clear profile','This only removes the saved selection; existing links stay untouched.','Clear profile',async()=>{
    await request('/api/action',{action:'profile-clear',agent,approved:true});
    delete profileDrafts[agent];showToast('Saved profile cleared');await refresh()
  })
};

function renderXerj(){
  if(!xerjState)return;
  const x=xerjState;
  $('xerj-node-state').textContent=[
    x.binaryAvailable?(x.managed?'Managed binary installed':'Existing binary detected'):'Binary missing · install from Skills & MCP catalog',
    x.reachable?(x.authRequired?'authentication required':x.healthy?'node ready':'node unhealthy'):'node offline',
    x.indices.length+' Agent Commons indices'
  ].join(' · ');
  $('xerj-indices').textContent=x.indices.length?'Indexes: '+x.indices.join(', '):'No local Agent Commons indices detected.';
  $('xerj-start').disabled=!x.binaryAvailable||x.reachable;
  $('xerj-stop').disabled=!x.running;
  $('xerj-index').disabled=!x.healthy||!x.roots.length;
  $('xerj-search').disabled=!x.healthy||!x.roots.length;
  $('xerj-remove').disabled=!x.healthy||!x.roots.length;
  const selected=$('xerj-root').value,select=$('xerj-root');clear(select);
  for(const root of x.roots){const option=node('option',root);option.value=root;select.append(option)}
  if(x.roots.includes(selected))select.value=selected;
  $('xerj-drop-root').disabled=!x.roots.length;
}
function xerjOutput(message){
  const output=$('xerj-output');output.classList.remove('hidden');output.textContent=message;
}
async function xerjRootChange(roots){
  const proposal=await request('/api/action',{action:'xerj-roots-preview',roots,expectedRevision:xerjState.revision});
  modal('Authorize XERJ directory',proposal.after.length+' directories authorized; nothing is indexed automatically.',
    'Save directory permissions',async()=>{
      await request('/api/action',{action:'xerj-roots-apply',roots,expectedRevision:proposal.revision,approved:true});
      xerjOutput('Allowed roots saved. Indexing requires a separate action.');await refresh();
    });
}
$('xerj-add-root').onclick=async()=>{
  try{
    const root=$('xerj-new-root').value.trim();
    if(!root)return;
    await xerjRootChange([...xerjState.roots,root]);
  }catch(err){showToast(err.message,true)}
};
$('xerj-drop-root').onclick=async()=>{
  try{
    const root=$('xerj-root').value;if(!root)return;
    await xerjRootChange(xerjState.roots.filter(r=>r!==root));
  }catch(err){showToast(err.message,true)}
};
$('xerj-start').onclick=()=>modal('Start XERJ local node',
  'Starts an unprivileged XERJ process bound to 127.0.0.1, with data outside indexed projects. No port is opened on the LAN.',
  'Start node',async()=>{await request('/api/action',{action:'xerj-start',approved:true});await refresh()});
$('xerj-stop').onclick=()=>modal('Stop XERJ node',
  'Only the node started in this Agent Commons web session will be stopped.',
  'Stop node',async()=>{await request('/api/action',{action:'xerj-stop',approved:true});await refresh()});
$('xerj-index').onclick=()=>{
  const root=$('xerj-root').value;if(!root)return;
  modal('Index approved directory',root+' · indexing can take several minutes. No other directory will be selected.',
    'Index now',async()=>{
      const r=await request('/api/action',{action:'xerj-index',root,approved:true});
      xerjOutput('Indexed '+r.prefix+(r.completedWithJunk?' · some files were skipped':'')+'.');
      await refresh();
    });
};
$('xerj-search').onclick=async()=>{
  const root=$('xerj-root').value,query=$('xerj-query').value;
  if(!root||!query.trim())return;
  try{
    const r=await request('/api/action',{action:'xerj-search',root,query});
    xerjOutput(r.empty?'No matching passages.':r.results);
  }catch(err){showToast(err.message,true)}
};
$('xerj-remove').onclick=async()=>{
  const root=$('xerj-root').value;if(!root)return;
  try{
    const proposal=await request('/api/action',{action:'xerj-remove-preview',root});
    modal('Delete XERJ index',proposal.preview||('Remove index for '+root),
      'Confirm deletion',async()=>{
        await request('/api/action',{action:'xerj-remove-apply',root,approved:true});
        xerjOutput('Indexed corpus removed; approved directory access remains unchanged.');
        await refresh();
      });
  }catch(err){showToast(err.message,true)}
};

function renderMcpCenter(){
  if(!centerState)return;
  const catalog=$('center-catalog');clear(catalog);
  centerState.catalog.forEach(entry=>{
    const status=entry.configured?'configured':entry.installation==='unavailable'?'not vetted':'reference only';
    const item=row(entry.name,entry.description+' · '+(entry.version||'manual')+' · '+entry.risk+' · '+status,labelStatus(entry.configured?'installed':'untracked'));
    const link=node('a','Official source');link.href=entry.repository;link.rel='noreferrer noopener';link.target='_blank';
    item.append(link);catalog.append(item);
  });
  const clients=$('center-clients');clear(clients);
  centerState.clients.forEach(c=>clients.append(row(c.name,(c.installed?c.servers.length+' native MCP':'not detected')+' · '+(c.status==='valid'?'config valid, not started':c.status),
    labelStatus(c.status==='corrupted'?'unsafe':c.installed?'installed':'missing'))));
  const select=$('center-profile'),previous=select.value;clear(select);
  for(const name of [...Object.keys(centerState.presets),...Object.keys(centerState.profiles.data.profiles)]){
    const option=node('option',name);option.value=name;select.append(option);
  }
  select.value=[...select.options].some(o=>o.value===previous)?previous:(select.options[0]?.value||'');
  const servers=$('center-servers');clear(servers);
  centerState.centralNames.forEach(name=>{
    const label=node('label',null,'check'),input=node('input');input.type='checkbox';input.value=name;input.className='center-server-check';
    label.append(input,rawNode('span',name));servers.append(label);
  });
  renderCenterTargets();
  translateUI();
}
function centerTargets(){return [...$('center-agents').querySelectorAll('input:checked')].map(input=>input.value)}
function centerServers(){return [...$('center-servers').querySelectorAll('input:checked')].map(input=>input.value)}
function renderCenterTargets(){
  if(!centerState)return;
  const profile=$('center-profile').value;
  const selected=centerState.profiles.data.profiles[profile]?.agents||[];
  const custom=centerState.profiles.data.profiles[profile];
  $('center-custom-name').value=custom?profile:'';
  $('center-custom-delete').disabled=!custom;
  document.querySelectorAll('.center-server-check').forEach(input=>input.checked=!!custom?.servers.includes(input.value));
  const target=$('center-agents');clear(target);
  centerState.clients.filter(c=>c.installed).forEach(client=>{
    const label=node('label',null,'check'),input=node('input');input.type='checkbox';input.value=client.id;
    input.checked=selected.includes(client.id);
    label.append(input,rawNode('span',client.name));target.append(label);
  });
  translateUI();
}
async function centerSync(apply){
  const name=$('center-profile').value,agents=centerTargets();
  if(!name||!agents.length){showToast('Select at least one MCP client.',true);return}
  try{
    const preview=await request('/api/action',{action:'mcp-profile-sync-preview',name,agents});
    const report=$('center-report');report.classList.remove('hidden');report.textContent=formatSync(preview);
    if(!apply)return;
    if(preview.errors.length){showToast('Preview reported errors; apply is blocked.',true);return}
    modal('Apply MCP profile',name+' · '+preview.mcpResults.length+' MCP operations. Existing native servers are preserved.',
      'Apply MCP sync',async()=>{
        const result=await request('/api/action',{action:'mcp-profile-sync-apply',name,agents,approved:true,previewToken:preview.previewToken});
        report.textContent=formatSync(result);
        if(result.errors.length)throw Error('MCP sync returned errors.');
        showToast('MCP profile synchronized');await refresh();
      },'SYNC');
  }catch(err){showToast(err.message,true)}
}
$('center-profile').onchange=renderCenterTargets;
$('center-sync-preview').onclick=()=>centerSync(false);
$('center-sync-apply').onclick=()=>centerSync(true);
$('center-custom-delete').onclick=()=>{
  const name=$('center-profile').value;
  if(!centerState.profiles.data.profiles[name])return;
  const revision=centerState.profiles.revision;
  modal('Delete MCP profile',name+' · Existing client MCP entries are preserved.',
    'Delete profile',async()=>{
      await request('/api/action',{action:'mcp-profile-delete',name,approved:true,expectedRevision:revision});
      showToast('Profile removed');await refresh();
    },name);
};
$('center-custom-save').onclick=async()=>{
  const name=$('center-custom-name').value.trim(),agents=centerTargets(),servers=centerServers();
  if(!name||!agents.length||!servers.length){showToast('Select a name, clients and central servers.',true);return}
  try{
    const preview=(await request('/api/action',{action:'mcp-profile-preview',name,agents,servers})).plan;
    modal('Save MCP profile',name+' · '+servers.length+' allowed servers · '+agents.length+' clients. No client files change now.',
      'Save profile',async()=>{
        await request('/api/action',{action:'mcp-profile-save',name,agents,servers,approved:true,expectedRevision:preview.revision});
        showToast('MCP profile saved');await refresh();
      });
  }catch(err){showToast(err.message,true)}
};

let syncPreviewGeneration=0,fullSyncPreviewGeneration=0;
async function guardedPreview(button,kind,run){
  if(button.disabled)return;
  const generation=kind==='full'?++fullSyncPreviewGeneration:++syncPreviewGeneration;
  const page=activePage,nav=navigationGeneration;
  const current=()=>activePage===page&&navigationGeneration===nav&&
    generation===(kind==='full'?fullSyncPreviewGeneration:syncPreviewGeneration);
  button.disabled=true;button.setAttribute('aria-busy','true');
  try{await run(current)}catch(err){if(current())showToast(err.message,true)}
  finally{button.disabled=false;button.removeAttribute('aria-busy')}
}
$('sync-preview').onclick=()=>guardedPreview($('sync-preview'),'skills',async current=>{
  const r=await request('/api/action',{action:'sync-preview'});if(current())showSync(r)
});
$('sync-apply').onclick=()=>guardedPreview($('sync-apply'),'skills',async current=>{
  const p=await request('/api/action',{action:'sync-preview'});if(!current())return;
  showSync(p);if(p.errors.length)throw Error('Preview reported errors; apply is blocked.');
  modal('Apply saved profiles','Preview: '+p.skillResults.length+' skill result(s). Synchronization changes agent skill links and creates a recovery snapshot when needed. MCP configurations remain untouched.','Apply sync',async()=>{
    const r=await request('/api/action',{action:'sync-apply',approved:true,previewToken:p.previewToken});showSync(r);
    if(r.errors.length)throw Error('Sync returned errors: '+r.errors.join('; '));
    showToast('Profiles synchronized');await refresh()
  },'SYNC')
});
$('doctor-run').onclick=async()=>{try{const r=await request('/api/doctor');const p=$('doctor-report');p.classList.remove('hidden');p.textContent=['Health: '+(r.healthy?'OK':'Attention'),'Link capability: '+(r.linkCapabilityVerified?'OK':'Failed'),'Central MCP: '+r.centralMcpStatus,...r.issues,...(r.warnings||[]).map(w=>'Warning: '+w),...r.agents.filter(a=>a.installed&&a.skillMetadataTokens).map(a=>a.name+': ~'+a.skillMetadataTokens+' tokens of skill metadata per session'),'MCP servers are not started here; run "agent-commons mcp probe" to test them.'].join('\n')||'No issues';}catch(err){showToast(err.message,true)}};
$('full-sync-preview').onclick=()=>guardedPreview($('full-sync-preview'),'full',async current=>{
  const r=await request('/api/action',{action:'sync-all-preview'});if(!current())return;
  const report=$('full-sync-report');report.classList.remove('hidden');report.textContent=formatSync(r)
});
$('full-sync-apply').onclick=()=>guardedPreview($('full-sync-apply'),'full',async current=>{
  const p=await request('/api/action',{action:'sync-all-preview'});if(!current())return;
  const report=$('full-sync-report');report.classList.remove('hidden');report.textContent=formatSync(p);
  if(p.errors.length)throw Error('Preview reported errors.');
  modal('Synchronize skills + MCP','This changes compatible agent skill links and merges MCP server entries. A recovery snapshot is created when there are changes. Conflicts are preserved.','Apply full sync',async()=>{
    const result=await request('/api/action',{action:'sync-all-apply',approved:true,previewToken:p.previewToken});
    report.textContent=formatSync(result);
    if(result.errors.length)throw Error('Full sync returned errors: '+result.errors.join('; '));
    showToast('Full synchronization completed');await refresh()
  },'SYNC ALL')
});
$('verify-again').onclick=()=>refresh(true);
document.querySelectorAll('[data-int-filter]').forEach(btn=>btn.onclick=()=>{
  integrityFilter=btn.dataset.intFilter;
  document.querySelectorAll('[data-int-filter]').forEach(tab=>{
    const active=tab===btn;tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active));
  });
  if(state){renderIntegrity();translateUI();}
});
$('backup-create').onclick=()=>modal('Create full backup','Capture agent skill and MCP state now. This may take a moment on large local libraries.','Create backup',async()=>{const r=await request('/api/action',{action:'backup',approved:true});showToast('Backup created: '+r.id);await refresh()});
try{language=localStorage.getItem('agent-commons-ui-language')||'en'}catch{language='en'}
setLanguage(language);
refresh();
__COMMAND_JS__
__MISSION_JS__
</script></body></html>`;
