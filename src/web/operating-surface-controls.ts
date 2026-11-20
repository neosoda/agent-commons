/** Lightweight browser-only keyboard and appearance enhancement. */
export const OPERATING_SURFACE_CONTROLS = String.raw`/**
 * Keyboard command palette and appearance controls.
 * Pure presentation: real navigation and catalog filters only. No network
 * requests, no autonomous mutations, and no unreviewed installation actions.
 */
(function operatingSurfaceControls() {
  const overlay = $('quick-switcher');
  const queryInput = $('quick-switcher-input');
  const resultsElement = $('quick-switcher-results');
  const toggle = $('global-search-toggle');
  const closeButton = $('quick-switcher-close');
  const themeButton = $('theme-toggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  let previousFocus = null;
  let entries = [];
  let selected = 0;

  function readableSection(button) {
    return button.querySelector('span:last-child')?.textContent.trim() || button.dataset.page;
  }
  function resultEntries(query) {
    const q = query.trim().toLocaleLowerCase();
    const sections = [...document.querySelectorAll('.nav [data-page]')].map(button => ({
      kind: 'section', id: button.dataset.page, name: readableSection(button),
      hint: language === 'fr' ? 'Navigation' : 'Navigate'
    }));
    const tools = state ? discoveredTools().map(item => ({
      kind: item.kind, id: item.id, name: String(item.name || item.id),
      hint: item.installed ? (language === 'fr' ? 'Local / installé' : 'Local / installed') :
        (language === 'fr' ? 'Catalogue' : 'Catalog'),
      terms: String(item.description || '') + ' ' + String(item.categoryName || '')
    })) : [];
    const agents = (state?.inventory?.agents || []).filter(agent => agent.installed).map(agent => ({
      kind: 'agent', id: agent.id, name: String(agent.name || agent.id),
      hint: language === 'fr' ? 'Agent local' : 'Local agent'
    }));
    return [...sections, ...agents, ...tools]
      .filter(item => !q || (item.name + ' ' + item.id + ' ' + (item.terms || '')).toLocaleLowerCase().includes(q))
      .slice(0, 12);
  }
  function paintSelection() {
    const buttons = resultsElement.querySelectorAll('.quick-switcher-item');
    buttons.forEach((button, index) => button.setAttribute('aria-selected', String(index === selected)));
    queryInput.setAttribute('aria-activedescendant', buttons[selected]?.id || '');
    buttons[selected]?.scrollIntoView({ block: 'nearest' });
  }
  function activate(entry) {
    closePalette();
    if (entry.kind === 'section') {
      go(entry.id);
    } else if (entry.kind === 'skill' || entry.kind === 'mcp') {
      go('catalog');
      document.querySelector('[data-kind="' + entry.kind + '"]')?.click();
      $('catalog-status').value = '';
      $('catalog-category').value = '';
      $('catalog-search').value = entry.name;
      filterCatalog();
    } else if (entry.kind === 'agent') {
      go('agents');
      const selector = $('profile-agent');
      if ([...selector.options].some(option => option.value === entry.id)) {
        selector.value = entry.id;
        selector.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    updateViewTitle();
  }
  function renderPalette() {
    entries = resultEntries(queryInput.value);
    selected = 0;
    resultsElement.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'quick-switcher-empty';
      empty.textContent = language === 'fr' ? 'Aucun résultat dans cet espace local.' : 'No matches in this local workspace.';
      resultsElement.append(empty);
    }
    entries.forEach((entry, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'quick-switcher-item';
      item.id = 'quick-result-' + index;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(index === 0));
      const kind = document.createElement('span');
      kind.className = 'quick-switcher-type';
      kind.textContent = entry.kind === 'section' ? (language === 'fr' ? 'Vue' : 'View') :
        entry.kind === 'agent' ? 'Agent' : entry.kind === 'mcp' ? 'MCP' : 'Skill';
      const label = document.createElement('span');
      label.textContent = entry.name;
      const hint = document.createElement('small');
      hint.textContent = entry.hint;
      item.append(kind, label, hint);
      item.addEventListener('mousemove', () => { selected = index; paintSelection(); });
      item.addEventListener('click', () => activate(entry));
      resultsElement.append(item);
    });
    paintSelection();
  }
  function openPalette() {
    if ($('modal-root').querySelector('[role="dialog"]')) return;
    previousFocus = document.activeElement;
    overlay.classList.remove('hidden');
    queryInput.value = '';
    renderPalette();
    queryInput.focus();
  }
  function closePalette() {
    if (overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    queryInput.setAttribute('aria-activedescendant', '');
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  toggle.addEventListener('click', openPalette);
  closeButton.addEventListener('click', closePalette);
  overlay.addEventListener('mousedown', event => { if (event.target === overlay) closePalette(); });
  queryInput.addEventListener('input', renderPalette);
  queryInput.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!entries.length) return;
      selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + entries.length) % entries.length;
      paintSelection();
    }
    if (event.key === 'Enter' && entries[selected]) {
      event.preventDefault();
      activate(entries[selected]);
    }
  });
  document.addEventListener('keydown', event => {
    const open = !overlay.classList.contains('hidden');
    const isSearchShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (isSearchShortcut) {
      event.preventDefault();
      if (open) closePalette(); else openPalette();
      return;
    }
    if (open) {
      if (event.key === 'Escape') { event.preventDefault(); closePalette(); }
      if (event.key === 'Tab') {
        const focusables = [queryInput, closeButton];
        const index = focusables.indexOf(document.activeElement);
        const next = (index + (event.shiftKey ? -1 : 1) + focusables.length) % focusables.length;
        event.preventDefault();
        focusables[next].focus();
      }
      return;
    }
    if (event.key === '/' && !event.ctrlKey && !event.altKey && !event.metaKey &&
        !document.activeElement?.matches('input,textarea,select,[contenteditable]') &&
        !$('modal-root').querySelector('[role="dialog"]')) {
      event.preventDefault();
      openPalette();
    }
  }, true);

  function updateViewTitle() {
    const active = document.querySelector('.nav [aria-current="page"]');
    const label = active ? readableSection(active) : 'Overview';
    $('current-view').textContent = label;
    document.title = label + ' · Agent Commons';
  }
  document.querySelectorAll('[data-page],[data-go]').forEach(button =>
    button.addEventListener('click', updateViewTitle));
  $('language-select').addEventListener('change', () => {
    updateViewTitle();
    refreshAppearanceLabel();
  });

  function setTheme(next) {
    const theme = next === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#101214' : '#e9e9e3';
    try { localStorage.setItem('agent-commons-ui-theme', theme); } catch {}
    refreshAppearanceLabel();
  }
  function refreshAppearanceLabel() {
    const light = document.documentElement.dataset.theme === 'light';
    themeButton.textContent = light ? '◐' : '◑';
    themeButton.setAttribute('aria-label', language === 'fr' ?
      (light ? 'Activer le thème sombre' : 'Activer le thème clair') :
      (light ? 'Switch to dark theme' : 'Switch to light theme'));
    themeButton.setAttribute('title', themeButton.getAttribute('aria-label'));
    themeButton.setAttribute('aria-pressed', String(light));
  }
  themeButton.addEventListener('click', () =>
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  let savedTheme = '';
  try { savedTheme = localStorage.getItem('agent-commons-ui-theme') || ''; } catch {}
  setTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme :
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  updateViewTitle();
})();`;
