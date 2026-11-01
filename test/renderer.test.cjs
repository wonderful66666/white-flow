'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const SOURCE = fs.readFileSync(path.resolve(__dirname, '../src/keyword-flow.js'), 'utf8');
const KEY = '__SW_KEYWORD_FLOW_B__';
const STYLE_ID = 'swb-keyword-token-style';
const PROPERTY = '--white-flow-keyword-flow';

function renderer(options = {}) {
  const intervals = new Map(), timeouts = new Map();
  let nextId = 0, clock = 0;
  class Events {
    constructor() { this.handlers = new Map(); }
    addEventListener(name, handler) {
      if (!this.handlers.has(name)) this.handlers.set(name, new Set());
      this.handlers.get(name).add(handler);
    }
    removeEventListener(name, handler) { this.handlers.get(name)?.delete(handler); }
    emit(name, event = {}) { for (const handler of this.handlers.get(name) || []) handler(event); }
  }
  const head = {
    nodes: [],
    append(node) { node.isConnected = true; node.parentElement = this; this.nodes.push(node); },
    querySelectorAll() { return [...this.nodes]; }
  };
  const body = { nodes: [], append: head.append, querySelectorAll: head.querySelectorAll };
  const observers = new Set();
  class Element {
    constructor(name = 'style') {
      this.name = name; this.id = ''; this.className = ''; this.isConnected = false;
      this.sheet = {
        cssRules: [],
        insertRule(cssText, index = 0) { this.cssRules.splice(index, 0, { cssText, style: { getPropertyValue: () => '' } }); return index; },
        deleteRule(index) { this.cssRules.splice(index, 1); }
      };
      this.nodes = []; this.attributes = {}; this.parts = {};
      this.style = { setProperty(key, value) { this[key] = value; } };
      this.rect = { left: 0, right: 100, top: 0, bottom: 20, width: 100, height: 20 };
    }
    get classList() { return { contains: value => this.className.split(/\s+/).includes(value) }; }
    matches(selector) {
      if (selector === 'style.vscode-tokens-styles') return this.className === 'vscode-tokens-styles';
      if (selector.startsWith('.') && !selector.includes(' ')) return selector.slice(1).split('.').every(name => this.classList.contains(name));
      return selector === this.name;
    }
    closest(selector) {
      if (selector === '.monaco-editor' && this.editor) return this;
      for (let node = this; node; node = node.parentElement) if (node.matches?.(selector)) return node;
      return null;
    }
    remove() { this.isConnected = false; if (this.parentElement?.nodes) this.parentElement.nodes = this.parentElement.nodes.filter(node => node !== this); }
    append(node) { head.append.call(this, node); }
    replaceChildren() { this.nodes = []; }
    setAttribute(key, value) { this.attributes[key] = value; if (key === 'id') this.id = value; if (key === 'class') this.className = value; }
    getBoundingClientRect() { return this.rect; }
    querySelector(selector) { return this.parts[selector] || this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      if (selector === '.margin-view-overlays .line-numbers') return this.anchors || [];
      return this.nodes.flatMap(node => [node, ...node.querySelectorAll(selector)]).filter(node => node.matches(selector));
    }
    set textContent(value) {
      this.text = value;
      this.sheet.cssRules = ['--swb-animated-token', '--wf-mist-band', '--wf-mist-cursor'].filter(marker => value.includes(marker + ':1')).map(marker => ({
        style: { getPropertyValue: name => name === marker ? '1' : '', setProperty(key, value) { this[key] = value; } }
      }));
    }
    get textContent() { return this.text || ''; }
  }
  let editor = null;
  const widgets = [];
  let ui = null;
  if (options.polish) {
    const root = new Element('main'); root.className = 'monaco-workbench vs'; body.append(root);
    const group = new Element('section'); group.className = 'editor-group-container active'; root.append(group);
    const tabs = new Element('div'); tabs.className = 'tabs-container'; group.append(tabs);
    const tab = new Element('div'); tab.className = 'tab active dirty'; tabs.append(tab);
    const label = new Element('span'); label.className = 'label-name'; tab.append(label); tab.parts['.label-name'] = label;
    const status = new Element('footer'); status.className = 'part statusbar'; root.append(status);
    const problems = new Element('div'); problems.id = 'status.problems'; problems.textContent = '3 0'; status.append(problems);
    problems.rect = { left: 100, right: 180, top: 750, bottom: 772, width: 80, height: 22 };
    ui = { root, group, tabs, tab, label, status, problems };
  }
  if (options.editor) {
    editor = new Element('editor'); editor.editor = true;
    editor.rect = { left: 0, right: 800, top: 100, bottom: 400, width: 800, height: 300 };
    const layer = new Element('cursors'), cursor = new Element('cursor'); cursor.style.left = '120px'; layer.parts['.cursor'] = cursor;
    const margin = new Element('margin'); margin.rect.right = 80;
    editor.parts = { '.cursors-layer': layer, '.margin': margin, '.margin-view-overlays': new Element('rows') };
    editor.anchors = [10, 11, 12, 13, 14].map((line, i) => {
      const node = new Element('number'), row = new Element('row'); node.textContent = String(line);
      row.rect = { top: 100 + i * 20, bottom: 120 + i * 20, height: 20 }; node.parentElement = row; return node;
    });
  }
  const document = Object.assign(new Events(), {
    head, body, hidden: false, readyState: 'complete', adoptedStyleSheets: [],
    hasFocus: () => options.focused !== false,
    querySelector(selector) {
      if (selector === 'style.vscode-tokens-styles') return head.nodes.find(node => node.matches(selector)) || null;
      if (selector === '.monaco-workbench') return ui?.root || null;
      if (selector.includes('.tab.active.dirty')) return ui?.tab.matches('.tab.active.dirty') ? ui.tab : null;
      return editor;
    },
    querySelectorAll: selector => selector.includes('tabs-container') ? ui ? [ui.tabs] : [] : widgets,
    getElementById(id) {
      const pending = [...head.nodes, ...body.nodes];
      while (pending.length) { const node = pending.shift(); if (node.id === id) return node; pending.push(...node.nodes); }
      return null;
    },
    createElement: name => new Element(name), createElementNS: (_, name) => new Element(name)
  });
  const window = Object.assign(new Events(), { innerWidth: 1000, innerHeight: 800 });
  const reduced = Object.assign(new Events(), { matches: false });
  const tokens = new Element(); tokens.className = 'vscode-tokens-styles';
  tokens.sheet.cssRules = [
    { selectorText: '.mtk1', style: { color: 'rgb(124, 58, 237)' } },
    { selectorText: '.mtk2', style: { color: 'rgb(29, 78, 216)' } },
    { selectorText: '.mtk3', style: { color: 'rgb(175, 0, 219)' } }
  ];
  head.append(tokens);
  function timer(store, callback, delay) { const id = ++nextId; store.set(id, { callback, delay }); return id; }
  const context = {
    document, window, Element,
    CSS: { supports: (_, value) => !options.rejectGradients && (options.oklch !== false || !value.includes(' in oklch')) },
    matchMedia: () => reduced,
    MutationObserver: class {
      constructor(action) { this.action = action; this.targets = new Map(); }
      observe(target, options) { this.targets.set(target, options); observers.add(this); }
      disconnect() { observers.delete(this); }
    },
    ResizeObserver: class { observe() {} disconnect() {} }, getComputedStyle: () => ({ display: 'block', visibility: 'visible' }),
    requestAnimationFrame: callback => timer(timeouts, callback, 16), cancelAnimationFrame: id => timeouts.delete(id),
    performance: { now: () => clock },
    setInterval: (callback, delay) => timer(intervals, callback, delay),
    clearInterval: id => intervals.delete(id),
    setTimeout: (callback, delay) => timer(timeouts, callback, delay),
    clearTimeout: id => timeouts.delete(id)
  };
  new vm.Script(SOURCE).runInNewContext(context);
  function signal(value = 'aurora') {
    const style = new Element();
    const data = { value };
    style.sheet.cssRules = [{ style: { getPropertyValue: name => name === PROPERTY ? data.value : '' } }];
    head.append(style);
    return { style, data };
  }
  function signals(values) {
    const style = new Element();
    style.sheet.cssRules = [{ style: { getPropertyValue: name => values[name] || '' } }];
    head.append(style); return { style, values };
  }
  function run(delay) {
    clock += delay;
    for (const [id, entry] of [...timeouts]) {
      if (entry.delay === delay) { timeouts.delete(id); entry.callback(); }
    }
    for (const [id, entry] of [...intervals]) if (entry.delay === delay && intervals.has(id)) entry.callback();
  }
  return {
    document, window, reduced, tokens, head, body, intervals, timeouts, signal, signals, run, editor, widgets, ui,
    notify(target, records = []) {
      for (const observer of [...observers]) if ([...observer.targets].some(([node, options]) => {
        if (node === target) return true;
        if (options?.subtree) for (let parent = target.parentElement; parent; parent = parent.parentElement) if (parent === node) return true;
        return false;
      })) observer.action(records);
    },
    api: window[KEY],
    status: () => JSON.parse(JSON.stringify(window[KEY].getStatus())),
    runtime: () => document.getElementById(STYLE_ID),
    poll() { run(1500); run(180); },
    editorEvent() { const target = new Element(); target.editor = true; document.emit('keydown', { target }); },
    countInterval(delay) { return [...intervals.values()].filter(entry => entry.delay === delay).length; }
  };
}

