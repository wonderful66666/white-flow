'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./mock-vscode.cjs');
const range = (a, b, x = 0, y = 4) => ({ start: { line: a, character: x }, end: { line: b, character: y } });

test('all new features create no resources, editor reads, or provider calls while off', () => {
  const f = fixture(); let calls = 0;
  const features = [new (f.load('focusMode').FocusMode)(), new (f.load('lineMist').LineMist)('White'),
    new (f.load('methodBeams').MethodBeams)('White', async () => { calls++; return false; }),
    new (f.load('editTrail').EditTrail)(), new (f.load('riskRadar').RiskRadar)()];
  for (const feature of features) feature.refresh();
  assert.equal(f.frames.size + f.timers.size + f.listenerCount() + f.reads + calls + f.commands.size, 0);
  features.forEach(feature => feature.dispose());
});

test('Focus Mode decorates outside a function with the configured opacity and caches its version', async t => {
  const f = fixture(); f.set('whiteFlow.focusMode.enabled', true); f.set('whiteFlow.focusMode.opacity', .55);
  let calls = 0;
  f.providers.set('vscode.executeDocumentSymbolProvider', () => { calls++; return [{ kind: 11, range: range(1, 3) }]; });
  f.editor.selection.active.line = 2;
  const feature = new (f.load('focusMode').FocusMode)(); t.after(() => feature.dispose()); feature.refresh();
  assert.equal([...f.frames][0].options.opacity, '0.55');
  f.advance(80); await f.settle();
  assert.deepEqual(f.painted([...f.frames][0]).map(r => [r.start.line, r.end.line]), [[0, 0], [4, 4]]);
  f.emit('selection', { textEditor: f.editor }); f.advance(80); await f.settle(); assert.equal(calls, 1);
  f.editor.selection.active.line = 0; f.emit('selection', { textEditor: f.editor }); f.advance(80); await f.settle();
  assert.equal(f.painted([...f.frames][0]).length, 0);
  f.set('whiteFlow.focusMode.enabled', false); feature.refresh(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size, 0);
});

test('Focus Mode ignores stale symbols after edits, editor switches, and disable', async () => {
  for (const action of ['edit', 'switch', 'disable']) {
    const f = fixture(); f.set('whiteFlow.focusMode.enabled', true); let done;
    f.providers.set('vscode.executeDocumentSymbolProvider', () => new Promise(resolve => { done = resolve; }));
    const feature = new (f.load('focusMode').FocusMode)(); feature.refresh(); f.advance(80);
    if (action === 'edit') { f.editor.document.replace('updated'); f.emit('change', { document: f.editor.document }); }
    if (action === 'switch') { f.vscode.window.activeTextEditor = undefined; f.emit('active', undefined); }
    if (action === 'disable') { f.set('whiteFlow.focusMode.enabled', false); feature.refresh(); }
    done([{ kind: 11, range: range(0, 0) }]); await f.settle();
    assert.ok([...f.frames].every(type => f.painted(type).length === 0)); feature.dispose();
  }
});

test('Line Mist signals are theme-gated, static under reduced motion, and never painted', () => {
  const f = fixture(); f.set('whiteFlow.lineMist.enabled', true); f.set('workbench.colorTheme', 'White');
  const feature = new (f.load('lineMist').LineMist)('White'); feature.refresh();
  assert.equal(f.frames.size, 1); assert.match([...f.frames][0].options.textDecoration, /line-mist: drift/);
  f.set('workbench.reduceMotion', 'on'); feature.refresh(); assert.equal(f.frames.size, 1);
  assert.match([...f.frames][0].options.textDecoration, /line-mist: still/);
  f.set('whiteFlow.lineMist.cursorGlow', false); feature.refresh(); assert.match([...f.frames][0].options.textDecoration, /mist-glow: off/);
  f.set('workbench.colorTheme', 'Other'); feature.refresh(); assert.equal(f.frames.size, 0);
  assert.equal(f.listenerCount() + f.timers.size, 0); feature.dispose();
});

