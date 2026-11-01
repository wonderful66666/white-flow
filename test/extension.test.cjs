'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const OUT = path.resolve(__dirname, '../out');

// Load compiled entry points with an in-memory API, never an installed editor or real settings.
function fixture() {
  const values = new Map();
  const overrides = new Map();
  const listeners = new Set();
  const frames = new Set();
  const painted = new Map();
  const timers = new Map();
  const updates = [];
  const configurationListeners = new Set();
  const commands = new Map();
  let patchReads = 0;
  let timerId = 0;
  let picker;
  const document = { positionAt: offset => ({ line: 0, character: offset }) };
  const editor = {
    document,
    setDecorations(frame, ranges) {
      assert.ok(frames.has(frame), 'A disposed decoration must not be painted');
      painted.set(frame, [...ranges]);
    }
  };
  const vscode = {
    DecorationRangeBehavior: { ClosedClosed: 1 },
    ConfigurationTarget: { Global: 1, Workspace: 2 },
    Range: class { constructor(start, end) { this.start = start; this.end = end; } },
    ThemeIcon: class { constructor(id) { this.id = id; } },
    env: { appRoot: '/synthetic-app' },
    commands: {
      executeCommand: async () => undefined,
      registerCommand(name, handler) {
        commands.set(name, handler);
        return { dispose() { commands.delete(name); } };
      }
    },
    workspace: {
      getConfiguration(section) {
        return {
          get(key, fallback) { return values.has(section + '.' + key) ? values.get(section + '.' + key) : fallback; },
          inspect(key) { return { workspaceValue: overrides.get(section + '.' + key) }; },
          async update(key, value, target) {
            updates.push({ key: section + '.' + key, value, target });
            values.set(section + '.' + key, value);
          }
        };
      },
      onDidChangeTextDocument(handler) {
        listeners.add(handler);
        return { dispose() { listeners.delete(handler); } };
      },
      onDidChangeConfiguration(handler) {
        configurationListeners.add(handler);
        return { dispose() { configurationListeners.delete(handler); } };
      }
    },
    window: {
      visibleTextEditors: [editor],
      createTextEditorDecorationType(options) {
        const frame = { options, dispose() { frames.delete(frame); painted.delete(frame); } };
        frames.add(frame);
        return frame;
      },
      createQuickPick() {
        const handlers = {};
        picker = {
          selectedItems: [],
          disposed: false,
          onDidTriggerButton(handler) { handlers.button = handler; },
          onDidAccept(handler) { handlers.accept = handler; },
          onDidHide(handler) { handlers.hide = handler; },
          show() {},
          hide() { handlers.hide(); },
          dispose() { picker.disposed = true; },
          accept() { handlers.accept(); }
        };
        return picker;
      }
    }
  };
  const setTimer = callback => { const id = ++timerId; timers.set(id, callback); return id; };
  const clearTimer = id => timers.delete(id);
  function load(name) {
    const filename = path.join(OUT, name + '.js');
    const module = { exports: {} };
    const source = fs.readFileSync(filename, 'utf8');
    const wrapper = new vm.Script('(function(exports, require, module) {' + source + '\n})', { filename });
    wrapper.runInNewContext({ setTimeout: setTimer, clearTimeout: clearTimer })(module.exports, id => {
      if (id === 'vscode') return vscode;
      if (id === './typingRules') return require('../out/typingRules.js');
      if (id === './workbenchSignal') return require('../out/workbenchSignal.js');
      if (['./hub', './typingMotion', './keywordFlow'].includes(id)) return load(id.slice(2));
      if (id === './patchStatus') return {
        async patchProvidesKeyframes() { patchReads++; return false; },
        async patchMarkerPresent() { patchReads++; return false; }
      };
      throw new Error('Unexpected fixture import');
    }, module);
    return module.exports;
  }
  return {
    values, overrides, listeners, frames, painted, timers, updates, vscode, editor, load,
    configurationListeners, commands,
    get patchReads() { return patchReads; },
    get picker() { return picker; },
    set(key, value) { values.set(key, value); },
    configure(key) {
      for (const handler of configurationListeners) handler({ affectsConfiguration: section => key === section || key.startsWith(section + '.') });
    },
    emit(text, reason) {
      const event = { document, reason, contentChanges: [{ rangeOffset: 0, rangeLength: 0, text }] };
      for (const handler of [...listeners]) handler(event);
    },
    flushTimers() {
      while (timers.size) {
        const [id, action] = timers.entries().next().value;
        timers.delete(id); action();
      }
    }
  };
}

