'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function fixture() {
  let now = 1000, nextTimer = 0;
  const values = new Map(), frames = new Set(), timers = new Map(), events = new Map();
  const providers = new Map(), commands = new Map(), cache = new Map(), paints = new Map();
  let patchReads = 0, patch = false, reads = 0;
  const on = name => handler => {
    if (!events.has(name)) events.set(name, new Set());
    events.get(name).add(handler); return { dispose: () => events.get(name).delete(handler) };
  };
  const emit = (name, value) => { for (const handler of [...(events.get(name) || [])]) handler(value); };
  class Position { constructor(line, character) { this.line = line; this.character = character; } }
  class Range {
    constructor(a, b, c, d) {
      this.start = typeof a === 'number' ? new Position(a, b) : a;
      this.end = typeof a === 'number' ? new Position(c, d) : b;
    }
  }
  class Selection extends Range {
    constructor(a, b) { super(a, b); this.anchor = a; this.active = b; }
    get isEmpty() { return this.start.line === this.end.line && this.start.character === this.end.character; }
  }
  function doc(text = 'a\nb\nc\nd\ne', languageId = 'rust', scheme = 'file', name = 'sample') {
    let source = text;
    const document = {
      uri: { scheme, toString: () => scheme + ':' + name }, languageId, version: 1, isClosed: false,
      get lineCount() { return source.split('\n').length; },
      getText() { reads++; return source; },
      replace(text) { source = text; document.version++; },
      positionAt(offset) { const before = source.slice(0, offset).split('\n'); return new Position(before.length - 1, before.at(-1).length); },
      offsetAt(position) { const lines = source.split('\n'); return lines.slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + Math.min(position.character, (lines[position.line] || '').length); },
      getWordRangeAtPosition(position) { return new Range(position.line, 0, position.line, 3); }
    };
    return document;
  }
  function makeEditor(document = doc()) {
    const position = new Position(0, 0);
    const editor = {
      document, selection: new Selection(position, position),
      get selections() { return this.multiple || [this.selection]; },
      setDecorations(type, ranges) {
        assert.ok(frames.has(type), 'disposed types cannot be painted');
        if (!paints.has(editor)) paints.set(editor, new Map());
        paints.get(editor).set(type, [...ranges]);
      },
      revealRange(range) { editor.revealed = range; }
    };
    return editor;
  }
  const editor = makeEditor();
  const vscode = {
    Position, Range, Selection, OverviewRulerLane: { Left: 1, Right: 4 }, TextEditorRevealType: { InCenter: 1 },
    DecorationRangeBehavior: { ClosedClosed: 1 }, ConfigurationTarget: { Global: 1, Workspace: 2 },
    ThemeIcon: class { constructor(id) { this.id = id; } },
    MarkdownString: class { constructor(value) { this.value = value; this.isTrusted = false; } },
    Uri: { parse: value => ({ toString: () => value }) }, env: { appRoot: '/synthetic-app' },
    workspace: {
      textDocuments: [editor.document],
      getConfiguration: section => ({ get: (key, fallback) => values.has(section + '.' + key) ? values.get(section + '.' + key) : fallback }),
      onDidChangeConfiguration: on('config'), onDidChangeTextDocument: on('change'), onDidCloseTextDocument: on('close'), onDidOpenTextDocument: on('open')
    },
    window: {
      activeTextEditor: editor, visibleTextEditors: [editor], state: { focused: true },
      onDidChangeTextEditorSelection: on('selection'), onDidChangeActiveTextEditor: on('active'),
      onDidChangeVisibleTextEditors: on('visible'), onDidChangeWindowState: on('window'),
      createTextEditorDecorationType(options) {
        const type = { options, dispose() { frames.delete(type); for (const map of paints.values()) map.delete(type); } };
        frames.add(type); return type;
      }
    },
    commands: {
      executeCommand: async (name, ...args) => providers.get(name)?.(...args),
      registerCommand(name, handler) { commands.set(name, handler); return { dispose: () => commands.delete(name) }; }
    }
  };
  function timer(callback, delay, interval = false) {
    const id = ++nextTimer; timers.set(id, { callback, delay, at: now + delay, interval }); return id;
  }
  const context = { Buffer, Date: class extends Date { static now() { return now; } },
    setTimeout: (action, delay) => timer(action, delay), clearTimeout: id => timers.delete(id),
    setInterval: (action, delay) => timer(action, delay, true), clearInterval: id => timers.delete(id) };
  function load(name) {
    if (cache.has(name)) return cache.get(name).exports;
    const module = { exports: {} }; cache.set(name, module);
    const source = fs.readFileSync(path.resolve(__dirname, '../out', name + '.js'), 'utf8');
    new vm.Script('(function(exports, require, module){' + source + '\n})').runInNewContext(context)(module.exports, id => {
      if (id === 'vscode') return vscode;
      if (id === './patchStatus') return {
        async patchProvidesKeyframes() { patchReads++; return patch; }, async patchProvidesBeams() { patchReads++; return patch; },
        async patchMarkerPresent() { patchReads++; return patch; }
      };
      if (id.startsWith('./')) return load(id.slice(2));
      throw new Error('Unexpected mock import');
    }, module);
    return module.exports;
  }
  return {
    values, frames, timers, events, providers, commands, vscode, editor, doc, makeEditor, emit, load,
    get reads() { return reads; }, get patchReads() { return patchReads; }, setPatch(value) { patch = value; },
    set: (key, value) => values.set(key, value),
    listenerCount: () => [...events.values()].reduce((sum, handlers) => sum + handlers.size, 0),
    painted(type, target = editor) { return paints.get(target)?.get(type) || []; },
    advance(ms) {
      const end = now + ms;
      for (let count = 0; count < 10000; count++) {
        const due = [...timers].filter(([, entry]) => entry.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        const [id, entry] = due; now = entry.at;
        if (entry.interval) entry.at += entry.delay; else timers.delete(id);
        entry.callback();
      }
      now = end;
    },
    async settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); }
  };
}
module.exports = { fixture };