test('renderer is off by default and emits no token override or color ticker', () => {
  const f = renderer();
  assert.equal(f.status().enabled, false); assert.equal(f.status().palette, null);
  assert.equal(f.runtime(), null); assert.equal(f.countInterval(1000 / 6), 0);
  assert.equal(f.countInterval(1500), 1);
  f.editorEvent(); assert.equal(f.timeouts.size, 0);
  f.api.dispose(); assert.equal(f.intervals.size, 0);
});

test('CSSOM-only insertions enable flow and only the purple keyword class matches', () => {
  const f = renderer(), producer = f.signal();
  // No MutationObserver callback is fired: insertRule is represented by direct CSSOM edits.
  assert.equal(f.status().enabled, false); f.poll();
  assert.equal(f.status().enabled, true); assert.equal(f.status().palette, 'aurora');
  assert.deepEqual(f.status().matchedClasses, ['.mtk1']);
  assert.equal(f.countInterval(1000 / 6), 1);
  assert.match(f.runtime().text, /100deg in oklch/);
  assert.doesNotMatch(f.runtime().text, /span\.mtk[23]/);
  producer.style.sheet.cssRules.length = 0; f.poll();
  assert.equal(f.status().enabled, false); assert.equal(f.runtime(), null);
  assert.equal(f.countInterval(1000 / 6), 0);
  f.api.dispose();
});