function enabledFixture(t, patch = async () => false) {
  const f = fixture();
  f.set('whiteFlow.typingMotion.enabled', true);
  const { TypingMotion } = f.load('typingMotion');
  f.motion = new TypingMotion(patch);
  t.after(() => f.motion.dispose());
  return f;
}

test('disabled typing motion creates no listeners, decorations, timers, or patch reads', async () => {
  const f = fixture();
  let reads = 0;
  const { TypingMotion } = f.load('typingMotion');
  const motion = new TypingMotion(async () => { reads++; return true; });
  await motion.refresh();
  assert.equal(reads, 0);
  assert.equal(f.listeners.size + f.frames.size + f.timers.size, 0);
  motion.dispose();
});

test('pending patch detection cannot revive a disposed feature', async t => {
  let resolve;
  const f = enabledFixture(t, () => new Promise(done => { resolve = done; }));
  const pending = f.motion.refresh();
  f.motion.dispose(); resolve(true); await pending;
  assert.equal(f.motion.style, undefined);
  assert.equal(f.listeners.size + f.frames.size, 0);
  await f.motion.refresh();
  assert.equal(f.listeners.size, 0);
});

test('an older asynchronous refresh cannot replace newer settings', async t => {
  let resolve;
  const f = enabledFixture(t, () => new Promise(done => { resolve = done; }));
  const pending = f.motion.refresh();
  f.set('whiteFlow.typingMotion.style', 'fade');
  await f.motion.refresh();
  resolve(true); await pending;
  assert.equal(f.motion.style, 'fade');
  assert.equal(f.frames.size, 3);
  assert.equal(f.listeners.size, 1);
});

test('explicit rise falls back when patch keyframes are unavailable', async t => {
  const f = enabledFixture(t);
  f.set('whiteFlow.typingMotion.style', 'rise');
  await f.motion.refresh();
  assert.equal(f.motion.style, 'fade');
  assert.equal(f.frames.size, 3);
});

test('bulk edits and undo immediately settle the preceding effect', async t => {
  const f = enabledFixture(t);
  await f.motion.refresh();
  for (const [text, reason] of [['long insertion', undefined], ['a', 1]]) {
    f.emit('a');
    assert.ok(f.timers.size > 0);
    assert.ok([...f.painted.values()].some(ranges => ranges.length));
    f.emit(text, reason);
    assert.equal(f.timers.size, 0);
    assert.ok([...f.painted.values()].every(ranges => ranges.length === 0));
  }
});

test('effects are cleared even when an editor becomes hidden', async t => {
  const f = enabledFixture(t);
  await f.motion.refresh(); f.emit('a');
  f.vscode.window.visibleTextEditors = [];
  assert.doesNotThrow(() => f.flushTimers());
  assert.equal(f.timers.size, 0);
  assert.ok([...f.painted.values()].every(ranges => ranges.length === 0));
});

test('pending timers tolerate an editor closing', async t => {
  const f = enabledFixture(t);
  await f.motion.refresh(); f.emit('a');
  f.editor.setDecorations = () => { throw new Error('Synthetic closed editor'); };
  assert.doesNotThrow(() => f.flushTimers());
  assert.equal(f.timers.size, 0);
});

test('explicit reduced motion tears down an enabled feature', async t => {
  const f = enabledFixture(t);
  await f.motion.refresh(); f.emit('a');
  f.set('workbench.reduceMotion', 'on');
  await f.motion.refresh();
  assert.equal(f.listeners.size + f.frames.size + f.timers.size, 0);
});

test('the hub updates an existing workspace override rather than a hidden global value', async () => {
  const f = fixture();
  f.set('whiteFlow.typingMotion.enabled', false);
  f.overrides.set('whiteFlow.typingMotion.enabled', false);
  const { openFeatureHub } = f.load('hub');
  const done = openFeatureHub(false);
  f.picker.selectedItems = f.picker.items.filter(item => item.setting === 'typingMotion.enabled');
  f.picker.accept(); await done;
  assert.deepEqual(f.updates, [{ key: 'whiteFlow.typingMotion.enabled', value: true, target: 2 }]);
  assert.equal(f.picker.disposed, true);
});

test('cancelling the hub writes no settings', async () => {
  const f = fixture();
  const done = f.load('hub').openFeatureHub(false);
  f.picker.hide(); await done;
  assert.deepEqual(f.updates, []);
});

test('keyword signal owns no decoration while disabled, even on the White Flow theme', () => {
  const f = fixture(), theme = 'Synthetic White Theme';
  f.set('workbench.colorTheme', theme);
  const signal = new (f.load('keywordFlow').KeywordFlowSignal)(theme);
  signal.refresh();
  assert.equal(f.frames.size, 0);
  assert.equal(f.painted.size + f.listeners.size + f.timers.size, 0);
  signal.dispose();
});

