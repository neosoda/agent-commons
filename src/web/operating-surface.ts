/** Presentation-only design tokens and layout overrides for the local web UI. */
export const OPERATING_SURFACE_STYLES = String.raw`/**
 * Agent Commons / Operating Surface
 * A deliberately utilitarian, editorial interface: graphite, porcelain and
 * vermilion signal. No fonts, images, CDNs or new runtime dependencies.
 * All components keep the original DOM hooks and safe interaction flows.
 */
:root,
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg:#101214; --panel:#191c1f; --panel2:#222629; --stroke:#363a3c;
  --muted:#a3a9a9; --ink:#f2f1eb; --accent:#fb674a; --mint:#a7cfab;
  --warn:#ecc184; --bad:#f69b91; --radius:3px;
  --surface:#151719; --surface-hover:#272b2c; --surface-raised:#222527;
  --line-strong:#858c8a; --signal-ink:#111315; --code-bg:#111416;
  --soft-signal:rgba(251,103,74,.11);
  font:14px/1.48 "Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
}
:root[data-theme="light"] {
  color-scheme:light;
  --bg:#e9e9e3; --panel:#faf9f4; --panel2:#eeeee8; --stroke:#d2d3cc;
  --muted:#596060; --ink:#191c1c; --accent:#af341b; --mint:#346a48;
  --warn:#825a19; --bad:#a83228;
  --surface:#f4f3ed; --surface-hover:#e8e7df; --surface-raised:#fffefa;
  --line-strong:#747a75; --signal-ink:#fffaf3; --code-bg:#eeeae1;
  --soft-signal:rgba(175,52,27,.09);
}
html {scroll-behavior:smooth;scroll-padding-top:95px}
body {background:var(--bg);color:var(--ink);font-family:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif}
a {color:var(--accent);text-underline-offset:3px}
a:hover {color:var(--ink)}
button, input, textarea, select {font-family:inherit}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,[tabindex]:focus-visible {outline:2px solid var(--accent);outline-offset:3px}
::selection {background:var(--accent);color:var(--signal-ink)}
.layout {grid-template-columns:236px minmax(0,1fr);align-items:start;min-height:100vh}
.sidebar {background:var(--surface);border-right:1px solid var(--stroke);padding:0;position:sticky;top:0;height:100vh;min-height:520px}
.brand {padding:27px 22px 24px;display:flex;align-items:center;gap:12px;font-size:17px;font-weight:790;letter-spacing:-.8px;border-bottom:1px solid var(--stroke)}
.brand-mark {position:relative;background:var(--accent);color:var(--signal-ink);box-shadow:none;border-radius:0;width:35px;height:35px;font:800 15px/1 ui-monospace,"Cascadia Code",monospace;letter-spacing:-2px}
.brand-mark::after {content:"";width:6px;height:6px;position:absolute;right:-4px;top:-4px;background:var(--ink)}
.brand-lockup {display:block;line-height:1.05}
.brand-lockup small {display:block;margin-top:5px;font:650 9px/1.3 ui-monospace,"Cascadia Code",monospace;color:var(--muted);text-transform:uppercase;letter-spacing:1.6px}
.side-label {font:600 10px/1.3 ui-monospace,"Cascadia Code",monospace;color:var(--muted);padding:26px 22px 12px;letter-spacing:1.2px}
.nav {display:grid;gap:1px;padding:0 10px}
.nav button {position:relative;display:flex;gap:11px;align-items:center;border-radius:0;padding:12px 11px;color:var(--muted);font-size:13px;line-height:1.25;font-weight:580;min-height:43px;transition:background .13s,color .13s}
.nav button:hover {background:var(--surface-hover);color:var(--ink)}
.nav button.active {background:var(--surface-hover);color:var(--ink);box-shadow:inset 2px 0 var(--accent);font-weight:730}
.nav button>span:first-child {min-width:25px;display:inline-block;font:600 11px/1.2 ui-monospace,"Cascadia Code",monospace;color:var(--muted);text-align:center}
.nav button.active>span:first-child {color:var(--accent)}
.sidebar-bottom {margin: auto 0 0;border:0;border-top:1px solid var(--stroke);background:transparent;border-radius:0;padding:19px 22px;color:var(--ink);font-size:12px}
.sidebar-bottom .subtle {font:11px/1.45 ui-monospace,"Cascadia Code",monospace;color:var(--muted)}
.status-dot {background:var(--mint);box-shadow:none;border-radius:1px;width:7px;height:7px;margin-right:10px}
.main {padding:0 35px 48px;max-width:1700px;min-width:0}
.top {height:76px;position:sticky;top:0;z-index:12;background:var(--bg);border-bottom:1px solid var(--stroke);margin:0 0 26px;display:flex;gap:16px;align-items:center}
.top .eyebrow {font:650 11px/1.3 ui-monospace,"Cascadia Code",monospace;color:var(--muted);letter-spacing:1.2px}
.top-right {gap:9px;justify-content:flex-end;flex-wrap:nowrap}
.pill {border:0;border-left:1px solid var(--line-strong);color:var(--muted);border-radius:0;font:600 11px/1.3 ui-monospace,"Cascadia Code",monospace;padding:6px 11px}
.field,.lang-select {background:var(--panel);border:1px solid var(--line-strong);color:var(--ink);border-radius:2px;min-width:0;padding:10px 12px;font-size:13px;min-height:39px}
.field::placeholder {color:var(--muted);opacity:1}
.field:hover,.lang-select:hover {border-color:var(--accent)}
.field.search {min-width:240px}
.btn {background:var(--surface-raised);color:var(--ink);border:1px solid var(--line-strong);border-radius:2px;box-shadow:none;padding:9px 14px;min-height:39px;font-size:12px;font-weight:700;letter-spacing:.01em;transition:background .15s,border-color .15s,color .15s}
.btn:hover:not(:disabled) {transform:none;background:var(--surface-hover);border-color:var(--ink);color:var(--ink)}
.btn.primary {background:var(--accent);color:var(--signal-ink);border:1px solid var(--accent);font-weight:790}
.btn.primary:hover:not(:disabled) {background:var(--ink);color:var(--bg);border-color:var(--ink)}
.btn.ghost {background:transparent;border-color:var(--line-strong)}
.btn.danger {color:var(--bad);border-color:var(--bad);background:transparent}
.btn.danger:hover:not(:disabled) {color:var(--bg);background:var(--bad);border-color:var(--bad)}
.btn.small {padding:7px 10px;min-height:36px}
.btn:disabled {opacity:.45}
#global-search-toggle {display:flex;align-items:center;gap:14px;border:1px solid var(--stroke);background:var(--surface);color:var(--muted);font-size:12px;font-weight:600;line-height:1.3;padding:8px 11px;min-height:36px;cursor:pointer;border-radius:2px}
#global-search-toggle:hover {border-color:var(--accent);color:var(--ink)}
.keycap {border:1px solid var(--line-strong);padding:2px 5px;font:10px/1.2 ui-monospace,"Cascadia Code",monospace;white-space:nowrap}
#theme-toggle {min-width:36px;padding:7px 8px;letter-spacing:0}
h1,h2,h3 {color:var(--ink)}
h1 {font-size:clamp(29px,3.3vw,49px);letter-spacing:-2px;line-height:1.04;font-weight:760}
.page > h1,.page .section-head h1 {margin:9px 0 12px}
.page > p.dim {max-width:900px;margin:0 0 24px;font-size:13px;line-height:1.6}
.eyebrow {font:700 10px/1.3 ui-monospace,"Cascadia Code",monospace;letter-spacing:1.5px;color:var(--accent)}
.hero {display:flex;flex-direction:column;justify-content:center;position:relative;background:var(--panel);border:1px solid var(--line-strong);border-radius:2px;padding:26px 32px;box-shadow:none;overflow:hidden}
.hero .eyebrow {z-index:1}
.hero h1 {font-size:clamp(28px,2.6vw,38px);max-width:750px;margin:10px 0 10px;letter-spacing:-1.2px;line-height:1.08;z-index:1}
.hero p {max-width:640px;font-size:14px;line-height:1.6;color:var(--muted);z-index:1;margin-bottom:18px}
.hero .actions {z-index:1}
.metrics {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0 0 32px;background:var(--panel);border:1px solid var(--stroke);border-top:0}
.metric {border:0;border-right:1px solid var(--stroke);border-radius:0;padding:15px 24px 18px;background:transparent;display:flex;flex-direction:column;gap:2px;min-width:0}
.metric:last-child {border-right:0}
.overview-signal {display:flex;justify-content:space-between;align-items:center;gap:20px;margin:-17px 0 30px;padding:18px 21px;background:var(--surface);border:1px solid var(--stroke);border-left:3px solid var(--mint)}
.overview-signal.needs-attention {border-left-color:var(--warn)}
.overview-signal strong {display:block;font-size:14px;font-weight:740;margin:5px 0 2px}
.overview-signal p {margin:0;color:var(--muted);font-size:12px}
.overview-signal .eyebrow {color:var(--muted)}

.metric .value {font:760 clamp(24px,2.5vw,36px)/1.25 "Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;letter-spacing:-1.5px;font-variant-numeric:tabular-nums}
.metric .label {font:650 10px/1.5 ui-monospace,"Cascadia Code",monospace;letter-spacing:.35px;color:var(--muted);text-transform:uppercase}
.panel {border:1px solid var(--stroke);background:var(--panel);border-radius:2px;padding:21px;margin-bottom:15px;min-width:0}
.panel h3 {font-size:15px;letter-spacing:-.3px}
.panel h2 {margin:0 0 14px;font-size:18px}
.panel p,.dim {color:var(--muted)}
.panel p {line-height:1.55}
.split {gap:15px;grid-template-columns:1.05fr 1fr}
.section-head {border-bottom:1px solid var(--stroke);padding-bottom:12px;margin:22px 0 16px}
.section-head h2 {font-size:20px;letter-spacing:-.75px}
.cards {grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--stroke);border:1px solid var(--stroke)}
.skill-card {background:var(--panel);border:0;border-radius:0;padding:20px;gap:10px;min-width:0;transition:background .12s}
.skill-card:hover {background:var(--surface-hover)}
.skill-card h3 {font-size:15px;line-height:1.32;letter-spacing:-.25px;overflow-wrap:anywhere}
.skill-card p {color:var(--muted);font-size:12px;line-height:1.55;min-height:0}
.skill-card .bottom {border-color:var(--stroke);gap:8px;padding-top:12px}
.skill-card .card-meta {color:var(--muted)}
.tag {background:transparent;border:1px solid var(--stroke);border-radius:1px;color:var(--muted);font:600 10px/1.35 ui-monospace,"Cascadia Code",monospace;padding:4px 6px}
.tag.good {color:var(--mint);border-color:var(--mint)}
.tag.bad {color:var(--bad);border-color:var(--bad)}
.tag.warn {color:var(--warn);border-color:var(--warn)}
.catalog-switch {background:transparent;border:0;border-bottom:1px solid var(--stroke);border-radius:0;display:flex;width:100%;padding:0;margin:20px 0 17px;gap:0}
.catalog-switch button {border-radius:0;border-bottom:2px solid transparent;padding:11px 17px;color:var(--muted);background:transparent;font-size:12px;min-height:44px}
.catalog-switch button.active {background:transparent;border-bottom-color:var(--accent);color:var(--ink)}
.catalog-switch button:hover {color:var(--ink)}
.catalog-toolbar {background:var(--panel);border:1px solid var(--stroke);padding:14px 17px 3px;margin:18px 0 0}
.catalog-guide {border-left:2px solid var(--accent);margin:19px 0;padding:7px 0 7px 15px}
.catalog-guide span {color:var(--muted)}
.catalog-results {margin:12px 0}
.catalog-usage,.catalog-prompt {background:var(--surface);border-color:var(--stroke);border-radius:2px}
.catalog-command,.result-box {background:var(--code-bg);color:var(--ink);border:1px solid var(--stroke);border-radius:2px}
.checkbox-list {border-color:var(--stroke);background:var(--surface);border-radius:2px}
.check input {accent-color:var(--accent)}
.agent-card {background:var(--panel);border:1px solid var(--stroke);border-radius:2px}
.row-item {border-color:var(--stroke);padding:11px 0}
.row-item small {color:var(--muted)}
.agents-grid {gap:12px}
.agent-card p {color:var(--muted)}
.agents-absent {margin-top:18px}
.agents-absent summary {cursor:pointer;color:var(--muted);font-size:13px;padding:10px 0;width:max-content;max-width:100%}
.agents-absent summary:hover {color:var(--ink)}
.agents-absent .agents-grid {margin-top:8px}
.agents-absent .agent-card {padding-block:12px}
.extension-steps,.extension-steps li {border-color:var(--stroke)}
.empty,.catalog-empty {border:1px dashed var(--line-strong);border-radius:2px}
.spinner {border-color:var(--line-strong);border-top-color:var(--accent)}
.toast {border-radius:2px;background:var(--panel);color:var(--ink);border:1px solid var(--mint);box-shadow:0 15px 30px #0006}
.toast.error {background:var(--panel);color:var(--bad);border-color:var(--bad)}
.modal-backdrop {background:rgba(0,0,0,.74)}
.modal {background:var(--panel);border:1px solid var(--line-strong);border-radius:2px;box-shadow:0 24px 75px #0009}
.footer {border-top:1px solid var(--stroke);padding-top:17px;color:var(--muted);font:10px/1.6 ui-monospace,"Cascadia Code",monospace}
.skip-link {background:var(--panel);border-color:var(--accent);border-radius:2px;color:var(--ink)}
/* Command palette: local, searchable navigation + actual catalog entries. */
.quick-switcher {position:fixed;inset:0;z-index:45;background:rgba(7,9,10,.78);padding:10vh 16px 20px;display:flex;align-items:flex-start;justify-content:center}
.quick-switcher-dialog {background:var(--panel);border:1px solid var(--line-strong);width:min(660px,100%);box-shadow:0 30px 95px #0009}
.quick-switcher-header {display:flex;gap:13px;align-items:center;border-bottom:1px solid var(--stroke);padding:15px 17px}
.quick-switcher-icon {font:750 17px/1 ui-monospace,"Cascadia Code",monospace;color:var(--accent)}
#quick-switcher-input {flex:1;min-width:0;background:transparent;color:var(--ink);border:0;outline:none;font-size:16px;font-weight:500;line-height:1.4}
#quick-switcher-input:focus-visible {outline:0}
#quick-switcher-input::placeholder {color:var(--muted)}
.quick-switcher-results {padding:8px;max-height:min(58vh,440px);overflow:auto}
.quick-switcher-item {display:grid;grid-template-columns:72px minmax(0,1fr) auto;gap:13px;align-items:center;width:100%;padding:12px 13px;text-align:left;color:var(--ink);background:transparent;border:0;border-left:2px solid transparent;cursor:pointer;font-size:13px;font-weight:600;line-height:1.3}
.quick-switcher-item[aria-selected="true"],.quick-switcher-item:hover {background:var(--surface-hover);border-left-color:var(--accent)}
.quick-switcher-type {font:650 10px/1.2 ui-monospace,"Cascadia Code",monospace;color:var(--accent);text-transform:uppercase}
.quick-switcher-item small {color:var(--muted);font:500 10px/1.2 ui-monospace,"Cascadia Code",monospace}
.quick-switcher-empty {padding:22px;color:var(--muted);font-size:13px}
.quick-switcher-footer {display:flex;gap:18px;flex-wrap:wrap;padding:11px 19px;border-top:1px solid var(--stroke);color:var(--muted);font:11px/1.4 ui-monospace,"Cascadia Code",monospace}
.quick-switcher-footer kbd {border:1px solid var(--line-strong);padding:1px 4px;color:var(--ink);font:inherit}
:root[data-theme="light"] .hero {background:#212524;color:#f4f2eb;border-color:#212524}
:root[data-theme="light"] .hero h1,:root[data-theme="light"] .hero .eyebrow {color:#f4f2eb}
:root[data-theme="light"] .hero p {color:#cbceca}
:root[data-theme="light"] .hero .btn:not(.primary) {color:#faf9f4;border-color:#6c7470;background:transparent}
:root[data-theme="light"] .hero .btn.primary {background:#ff795c;color:#121615;border-color:#ff795c}
:root[data-theme="light"] .toast {box-shadow:0 15px 35px #0003}
@media(min-width:1450px) {.cards {grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:1120px) {
 .main {padding:0 23px 38px}
 .top {height:auto;min-height:72px}
 .top-right {gap:5px}
 .top .pill {display:none}
}
@media(max-width:860px) {
 .layout {grid-template-columns:69px minmax(0,1fr)}
 .sidebar {min-height:0;padding:0}
 .brand {padding:19px 16px;justify-content:center}
 .brand-lockup,.side-label,.sidebar-bottom {display:none}
 .nav {padding:12px 6px}
 .nav button {justify-content:center;padding:12px 8px;min-height:50px}
 .nav button>span:nth-child(2) {position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
 .nav button>span:first-child {font-size:12px}
 .main {padding:0 20px 35px}
 .top {margin-bottom:20px}
 .hero {padding:24px}
 .split {grid-template-columns:1fr}
}
@media(max-width:730px) {
 .layout {display:block}
 .sidebar {position:sticky;top:0;z-index:16;min-height:0;height:auto;display:flex;flex-direction:row;align-items:center;border-bottom:1px solid var(--stroke);border-right:0}
 .brand {padding:11px 13px;border:0}
 .brand-mark {height:31px;width:31px;font-size:13px}
 .nav {display:flex;gap:0;flex:1;justify-content:space-around;padding:0 4px;overflow-x:auto}
 .nav button {flex:1;min-width:39px;min-height:52px;white-space:normal;text-align:center;font-size:12px;padding:8px 5px}
 .nav button>span:first-child {font-size:10px}
 .nav button>span:nth-child(2) {position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
 .nav button.active {box-shadow:inset 0 -2px var(--accent)}
 .main {padding:0 14px 25px}
 .top {position:relative;top:auto;height:auto;min-height:61px;gap:8px;margin-bottom:14px;flex-wrap:wrap;padding:10px 0}
 .top .eyebrow {font-size:10px;flex:1}
 .top-right {gap:5px}
 #global-search-toggle {padding:8px;min-height:36px}
 #global-search-toggle .keycap,#global-search-toggle .search-label {display:none}
 #global-search-toggle .search-glyph {display:block}
 .top-right .lang-select {padding:6px 4px;min-height:36px}
 .top-right #refresh {padding:6px 9px}
 .hero {padding:22px 18px}
 .hero h1 {font-size:26px;letter-spacing:-.8px}
 .metrics {grid-template-columns:repeat(2,minmax(0,1fr))}
 .overview-signal {align-items:flex-start;flex-direction:column;gap:12px;padding:15px;margin:-14px 0 22px}
 .metric {border-bottom:1px solid var(--stroke);padding:12px 15px}
 .metric:nth-child(2) {border-right:0}
 .metric:nth-child(n+3) {border-bottom:0}
 .metric .value {font-size:26px}
 .cards,.agents-grid {grid-template-columns:1fr}
 .catalog-toolbar {padding:12px 12px 2px}
 #page-catalog .section-head {margin-top:12px}
 #page-catalog h1 {font-size:32px;letter-spacing:-1.3px}
 .catalog-switch {margin:8px 0 16px}
 .catalog-switch button {padding:8px 10px}
 .catalog-guide {display:none}
 .panel {padding:17px}
 .quick-switcher {padding-top:6vh}
 .quick-switcher-item {grid-template-columns:56px minmax(0,1fr)}
 .quick-switcher-item small {display:none}
}
@media(max-width:400px) {
 .top .eyebrow {display:none}
 .top-right {width:100%;justify-content:space-between}
 .nav button {min-width:36px}
}
@media(prefers-reduced-motion:reduce) {
 html {scroll-behavior:auto}
 *,*::before,*::after {transition:none!important;animation:none!important}
}`;