test('palette changes replace the shared CSS, and a removed cached sheet switches off', () => {
  const f = renderer(), producer = f.signal(); f.poll();
  producer.data.value = 'spectrum'; f.poll();
  assert.equal(f.status().palette, 'spectrum'); assert.match(f.runtime().text, /#B91C1C/);
  assert.equal(f.head.nodes.filter(node => node.id === STYLE_ID).length, 1);
  producer.style.remove(); f.poll();
  assert.equal(f.status().enabled, false); assert.equal(f.runtime(), null);
  f.api.dispose();
});

test('token sheets cannot spoof a signal; inaccessible sheets are ignored and adopted sheets work', () => {
  const f = renderer();
  f.tokens.sheet.cssRules.push({ style: { getPropertyValue: () => 'aurora' } });
  const broken = f.signal('bad');
  broken.style.sheet = { get cssRules() { throw new Error('Synthetic inaccessible sheet'); } };
  f.poll(); assert.equal(f.status().enabled, false);
  f.document.adoptedStyleSheets = [{ cssRules: [{ style: { getPropertyValue: name => name === PROPERTY ? 'spectrum' : '' } }] }];
  f.poll(); assert.equal(f.status().palette, 'spectrum');
  f.document.adoptedStyleSheets = []; f.poll(); assert.equal(f.status().enabled, false);
  f.api.dispose();
});

test('a cached keyword sheet is checked first and each sheet is read at most once per multi-feature check', () => {
  const f = renderer(), noise = f.signal('bad');
  let reads = 0; const order = [];
  noise.style.sheet = { get cssRules() { reads++; order.push('noise'); return []; } };
  const producer = f.signal(), rules = producer.style.sheet.cssRules;
  producer.style.sheet = { get cssRules() { order.push('cached'); return rules; } };
  f.poll(); const first = reads; order.length = 0;
  f.poll(); assert.equal(order[0], 'cached'); assert.equal(reads, first + 1); assert.ok(f.status().signalChecks >= 3);
  f.api.dispose();
});

test('mist signals create and remove a shared band, pausing drift without touching rows', () => {
  const f = renderer({ editor: true }), producer = f.signals({ '--white-flow-line-mist': 'drift', '--white-flow-line-mist-glow': 'on' });
  f.poll(); assert.equal(f.status().lineMist, true); assert.equal(f.status().enabled, false);
  const style = f.document.getElementById('swb-line-mist-style'); assert.ok(style);
  assert.equal(f.countInterval(1000 / 6), 1); const before = f.status().mistUpdates;
  f.run(1000 / 6); assert.ok(f.status().mistUpdates > before);
  f.editorEvent(); assert.equal(f.countInterval(1000 / 6), 0); f.run(300); assert.equal(f.countInterval(1000 / 6), 1);
  f.window.emit('blur'); assert.equal(f.intervals.size, 0); f.window.emit('focus');
  producer.style.remove(); f.poll(); assert.equal(f.status().lineMist, false);
  assert.equal(f.document.getElementById('swb-line-mist-style'), null); assert.equal(f.editor.nodes.length, 0);
  f.api.dispose(); assert.equal(f.intervals.size + f.timeouts.size, 0);
});

test('static mist has no color timer and cursor changes are coalesced to six per second', () => {
  const f = renderer({ editor: true }), values = { '--white-flow-line-mist': 'still', '--white-flow-line-mist-glow': 'on' };
  f.signals(values); f.poll(); assert.equal(f.countInterval(1000 / 6), 0);
  const layer = f.editor.parts['.cursors-layer'];
  for (let i = 0; i < 50; i++) { layer.parts['.cursor'].style.left = `${i}px`; f.notify(layer); }
  f.run(1000 / 6); assert.equal(f.status().cursorUpdates, 1);
  const rule = f.document.getElementById('swb-line-mist-style').sheet.cssRules.find(rule => rule.style.getPropertyValue('--wf-mist-cursor'));
  assert.equal(rule.style['--wf-mist-x'], '49px');
  values['--white-flow-line-mist-glow'] = 'off'; f.poll(); f.notify(layer); f.run(1000 / 6);
  assert.equal(f.status().cursorUpdates, 1); f.api.dispose();
});

test('mist validates its gradient fallback and retains reduced-motion and forced-color guards', () => {
  const fallback = renderer({ oklch: false }); fallback.signals({ '--white-flow-line-mist': 'drift' }); fallback.poll();
  const style = fallback.document.getElementById('swb-line-mist-style'); assert.ok(style);
  assert.doesNotMatch(style.text, /in oklch/); assert.match(style.text, /forced-colors:none/); assert.match(style.text, /prefers-reduced-motion:reduce/);
  fallback.reduced.matches = true; fallback.reduced.emit('change'); assert.equal(fallback.countInterval(1000 / 6), 0); fallback.api.dispose();
  const unsupported = renderer({ rejectGradients: true }); unsupported.signals({ '--white-flow-line-mist': 'drift' }); unsupported.poll();
  assert.equal(unsupported.document.getElementById('swb-line-mist-style'), null); unsupported.api.dispose();
});

test('changing mist drift rebuilds the cursor rule without losing the current glow position', () => {
  const f = renderer({ editor: true }), values = { '--white-flow-line-mist': 'drift', '--white-flow-line-mist-glow': 'on' };
  f.signals(values); f.poll(); f.run(1000 / 6); assert.equal(f.status().cursorUpdates, 1);
  values['--white-flow-line-mist'] = 'still'; f.poll(); f.run(1000 / 6);
  const rule = f.document.getElementById('swb-line-mist-style').sheet.cssRules.find(rule => rule.style.getPropertyValue('--wf-mist-cursor'));
  assert.equal(rule.style['--wf-mist-x'], '120px'); assert.equal(f.status().cursorUpdates, 2); f.api.dispose();
});

test('beams draw from numeric gutter anchors into an owned body SVG and are removed with the signal', () => {
  const f = renderer({ editor: true }), producer = f.signals({ '--white-flow-beams': '10-14', '--white-flow-beams-rev': '1' });
  f.poll(); assert.equal(f.timeouts.size, 1); f.run(16);
  const svg = f.document.getElementById('swb-method-beams'); assert.ok(svg); assert.equal(svg.parentElement, f.body);
  const path = svg.querySelectorAll('path')[0]; assert.match(path.attributes.d, /^M82 110H/); assert.match(path.attributes.d, /190/);
  assert.equal(f.editor.nodes.length, 0); f.run(450); assert.equal(svg.querySelectorAll('.wf-glint').length, 0);
  f.run(2000); assert.equal(svg.style.opacity, '.4'); producer.style.remove(); f.poll();
  assert.equal(f.document.getElementById('swb-method-beams'), null); f.api.dispose(); assert.equal(f.timeouts.size, 0);
});

test('off-screen and folded endpoints get line chips, while nonnumeric gutters draw nothing', () => {
  const f = renderer({ editor: true }), values = { '--white-flow-beams': '2-14', '--white-flow-beams-rev': '1' };
  f.signals(values); f.poll(); f.run(16);
  assert.ok(f.document.getElementById('swb-method-beams').querySelectorAll('text').some(node => node.textContent === 'L2'));
  f.editor.anchors[0].textContent = 'relative'; f.window.emit('resize'); f.run(16);
  assert.equal(f.document.getElementById('swb-method-beams'), null); f.api.dispose();
});

test('beam layout is event-batched, widgets hide it, and static motion suppresses glints', () => {
  const f = renderer({ editor: true }); f.signals({ '--white-flow-beams': '10-14', '--white-flow-beams-rev': '2', '--white-flow-beams-motion': 'still' });
  f.poll(); for (let i = 0; i < 100; i++) f.window.emit('resize');
  assert.equal(f.timeouts.size, 1); f.run(16); const svg = f.document.getElementById('swb-method-beams');
  assert.equal(svg.querySelectorAll('.wf-glint').length, 0); assert.equal(f.timeouts.size, 0);
  f.widgets.push(f.editor); f.window.emit('resize'); f.run(16); assert.equal(svg.style.visibility, 'hidden');
  f.api.dispose(); assert.equal(f.timeouts.size + f.intervals.size, 0);
});

test('missing beam layout clears an old drawing and wrapped or relative gutters fail safely', () => {
  const f = renderer({ editor: true }), values = { '--white-flow-beams': '12-14', '--white-flow-beams-rev': '3' };
  f.signals(values); f.poll(); f.run(16); assert.ok(f.document.getElementById('swb-method-beams'));
  const margin = f.editor.parts['.margin']; delete f.editor.parts['.margin'];
  f.window.emit('resize'); f.run(16); assert.equal(f.document.getElementById('swb-method-beams'), null);
  f.editor.parts['.margin'] = margin; f.editor.anchors[2].parentElement.rect.height = 40;
  f.window.emit('resize'); f.run(16);
  assert.ok(f.document.getElementById('swb-method-beams').querySelectorAll('text').some(node => node.textContent === 'L12'));
  f.editor.anchors[1].textContent = '9'; f.window.emit('resize'); f.run(16);
  assert.equal(f.document.getElementById('swb-method-beams'), null); f.api.dispose();
});

test('unknown signals do not activate the renderer', () => {
  for (const value of ['__proto__', 'AURORA', 'rainbow', 'aurora; color: red', '']) {
    const f = renderer(); f.signal(value); f.poll();
    assert.equal(f.status().enabled, false, value); assert.equal(f.runtime(), null);
    f.api.dispose();
  }
});

test('old browsers use a valid non-OKLCH gradient, or retain normal text if unsupported', () => {
  const fallback = renderer({ oklch: false }); fallback.signal(); fallback.poll();
  assert.ok(fallback.runtime()); assert.doesNotMatch(fallback.runtime().text, /in oklch/);
  fallback.api.dispose();
  const unsupported = renderer({ rejectGradients: true }); unsupported.signal(); unsupported.poll();
  assert.equal(unsupported.runtime(), null); assert.equal(unsupported.countInterval(1000 / 6), 0);
  unsupported.api.dispose();
});

test('background windows stop both timers and focus immediately reads the latest signal', () => {
  const f = renderer(), producer = f.signal(); f.poll();
  f.window.emit('blur'); assert.equal(f.status().paused, true); assert.equal(f.intervals.size, 0);
  producer.data.value = 'spectrum'; f.run(1500); assert.equal(f.status().palette, 'aurora');
  f.window.emit('focus'); f.run(180); assert.equal(f.status().palette, 'spectrum');
  assert.equal(f.countInterval(1500), 1);
  f.document.hidden = true; f.document.emit('visibilitychange'); assert.equal(f.intervals.size, 0);
  producer.style.remove(); f.document.hidden = false; f.document.emit('visibilitychange');
  assert.equal(f.status().enabled, false); assert.equal(f.countInterval(1500), 1);
  f.api.dispose();
});

test('typing and accessibility pause color ticks; disposal releases every owned resource', () => {
  const f = renderer(); f.signal(); f.poll();
  f.editorEvent(); assert.equal(f.status().paused, true); assert.equal(f.countInterval(1000 / 6), 0);
  f.run(300); assert.equal(f.status().paused, false);
  f.reduced.matches = true; f.reduced.emit('change'); assert.equal(f.status().paused, true);
  assert.equal(f.countInterval(1000 / 6), 0);
  assert.match(f.runtime().text, /prefers-reduced-motion/); assert.match(f.runtime().text, /forced-colors/);
  f.api.dispose(); assert.equal(f.intervals.size + f.timeouts.size, 0); assert.equal(f.runtime(), null);
  assert.equal(f.window[KEY], undefined);
  f.window.emit('focus'); f.document.emit('visibilitychange'); assert.equal(f.intervals.size, 0);
});

test('polish CSS is canonical, opt-in, stable, and removed when its signal disappears', () => {
  const f = renderer({ polish: true }), producer = f.signals({ '--white-flow-polish': 'backlight dock keycaps sticky-glass toast-stack' });
  assert.equal(f.document.getElementById('swb-polish-style'), null); f.poll();
  const style = f.document.getElementById('swb-polish-style'); assert.ok(style);
  for (const pattern of [/sticky-widget-lines-scrollable/, /sticky-widget-line-numbers/, /:not\(\.peek\)/, /prefers-reduced-transparency/, /forced-colors/, /monaco-keybinding-key-separator/, /editor-group-watermark-wrapper/, /:focus-within/, /monaco-reduce-motion/, /reduce-motion/, /:has\(\+ \.action-item:hover\)/, /pointer-events:none/]) assert.match(style.text, pattern);
  f.poll(); assert.equal(f.document.getElementById('swb-polish-style'), style);
  assert.equal(f.countInterval(1000 / 6), 0);
  producer.style.remove(); f.poll(); assert.equal(f.document.getElementById('swb-polish-style'), null); f.api.dispose();
  for (const value of ['unknown', 'keycaps;dock', 'dock keycaps dock', 'sticky-glass keycaps']) {
    const rejected = renderer(); rejected.signals({ '--white-flow-polish': value }); rejected.poll();
    assert.equal(rejected.document.getElementById('swb-polish-style'), null); rejected.api.dispose();
  }
});

test('manual save followed by dirty removal shines once, without changing the tab', () => {
  const f = renderer({ polish: true }); f.signals({ '--white-flow-polish': 'save-shine' }); f.poll();
  const style = f.document.getElementById('swb-polish-style'), original = style.text;
  f.document.emit('keydown', { key: 's', ctrlKey: true });
  f.ui.tab.className = 'tab active';
  f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]);
  assert.equal(f.status().shines, 1); assert.equal(style.sheet.cssRules.length, 2); assert.equal(style.text, original);
  assert.equal(f.ui.tab.className, 'tab active'); assert.equal(f.ui.tab.nodes.length, 1);
  f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]); assert.equal(f.status().shines, 1);
  f.run(600); assert.equal(style.sheet.cssRules.length, 0); f.api.dispose(); assert.equal(f.timeouts.size, 0);
});

