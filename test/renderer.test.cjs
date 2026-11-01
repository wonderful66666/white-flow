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
    append(node) { node.isConnected = true; this.nodes.push(node); },
    querySelectorAll() { return [...this.nodes]; }
  };
  class Element {
    constructor() { this.id = ''; this.className = ''; this.isConnected = false; this.sheet = { cssRules: [] }; }
    matches() { return this.className === 'vscode-tokens-styles'; }
    closest() { return this.editor ? this : null; }
    remove() { this.isConnected = false; head.nodes = head.nodes.filter(node => node !== this); }
    set textContent(value) {
      this.text = value;
      this.sheet.cssRules = value.includes('--swb-animated-token:1')
        ? [{ style: { getPropertyValue: name => name === '--swb-animated-token' ? '1' : '' } }] : [];
    }
  }
  const document = Object.assign(new Events(), {
    head, hidden: false, readyState: 'complete', adoptedStyleSheets: [],
    hasFocus: () => options.focused !== false,
    querySelector: () => head.nodes.find(node => node.matches('style.vscode-tokens-styles')) || null,
    getElementById: id => head.nodes.find(node => node.id === id) || null,
    createElement: () => new Element()
  });
  const window = new Events();
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
    MutationObserver: class { observe() {} disconnect() {} },
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
  function run(delay) {
    clock += delay;
    for (const [id, entry] of [...timeouts]) {
      if (entry.delay === delay) { timeouts.delete(id); entry.callback(); }
    }
    for (const [id, entry] of [...intervals]) if (entry.delay === delay && intervals.has(id)) entry.callback();
  }
  return {
    document, window, reduced, tokens, head, intervals, timeouts, signal, run,
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

test('a cached signal sheet is checked before unrelated stylesheets', () => {
  const f = renderer(), noise = f.signal('bad');
  let reads = 0;
  noise.style.sheet = { get cssRules() { reads++; return []; } };
  f.signal(); f.poll(); const first = reads;
  f.poll(); assert.equal(reads, first); assert.ok(f.status().signalChecks >= 3);
  f.api.dispose();
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
