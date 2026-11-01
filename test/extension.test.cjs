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
    commands: { executeCommand: async () => undefined },
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
      throw new Error('Unexpected fixture import');
    }, module);
    return module.exports;
  }
  return {
    values, overrides, listeners, frames, painted, timers, updates, vscode, editor, load,
    get picker() { return picker; },
    set(key, value) { values.set(key, value); },
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
  f.picker.selectedItems = f.picker.items;
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