test('Method Beams use a gutter fallback without patch support, and signals when present', async () => {
  for (const patch of [false, true]) {
    const f = fixture(); f.set('whiteFlow.methodBeams.enabled', true); f.set('workbench.colorTheme', 'White');
    f.providers.set('vscode.prepareCallHierarchy', () => [{ uri: f.editor.document.uri, selectionRange: range(3, 3) }]);
    const feature = new (f.load('methodBeams').MethodBeams)('White', async () => patch); feature.refresh();
    f.advance(250); await f.settle();
    assert.equal(f.frames.size, patch ? 3 : 5);
    assert.ok([...f.frames].some(type => f.painted(type).length));
    const signal = [...f.frames].find(type => type.options.textDecoration?.includes('--white-flow-beams:'));
    if (patch) assert.match(signal.options.textDecoration, /--white-flow-beams: 1-4/);
    else assert.equal(signal, undefined);
    f.emit('window', { focused: false }); assert.ok([...f.frames].every(type => f.painted(type).length === 0));
    feature.dispose(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size, 0);
  }
});

test('Method Beams ignore stale hierarchy results and typing', async () => {
  const f = fixture(); f.set('whiteFlow.methodBeams.enabled', true); let done, calls = 0;
  f.providers.set('vscode.prepareCallHierarchy', () => { calls++; return new Promise(resolve => { done = resolve; }); });
  const feature = new (f.load('methodBeams').MethodBeams)('White', async () => true); feature.refresh(); f.advance(250);
  f.editor.document.replace('updated'); f.emit('change', { document: f.editor.document });
  done([{ uri: f.editor.document.uri, selectionRange: range(3, 3) }]); await f.settle();
  assert.ok([...f.frames].every(type => f.painted(type).length === 0));
  f.emit('selection', {}); f.advance(250); await f.settle(); assert.equal(calls, 1); feature.dispose();
});

test('Edit Trail tracks changes, uses four types, ages only in foreground, and supports navigation', () => {
  const f = fixture(); f.set('whiteFlow.editTrail.enabled', true);
  const feature = new (f.load('editTrail').EditTrail)(); feature.refresh(); assert.equal(f.frames.size, 4);
  const change = line => f.emit('change', { document: f.editor.document, contentChanges: [{ range: range(line, line), text: 'x' }] });
  change(1); f.advance(500); change(3); f.advance(500);
  assert.ok([...f.frames].some(type => f.painted(type).length === 2));
  f.commands.get('whiteFlow.editTrail.previous')(); assert.equal(f.editor.selection.active.line, 3);
  f.commands.get('whiteFlow.editTrail.previous')(); assert.equal(f.editor.selection.active.line, 1);
  f.commands.get('whiteFlow.editTrail.next')(); assert.equal(f.editor.selection.active.line, 3);
  f.vscode.window.state.focused = false; f.emit('window', { focused: false }); assert.equal(f.timers.size, 0);
  f.vscode.window.state.focused = true; f.emit('window', { focused: true }); assert.equal(f.timers.size, 1);
  f.emit('close', f.editor.document); f.emit('visible', [f.editor]); assert.ok([...f.frames].every(type => f.painted(type).length === 0));
  feature.dispose(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size + f.commands.size, 0);
});

test('Risk Radar scans only Rust, debounces edits, and paints every split editor', () => {
  const f = fixture(); f.editor.document.replace('value.unwrap(); unsafe {}');
  const split = f.makeEditor(f.editor.document), python = f.doc('panic!()', 'python', 'file', 'other');
  f.vscode.window.visibleTextEditors.push(split); f.vscode.workspace.textDocuments.push(python);
  f.set('whiteFlow.riskRadar.enabled', true);
  const feature = new (f.load('riskRadar').RiskRadar)(); feature.refresh();
  const type = [...f.frames][0]; assert.equal(f.frames.size, 1); assert.equal(f.reads, 1);
  assert.equal(f.painted(type).length, 2); assert.equal(f.painted(type, split).length, 2);
  assert.equal(f.painted(type)[0].hoverMessage.isTrusted, false);
  f.editor.document.replace('ordinary_code();'); f.emit('change', { document: f.editor.document });
  assert.equal(f.painted(type).length, 0); f.advance(299); assert.equal(f.reads, 1);
  f.advance(1); assert.equal(f.reads, 2); assert.equal(f.painted(type).length, 0);
  f.emit('change', { document: f.editor.document }); feature.dispose(); f.advance(300);
  assert.equal(f.frames.size + f.listenerCount() + f.timers.size, 0);
});

