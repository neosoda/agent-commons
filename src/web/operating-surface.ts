/** Presentation-only design tokens and layout styles implementing rapport-ux-ui-v3. */
export const OPERATING_SURFACE_STYLES = String.raw`/**
 * Agent Commons / rapport-ux-ui-v3
 * Warm editorial glass over peach-to-sage canvas, charcoal/yellow/pine/rust
 * semantic accents, floating quick-action rail and capsule bottom dock.
 * Local-only: no external fonts, images, CDNs or runtime dependencies.
 */
:root,
:root[data-theme="light"] {
  color-scheme: light;

  /* Canvas: warm peach -> neutral -> sage radial wash */
  --canvas-peach: #f1dac0;
  --canvas-honey: #eedec0;
  --canvas-neutral: #ece6dc;
  --canvas-sage: #dfebdd;
  --bg: var(--canvas-neutral);

  /* Surfaces */
  --surface: rgba(248, 245, 239, .72);
  --surface-border: rgba(255, 255, 255, .68);
  --surface-solid: #f7f4ee;
  --surface-chip: #fbfaf7;
  --surface-hover: #efeae0;
  --surface-raised: #fbfaf7;
  --surface-muted: rgba(25, 27, 27, .065);
  --panel: var(--surface);
  --panel2: var(--surface-solid);
  --scrim: rgba(234, 229, 220, .48);
  --code-bg: #f1ede4;
  --soft-signal: rgba(43, 92, 78, .10);

  /* Ink & verified contrast */
  --ink: #181815;
  --muted: #65655b;
  --faint: #73746b;
  --line: rgba(24, 24, 21, .10);
  --stroke: rgba(24, 24, 21, .12);
  --line-strong: #808076;
  --border-control: #808076;
  --signal-ink: #ffffff;

  /* rapport-ux-ui-v3 business / stage palette */
  --stage-yellow: #f0c94e;
  --stage-green: #2b5c4e;
  --stage-orange: #c64720;
  --stage-black: #181815;
  --stage-won: #f6f3ed;
  --y: var(--stage-yellow);
  --g: var(--stage-green);
  --r: var(--stage-orange);
  --k: var(--stage-black);
  --kc: #181815;
  --on-yellow: #181815;
  --on-dark: #ffffff;
  --on-orange: #ffffff;

  /* Semantic tokens */
  --accent: var(--stage-orange);
  --mint: var(--stage-green);
  --warn: #7a5a06;
  --bad: #a23818;
  --status-paid: #2b5c4e;
  --status-draft: #65655b;
  --status-due: #7a5a06;
  --status-overdue: #a23818;

  /* Typography */
  --font-ui: 'Urbanist', 'Outfit', 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif;
  --font-mono: ui-monospace, 'Cascadia Code', SFMono-Regular, Consolas, monospace;

  /* Spacing & radii */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-control: 999px;
  --radius-card: 18px;
  --radius-column: 22px;
  --radius-panel: 24px;
  --radius-sheet: 28px;
  --radius-dialog: 30px;
  --radius: var(--radius-panel);

  /* Shadows */
  --shadow-panel: 0 20px 40px -26px rgba(80, 60, 30, .35), 0 2px 6px -3px rgba(80, 60, 30, .08);
  --shadow-float: 0 20px 40px -18px rgba(0, 0, 0, .55);
  --shadow-dialog: 0 40px 80px -30px rgba(0, 0, 0, .55);

  /* Motion */
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --ease-spring: cubic-bezier(.34, 1.45, .64, 1);
  --ease-sheet: cubic-bezier(.32, .72, 0, 1);
  --motion-fast: 200ms;
  --motion-control: 300ms;
  --motion-exit: 240ms;
  --motion-enter: 520ms;
  --motion-morph: 440ms;
  --motion-sheet: 480ms;

  font: 15px/1.45 var(--font-ui);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --canvas-peach: #2b2118;
  --canvas-neutral: #111312;
  --canvas-sage: #11211a;
  --bg: var(--canvas-neutral);

  --surface: rgba(33, 35, 33, .76);
  --surface-border: rgba(255, 255, 255, .08);
  --surface-solid: #1c1e1c;
  --surface-chip: #262826;
  --surface-hover: #2d302d;
  --surface-raised: #262826;
  --surface-muted: rgba(255, 255, 255, .07);
  --panel: var(--surface);
  --panel2: var(--surface-solid);
  --scrim: rgba(8, 10, 9, .58);
  --code-bg: #141615;
  --soft-signal: rgba(127, 191, 169, .12);

  --ink: #edece7;
  --muted: #a6a9a2;
  --faint: #8c9089;
  --line: rgba(255, 255, 255, .09);
  --stroke: rgba(255, 255, 255, .12);
  --line-strong: #8a8d85;
  --border-control: #8a8d85;
  --signal-ink: #ffffff;

  --stage-black: #0b0c0c;
  --stage-won: #2a2c2a;
  --kc: #0b0c0c;
  --accent: #f0845d;
  --mint: #7fbfa9;
  --warn: #f0c94e;
  --bad: #ff9c88;
  --status-paid: #7fbfa9;
  --status-draft: #a6a9a2;
  --status-due: #f0c94e;
  --status-overdue: #ff9c88;

  --shadow-panel: 0 20px 40px -24px rgba(0, 0, 0, .75);
  --shadow-float: 0 20px 40px -18px rgba(0, 0, 0, .82);
  --shadow-dialog: 0 40px 80px -28px rgba(0, 0, 0, .85);
}

* { box-sizing: border-box; min-width: 0; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 24px; }
body {
  margin: 0;
  font: 15px/1.45 var(--font-ui);
  color: var(--ink);
  background: var(--bg);
  min-height: 100vh;
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(75% 55% at 0% 0%, var(--canvas-peach), transparent 72%),
    radial-gradient(70% 60% at 100% 100%, var(--canvas-sage), transparent 72%),
    var(--canvas-neutral);
  transition: background .5s var(--ease-out);
}
button, input, textarea, select { font: inherit; color: inherit; }
button { cursor: pointer; }
a { color: var(--g); text-decoration: none; text-underline-offset: 3px; }
:root[data-theme="dark"] a { color: var(--mint); }
a:hover { text-decoration: underline; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, a:focus-visible, [tabindex]:focus-visible {
  outline: 2px solid var(--g);
  outline-offset: 2px;
  border-radius: 10px;
}
:root[data-theme="dark"] button:focus-visible,
:root[data-theme="dark"] input:focus-visible,
:root[data-theme="dark"] select:focus-visible,
:root[data-theme="dark"] textarea:focus-visible,
:root[data-theme="dark"] a:focus-visible,
:root[data-theme="dark"] [tabindex]:focus-visible {
  outline-color: var(--y);
}
::selection { background: rgba(43, 92, 78, .25); color: var(--ink); }
:root[data-theme="dark"] ::selection { background: rgba(240, 201, 78, .28); color: var(--ink); }
input, textarea { caret-color: var(--g); }
:root[data-theme="dark"] input, :root[data-theme="dark"] textarea { caret-color: var(--y); }

/* Skip link */
.skip-link {
  position: absolute;
  left: 16px;
  top: -120px;
  z-index: 120;
  padding: 10px 18px;
  background: var(--kc);
  color: #ffffff;
  border: 2px solid var(--y);
  border-radius: var(--radius-control);
  font-weight: 600;
  font-size: 13px;
}
.skip-link:focus { top: 14px; }

/* Shell: centered max-width + space for left floating rail & bottom dock */
.layout {
  display: block;
  max-width: 1240px;
  margin: 0 auto;
  padding: 18px clamp(14px, 3vw, 28px) 124px clamp(78px, 7vw, 100px);
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 18px;
  padding: 0;
  position: static;
  height: auto;
  background: transparent;
  border: 0;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  font-weight: 600;
  font-size: 21px;
  letter-spacing: -.02em;
  color: var(--ink);
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--kc);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -.03em;
  box-shadow: 0 8px 18px -10px rgba(0, 0, 0, .55);
  flex: none;
}

.brand-lockup { display: block; line-height: 1.05; }
.brand-lockup small {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0;
}

.side-label, .sidebar-bottom { display: none; }

/* Horizontal pill tabs with sliding charcoal indicator */
.nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 4px 0 6px;
  padding: 3px;
  overflow-x: auto;
  scrollbar-width: none;
}
.nav::-webkit-scrollbar { display: none; }

.nav .nav-ind {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  width: 0;
  border-radius: var(--radius-control);
  background: var(--kc);
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, .48);
  pointer-events: none;
  z-index: 0;
}

.nav button {
  flex: none;
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: var(--ink);
  padding: 9px 15px;
  min-height: 38px;
  border-radius: var(--radius-control);
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  transition: color .3s var(--ease-out), background .2s var(--ease-out);
}
.nav button:not(.active):hover { background: var(--surface-muted); }
.nav button.active {
  color: #ffffff;
  background: transparent;
  box-shadow: none;
}
.nav.no-ind button.active {
  background: var(--kc);
  box-shadow: 0 8px 18px -8px rgba(0, 0, 0, .48);
}
.nav button > span:first-child {
  font-size: 11px;
  font-weight: 600;
  opacity: .55;
  font-variant-numeric: tabular-nums;
}
.nav button.active > span:first-child { opacity: .82; color: var(--y); }

/* Floating charcoal quick-action rail */
.rail {
  position: fixed;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 40;
  background: var(--kc);
  border: 1px solid rgba(255, 255, 255, .10);
  border-radius: 26px;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: var(--shadow-float);
}
.rail button {
  width: 44px;
  height: 35px;
  border: 0;
  background: transparent;
  display: grid;
  place-items: center;
  color: #ffffff;
  opacity: .76;
  position: relative;
  transition: opacity var(--motion-fast), transform var(--motion-control) var(--ease-spring), color var(--motion-fast);
}
.rail button:hover, .rail button.on { opacity: 1; transform: scale(1.12); color: var(--y); }
.rail button svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.rail button span.rail-tip {
  position: absolute;
  left: calc(100% + 10px);
  top: 50%;
  background: var(--kc);
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 500;
  padding: 5px 11px;
  border-radius: var(--radius-control);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transform: translate(-6px, -50%);
  box-shadow: 0 8px 20px -8px rgba(0, 0, 0, .55);
  transition: opacity var(--motion-fast), transform var(--motion-control) var(--ease-out);
}
.rail button:hover span.rail-tip, .rail button:focus-visible span.rail-tip {
  opacity: 1;
  transform: translate(0, -50%);
}
.rail hr {
  border: 0;
  height: 1px;
  background: rgba(255, 255, 255, .14);
  margin: 6px 10px;
}

/* Floating bottom dock */
.dock {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 42;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--kc);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, .10);
  border-radius: var(--radius-control);
  padding: 6px 6px 6px 16px;
  box-shadow: var(--shadow-float);
  font-size: 13px;
  white-space: nowrap;
  max-width: calc(100vw - 24px);
}
.dock .pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--y);
  box-shadow: 0 0 0 0 rgba(240, 201, 78, .6);
  animation: dockPulse 2.2s infinite;
  flex: none;
}
.dock.has-alert .pulse { background: var(--r); }
@keyframes dockPulse {
  70% { box-shadow: 0 0 0 8px rgba(240, 201, 78, 0); }
  100% { box-shadow: 0 0 0 0 rgba(240, 201, 78, 0); }
}
.dock-txt { overflow: hidden; text-overflow: ellipsis; }
.dock button {
  background: var(--y);
  color: var(--on-yellow);
  border: 0;
  font-weight: 600;
  font-size: 13px;
  padding: 7px 15px;
  border-radius: var(--radius-control);
  transition: transform var(--motion-control) var(--ease-spring);
  flex: none;
}
.dock button:hover { transform: scale(1.05); }
.dock button:active { transform: scale(.95); }

/* Topbar right controls */
.main { padding: 0; max-width: 100%; width: 100%; min-width: 0; }
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  padding: 0;
  background: transparent;
  border: 0;
  position: static;
  height: auto;
  flex-wrap: wrap;
}
.top .eyebrow {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--muted);
}
.top-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-control);
  border: 1px solid var(--border-control);
  background: var(--surface-chip);
  color: var(--ink);
  font-size: 12px;
  font-weight: 500;
  padding: 6px 12px;
  white-space: nowrap;
}

#global-search-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-control);
  background: var(--surface-chip);
  color: var(--ink);
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px 6px 14px;
  min-height: 38px;
  border-radius: var(--radius-control);
  transition: transform var(--motion-control) var(--ease-spring), border-color var(--motion-fast), background var(--motion-fast);
}
#global-search-toggle:hover { transform: translateY(-1px); background: var(--surface-solid); }
#global-search-toggle .search-glyph { color: var(--muted); font-size: 15px; }
.keycap {
  border: 1px solid var(--border-control);
  border-radius: 6px;
  padding: 1px 6px;
  font: 500 11px/1.3 var(--font-mono);
  color: var(--muted);
  white-space: nowrap;
}

#theme-toggle {
  width: 38px;
  height: 38px;
  min-width: 38px;
  min-height: 38px;
  padding: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--surface-chip);
  border: 1px solid var(--border-control);
  color: var(--ink);
}
#refresh {
  border-radius: var(--radius-control);
  background: var(--surface-chip);
  border: 1px solid var(--border-control);
  color: var(--ink);
  min-height: 38px;
  padding: 7px 14px;
}

/* Inputs, selects & controls (WCAG 3:1+ border against background) */
.field, .lang-select {
  background: var(--surface-chip);
  border: 1px solid var(--border-control);
  color: var(--ink);
  border-radius: var(--radius-control);
  padding: 8px 14px;
  min-height: 40px;
  font-size: 13.5px;
  min-width: 0;
  transition: border-color var(--motion-fast), box-shadow var(--motion-fast);
}
textarea.field { border-radius: var(--radius-card); padding: 11px 14px; }
.field::placeholder { color: var(--faint); opacity: 1; }
.field:hover, .lang-select:hover { border-color: var(--ink); }
.field:focus, .lang-select:focus { border-color: var(--g); outline: none; }
.field.search { flex: 1; min-width: 220px; }
.lang-select { min-height: 38px; padding: 6px 12px; font-size: 13px; cursor: pointer; }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 9px 17px;
  min-height: 40px;
  border-radius: var(--radius-control);
  border: 1px solid var(--border-control);
  background: var(--surface-chip);
  color: var(--ink);
  font-weight: 600;
  font-size: 13.5px;
  white-space: nowrap;
  transition: transform var(--motion-control) var(--ease-spring), background var(--motion-fast), border-color var(--motion-fast);
}
.btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.02); background: var(--surface-hover); }
.btn:active:not(:disabled) { transform: scale(.96); }
.btn.primary {
  background: var(--kc);
  color: #ffffff;
  border-color: var(--kc);
}
:root[data-theme="dark"] .btn.primary {
  background: var(--y);
  color: var(--on-yellow);
  border-color: var(--y);
}
.btn.primary:hover:not(:disabled) { opacity: .92; }
.btn.ghost { background: var(--surface-chip); border-color: var(--border-control); color: var(--ink); }
.btn.danger {
  background: transparent;
  color: var(--bad);
  border-color: var(--bad);
}
.btn.danger:hover:not(:disabled) { background: var(--r); color: #ffffff; border-color: var(--r); }
.btn.small { min-height: 36px; padding: 6px 13px; font-size: 12.5px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }

/* Typography & Page Headers */
h1, h2, h3 { color: var(--ink); margin: 0; font-weight: 600; }
h1 {
  font-size: clamp(28px, 3.3vw, 35px);
  line-height: 1.06;
  font-weight: 500;
  letter-spacing: -.025em;
}
.page { display: none; }
.page.active {
  display: block;
  animation: pageRise var(--motion-enter) var(--ease-out) both;
}
@keyframes pageRise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.page > .eyebrow, .hero .eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--g);
  margin-bottom: 6px;
}
:root[data-theme="dark"] .page > .eyebrow,
:root[data-theme="dark"] .hero .eyebrow { color: var(--y); }
.page > h1 { margin: 4px 0 10px; }
.page > p.dim { max-width: 780px; margin: 0 0 22px; font-size: 14.5px; color: var(--muted); line-height: 1.5; }
.dim { color: var(--muted); }
.subtle { font-size: 12.5px; color: var(--muted); }

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 22px 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--line);
}
.section-head h1 { font-size: clamp(28px, 3.3vw, 35px); }
.section-head h2 { font-size: 19px; letter-spacing: -.015em; }
.section-head h3 { font-size: 16px; }

/* Frosted panels */
.panel {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-panel);
  padding: 20px 22px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
  min-width: 0;
}
.panel h2 { font-size: 19px; margin-bottom: 10px; letter-spacing: -.015em; }
.panel h3 { font-size: 16px; margin-bottom: 8px; letter-spacing: -.01em; }
.panel p { margin: 4px 0 14px; color: var(--muted); line-height: 1.5; }

/* Overview Bento & KPI strip */
.hero {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-panel);
  padding: 26px 28px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
}
.hero h1 { font-size: clamp(28px, 3.3vw, 36px); margin: 4px 0 10px; max-width: 720px; }
.hero p { color: var(--muted); max-width: 640px; margin: 0 0 18px; font-size: 15px; line-height: 1.5; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin: 0 0 16px;
}
.metric {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  padding: 16px 18px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.metric .value {
  font-size: clamp(24px, 2.8vw, 31px);
  font-weight: 600;
  letter-spacing: -.025em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
}
.metric .label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--muted);
}

.overview-signal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  margin: 0 0 16px;
  padding: 16px 20px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-left: 4px solid var(--g);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
}
.overview-signal.needs-attention { border-left-color: var(--r); }
.overview-signal .eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .1em;
  color: var(--muted);
}
.overview-signal strong { display: block; font-size: 15px; font-weight: 600; margin: 3px 0 2px; color: var(--ink); }
.overview-signal p { margin: 0; font-size: 13px; color: var(--muted); }

.split { display: grid; grid-template-columns: 1.05fr 1fr; gap: 16px; }

/* Signature Pine-Green Health Card in Overview (matches Team Quota card) */
.panel.panel-health {
  background: var(--g);
  color: #ffffff;
  border-color: transparent;
}
.panel.panel-health h3,
.panel.panel-health .row-item strong { color: #ffffff; }
.panel.panel-health p,
.panel.panel-health .row-item small { color: rgba(255, 255, 255, .86); }
.panel.panel-health .row-item { border-bottom-color: rgba(255, 255, 255, .18); }
.panel.panel-health .tag {
  background: rgba(255, 255, 255, .18);
  border-color: rgba(255, 255, 255, .36);
  color: #ffffff;
}
.panel.panel-health .tag.good { background: var(--y); color: var(--on-yellow); border-color: var(--y); }
.panel.panel-health .tag.warn, .panel.panel-health .tag.bad { background: var(--r); color: #ffffff; border-color: var(--r); }
.panel.panel-health .btn {
  margin-top: 14px;
  background: var(--y);
  color: var(--on-yellow);
  border-color: var(--y);
}
.panel.panel-health .btn:hover:not(:disabled) { background: #ffffff; border-color: #ffffff; color: #181815; }

/* Library Mix segmented bar (pure DOM/CSS) */
.mix-wrap { margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, .16); }
.mix-title { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, .88); margin-bottom: 8px; display: block; }
.mixbar { display: flex; gap: 6px; height: 14px; }
.mixbar > span { border-radius: 999px; min-width: 10px; transition: flex-grow .6s var(--ease-out); }
.mix-y { background: var(--y); }
.mix-l { background: #fbfaf7; }
.mix-r { background: var(--r); }
.mix-k { background: #181815; }
.mixleg { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; font-size: 12px; color: rgba(255, 255, 255, .88); }
.mixleg span { display: inline-flex; align-items: center; gap: 6px; }
.mixleg i { display: inline-block; width: 8px; height: 8px; border-radius: 3px; }

/* Tags / pills */
.tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: var(--radius-control);
  border: 1px solid var(--line);
  background: var(--surface-muted);
  color: var(--ink);
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 10px;
  white-space: nowrap;
}
.tag.good { background: var(--g); color: #ffffff; border-color: var(--g); }
.tag.warn { background: var(--y); color: var(--on-yellow); border-color: var(--y); }
.tag.bad { background: var(--r); color: #ffffff; border-color: var(--r); }
:root[data-theme="dark"] .tag.good { background: rgba(127, 191, 169, .2); color: var(--mint); border-color: var(--mint); }
:root[data-theme="dark"] .tag.bad { background: rgba(198, 71, 32, .25); color: var(--bad); border-color: var(--bad); }

/* Catalog page */
.catalog-guide {
  display: flex;
  align-items: center;
  gap: 10px 18px;
  flex-wrap: wrap;
  border-left: 3px solid var(--g);
  padding: 6px 0 6px 16px;
  margin: 14px 0 18px;
}
.catalog-guide strong { font-size: 14px; font-weight: 600; }
.catalog-guide span { color: var(--muted); font-size: 13px; flex: 1; min-width: 180px; }

.catalog-toolbar {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-panel);
  padding: 18px 20px 12px;
  margin-bottom: 16px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
}

.catalog-switch {
  display: inline-flex;
  gap: 4px;
  flex-wrap: wrap;
  background: var(--surface-muted);
  border-radius: var(--radius-control);
  padding: 4px;
  border: 0;
  margin: 0 0 14px;
  max-width: 100%;
}
.catalog-switch button {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-weight: 600;
  font-size: 13px;
  padding: 7px 16px;
  min-height: 36px;
  border-radius: var(--radius-control);
  transition: background var(--motion-fast), color var(--motion-fast), transform var(--motion-control) var(--ease-spring);
}
.catalog-switch button:hover { color: var(--ink); }
.catalog-switch button.active {
  background: var(--kc);
  color: #ffffff;
  box-shadow: 0 4px 12px -4px rgba(0, 0, 0, .35);
}
:root[data-theme="dark"] .catalog-switch button.active {
  background: var(--surface-chip);
  color: var(--ink);
}

.filter-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 0 0 12px; align-items: center; }
.catalog-results {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  margin: 10px 0 4px;
}
.catalog-results .subtle { margin: 0; }

.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
@media (min-width: 1120px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }

.skill-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
  transition: transform var(--motion-control) var(--ease-spring), box-shadow var(--motion-control) var(--ease-out);
}
.skill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 44px -22px rgba(60, 40, 20, .35);
}
.skill-card .card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.skill-card h3 {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -.01em;
  overflow-wrap: anywhere;
}
.skill-card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; }
.skill-card .card-meta { font-size: 12px; color: var(--muted); }
.skill-card .bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.card-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }

.catalog-empty { grid-column: 1 / -1; padding: 38px 20px; text-align: center; }
.catalog-empty h3 { margin: 0 0 8px; }
.catalog-empty p { margin: 0 0 16px; }

/* Rows, Agents, Checkboxes, Code wells */
.row-item {
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.row-item:last-child { border-bottom: 0; }
.row-item strong { font-size: 14px; font-weight: 600; }
.row-item small { display: block; color: var(--muted); font-size: 12.5px; margin-top: 2px; }

.agents-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.agent-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-card);
  padding: 16px 18px;
  box-shadow: var(--shadow-panel);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
}
.agent-card .head { display: flex; gap: 9px; align-items: center; justify-content: space-between; }
.agent-card h3 { font-size: 15.5px; font-weight: 600; }
.agent-card p { font-size: 12.5px; color: var(--muted); margin: 8px 0 0; }
.agents-absent { margin-top: 16px; }
.agents-absent summary { cursor: pointer; color: var(--muted); font-size: 13px; font-weight: 500; padding: 8px 0; width: max-content; max-width: 100%; }
.agents-absent summary:hover { color: var(--ink); }
.agents-absent .agents-grid { margin-top: 8px; }

.checkbox-list {
  max-height: 255px;
  overflow: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: 8px 12px;
  background: var(--surface-solid);
  display: grid;
  gap: 4px;
}
.check { display: flex; gap: 10px; align-items: center; font-size: 13.5px; padding: 6px 4px; min-height: 44px; cursor: pointer; }
.check input { accent-color: var(--g); width: 16px; height: 16px; flex: none; }
:root[data-theme="dark"] .check input { accent-color: var(--y); }

.result-box, .catalog-command {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 340px;
  overflow: auto;
  background: var(--code-bg);
  border: 1px solid var(--line);
  color: var(--ink);
  padding: 14px 16px;
  border-radius: var(--radius-card);
  font: 12px/1.6 var(--font-mono);
}
.catalog-usage {
  margin: 16px 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  background: var(--surface-muted);
}
.catalog-usage h3 { font-size: 14.5px; margin: 0 0 8px; }
.catalog-usage p { white-space: pre-wrap; font-size: 13px; color: var(--muted); }
.catalog-prompt {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-chip);
  margin-top: 8px;
}
.catalog-prompt p { white-space: pre-wrap; color: var(--ink); font-size: 13px; margin: 0 0 8px; }

.extension-actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.extension-steps { list-style: none; margin: 16px 0; padding: 0; display: grid; border-top: 1px solid var(--line); }
.extension-steps li {
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
}
.extension-steps strong { font-size: 13px; }
.extension-steps span { font-size: 12.5px; color: var(--muted); text-align: right; }
.extension-steps .step-complete { color: var(--g); font-weight: 600; }
:root[data-theme="dark"] .extension-steps .step-complete { color: var(--mint); }

.empty {
  padding: 32px 20px;
  text-align: center;
  border: 1.5px dashed var(--line-strong);
  border-radius: var(--radius-card);
  color: var(--muted);
}
.integrity-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 14px;
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: var(--radius-card);
  background: var(--surface-muted);
  border: 1px solid var(--line);
  font-size: 13px;
}
.integrity-summary-counts { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.integrity-filters { margin: 14px 0 0; }
.spinner {
  display: inline-block;
  border: 2px solid var(--line-strong);
  border-top-color: var(--g);
  border-radius: 50%;
  width: 14px;
  height: 14px;
  animation: spin .7s linear infinite;
  margin-right: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Modals (Solid cream / forest-dark card with 3:1+ border & blurred scrim) */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: var(--scrim);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  backdrop-filter: blur(10px) saturate(1.1);
  display: grid;
  place-items: center;
  padding: 16px;
  animation: fadeIn var(--motion-fast) var(--ease-out) both;
}
@keyframes fadeIn { from { opacity: 0; } }
.modal {
  background: var(--surface-solid);
  border: 1px solid var(--border-control);
  color: var(--ink);
  width: min(600px, 100%);
  max-height: 88vh;
  overflow: auto;
  border-radius: var(--radius-dialog);
  padding: 24px 26px;
  box-shadow: var(--shadow-dialog);
  animation: dlgIn var(--motion-morph) var(--ease-sheet) both;
}
@keyframes dlgIn {
  from { opacity: 0; transform: translateY(12px) scale(.97); }
  to { opacity: 1; transform: none; }
}
.modal h2 { margin: 0 0 10px; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
.modal .copy { color: var(--muted); font-size: 13.5px; white-space: pre-line; line-height: 1.5; }
.modal-buttons { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
.links { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 12px; }
.links a { font-size: 12.5px; font-weight: 600; }

/* Command palette (Ctrl+K) */
.quick-switcher {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: var(--scrim);
  -webkit-backdrop-filter: blur(10px) saturate(1.1);
  backdrop-filter: blur(10px) saturate(1.1);
  padding: 12vh 16px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.quick-switcher-dialog {
  background: var(--surface-solid);
  border: 1px solid var(--border-control);
  border-radius: 22px;
  width: min(560px, 100%);
  box-shadow: var(--shadow-dialog);
  overflow: hidden;
  animation: dlgIn var(--motion-control) var(--ease-spring) both;
}
.quick-switcher-header {
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding: 14px 18px;
}
.quick-switcher-icon { font-size: 17px; color: var(--r); font-weight: 700; }
#quick-switcher-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  color: var(--ink);
  border: 0;
  outline: none;
  font-size: 16px;
  font-weight: 500;
}
#quick-switcher-input:focus-visible { outline: 0; }
#quick-switcher-input::placeholder { color: var(--faint); }
.quick-switcher-results { padding: 6px; max-height: min(56vh, 420px); overflow: auto; }
.quick-switcher-item {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  text-align: left;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 500;
}
.quick-switcher-item[aria-selected="true"], .quick-switcher-item:hover {
  background: var(--surface-muted);
}
.quick-switcher-type {
  font-size: 11px;
  font-weight: 600;
  color: var(--g);
  text-transform: uppercase;
  letter-spacing: .04em;
}
:root[data-theme="dark"] .quick-switcher-type { color: var(--y); }
.quick-switcher-item small { color: var(--muted); font-size: 12px; }
.quick-switcher-empty { padding: 20px; color: var(--muted); font-size: 13px; text-align: center; }
.quick-switcher-footer {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 18px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
}
.quick-switcher-footer kbd {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 1px 6px;
  color: var(--ink);
  font: inherit;
}

/* Toast capsule */
.toast {
  position: fixed;
  left: 50%;
  bottom: 74px;
  transform: translateX(-50%);
  z-index: 95;
  background: var(--kc);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, .14);
  border-radius: var(--radius-control);
  padding: 10px 18px;
  box-shadow: var(--shadow-float);
  font-size: 13.5px;
  font-weight: 500;
  max-width: min(460px, calc(100vw - 24px));
  text-align: center;
}
.toast.error { background: var(--r); border-color: var(--r); color: #ffffff; }

.footer {
  margin-top: 26px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.hidden { display: none !important; }
.sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.mt-14 { margin-top: 14px; }
.mt-15 { margin-top: 15px; }
.mt-16 { margin-top: 16px; }
.mt-18 { margin-top: 18px; }
.mt-19 { margin-top: 19px; }

/* Responsive */
@media (max-width: 1000px) {
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .split { grid-template-columns: 1fr; }
  .skill-card .bottom { align-items: flex-start; }
  .card-actions { margin-left: 0; width: 100%; }
}

@media (max-width: 730px) {
  .layout { padding: 14px 14px 110px clamp(68px, 10vw, 84px); }
  .cards, .agents-grid { grid-template-columns: 1fr; }
  .hero { padding: 20px 18px; }
  .panel { padding: 17px 16px; }
  #page-catalog .filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  #catalog-search { grid-column: 1 / -1; }
  .catalog-guide { display: none; }
}

@media (max-width: 560px) {
  .rail { display: none; }
  .layout { padding: 14px 14px 104px 14px; }
  .topbar { gap: 8px; }
  .top .eyebrow { display: none; }
  #global-search-toggle .keycap, #global-search-toggle .search-label { display: none; }
  #global-search-toggle { width: 38px; height: 38px; padding: 0; justify-content: center; border-radius: 50%; }
  .top-right .pill { display: none; }
  .dock { padding: 5px 5px 5px 12px; gap: 8px; font-size: 12px; }
  .dock button { padding: 6px 12px; font-size: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-fast: 1ms;
    --motion-control: 1ms;
    --motion-exit: 1ms;
    --motion-enter: 1ms;
    --motion-morph: 1ms;
    --motion-sheet: 1ms;
  }
  html { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; animation: none !important; }
}`;