test('autosave, late removal, disabled effects, and reduced motion never shine', () => {
  for (const mode of ['autosave', 'late', 'disabled', 'reduced']) {
    const f = renderer({ polish: true }); if (mode !== 'disabled') f.signals({ '--white-flow-polish': 'save-shine' }); f.poll();
    if (mode === 'reduced') { f.ui.root.className += ' monaco-reduce-motion'; f.notify(f.ui.root); }
    if (mode !== 'autosave') f.document.emit('keydown', { key: 's', metaKey: true, altKey: true });
    if (mode === 'late') f.run(1600);
    f.ui.tab.className = 'tab active'; f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]);
    assert.equal(f.status().shines, 0, mode); f.api.dispose();
  }
});

test('celebration waits for stable zero, removes 26 particles, and enforces its cooldown', () => {
  const f = renderer({ polish: true }); f.signals({ '--white-flow-polish': 'celebrate' }); f.poll();
  const count = value => { f.ui.problems.textContent = value; f.notify(f.ui.problems); };
  count('0 2'); assert.equal(f.status().bursts, 0); f.run(800);
  assert.equal(f.status().bursts, 1); assert.equal(f.document.getElementById('swb-celebrate').nodes.length, 26);
  f.run(900); assert.equal(f.document.getElementById('swb-celebrate'), null);
  count('3 2'); count('0 2'); f.run(800); assert.equal(f.status().bursts, 1);
  f.run(30000); count('3 2'); count('0 2'); f.run(800); assert.equal(f.status().bursts, 2);
  f.api.dispose(); assert.equal(f.document.getElementById('swb-celebrate'), null); assert.equal(f.timeouts.size, 0);
});