test('Risk Radar skips oversized files, and Focus Mode skips non-file and huge documents', async () => {
  const f = fixture(); f.editor.document.replace('x'.repeat(1048577)); f.set('whiteFlow.riskRadar.enabled', true);
  const radar = new (f.load('riskRadar').RiskRadar)(); radar.refresh(); assert.equal(f.painted([...f.frames][0]).length, 0); radar.dispose();
  const focus = new (f.load('focusMode').FocusMode)(); f.set('whiteFlow.focusMode.enabled', true); let calls = 0;
  f.providers.set('vscode.executeDocumentSymbolProvider', () => { calls++; return []; });
  f.editor.document = f.doc('', 'rust', 'git'); focus.refresh(); f.advance(80); await f.settle(); assert.equal(calls, 0);
  f.editor.document = f.doc('\n'.repeat(50001)); f.emit('active', f.editor); f.advance(80); await f.settle(); assert.equal(calls, 0); focus.dispose();
});

test('main wires every new feature independently and releases all resources', () => {
  const f = fixture(), metadata = require('../package.json');
  const context = { extension: { packageJSON: metadata }, subscriptions: [] };
  f.load('main').activate(context);
  assert.equal(f.frames.size + f.timers.size + f.reads + f.patchReads, 0);
  f.set('workbench.colorTheme', metadata.contributes.themes[0].label);
  for (const name of ['focusMode', 'lineMist', 'methodBeams', 'editTrail', 'riskRadar']) {
    const key = `whiteFlow.${name}.enabled`; f.set(key, true);
    f.emit('config', { affectsConfiguration: section => key === section || key.startsWith(section + '.') });
  }
  assert.equal(f.frames.size, 9); assert.equal(f.commands.size, 3);
  f.set('workbench.reduceMotion', 'on');
  f.emit('config', { affectsConfiguration: section => section === 'workbench.reduceMotion' });
  assert.ok([...f.frames].some(type => type.options.textDecoration?.includes('line-mist: still')));
  context.subscriptions.forEach(disposable => disposable.dispose());
  assert.equal(f.frames.size + f.timers.size + f.listenerCount() + f.commands.size, 0);
});

test('missing or rejecting language providers are quiet and do not paint', async () => {
  const f = fixture(); f.set('whiteFlow.focusMode.enabled', true); f.set('whiteFlow.methodBeams.enabled', true);
  f.providers.set('vscode.executeDocumentSymbolProvider', () => Promise.reject(new Error('Unavailable synthetic provider')));
  f.providers.set('vscode.prepareCallHierarchy', () => Promise.reject(new Error('Unavailable synthetic provider')));
  const focus = new (f.load('focusMode').FocusMode)(), beams = new (f.load('methodBeams').MethodBeams)('White', async () => false);
  focus.refresh(); beams.refresh(); f.advance(300); await f.settle();
  assert.ok([...f.frames].every(type => f.painted(type).length === 0)); focus.dispose(); beams.dispose();
});

test('polish has one unapplied aggregate type, with theme and motion gates and no off resources', () => {
  const f = fixture(), polish = new (f.load('polishEffects').PolishEffects)('White');
  polish.refresh(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size + f.reads, 0);
  f.set('workbench.colorTheme', 'White');
  f.set('whiteFlow.stickyGlass.enabled', true); f.set('whiteFlow.celebrate.enabled', true); f.set('whiteFlow.keycaps.enabled', true);
  polish.refresh(); assert.equal(f.frames.size, 1);
  assert.equal([...f.frames][0].options.textDecoration, 'none; --white-flow-polish: celebrate keycaps sticky-glass');
  assert.equal(f.painted([...f.frames][0]).length, 0);
  f.set('workbench.reduceMotion', 'on'); polish.refresh();
  assert.equal([...f.frames][0].options.textDecoration, 'none; --white-flow-polish: keycaps sticky-glass');
  f.set('workbench.colorTheme', 'Other'); polish.refresh(); assert.equal(f.frames.size, 0);
  polish.dispose(); polish.refresh(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size + f.reads, 0);
});

