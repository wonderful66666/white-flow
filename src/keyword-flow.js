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
  const SIGNALS = {
    [SIGNAL]: value => Object.hasOwn(PALETTES, value),
    '--white-flow-line-mist': value => ['drift', 'still'].includes(value),
    '--white-flow-line-mist-glow': value => ['on', 'off'].includes(value),
    '--white-flow-beams': value => /^\d{1,7}-\d{1,7}(,\d{1,7}-\d{1,7}){0,4}$/.test(value) &&
      value.split(',').every(pair => pair.split('-').every(line => Number(line) > 0)),
    '--white-flow-beams-rev': value => /^\d{1,10}$/.test(value),
    '--white-flow-beams-motion': value => ['on', 'still'].includes(value)
  };
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
  let enabled = false, palette = null, signalChecks = 0, signalTimer = null;
  const cachedSignalSheets = new Map();
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
    const paused = (!enabled && !drift) || document.hidden || !focused || busy || reduced.matches;
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
    const css = bases + `
${targets}{--swb-animated-token:1;background-image:${gradient};background-size:300% 100%;background-position:0% 0;background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;transition:background-position 167ms linear}
${fallback}{background-image:none!important;-webkit-text-fill-color:var(--swb-token-base)!important}
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
      if ([STYLE_ID, MIST_ID, BEAM_STYLE_ID].includes(node.id) || node.matches(TOKEN_STYLE)) excluded.add(sheet);
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
    const animate = beamMotion && !reduced.matches && lastGlintRev !== beamRev;
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
      beamSvg.style.transition = beamMotion && !reduced.matches ? 'opacity 180ms linear' : 'none';
      if (beamMotion && !reduced.matches) beamFade = setTimeout(() => { beamFade = null; if (beamSvg) beamSvg.style.opacity = '.4'; }, 2000);
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
    listen(window, 'blur', () => { focused = false; updatePause(); syncSignalTimer(); detachCursor(); disconnectBeams(); beamSvg?.remove(); beamSvg = null; });
    listen(document, 'visibilitychange', () => { checkSignal(); syncSignalTimer(); attachCursor(); attachBeams(); });
    listen(document, 'focusin', () => { attachCursor(); attachBeams(); });
    listen(window, 'resize', scheduleBeams);
    listen(document, 'scroll', scheduleBeams, { capture: true, passive: true });
    listen(document, 'keydown', markBusy, {capture: true, passive: true});
    listen(document, 'wheel', markBusy, {capture: true, passive: true});
    listen(reduced, 'change', () => { updatePause(); scheduleBeams(); });
    checkSignal(); syncSignalTimer();
  }
  function dispose() {
    disposed = true;
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
    matchedClasses: [...matchedClasses], refreshes, lastRefreshMs,
    paused: lastPaused, durationSeconds: 12, colorUpdatesPerSecond: 6, ticks,
    architecture: 'one shared 6 Hz ticker; focused visible signal checks every 1500 ms; event-batched beam layout',
    codeTextRead: false, tokenNodesModified: false
  })});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