test('transient zero, unparsable status, missing signals, and background windows never celebrate', () => {
  for (const mode of ['transient', 'invalid', 'disabled', 'background']) {
    const f = renderer({ polish: true }); if (mode !== 'disabled') f.signals({ '--white-flow-polish': 'celebrate' }); f.poll();
    f.ui.problems.textContent = '0 1'; f.notify(f.ui.problems);
    if (mode === 'transient' || mode === 'invalid') { f.ui.problems.textContent = mode === 'transient' ? '3 1' : 'unknown'; f.notify(f.ui.problems); }
    if (mode === 'background') f.window.emit('blur');
    f.run(800); assert.equal(f.status().bursts, 0, mode); f.api.dispose();
  }
});

test('both workbench reduced-motion class names pause existing effects and cancel polish feedback', () => {
  for (const name of ['monaco-reduce-motion', 'reduce-motion']) {
    const f = renderer({ polish: true }); f.signals({ '--white-flow-keyword-flow': 'aurora', '--white-flow-polish': 'celebrate save-shine' }); f.poll();
    assert.equal(f.countInterval(1000 / 6), 1);
    f.ui.root.className += ' ' + name; f.notify(f.ui.root);
    assert.equal(f.status().paused, true); assert.equal(f.countInterval(1000 / 6), 0);
    f.document.emit('keydown', { key: 's', ctrlKey: true }); f.ui.tab.className = 'tab active';
    f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]);
    assert.equal(f.status().shines, 0); f.api.dispose(); assert.equal(f.intervals.size + f.timeouts.size, 0);
  }
});

