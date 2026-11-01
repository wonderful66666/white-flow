/* Browser-only appearance adapter. Never reads code text or changes token nodes. */
(() => {
  'use strict';
  const KEY = '__SW_KEYWORD_FLOW_B__';
  window[KEY]?.dispose?.();
  const STYLE_ID = 'swb-keyword-token-style';
  const TOKEN_STYLE = 'style.vscode-tokens-styles';
  const PREFIX = '.monaco-workbench.vs .part.editor .monaco-editor';
  const SIGNAL = '--white-flow-keyword-flow';
  const MIST_ID = 'swb-line-mist-style';
  const BEAM_STYLE_ID = 'swb-method-beam-style';
  const POLISH_ID = 'swb-polish-style';
  const SIGNALS = {
    [SIGNAL]: value => Object.hasOwn(PALETTES, value),
    '--white-flow-line-mist': value => ['drift', 'still'].includes(value),
    '--white-flow-line-mist-glow': value => ['on', 'off'].includes(value),
    '--white-flow-beams': value => /^\d{1,7}-\d{1,7}(,\d{1,7}-\d{1,7}){0,4}$/.test(value) &&
      value.split(',').every(pair => pair.split('-').every(line => Number(line) > 0)),
    '--white-flow-beams-rev': value => /^\d{1,10}$/.test(value),
    '--white-flow-beams-motion': value => ['on', 'still'].includes(value),
    '--white-flow-polish': validPolish
  };
  const COLORS = new Set(['rgb(124, 58, 237)', 'rgb(109, 32, 217)']);
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
  // Polish blocks are opt-in and owned by one style element, never native DOM edits.
  const WB = '.monaco-workbench.vs';
  const TOASTS = `${WB} > .notifications-toasts`;
  const STACK = `${TOASTS}.visible:not(:hover):not(:focus-within)`;
  const DOCK = `${WB}:not(.monaco-reduce-motion):not(.reduce-motion) .part.activitybar:not(.horizontal) > .content .composite-bar > .monaco-action-bar .action-item`;
  const STICKY_GLASS_CSS = `@media(forced-colors:none) and (prefers-reduced-transparency:no-preference){
${WB} .monaco-editor .sticky-widget:not(.peek){background-color:transparent!important;backdrop-filter:blur(8px) saturate(1.5);-webkit-backdrop-filter:blur(8px) saturate(1.5);box-shadow:inset 0 1px 0 #FFFFFF,0 1px 0 rgb(228 228 231 / .9),0 8px 18px -10px rgb(24 24 27 / .18)!important}
${WB} .sticky-widget:not(.peek) .sticky-widget-lines-scrollable,${WB} .sticky-widget:not(.peek) .sticky-widget-line-numbers{background-color:rgb(255 255 255 / .66)!important}
${WB} .sticky-widget:not(.peek) .sticky-widget-lines,${WB} .sticky-widget:not(.peek) .sticky-line-content{background-color:transparent!important}}`;
  const KEYCAPS_CSS = `@media(forced-colors:none){
${WB} .monaco-keybinding > .monaco-keybinding-key{box-sizing:content-box;background:linear-gradient(#FFFFFF,#F4F4F5);border:1px solid #D4D4D8;border-bottom:2px solid #C4C4CC;border-radius:5px;font-family:var(--monaco-monospace-font,monospace);font-size:11px;line-height:10px;font-weight:600;padding:2px 5px 3px;box-shadow:inset 0 1px 0 #FFFFFF,0 1px 2px rgb(24 24 27 / .06)}
${WB} .monaco-keybinding > .monaco-keybinding-key-separator{font-size:0;width:3px}
${WB} .monaco-keybinding > .monaco-keybinding-key-chord-separator{width:8px}}`;
  const WATERMARK = `${WB} .part.editor .editor-group-watermark-wrapper,${WB} .part.editor .editor-group-container.empty > .editor-group-watermark`;
  const watermarkTargets = suffix => WATERMARK.split(',').map(selector => selector + suffix).join(',');
  const BACKLIGHT_CSS = `@media(forced-colors:none) and (prefers-reduced-transparency:no-preference){
${WATERMARK}{position:relative;isolation:isolate;overflow:hidden}
${watermarkTargets('::before')}{content:"";position:absolute;inset:-40%;pointer-events:none;z-index:-2;background:conic-gradient(from 200deg at 50% 0%,transparent 0deg,rgb(124 58 237 / .11) 12deg,transparent 24deg,rgb(29 78 216 / .10) 38deg,transparent 52deg,rgb(3 116 113 / .09) 66deg,transparent 80deg,rgb(194 40 89 / .08) 94deg,transparent 110deg);filter:blur(6px)}
${watermarkTargets('::after')}{content:"";position:absolute;left:50%;top:52%;width:300px;height:140px;transform:translate(-50%,-50%);pointer-events:none;z-index:-1;background:radial-gradient(closest-side,rgb(165 180 252 / .30),rgb(196 181 253 / .14) 55%,transparent);filter:blur(4px)}}`;
  const TOAST_STACK_CSS = `@media(forced-colors:none){
${STACK}{display:grid;overflow:visible}
${TOASTS}.visible:hover,${TOASTS}.visible:focus-within{display:flex}
${TOASTS}.visible > .notification-toast-container{transition:transform 200ms ease-out,opacity 200ms ease-out}
${STACK} > .notification-toast-container{grid-area:1 / 1;align-self:end;transform-origin:bottom center;z-index:1}
${STACK} > .notification-toast-container:first-child{z-index:3;transform:none;opacity:1}
${STACK} > .notification-toast-container:nth-child(2){z-index:2;transform:translateY(-10px) scale(.95);opacity:.9}
${STACK} > .notification-toast-container:nth-child(n+3){transform:translateY(-20px) scale(.9);opacity:.75}
${STACK} > .notification-toast-container:not(:first-child) > .notification-toast > .notifications-list-container{visibility:hidden}
${STACK}.top-right > .notification-toast-container{align-self:start;transform-origin:top center}
${STACK}.top-right > .notification-toast-container:nth-child(2){transform:translateY(10px) scale(.95)}
${STACK}.top-right > .notification-toast-container:nth-child(n+3){transform:translateY(20px) scale(.9)}
${TOASTS} .notification-toast-container > .notification-toast{filter:blur(4px);transition:transform 300ms ease-out,opacity 300ms ease-out,filter 300ms ease-out}
${TOASTS} .notification-toast.notification-fade-in,${TOASTS} .notification-toast.notification-fade-in-done{filter:none}
${WB}.monaco-reduce-motion > .notifications-toasts .notification-toast-container,${WB}.reduce-motion > .notifications-toasts .notification-toast-container,${WB}.monaco-reduce-motion > .notifications-toasts .notification-toast,${WB}.reduce-motion > .notifications-toasts .notification-toast{transition:none!important;filter:none!important}}
@media(prefers-reduced-motion:reduce){${TOASTS} .notification-toast-container,${TOASTS} .notification-toast{transition:none!important;filter:none!important}}
@media(prefers-reduced-transparency:reduce){${TOASTS} .notification-toast{filter:none!important}}`;
  const DOCK_CSS = `@media(prefers-reduced-motion:no-preference) and (forced-colors:none){
${DOCK}{overflow:visible}
${DOCK} .action-label{transform-origin:center;transition:transform 120ms ease-out}
${DOCK}:hover .action-label,${DOCK}:focus-visible .action-label,${DOCK}:has(.action-label:focus-visible) .action-label{transform:scale(1.25)!important}
${DOCK}:hover + .action-item .action-label,${DOCK}:focus-visible + .action-item .action-label,${DOCK}:has(.action-label:focus-visible) + .action-item .action-label,${DOCK}:has(+ .action-item:hover) .action-label,${DOCK}:has(+ .action-item:focus-visible) .action-label,${DOCK}:has(+ .action-item .action-label:focus-visible) .action-label{transform:scale(1.1)}}`;
  const SAVE_SHINE_CSS = `@property --wf-save-ring-size{syntax:'<length>';initial-value:0px;inherits:false}
@property --wf-save-ring-alpha{syntax:'<number>';initial-value:0;inherits:false}` + [0, 1].map(index => `
@keyframes wf-save-shine-${index}{from{background-position:100% 0}to{background-position:0% 0}}
@keyframes wf-save-ring-${index}{from{--wf-save-ring-size:3px;--wf-save-ring-alpha:.25}to{--wf-save-ring-size:0px;--wf-save-ring-alpha:0}}`).join('') +
    `@media(prefers-reduced-transparency:reduce){${WB} .editor-group-container.active .tab.active{--wf-save-ring-alpha:0!important}}`;
  const CELEBRATE_CSS = `#swb-celebrate{position:fixed;pointer-events:none;z-index:2000;width:0;height:0}
#swb-celebrate > span{position:absolute;pointer-events:none;animation:wf-confetti 900ms ease-out both}
@keyframes wf-confetti{0%{transform:translate(0,0) rotate(0deg);opacity:1}55%{transform:translate(calc(var(--wf-cx) * .55),var(--wf-cy)) rotate(calc(var(--wf-cr) * .55));opacity:1}100%{transform:translate(var(--wf-cx),24px) rotate(var(--wf-cr));opacity:0}}
@media(prefers-reduced-motion:reduce),(forced-colors:active){#swb-celebrate{display:none}}`;
  // The outer editor-container is unpositioned in 1.98.2; Monaco already supplies
  // a positioned containing block. Only the owned pseudo-element has dimensions.
  const ENGRAVED_CSS = `@media(forced-colors:none){
${WB} .part.sidebar.left,${WB} .part.activitybar.left{box-shadow:1px 0 0 #FFFFFF}
${WB} .part.sidebar.right,${WB} .part.activitybar.right{box-shadow:-1px 0 0 #FFFFFF}
${WB} .part.editor > .content .editor-group-container > .title{box-shadow:0 1px 0 #FFFFFF}
${WB} .part.panel,${WB} .part.statusbar{box-shadow:inset 0 1px 0 #FFFFFF}
${WB} .tabs-container > .tab.active{box-shadow:inset 0 1px 0 #FFFFFF,0 1px 3px rgb(24 24 27 / .03)}
${WB} .part.editor > .content .editor-group-container:not(.empty) > .editor-container .monaco-editor:not(.monaco-editor .monaco-editor)::before{content:"";position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(rgb(23 26 33 / .07),transparent);pointer-events:none;z-index:4}
${WB} .part.editor .monaco-editor .margin{box-shadow:inset -1px 0 0 var(--vscode-editorGroup-border)}}`;
  const POLISH_CSS = Object.freeze({ engraved: ENGRAVED_CSS, 'sticky-glass': STICKY_GLASS_CSS, keycaps: KEYCAPS_CSS,
    backlight: BACKLIGHT_CSS, 'toast-stack': TOAST_STACK_CSS, 'save-shine': SAVE_SHINE_CSS,
    celebrate: CELEBRATE_CSS, dock: DOCK_CSS });
  function validPolish(value) {
    if (!/^[a-z-]+( [a-z-]+)*$/.test(value)) return false;
    const tokens = value.split(' ');
    return tokens.every(token => Object.hasOwn(POLISH_CSS, token)) && [...new Set(tokens)].sort().join(' ') === value;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  let enabled = false, palette = null, signalChecks = 0, signalTimer = null;
  const cachedSignalSheets = new Map();
  let polish = '', polishStyle = null, workbenchObserver = null, workbenchRoot = null;
  let saveObserver = null, saveContainers = [], saveTab = null, saveAt = -Infinity, saveArmTimer = null;
  let shineTimer = null, shineRules = [], shineTarget = null, shineNonce = 0, shines = 0;
  let problems = null, problemsObserver = null, statusObserver = null, statusRoot = null, errorCount = null;
  let settleTimer = null, burstTimer = null, confetti = null, lastBurst = -Infinity, bursts = 0;
  // Line Mist: only shared stylesheet rules are changed; editor rows are never modified.
  let lineMist = false, drift = false, glow = false, mistStyle = null, mistRule = null, cursorRule = null;
  let mistPhase = 0, mistUpdates = 0, cursorUpdates = 0, cursorObserver = null, cursorLayer = null, cursorTimer = null;
  // WHITE-FLOW:METHOD-BEAMS -- the only drawing surface is an owned body-level SVG.
  let beams = null, beamRev = null, beamMotion = true, beamSvg = null, beamStyle = null, beamEditor = null;
  let beamObserver = null, widgetObserver = null, beamResize = null, beamFrame = null, beamFade = null, beamGlint = null;
  let lastGlintRev = null, beamSuppressed = false, beamDraws = 0;
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
    const paused = (!enabled && !drift) || document.hidden || !focused || busy || motionReduced();
    lastPaused = paused;
    if (animatedRule) animatedRule.style.transition = paused ? 'none' : 'background-position 167ms linear';
    if (mistRule) mistRule.style.transition = paused || !drift ? 'none' : 'background-position 167ms linear';
    syncTicker();
  }
  function tick() {
    if (lastPaused || disposed) return;
    const now = performance.now();
    const elapsed = Math.min(1000, now - lastTick);
    if (enabled && animatedRule) {
      phase = (phase + elapsed * 300 / 12000) % 300;
      animatedRule.style.backgroundPosition = `${phase.toFixed(3)}% 0`;
      ticks++;
    }
    if (drift && mistRule) {
      mistPhase = (mistPhase + elapsed * 50 / 1000) % 1200;
      mistRule.style.backgroundPosition = `${(-mistPhase).toFixed(3)}px 0`;
      mistUpdates++;
    }
    lastTick = now;
  }
  function syncTicker() {
    if (disposed || lastPaused || !(enabled && animatedRule || drift && mistRule)) {
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
    const reducedTargets = targets.split(',').flatMap(selector => ['monaco-reduce-motion', 'reduce-motion'].map(name =>
      selector.replace(WB, `${WB}.${name}`))).join(',');
    const css = bases + `
${targets}{--swb-animated-token:1;background-image:${gradient};background-size:300% 100%;background-position:0% 0;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;transition:background-position 167ms linear}
${fallback}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}
${reducedTargets}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important;transition:none!important}
@media(prefers-reduced-motion:reduce){${targets}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important;transition:none!important}}
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
  function readSignal(sheet, property, memo) {
    try {
      if (!memo.has(sheet)) memo.set(sheet, [...sheet.cssRules]);
      for (const rule of memo.get(sheet)) {
        const value = rule.style?.getPropertyValue(property).trim();
        if (value && SIGNALS[property](value)) return value;
      }
    } catch { memo.set(sheet, []); }
    return null;
  }
  function signalSheets() {
    const sheets = [], excluded = new Set();
    for (const node of document.head.querySelectorAll('style')) {
      let sheet;
      try { sheet = node.sheet; } catch { continue; }
      if (!sheet) continue;
      if ([STYLE_ID, MIST_ID, BEAM_STYLE_ID, POLISH_ID].includes(node.id) || node.matches(TOKEN_STYLE)) excluded.add(sheet);
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
    const memo = new Map();
    function get(property) {
      const cached = cachedSignalSheets.get(property);
      let value = cached && sheets.includes(cached) ? readSignal(cached, property, memo) : null;
      if (!value) {
        cachedSignalSheets.delete(property);
        for (const sheet of sheets) {
          value = readSignal(sheet, property, memo);
          if (value) { cachedSignalSheets.set(property, sheet); break; }
        }
      }
      return value;
    }
    const next = get(SIGNAL);
    if (next !== palette) {
      palette = next; enabled = next !== null;
      if (enabled) { attachTokenStyle(); scheduleRefresh(); }
      else { phase = 0; stopTokenTracking(); }
    }
    const mist = get('--white-flow-line-mist'), nextGlow = get('--white-flow-line-mist-glow') === 'on';
    if (lineMist !== !!mist || drift !== (mist === 'drift') || glow !== (!!mist && nextGlow)) {
      lineMist = !!mist; drift = mist === 'drift'; glow = lineMist && nextGlow;
      refreshMist();
    }
    attachCursor();
    const nextBeams = get('--white-flow-beams'), nextRev = get('--white-flow-beams-rev');
    const nextMotion = get('--white-flow-beams-motion') !== 'still';
    if (beams !== nextBeams || beamRev !== nextRev || beamMotion !== nextMotion) {
      beams = nextRev !== null ? nextBeams : null; beamRev = nextRev; beamMotion = nextMotion;
      beamSuppressed = false;
      if (!beams) stopBeams(); else { attachBeams(); scheduleBeams(); }
    } else if (beams) attachBeams();
    const nextPolish = get('--white-flow-polish') || '';
    if (nextPolish !== polish) { polish = nextPolish; refreshPolish(); }
    syncPolishObservers(); syncWorkbenchObserver();
    updatePause();
  }
  function syncSignalTimer() {
    if (disposed || !focused || document.hidden) {
      if (signalTimer !== null) clearInterval(signalTimer);
      signalTimer = null;
    } else if (signalTimer === null) signalTimer = setInterval(checkSignal, 1500);
  }
  function markBusy(event) {
    if ((!enabled && !lineMist && !beams) || !(event.target instanceof Element) || !event.target.closest('.monaco-editor')) return;
    if (beams) { beamSuppressed = true; if (beamSvg) beamSvg.style.visibility = 'hidden'; }
    busy = true; updatePause();
    clearTimeout(busyTimer);
    busyTimer = setTimeout(() => { busy = false; busyTimer = null; updatePause(); }, 300);
  }

  function motionReduced() {
    const root = document.querySelector('.monaco-workbench');
    return reduced.matches || !!root?.classList?.contains('monaco-reduce-motion') || !!root?.classList?.contains('reduce-motion');
  }

  function canAnimate() { return !disposed && focused && !document.hidden && !motionReduced(); }
  function hasPolish(token) { return (` ${polish} `).includes(` ${token} `); }

  function syncWorkbenchObserver() {
    const root = enabled || lineMist || beams || polish ? document.querySelector('.monaco-workbench') : null;
    if (root === workbenchRoot) return;
    workbenchObserver?.disconnect(); workbenchObserver = null; workbenchRoot = root;
    if (root) {
      workbenchObserver = new MutationObserver(() => {
        updatePause();
        if (motionReduced()) { clearShine(); clearBurst(); clearTimeout(settleTimer); settleTimer = null; errorCount = null; }
        syncPolishObservers(); scheduleBeams();
      });
      workbenchObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function refreshPolish() {
    stopSaveObserver(); stopProblemsObserver();
    polishStyle?.remove(); polishStyle = null;
    if (!polish) return;
    polishStyle = document.createElement('style'); polishStyle.id = POLISH_ID;
    polishStyle.textContent = polish.split(' ').map(token => POLISH_CSS[token]).join('\n');
    document.head.append(polishStyle);
  }

  function syncPolishObservers() {
    if (hasPolish('save-shine') && canAnimate()) syncSaveObserver(); else stopSaveObserver();
    if (hasPolish('celebrate') && canAnimate()) syncProblemsObserver(); else stopProblemsObserver();
  }

  function activeTab(tab) {
    return !!tab?.isConnected && !!tab.matches?.('.tab.active') && !!tab.closest?.('.editor-group-container.active');
  }

  function clearSaveArm() {
    clearTimeout(saveArmTimer); saveArmTimer = null; saveTab = null; saveAt = -Infinity;
  }

  function syncSaveObserver() {
    const containers = [...document.querySelectorAll(`${WB} .part.editor .tabs-container`)];
    if (containers.length === saveContainers.length && containers.every((node, i) => node === saveContainers[i])) return;
    saveObserver?.disconnect(); saveContainers = containers;
    saveObserver = new MutationObserver(records => {
      if (shineTarget && !activeTab(shineTarget)) clearShine();
      for (const record of records) {
        const tab = record.target;
        if (tab !== saveTab || !activeTab(tab) || !/(?:^|\s)dirty(?:\s|$)/.test(record.oldValue || '') ||
          tab.classList.contains('dirty') || performance.now() - saveAt > 1500) continue;
        clearSaveArm(); playShine(tab); break;
      }
    });
    const options = { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true };
    for (const container of containers) {
      saveObserver.observe(container, options);
      const group = container.closest?.('.editor-group-container');
      if (group) saveObserver.observe(group, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function armSave(event) {
    if (!hasPolish('save-shine') || !canAnimate() || event.repeat || event.isComposing || event.shiftKey ||
      !(event.ctrlKey || event.metaKey) || String(event.key || '').toLowerCase() !== 's') return;
    syncSaveObserver(); clearSaveArm();
    const tab = document.querySelector(`${WB} .part.editor .editor-group-container.active .tabs-container > .tab.active.dirty`);
    if (!activeTab(tab) || !tab.querySelector?.('.label-name')) return;
    saveTab = tab; saveAt = performance.now();
    saveArmTimer = setTimeout(clearSaveArm, 1500);
  }

  function clearShine() {
    clearTimeout(shineTimer); shineTimer = null; shineTarget = null;
    try {
      for (const rule of shineRules) {
        const index = [...(polishStyle?.sheet?.cssRules || [])].indexOf(rule);
        if (index >= 0) polishStyle.sheet.deleteRule(index);
      }
    } catch { /* A removed or rejected owned sheet has nothing to restore. */ }
    shineRules = [];
  }

  function playShine(tab) {
    if (!hasPolish('save-shine') || !canAnimate() || !activeTab(tab) || !polishStyle?.sheet) return;
    const gradient = 'linear-gradient(100deg, #27272A 0% 32%, #6366F1 42%, #A5B4FC 50%, #6366F1 58%, #27272A 68% 100%)';
    if (!supportsGradient(gradient)) return;
    clearShine(); shineNonce = 1 - shineNonce; shineTarget = tab;
    const target = `${WB}:not(.monaco-reduce-motion):not(.reduce-motion) .part.editor .editor-group-container.active .tabs-container > .tab.active`;
    try {
      for (const css of [
        `${target} .label-name{background-image:${gradient};background-size:260% 100%;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:wf-save-shine-${shineNonce} 600ms ease-out both}`,
        `${target}{box-shadow:0 0 0 var(--wf-save-ring-size) rgb(196 181 253 / var(--wf-save-ring-alpha))!important;animation:wf-save-ring-${shineNonce} 600ms ease-out both}`
      ]) {
        const index = polishStyle.sheet.insertRule(css, polishStyle.sheet.cssRules.length);
        shineRules.push(polishStyle.sheet.cssRules[index]);
      }
      shines++; shineTimer = setTimeout(clearShine, 600);
    } catch { clearShine(); }
  }

  function stopSaveObserver() {
    saveObserver?.disconnect(); saveObserver = null; saveContainers = [];
    clearSaveArm(); clearShine();
  }

  function syncProblemsObserver() {
    const item = document.getElementById('status.problems');
    if (item !== problems) {
      clearBurst();
      problemsObserver?.disconnect(); problemsObserver = null;
      clearTimeout(settleTimer); settleTimer = null; errorCount = null; problems = item;
      if (item) {
        problemsObserver = new MutationObserver(readProblems);
        problemsObserver.observe(item, { childList: true, characterData: true, subtree: true }); readProblems();
      }
    }
    const parent = item?.closest?.('.part.statusbar') || item?.parentElement || null;
    if (parent !== statusRoot) {
      statusObserver?.disconnect(); statusObserver = null; statusRoot = parent;
      if (parent) {
        statusObserver = new MutationObserver(() => {
          if (document.getElementById('status.problems') !== problems) syncProblemsObserver();
        });
        statusObserver.observe(parent, { childList: true, subtree: true });
      }
    }
  }

  function problemCount() {
    const match = problems?.textContent?.match(/\d+/);
    const value = match ? Number(match[0]) : null;
    return Number.isSafeInteger(value) ? value : null;
  }

  function readProblems() {
    const count = problemCount(), previous = errorCount; errorCount = count;
    if (count !== 0) { clearTimeout(settleTimer); settleTimer = null; return; }
    if (!(previous > 0) || !canAnimate() || performance.now() - lastBurst < 30000) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (hasPolish('celebrate') && canAnimate() && !busy && problemCount() === 0 && performance.now() - lastBurst >= 30000) playBurst();
    }, 800);
  }

  function clearBurst() {
    clearTimeout(burstTimer); burstTimer = null; confetti?.remove(); confetti = null;
  }

  function playBurst() {
    if (!problems?.isConnected || !polishStyle?.isConnected || !polishStyle.sheet) return;
    const rect = problems.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    clearBurst();
    confetti = document.createElement('div'); confetti.id = 'swb-celebrate'; confetti.setAttribute('aria-hidden', 'true');
    confetti.style.left = `${rect.left + rect.width / 2}px`; confetti.style.top = `${rect.top}px`;
    const colors = ['#7C3AED', '#1D4ED8', '#037471', '#C22859', '#9A5702', '#C4B5FD'];
    for (let i = 0; i < 26; i++) {
      const particle = document.createElement('span'), circle = i % 4 === 0;
      particle.style.width = circle ? '5px' : '6px'; particle.style.height = circle ? '5px' : '3px';
      particle.style.borderRadius = circle ? '50%' : '1px'; particle.style.backgroundColor = colors[i % colors.length];
      particle.style.setProperty('--wf-cx', `${((i % 13) - 6) * 12}px`);
      particle.style.setProperty('--wf-cy', `${-45 - (i * 17 % 55)}px`);
      particle.style.setProperty('--wf-cr', `${(i % 2 ? 1 : -1) * (90 + i * 19)}deg`);
      confetti.append(particle);
    }
    document.body.append(confetti); lastBurst = performance.now(); bursts++;
    burstTimer = setTimeout(clearBurst, 900);
  }

  function stopProblemsObserver() {
    problemsObserver?.disconnect(); statusObserver?.disconnect(); problemsObserver = null; statusObserver = null;
    problems = null; statusRoot = null; errorCount = null;
    clearTimeout(settleTimer); settleTimer = null; clearBurst();
  }

  function markedRule(style, marker) {
    try {
      const pending = [...style.sheet.cssRules];
      while (pending.length) {
        const rule = pending.shift();
        if (rule.style?.getPropertyValue(marker)) return rule;
        if (rule.cssRules) pending.push(...rule.cssRules);
      }
    } catch { /* A rejected stylesheet has no enhancement. */ }
    return null;
  }

  function refreshMist() {
    detachCursor();
    mistStyle?.remove(); mistStyle = null; mistRule = null; cursorRule = null;
    if (!lineMist) { mistPhase = 0; detachCursor(); syncTicker(); return; }
    const raw = 'linear-gradient(90deg in oklch, rgb(124 58 237 / .08) 0%, rgb(29 78 216 / .075) 12.5%, rgb(3 116 113 / .065) 25%, rgb(194 40 89 / .06) 37.5%, rgb(124 58 237 / .08) 50%, rgb(29 78 216 / .075) 62.5%, rgb(3 116 113 / .065) 75%, rgb(194 40 89 / .06) 87.5%, rgb(124 58 237 / .08) 100%)';
    const band = oklchSupported ? raw : raw.replace(' in oklch', '');
    if (!supportsGradient(band)) { detachCursor(); syncTicker(); return; }
    const rows = `${PREFIX} .view-overlays .current-line,${PREFIX} .margin-view-overlays .current-line-margin`;
    const bands = `${PREFIX} .view-overlays .current-line::before,${PREFIX} .margin-view-overlays .current-line-margin::before`;
    const glowTarget = `${PREFIX}.focused .view-overlays .current-line::after`;
    const feather = 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)';
    mistStyle = document.createElement('style'); mistStyle.id = MIST_ID;
    mistStyle.textContent = `@media(forced-colors:none){
${rows}{background-color:transparent!important;border-color:transparent!important}
${bands}{--wf-mist-band:1;content:"";position:absolute;inset:-8px 0;pointer-events:none;background-image:${band};background-size:2400px 100%;background-repeat:repeat-x;background-position:${-mistPhase}px 0;-webkit-mask-image:${feather};mask-image:${feather};transition:${drift ? 'background-position 167ms linear' : 'none'}}
${PREFIX}.focused .view-overlays .current-line{--wf-mist-cursor:1;--wf-mist-x:-9999px}
${glowTarget}{content:${glow ? '""' : 'none'};position:absolute;inset:-8px 0;pointer-events:none;background-image:radial-gradient(ellipse 260px 30px at var(--wf-mist-x,-9999px) 50%,rgb(129 140 248 / .06),rgb(129 140 248 / .02) 55%,transparent);-webkit-mask-image:${feather};mask-image:${feather}}}
@media(prefers-reduced-motion:reduce){${bands}{transition:none!important}}`;
    document.head.append(mistStyle);
    mistRule = markedRule(mistStyle, '--wf-mist-band'); cursorRule = markedRule(mistStyle, '--wf-mist-cursor');
    syncTicker();
  }

  function detachCursor() {
    cursorObserver?.disconnect(); cursorObserver = null; cursorLayer = null;
    clearTimeout(cursorTimer); cursorTimer = null;
  }

  function attachCursor() {
    const editor = lineMist && glow && cursorRule && focused && !document.hidden ? document.querySelector(`${PREFIX}.focused`) : null;
    const layer = editor?.querySelector?.('.cursors-layer') || null;
    if (layer === cursorLayer) return;
    detachCursor();
    if (!layer) return;
    cursorLayer = layer;
    cursorObserver = new MutationObserver(scheduleCursor);
    cursorObserver.observe(layer, { attributes: true, subtree: true, childList: true });
    scheduleCursor();
  }

  function scheduleCursor() {
    if (disposed || !glow || cursorTimer !== null) return;
    cursorTimer = setTimeout(() => {
      cursorTimer = null;
      const cursor = cursorLayer?.querySelector?.('.cursor') || cursorLayer?.firstElementChild;
      const raw = cursor?.style?.left || '';
      const value = /^-?\d+(?:\.\d+)?px$/.test(raw) ? Number.parseFloat(raw) : -9999;
      if (cursorRule && Number.isFinite(value) && Math.abs(value) <= 10000000) {
        cursorRule.style.setProperty('--wf-mist-x', `${value}px`); cursorUpdates++;
      }
    }, 1000 / 6);
  }

  function scheduleBeams() {
    if (disposed || !beams || !focused || document.hidden || beamFrame !== null) return;
    // One frame per event batch, never a self-scheduling animation loop.
    beamFrame = requestAnimationFrame(() => {
      beamFrame = null;
      try { renderBeams(); } catch { beamSvg?.remove(); beamSvg = null; }
    });
  }

  function attachBeams() {
    const editor = beams && focused && !document.hidden ? document.querySelector(`${PREFIX}.focused`) : null;
    if (editor === beamEditor) return;
    disconnectBeams(); beamEditor = editor;
    if (!editor) { beamSvg?.remove(); beamSvg = null; return; }
    const margin = editor.querySelector?.('.margin-view-overlays');
    if (margin) {
      beamObserver = new MutationObserver(scheduleBeams);
      beamObserver.observe(margin, { childList: true, attributes: true, characterData: true, subtree: true });
    }
    if (typeof ResizeObserver !== 'undefined') { beamResize = new ResizeObserver(scheduleBeams); beamResize.observe(editor); }
    widgetObserver = new MutationObserver(records => {
      if (records.some(record => !record.target?.closest?.('#swb-method-beams') &&
        (record.target?.closest?.('.suggest-widget,.monaco-hover,.find-widget,.peekview-widget') ||
        [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element &&
          node.matches('.suggest-widget,.monaco-hover,.find-widget,.peekview-widget'))))) scheduleBeams();
    });
    widgetObserver.observe(document.body, { childList: true, attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
    scheduleBeams();
  }

  function disconnectBeams() {
    beamObserver?.disconnect(); widgetObserver?.disconnect(); beamResize?.disconnect();
    beamObserver = null; widgetObserver = null; beamResize = null; beamEditor = null;
    if (beamFrame !== null) cancelAnimationFrame(beamFrame); beamFrame = null;
  }

  function stopBeams() {
    disconnectBeams(); clearTimeout(beamFade); clearTimeout(beamGlint); beamFade = null; beamGlint = null;
    beamSvg?.remove(); beamStyle?.remove(); beamSvg = null; beamStyle = null; lastGlintRev = null;
  }

  function svgNode(name, attributes = {}, parent) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    parent?.append(node); return node;
  }

  function renderBeams() {
    if (!beams || !beamEditor || !focused || document.hidden || disposed) return;
    const widgets = document.querySelectorAll('.suggest-widget,.monaco-hover,.find-widget,.peekview-widget');
    const covered = [...widgets].some(node => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (covered || beamSuppressed) { if (beamSvg) beamSvg.style.visibility = 'hidden'; return; }
    const anchors = [...beamEditor.querySelectorAll('.margin-view-overlays .line-numbers')].map(node => {
      const text = node.textContent.trim(), rect = node.parentElement.getBoundingClientRect();
      return /^\d+$/.test(text) && rect.height > 0 ? { line: Number(text), rect } : null;
    });
    if (!anchors.length || anchors.some(anchor => !anchor)) { beamSvg?.remove(); beamSvg = null; return; }
    anchors.sort((a, b) => a.rect.top - b.rect.top);
    const bounds = beamEditor.getBoundingClientRect(), margin = beamEditor.querySelector('.margin')?.getBoundingClientRect();
    if (!margin || bounds.height <= 0) { beamSvg?.remove(); beamSvg = null; return; }
    const visible = anchors.filter(anchor => anchor.rect.bottom > bounds.top && anchor.rect.top < bounds.bottom);
    if (!visible.length) { beamSvg?.remove(); beamSvg = null; return; }
    if (visible.some((anchor, i) => anchor.line < 1 || i > 0 && anchor.line <= visible[i - 1].line)) {
      beamSvg?.remove(); beamSvg = null; return;
    }
    const height = Math.min(...visible.map(anchor => anchor.rect.height));
    const linear = visible.every((anchor, i) => i === 0 ||
      Math.abs((anchor.line - visible[i - 1].line) * height - (anchor.rect.top - visible[i - 1].rect.top)) < 1);
    const endpoint = line => {
      const exact = visible.find(anchor => anchor.line === line);
      const guess = visible[0].rect.top + (line - visible[0].line) * height + height / 2;
      if (exact && Math.abs(exact.rect.height - height) < 1) return { y: Math.max(bounds.top + 8, Math.min(bounds.bottom - 8, exact.rect.top + exact.rect.height / 2)), chip: false };
      return { y: line < visible[0].line || linear && guess < bounds.top ? bounds.top + 10 : bounds.bottom - 10, chip: true };
    };
    if (!beamStyle) {
      beamStyle = document.createElement('style'); beamStyle.id = BEAM_STYLE_ID;
      beamStyle.textContent = '#swb-method-beams{position:fixed;inset:0;pointer-events:none;z-index:4;overflow:visible}' +
        '@media(prefers-reduced-motion:reduce){#swb-method-beams{transition:none!important}#swb-method-beams .wf-glint{display:none}}' +
        '@media(forced-colors:active){#swb-method-beams path{stroke:CanvasText!important;filter:none!important}#swb-method-beams .wf-glint{display:none}}';
      document.head.append(beamStyle);
    }
    if (!beamSvg) { beamSvg = svgNode('svg', { id: 'swb-method-beams', 'aria-hidden': 'true' }); document.body.append(beamSvg); }
    beamSvg.style.visibility = 'visible'; beamSvg.setAttribute('width', window.innerWidth); beamSvg.setAttribute('height', window.innerHeight);
    beamSvg.replaceChildren();
    const defs = svgNode('defs', {}, beamSvg), clip = svgNode('clipPath', { id: 'wf-beam-clip' }, defs);
    svgNode('rect', { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }, clip);
    const filter = svgNode('filter', { id: 'wf-beam-shadow', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
    svgNode('feDropShadow', { dx: .4, dy: .7, stdDeviation: .7, 'flood-color': '#18181B', 'flood-opacity': .22 }, filter);
    const group = svgNode('g', { 'clip-path': 'url(#wf-beam-clip)' }, beamSvg);
    const animate = beamMotion && !motionReduced() && lastGlintRev !== beamRev;
    beams.split(',').forEach((pair, i) => {
      const [from, to] = pair.split('-').map(Number), call = endpoint(from), definition = endpoint(to);
      const lane = margin.right - 14 - i * 3, x = lane + 16, sign = Math.sign(definition.y - call.y) || 1;
      const radius = Math.min(10, Math.abs(definition.y - call.y) / 2);
      const d = `M${x} ${call.y}H${lane + radius}Q${lane} ${call.y} ${lane} ${call.y + sign * radius}V${definition.y - sign * radius}Q${lane} ${definition.y} ${lane + radius} ${definition.y}H${x}`;
      const gradient = svgNode('linearGradient', { id: `wf-silver-${i}`, gradientUnits: 'userSpaceOnUse', x1: lane, x2: lane, y1: call.y, y2: definition.y }, defs);
      ['#D4D4D8', '#F4F4F5', '#A1A1AA', '#E4E4E7', '#8B8B95', '#C4C4CC'].forEach((color, n) =>
        svgNode('stop', { offset: [0, .18, .42, .60, .82, 1][n], 'stop-color': color }, gradient));
      svgNode('path', { d, fill: 'none', stroke: `url(#wf-silver-${i})`, 'stroke-width': 2.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#wf-beam-shadow)' }, group);
      svgNode('path', { d, fill: 'none', stroke: '#FFFFFF', 'stroke-opacity': .75, 'stroke-width': .7, transform: 'translate(-.6 -.6)' }, group);
      svgNode('path', { d: `M${x - 4} ${definition.y - 3}L${x} ${definition.y} ${x - 4} ${definition.y + 3}`, fill: 'none', stroke: '#8B8B95', 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, group);
      for (const [line, end] of [[from, call], [to, definition]]) if (end.chip) {
        const width = 19 + String(line).length * 7, chip = svgNode('g', {}, group);
        svgNode('rect', { x: x + 4, y: end.y - 8, width, height: 16, rx: 8, fill: '#F4F4F5', stroke: '#E4E4E7' }, chip);
        const label = svgNode('text', { x: x + 10, y: end.y + 4, fill: '#52525B', 'font-size': 11 }, chip); label.textContent = `L${line}`;
      }
      if (animate) {
        const light = svgNode('radialGradient', { id: `wf-glint-${i}` }, defs);
        svgNode('stop', { offset: 0, 'stop-color': '#FFFFFF' }, light);
        svgNode('stop', { offset: .45, 'stop-color': '#FFFFFF', 'stop-opacity': .85 }, light);
        svgNode('stop', { offset: 1, 'stop-color': '#FFFFFF', 'stop-opacity': 0 }, light);
        const glint = svgNode('g', { class: 'wf-glint' }, group);
        svgNode('ellipse', { rx: 16, ry: 5, fill: '#18181B', 'fill-opacity': .05 }, glint);
        svgNode('ellipse', { rx: 14, ry: 3.4, fill: `url(#wf-glint-${i})` }, glint);
        svgNode('circle', { r: 1.4, fill: '#FFFFFF' }, glint);
        const motion = svgNode('animateMotion', { begin: 'indefinite', dur: '420ms', path: d, rotate: 'auto', fill: 'freeze' }, glint);
        motion.beginElement?.();
      }
    });
    if (lastGlintRev !== beamRev) {
      clearTimeout(beamFade); clearTimeout(beamGlint); beamSvg.style.opacity = '1';
      beamSvg.style.transition = beamMotion && !motionReduced() ? 'opacity 180ms linear' : 'none';
      if (beamMotion && !motionReduced()) beamFade = setTimeout(() => { beamFade = null; if (beamSvg) beamSvg.style.opacity = '.4'; }, 2000);
      if (animate) beamGlint = setTimeout(() => { beamGlint = null; beamSvg?.querySelectorAll('.wf-glint').forEach(node => node.remove()); }, 450);
      lastGlintRev = beamRev;
    }
    beamDraws++;
  }
  function start() {
    if (disposed) return;
    document.getElementById(STYLE_ID)?.remove();
    headObserver = new MutationObserver(records => {
      if (enabled && records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
        node instanceof Element && node.matches(TOKEN_STYLE)))) attachTokenStyle();
    });
    headObserver.observe(document.head, {childList: true});
    listen(window, 'focus', () => { focused = true; checkSignal(); syncSignalTimer(); attachCursor(); attachBeams(); });
    listen(window, 'blur', () => { focused = false; updatePause(); syncSignalTimer(); detachCursor(); disconnectBeams(); beamSvg?.remove(); beamSvg = null; syncPolishObservers(); });
    listen(document, 'visibilitychange', () => { checkSignal(); syncSignalTimer(); attachCursor(); attachBeams(); });
    listen(document, 'focusin', () => { attachCursor(); attachBeams(); if (shineTarget && !activeTab(shineTarget)) clearShine(); });
    listen(window, 'resize', scheduleBeams);
    listen(document, 'scroll', scheduleBeams, { capture: true, passive: true });
    listen(document, 'keydown', event => { armSave(event); markBusy(event); }, {capture: true, passive: true});
    listen(document, 'wheel', markBusy, {capture: true, passive: true});
    listen(reduced, 'change', () => { updatePause(); syncPolishObservers(); scheduleBeams(); });
    checkSignal(); syncSignalTimer();
  }
  function dispose() {
    disposed = true;
    stopSaveObserver(); stopProblemsObserver(); polishStyle?.remove(); polishStyle = null; polish = '';
    workbenchObserver?.disconnect(); workbenchObserver = null; workbenchRoot = null;
    enabled = false; palette = null; lastPaused = true;
    lineMist = false; drift = false; glow = false; detachCursor(); mistStyle?.remove(); mistStyle = null; mistRule = null;
    stopBeams(); beams = null; cursorRule = null;
    clearTimeout(busyTimer); clearInterval(signalTimer); signalTimer = null;
    stopTokenTracking();
    headObserver?.disconnect(); cachedSignalSheets.clear();
    removers.splice(0).forEach(remove => remove());
    document.removeEventListener('DOMContentLoaded', start);
    if (window[KEY]?.dispose === dispose) delete window[KEY];
  }
  window[KEY] = Object.freeze({dispose, getStatus: () => ({
    enabled, palette, signalChecks,
    lineMist, drift, glow, mistUpdates, cursorUpdates, beamDraws,
    polish: polish ? polish.split(' ') : [], shines, bursts,
    matchedClasses: [...matchedClasses], refreshes, lastRefreshMs,
    paused: lastPaused, durationSeconds: 12, colorUpdatesPerSecond: 6, ticks,
    architecture: 'one shared 6 Hz ticker; focused visible signal checks every 1500 ms; event-batched beam layout',
    codeTextRead: false, tokenNodesModified: false
  })});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
