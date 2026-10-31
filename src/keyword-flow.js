/* Browser-only appearance adapter. Never reads code text or changes token nodes. */
(() => {
  'use strict';
  const KEY = '__SW_KEYWORD_FLOW_B__';
  window[KEY]?.dispose?.();
  const STYLE_ID = 'swb-keyword-token-style';
  const TOKEN_STYLE = 'style.vscode-tokens-styles';
  const PREFIX = '.monaco-workbench.vs .part.editor .monaco-editor';
  const COLORS = new Set(['rgb(124, 58, 237)', 'rgb(175, 0, 219)', 'rgb(0, 0, 255)', 'rgb(29, 78, 216)']);
  const palette = 'linear-gradient(100deg,#b91c1c 0%,#047857 25%,#1d4ed8 50%,#7c3aed 75%,#b91c1c 100%)';
  const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  let tokenStyle = null, tokenObserver = null, headObserver = null, runtimeStyle = null;
  let startupTimer = null, refreshTimer = null, busyTimer = null, retries = 0;
  let disposed = false, focused = document.hasFocus(), busy = false, lastPaused = null;
  let refreshes = 0, lastRefreshMs = 0, matchedClasses = [], lastCss = '';
  let tickTimer = null, animatedRule = null, phase = 0, lastTick = 0, ticks = 0;
  const removers = [];
  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    removers.push(() => target.removeEventListener(type, handler, options));
  }
  function updatePause() {
    const paused = document.hidden || !focused || busy || reduced.matches;
    lastPaused = paused;
    syncTicker();
  }
  function tick() {
    if (!animatedRule || lastPaused || disposed) return;
    const now = performance.now();
    phase = (phase + Math.min(1000, now - lastTick) * 300 / 12000) % 300;
    lastTick = now;
    animatedRule.style.backgroundPosition = `${phase.toFixed(3)}% 0`;
    ticks++;
  }
  function syncTicker() {
    if (disposed || lastPaused || !animatedRule) {
      if (tickTimer !== null) clearInterval(tickTimer);
      tickTimer = null;
      return;
    }
    if (tickTimer === null) {
      lastTick = performance.now(); tick();
      tickTimer = setInterval(tick, 1000 / 6);
    }
  }
  function refresh() {
    refreshTimer = null;
    if (disposed || !tokenStyle?.sheet) return;
    const start = performance.now(), rules = [];
    try {
      for (const rule of tokenStyle.sheet.cssRules) {
        if (!rule.style?.color || !/^\.mtk\d+$/.test(rule.selectorText || '')) continue;
        if (!COLORS.has(rule.style.color)) continue;
        rules.push({name: rule.selectorText, base: rule.style.color});
      }
    } catch { return; }
    const targets = rules.map(rule => `${PREFIX} .view-lines .view-line span${rule.name}`).join(',');
    const fallback = rules.flatMap(rule => [
      `${PREFIX}:has(.view-overlays .selected-text) .view-lines .view-line span${rule.name}`,
      `${PREFIX} .view-lines .view-line span${rule.name}.inline-selected-text`
    ]).join(',');
    const bases = rules.map(rule => `${PREFIX} .view-lines .view-line span${rule.name}{--swb-token-base:${rule.base}}`).join('\n');
    const css = rules.length ? bases + `
${targets}{--swb-animated-token:1;background-image:${palette};background-size:300% 100%;background-position:0% 0;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent}
${fallback}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}
@media(prefers-reduced-motion:reduce){${targets}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}}
@media(forced-colors:active){${targets}{background-image:none!important;-webkit-text-fill-color:CanvasText!important}}` : '';
    if (!runtimeStyle?.isConnected) {
      runtimeStyle = document.createElement('style');
      runtimeStyle.id = STYLE_ID;
      document.head.append(runtimeStyle);
    }
    if (css !== lastCss) { runtimeStyle.textContent = css; lastCss = css; }
    animatedRule = [...runtimeStyle.sheet.cssRules].find(rule => rule.style?.getPropertyValue('--swb-animated-token')) || null;
    syncTicker();
    matchedClasses = rules.map(rule => rule.name);
    refreshes++;
    lastRefreshMs = performance.now() - start;
  }
  function scheduleRefresh() {
    if (disposed || refreshTimer !== null) return;
    refreshTimer = setTimeout(refresh, 180);
  }
  function attachTokenStyle() {
    if (disposed) return;
    const next = document.querySelector(TOKEN_STYLE);
    if (next && next !== tokenStyle) {
      tokenObserver?.disconnect();
      tokenStyle = next;
      tokenObserver = new MutationObserver(scheduleRefresh);
      tokenObserver.observe(next, {childList: true, subtree: true, characterData: true});
      scheduleRefresh();
    }
    if (!next && tokenStyle) {
      tokenObserver?.disconnect(); tokenStyle = null;
      runtimeStyle?.remove(); runtimeStyle = null; lastCss = ''; matchedClasses = [];
      animatedRule = null; syncTicker();
    }
    if (!next && retries++ < 60 && startupTimer === null) {
      startupTimer = setTimeout(() => { startupTimer = null; attachTokenStyle(); }, 500);
    }
  }
  function markBusy(event) {
    if (!(event.target instanceof Element) || !event.target.closest('.monaco-editor')) return;
    busy = true; updatePause();
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { busy = false; busyTimer = null; updatePause(); }, 300);
  }
  function start() {
    if (disposed) return;
    document.getElementById(STYLE_ID)?.remove();
    headObserver = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && node.matches(TOKEN_STYLE)))) attachTokenStyle();
    });
    headObserver.observe(document.head, {childList: true});
    listen(window, 'focus', () => { focused = true; updatePause(); });
    listen(window, 'blur', () => { focused = false; updatePause(); });
    listen(document, 'visibilitychange', updatePause);
    listen(document, 'keydown', markBusy, {capture: true, passive: true});
    listen(document, 'wheel', markBusy, {capture: true, passive: true});
    listen(reduced, 'change', updatePause);
    updatePause(); attachTokenStyle();
  }
  function dispose() {
    disposed = true;
    clearTimeout(startupTimer); clearTimeout(refreshTimer); clearTimeout(busyTimer);
    clearInterval(tickTimer);
    tokenObserver?.disconnect(); headObserver?.disconnect();
    removers.splice(0).forEach(remove => remove());
    document.removeEventListener('DOMContentLoaded', start);
    runtimeStyle?.remove();
    if (window[KEY]?.dispose === dispose) delete window[KEY];
  }
  window[KEY] = Object.freeze({dispose, getStatus: () => ({
    matchedClasses: [...matchedClasses], refreshes, lastRefreshMs,
    paused: lastPaused, durationSeconds: 12, colorUpdatesPerSecond: 6, ticks,
    architecture: 'one low-frequency timer updates one shared CSS rule',
    codeTextRead: false, tokenNodesModified: false
  })});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