test('each polish block appears only for its own token and toast stacking leaves heights native', () => {
  const signatures = { 'sticky-glass': 'backdrop-filter:blur(8px)', keycaps: 'monaco-keybinding-key-separator',
    backlight: 'conic-gradient(from 200deg', 'toast-stack': 'grid-area:1 / 1', 'save-shine': 'wf-save-shine-0', celebrate: '#swb-celebrate', dock: 'transform:scale(1.25)', engraved: 'rgb(23 26 33 / .07)' };
  for (const [token, signature] of Object.entries(signatures)) {
    const f = renderer(); f.signals({ '--white-flow-polish': token }); f.poll();
    const css = f.document.getElementById('swb-polish-style').text; assert.ok(css.includes(signature), token);
    for (const [other, value] of Object.entries(signatures)) if (other !== token) assert.equal(css.includes(value), false, token + ' / ' + other);
    if (token === 'toast-stack') assert.doesNotMatch(css, /(?:[;{])(?:height|max-height)\s*:|display\s*:\s*none/);
    if (token === 'sticky-glass') assert.doesNotMatch(css, /(?:[;{])(?:height|width|position|overflow|z-index)\s*:/);
    f.api.dispose();
  }
});

test('Save All uses the same one-shot gate, alternates animations, and cancels on tab switches', () => {
  const f = renderer({ polish: true }); f.signals({ '--white-flow-polish': 'save-shine' }); f.poll();
  const style = f.document.getElementById('swb-polish-style');
  for (let i = 0; i < 2; i++) {
    f.ui.tab.className = 'tab active dirty'; f.document.emit('keydown', { key: 's', ctrlKey: true, altKey: true });
    f.ui.tab.className = 'tab active'; f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]);
    assert.match(style.sheet.cssRules[0].cssText, new RegExp('wf-save-shine-' + (1 - i)));
    if (!i) f.run(600);
  }
  f.ui.tab.className = 'tab'; f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active' }]);
  assert.equal(style.sheet.cssRules.length, 0); assert.equal(f.status().shines, 2); f.api.dispose();
});