test('TODO Marker is quiet while off, scans visible ranges with bounded overscan, and switches style', () => {
  const f = fixture(), marker = new (f.load('todoMarker').TodoMarker)();
  marker.refresh(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size + f.reads, 0);
  f.editor.document.replace(Array.from({ length: 300 }, (_, i) => [5, 150, 270].includes(i) ? '// TODO: sample' : 'ordinary code').join('\n'));
  f.editor.viewRanges = [new f.vscode.Range(150, 0, 150, 0)]; f.set('whiteFlow.todoMarker.enabled', true);
  marker.refresh(); assert.equal(f.frames.size, 3); f.advance(199); assert.equal(f.reads, 0); f.advance(1);
  assert.equal(f.reads, 101);
  const type = [...f.frames][0]; assert.match(type.options.textDecoration, /background-image: url\("data:/);
  assert.equal(type.options.backgroundColor, undefined); assert.deepEqual(f.painted(type).map(range => range.start.line), [150]);
  f.emit('ranges', {}); f.emit('ranges', {}); assert.equal(f.timers.size, 1);
  f.set('whiteFlow.todoMarker.style', 'flat'); marker.refresh();
  assert.equal([...f.frames][0].options.backgroundColor, '#FEF9C3'); assert.equal([...f.frames][0].options.textDecoration, undefined);
  marker.dispose(); assert.equal(f.frames.size + f.listenerCount() + f.timers.size, 0);
});

test('main wires polish and TODO settings without installing patch assets', () => {
  const f = fixture(), metadata = require('../package.json'), context = { extension: { packageJSON: metadata }, subscriptions: [] };
  f.load('main').activate(context); f.set('workbench.colorTheme', metadata.contributes.themes[0].label);
  for (const key of ['whiteFlow.stickyGlass.enabled', 'whiteFlow.todoMarker.enabled']) {
    f.set(key, true); f.emit('config', { affectsConfiguration: section => key === section || key.startsWith(section + '.') });
  }
  assert.equal(f.frames.size, 4); assert.equal(f.patchReads, 0);
  context.subscriptions.forEach(disposable => disposable.dispose());
  assert.equal(f.frames.size + f.listenerCount() + f.timers.size + f.commands.size, 0);
});

test('main reads all manifest labels and clears all declaration signals on other themes', async () => {
  const metadata = require('../package.json'), labels = metadata.contributes.themes.map(theme => theme.label);
  const f = fixture(), context = { extension: { packageJSON: metadata }, subscriptions: [] };
  f.setPatch(true); f.load('main').activate(context);
  assert.equal(f.frames.size + f.timers.size + f.reads + f.patchReads, 0);
  const configure = key => f.emit('config', { affectsConfiguration: section => key === section || key.startsWith(section + '.') });
  for (const name of ['keywordFlow', 'lineMist', 'engraved', 'methodBeams']) {
    const key = `whiteFlow.${name}.enabled`; f.set(key, true); configure(key);
  }
  f.providers.set('vscode.prepareCallHierarchy', () => [{ uri: f.editor.document.uri, selectionRange: range(3, 3) }]);
  for (const label of [...labels, 'Other', 'White Flow Ink Custom', ...labels]) {
    f.set('workbench.colorTheme', label); configure('workbench.colorTheme');
    f.advance(250); await f.settle();
    const declarations = [...f.frames].map(type => type.options.textDecoration || '').filter(value => value.includes('--white-flow-'));
    assert.equal(declarations.length, labels.includes(label) ? 4 : 0, label);
    if (labels.includes(label)) assert.ok(declarations.includes('none; --white-flow-polish: engraved'));
  }
  f.set('workbench.reduceMotion', 'on'); configure('workbench.reduceMotion');
  assert.ok([...f.frames].some(type => type.options.textDecoration === 'none; --white-flow-polish: engraved'));
  assert.equal([...f.frames].some(type => type.options.textDecoration?.includes('--white-flow-keyword-flow:')), false);
  context.subscriptions.forEach(disposable => disposable.dispose());
  assert.equal(f.frames.size + f.timers.size + f.listenerCount() + f.commands.size, 0);
});