test('keyword signal recreates one unapplied type on palette changes and disposes on every gate', () => {
  const f = fixture(), theme = 'Synthetic White Theme';
  f.set('whiteFlow.keywordFlow.enabled', true); f.set('workbench.colorTheme', theme);
  const signal = new (f.load('keywordFlow').KeywordFlowSignal)(theme);
  f.editor.setDecorations = () => assert.fail('Signal types must never be applied to a range');
  signal.refresh(); assert.equal(f.frames.size, 1);
  const first = [...f.frames][0];
  assert.equal(first.options.textDecoration, 'none; --white-flow-keyword-flow: aurora');
  f.set('whiteFlow.keywordFlow.palette', 'spectrum'); signal.refresh();
  assert.equal(f.frames.size, 1); assert.equal(f.frames.has(first), false);
  assert.equal([...f.frames][0].options.textDecoration, 'none; --white-flow-keyword-flow: spectrum');
  for (const [key, disabled, restored] of [
    ['workbench.colorTheme', 'Other Theme', theme],
    ['workbench.reduceMotion', 'on', 'off'],
    ['whiteFlow.keywordFlow.enabled', false, true],
    ['whiteFlow.keywordFlow.palette', 'x{}', 'aurora']
  ]) {
    f.set(key, disabled); signal.refresh(); assert.equal(f.frames.size, 0, key);
    f.set(key, restored); signal.refresh(); assert.equal(f.frames.size, 1, key);
  }
  signal.dispose(); signal.refresh();
  assert.equal(f.frames.size + f.painted.size + f.listeners.size + f.timers.size, 0);
});

test('the hub exposes keyword flow and explains the missing patch', async () => {
  const f = fixture();
  const done = f.load('hub').openFeatureHub(false, false);
  const item = f.picker.items.find(item => item.setting === 'keywordFlow.enabled');
  assert.match(item.description, /patch missing/);
  assert.equal(item.picked, false);
  f.picker.selectedItems = [item]; f.picker.accept(); await done;
  assert.deepEqual(f.updates, [{ key: 'whiteFlow.keywordFlow.enabled', value: true, target: 1 }]);
});

test('main wiring follows keyword settings, theme changes, and reduced motion without startup file reads', () => {
  const f = fixture();
  const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const context = { extension: { packageJSON: metadata }, subscriptions: [] };
  f.load('main').activate(context);
  assert.equal(f.commands.has('whiteFlow.openFeatures'), true);
  assert.equal(f.frames.size + f.listeners.size + f.timers.size + f.patchReads, 0);
  f.set('workbench.colorTheme', metadata.contributes.themes[0].label);
  f.set('whiteFlow.keywordFlow.enabled', true); f.configure('whiteFlow.keywordFlow.enabled');
  assert.equal(f.frames.size, 1);
  f.set('whiteFlow.keywordFlow.palette', 'spectrum'); f.configure('whiteFlow.keywordFlow.palette');
  assert.equal([...f.frames][0].options.textDecoration, 'none; --white-flow-keyword-flow: spectrum');
  f.set('workbench.colorTheme', 'Other'); f.configure('workbench.colorTheme'); assert.equal(f.frames.size, 0);
  f.set('workbench.colorTheme', metadata.contributes.themes[0].label); f.configure('workbench.colorTheme'); assert.equal(f.frames.size, 1);
  f.set('workbench.reduceMotion', 'on'); f.configure('workbench.reduceMotion'); assert.equal(f.frames.size, 0);
  for (const disposable of context.subscriptions) disposable.dispose();
  f.set('workbench.reduceMotion', 'off'); f.configure('workbench.reduceMotion');
  assert.equal(f.frames.size + f.configurationListeners.size + f.commands.size, 0);
});

test('keyword settings do not recreate independent typing-motion decorations', () => {
  const f = fixture();
  f.set('whiteFlow.typingMotion.enabled', true);
  f.set('whiteFlow.typingMotion.style', 'fade');
  const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const context = { extension: { packageJSON: metadata }, subscriptions: [] };
  f.load('main').activate(context);
  const before = [...f.frames]; assert.equal(before.length, 3);
  f.set('whiteFlow.keywordFlow.palette', 'spectrum'); f.configure('whiteFlow.keywordFlow.palette');
  assert.deepEqual([...f.frames], before);
  for (const disposable of context.subscriptions) disposable.dispose();
});