test('celebration re-finds a replaced status item without retaining old UI content', () => {
  const f = renderer({ polish: true }); f.signals({ '--white-flow-polish': 'celebrate' }); f.poll();
  f.ui.problems.remove(); const item = f.document.createElement('div'); item.id = 'status.problems'; item.textContent = '2 0';
  item.rect = f.ui.problems.rect; f.ui.status.append(item); f.notify(f.ui.status);
  item.textContent = '0 0'; f.notify(item); f.run(800); assert.equal(f.status().bursts, 1); f.api.dispose();
});

test('blocked owned styles leave normal labels alone and do not emit unstyled particles', () => {
  const f = renderer({ polish: true }); f.signals({ '--white-flow-polish': 'celebrate save-shine' }); f.poll();
  f.document.getElementById('swb-polish-style').sheet = null;
  f.document.emit('keydown', { key: 's', ctrlKey: true }); f.ui.tab.className = 'tab active';
  f.notify(f.ui.tab, [{ target: f.ui.tab, oldValue: 'tab active dirty' }]);
  f.ui.problems.textContent = '0 0'; f.notify(f.ui.problems); f.run(800);
  assert.equal(f.status().shines + f.status().bursts, 0); assert.equal(f.document.getElementById('swb-celebrate'), null); f.api.dispose();
});

