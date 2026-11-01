/* Browser-only appearance adapter. Never reads code text or changes token nodes. */
(() => {
  'use strict';
  const KEY = '__SW_KEYWORD_FLOW_B__';
  window[KEY]?.dispose?.();
  const STYLE_ID = 'swb-keyword-token-style';
  const TOKEN_STYLE = 'style.vscode-tokens-styles';
  const PREFIX = '.monaco-workbench.vs .part.editor .monaco-editor';
  const SIGNAL = '--white-flow-keyword-flow';
  const COLORS = new Set(['rgb(124, 58, 237)']);
  const PALETTES = Object.freeze({
    aurora: 'linear-gradient(100deg in oklch, #7C3AED 0%, #1D4ED8 25%, #037471 50%, #C22859 75%, #7C3AED 100%)',
    spectrum: 'linear-gradient(100deg in oklch, #B91C1C 0%, #047857 25%, #1D4ED8 50%, #7C3AED 75%, #B91C1C 100%)'
  });
  function supportsGradient(value) {
    try { return CSS.supports('background-image', value); } catch { return false; }
  }
  const oklchSupported = supportsGradient('linear-gradient(90deg in oklch, red, blue)');
  const GRADIENTS = Object.fromEntries(Object.entries(PALETTES).map(([name, value]) => {
    const gradient = oklchSupported ? value : value.replace(' in oklch', '');
    return [name, supportsGradient(gradient) ? gradient : null];
  }));
  const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  let enabled = false, palette = null, signalChecks = 0, cachedSignalSheet = null, signalTimer = null;
  let tokenStyle = null, tokenObserver = null, headObserver = null, runtimeStyle = null;
  let startupTimer = null, refreshTimer = null, busyTimer = null, retries = 0;
  let disposed = false, focused = document.hasFocus(), busy = false, lastPaused = true;
  let refreshes = 0, lastRefreshMs = 0, matchedClasses = [], lastCss = '';
  let tickTimer = null, animatedRule = null, phase = 0, lastTick = 0, ticks = 0;
  const removers = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  }
  function updatePause() {
    const paused = !enabled || document.hidden || !focused || busy || reduced.matches;
    lastPaused = paused;
    syncTicker();
  }
  function tick() {
    if (!animatedRule || lastPaused || disposed || !enabled) return;
    const now = performance.now();
    phase = (phase + Math.min(1000, now - lastTick) * 300 / 12000) % 300;
    lastTick = now;
    animatedRule.style.backgroundPosition = `${phase.toFixed(3)}% 0`;
    ticks++;
  }
  function syncTicker() {
    if (disposed || lastPaused || !enabled || !animatedRule) {
      if (tickTimer !== null) clearInterval(tickTimer);
      tickTimer = null;
      return;
    }
    if (tickTimer === null) {
      lastTick = performance.now(); tick();
      tickTimer = setInterval(tick, 1000 / 6);
    }
  }
  function clearRuntime() {
    runtimeStyle?.remove(); runtimeStyle = null;
    animatedRule = null; matchedClasses = []; lastCss = '';
    syncTicker();
  }
  function stopTokenTracking() {
    clearTimeout(startupTimer); clearTimeout(refreshTimer);
    startupTimer = null; refreshTimer = null; retries = 0;
    tokenObserver?.disconnect(); tokenObserver = null; tokenStyle = null;
    clearRuntime();
  }
  function refresh() {
    refreshTimer = null;
    if (disposed || !enabled || !tokenStyle?.sheet) return;
    const gradient = GRADIENTS[palette];
    // Never make text transparent unless the browser accepts the complete gradient value.
    if (!gradient) { clearRuntime(); return; }
    const start = performance.now(), rules = [];
    try {
      for (const rule of tokenStyle.sheet.cssRules) {
        if (!rule.style?.color || !/^\.mtk\d+$/.test(rule.selectorText || '')) continue;
        if (!COLORS.has(rule.style.color)) continue;
        rules.push({name: rule.selectorText, base: rule.style.color});
      }
    } catch { clearRuntime(); return; }
    if (!rules.length) { clearRuntime(); return; }
    const targets = rules.map(rule => `${PREFIX} .view-lines .view-line span${rule.name}`).join(',');
    const fallback = rules.flatMap(rule => [
      `${PREFIX}:has(.view-overlays .selected-text) .view-lines .view-line span${rule.name}`,
      `${PREFIX} .view-lines .view-line span${rule.name}.inline-selected-text`
    ]).join(',');
    const bases = rules.map(rule => `${PREFIX} .view-lines .view-line span${rule.name}{--swb-token-base:${rule.base}}`).join('\n');
    const css = bases + `
${targets}{--swb-animated-token:1;background-image:${gradient};background-size:300% 100%;background-position:0% 0;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}
${fallback}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}
@media(prefers-reduced-motion:reduce){${targets}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}}
@media(forced-colors:active){${targets}{background-image:none!important;-webkit-text-fill-color:CanvasText!important}}`;
    if (!runtimeStyle?.isConnected) {
      runtimeStyle = document.createElement('style');
      runtimeStyle.id = STYLE_ID;
      document.head.append(runtimeStyle);
    }
    if (css !== lastCss) { runtimeStyle.textContent = css; lastCss = css; }
    try {
      animatedRule = [...runtimeStyle.sheet.cssRules].find(rule => rule.style?.getPropertyValue('--swb-animated-token')) || null;
    } catch { clearRuntime(); return; }
    syncTicker();
    matchedClasses = rules.map(rule => rule.name);
    refreshes++;
    lastRefreshMs = performance.now() - start;
  }
  function scheduleRefresh() {
    if (disposed || !enabled || refreshTimer !== null) return;
    refreshTimer = setTimeout(refresh, 180);
  }
  function attachTokenStyle() {
    if (disposed || !enabled) return;
    const next = document.querySelector(TOKEN_STYLE);
    if (next && next !== tokenStyle) {
      tokenObserver?.disconnect();
      tokenStyle = next;
      tokenObserver = new MutationObserver(scheduleRefresh);
      tokenObserver.observe(next, {childList: true, subtree: true, characterData: true});
      clearTimeout(startupTimer); startupTimer = null;
      scheduleRefresh();
    }
    if (!next && tokenStyle) {
      tokenObserver?.disconnect(); tokenStyle = null;
      clearRuntime();
    }
    if (!next && retries++ < 60 && startupTimer === null) {
      startupTimer = setTimeout(() => { startupTimer = null; attachTokenStyle(); }, 500);
    }
  }
  function readSignal(sheet) {
    try {
      for (const rule of sheet.cssRules) {
        const value = rule.style?.getPropertyValue(SIGNAL).trim();
        if (Object.hasOwn(PALETTES, value)) return value;
      }
    } catch { /* Inaccessible stylesheets are not a signal source. */ }
    return null;
  }
  function signalSheets() {
    const sheets = [], excluded = new Set();
    for (const node of document.head.querySelectorAll('style')) {
      let sheet;
      try { sheet = node.sheet; } catch { continue; }
      if (!sheet) continue;
      if (node.id === STYLE_ID || node.matches(TOKEN_STYLE)) excluded.add(sheet);
      else sheets.push(sheet);
    }
    try {
      for (const sheet of document.adoptedStyleSheets || []) {
        if (!excluded.has(sheet) && !sheets.includes(sheet)) sheets.push(sheet);
      }
    } catch { /* Constructed sheets are optional. */ }
    return sheets;
  }
  function checkSignal() {
    if (disposed) return;
    signalChecks++;
    const sheets = signalSheets();
    let next = null;
    // Only reuse a cached sheet while it is still attached. Removed types must switch off.
    if (cachedSignalSheet && sheets.includes(cachedSignalSheet)) next = readSignal(cachedSignalSheet);
    if (!next) {
      cachedSignalSheet = null;
      for (const sheet of sheets) {
        next = readSignal(sheet);
        if (next) { cachedSignalSheet = sheet; break; }
      }
    }
    if (next !== palette) {
      palette = next; enabled = next !== null;
      if (enabled) { attachTokenStyle(); scheduleRefresh(); }
      else { phase = 0; stopTokenTracking(); }
    }
    updatePause();
  }
  function syncSignalTimer() {
    if (disposed || !focused || document.hidden) {
      if (signalTimer !== null) clearInterval(signalTimer);
      signalTimer = null;
    } else if (signalTimer === null) signalTimer = setInterval(checkSignal, 1500);
  }
  function markBusy(event) {
    if (!enabled || !(event.target instanceof Element) || !event.target.closest('.monaco-editor')) return;
    busy = true; updatePause();
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { busy = false; busyTimer = null; updatePause(); }, 300);
  }
  function start() {
    if (disposed) return;
    document.getElementById(STYLE_ID)?.remove();
    headObserver = new MutationObserver(records => {
      if (enabled && records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && node.matches(TOKEN_STYLE)))) attachTokenStyle();
    });
    headObserver.observe(document.head, {childList: true});
    listen(window, 'focus', () => { focused = true; checkSignal(); syncSignalTimer(); });
    listen(window, 'blur', () => { focused = false; updatePause(); syncSignalTimer(); });
    listen(document, 'visibilitychange', () => { checkSignal(); syncSignalTimer(); });
    listen(document, 'keydown', markBusy, {capture: true, passive: true});
    listen(document, 'wheel', markBusy, {capture: true, passive: true});
    listen(reduced, 'change', updatePause);
    checkSignal(); syncSignalTimer();
  }
  function dispose() {
    disposed = true;
    enabled = false; palette = null; lastPaused = true;
    clearTimeout(busyTimer); clearInterval(signalTimer); signalTimer = null;
    stopTokenTracking();
    headObserver?.disconnect(); cachedSignalSheet = null;
    removers.splice(0).forEach(remove => remove());
    document.removeEventListener('DOMContentLoaded', start);
    if (window[KEY]?.dispose === dispose) delete window[KEY];
  }
  window[KEY] = Object.freeze({dispose, getStatus: () => ({
    enabled, palette, signalChecks,
    matchedClasses: [...matchedClasses], refreshes, lastRefreshMs,
    paused: lastPaused, durationSeconds: 12, colorUpdatesPerSecond: 6, ticks,
    architecture: 'one shared 6 Hz color rule; focused visible signal checks every 1500 ms',
    codeTextRead: false, tokenNodesModified: false
  })});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