test('both reserved keyword colors match without adding function or metadata classes', () => {
  const f = renderer();
  f.tokens.sheet.cssRules.push({ selectorText: '.mtk4', style: { color: 'rgb(109, 32, 217)' } });
  f.signal(); f.poll(); assert.deepEqual(f.status().matchedClasses, ['.mtk1', '.mtk4']);
  assert.doesNotMatch(f.runtime().text, /span\.mtk[23]/); f.api.dispose();
});

test('engraved changes only owned CSS, is static, and keeps native geometry declarations absent', () => {
  const f = renderer({ polish: true });
  const snapshot = node => ({ name: node.name, className: node.className, attributes: { ...node.attributes },
    text: node.textContent, style: { ...node.style }, nodes: node.nodes.map(snapshot) });
  const before = snapshot(f.ui.root), body = [...f.body.nodes];
  for (const node of Object.values(f.ui)) {
    node.append = node.setAttribute = node.remove = node.replaceChildren = () => { throw new Error('Native mutation'); };
  }
  const producer = f.signals({ '--white-flow-polish': 'engraved' }); f.poll();
  const css = f.document.getElementById('swb-polish-style').text;
  assert.match(css, /^@media\(forced-colors:none\)\{/);
  assert.match(css, /\.sidebar\.left/); assert.match(css, /\.sidebar\.right/);
  assert.match(css, /var\(--vscode-editorGroup-border\)/);
  assert.match(css, /:not\(\.monaco-editor \.monaco-editor\)::before/);
  const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  assert.equal(blocks.filter(([, selector]) => selector.includes('::before')).length, 1);
  for (const [, selector, declarations] of blocks) {
    if (selector.includes('::before')) {
      assert.match(declarations, /height:8px/); assert.match(declarations, /pointer-events:none/);
      assert.match(declarations, /position:absolute/); assert.match(declarations, /z-index:4/);
    } else assert.match(declarations, /^box-shadow:[^;]+$/);
  }
  assert.doesNotMatch(css, /(?:^|[;{])(?:border|width|margin|padding|transform)\s*:/);
  f.ui.root.className += ' monaco-reduce-motion'; f.notify(f.ui.root);
  assert.equal(f.document.getElementById('swb-polish-style').text, css);
  f.ui.root.className = before.className;
  assert.deepEqual(snapshot(f.ui.root), before); assert.deepEqual(f.body.nodes, body);
  assert.equal(f.countInterval(1000 / 6), 0);
  producer.style.remove(); f.poll(); assert.equal(f.document.getElementById('swb-polish-style'), null);
  f.api.dispose(); assert.equal(f.intervals.size + f.timeouts.size, 0);
});
