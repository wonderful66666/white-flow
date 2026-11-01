'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { focusLines, dimRanges } = require('../out/focusRules');
const { beamPairs } = require('../out/beamRules');
const trail = require('../out/trailRules');
const { scanRust } = require('../out/rustScanner');
const { mistDeclaration, beamsDeclaration } = require('../out/workbenchSignal');
const range = (start, end, a = 0, b = 10) => ({ start: { line: start, character: a }, end: { line: end, character: b } });

test('focus chooses innermost callable symbols and handles flat and empty providers', () => {
  const nested = [{ kind: 4, range: range(0, 30), children: [{ kind: 5, range: range(2, 20), children: [{ kind: 11, range: range(5, 8) }] }] }];
  assert.deepEqual(focusLines(nested, 6), { start: 5, end: 8 });
  assert.equal(focusLines(nested, 25), null);
  assert.deepEqual(focusLines([{ kind: 8, location: { range: range(4, 9) } }], 5), { start: 4, end: 9 });
  assert.deepEqual(dimRanges(10, { start: 0, end: 3 }), [{ start: 4, end: 9 }]);
  assert.deepEqual(dimRanges(10, { start: 5, end: 9 }), [{ start: 0, end: 4 }]);
  assert.deepEqual(dimRanges(10, null), []); assert.deepEqual(dimRanges(10, { start: 0, end: 9 }), []);
});

test('beam rules limit same-file callers to the nearest five and ignore identical lines', () => {
  const item = { uri: 'file:sample', selectionRange: range(20, 20, 4, 10) };
  const incoming = [0, 10, 15, 19, 20, 21, 23, 40].map(line => ({ from: { uri: 'file:sample' }, fromRanges: [range(line, line)] }));
  incoming.push({ from: { uri: 'file:other' }, fromRanges: [range(18, 18)] });
  assert.deepEqual(beamPairs({ line: 20, character: 6 }, 'file:sample', item, incoming).map(pair => pair.from), [20, 22, 24, 16, 11]);
  assert.deepEqual(beamPairs({ line: 3, character: 0 }, 'file:sample', item), [{ from: 4, to: 21 }]);
  assert.deepEqual(beamPairs({ line: 20, character: 0 }, 'file:sample', item), []);
  assert.deepEqual(beamPairs({ line: 3, character: 0 }, 'file:other', item), []);
});

test('multi-feature signal builders accept only safe values', () => {
  assert.equal(mistDeclaration({ enabled: true, drift: 'still', glow: 'on' }), 'none; --white-flow-line-mist: still; --white-flow-line-mist-glow: on');
  for (const drift of ['drift;', '{}', 'off', undefined]) assert.equal(mistDeclaration({ enabled: true, drift, glow: 'on' }), null);
  assert.equal(mistDeclaration({ enabled: false, drift: 'drift', glow: 'off' }), null);
  assert.ok(beamsDeclaration('1-20,30-20', 1).includes('--white-flow-beams-rev: 1'));
  for (const value of ['0-2', '1-2;', '1-2{}', '1-2,', '1-2\n', '10000000-2', Array(6).fill('1-2').join(',')]) assert.equal(beamsDeclaration(value, 1), null);
  assert.equal(beamsDeclaration('1-2', -1), null); assert.equal(beamsDeclaration('1-2', 1, 'anything'), null);
  assert.notEqual(beamsDeclaration('1-2', 1), beamsDeclaration('1-2', 2));
});

test('trail rebases inserted, removed, replaced, and simultaneous line changes', () => {
  const state = new Map([[1, 1], [5, 2], [10, 3]]);
  assert.deepEqual([...trail.applyChange(state, { startLine: 2, endLine: 2, lineBreaks: 2 }, 9)], [[1, 1], [7, 2], [12, 3], [2, 9], [3, 9], [4, 9]]);
  const deleted = trail.applyChange(state, { startLine: 4, endLine: 7, lineBreaks: 0 }, 9);
  assert.equal(deleted.has(5), false); assert.equal(deleted.get(7), 3); assert.equal(deleted.get(4), 9);
  const replaced = trail.applyChange(state, { startLine: 4, endLine: 8, lineBreaks: 1 }, 9);
  assert.equal(replaced.get(7), 3); assert.equal(replaced.get(5), 9);
  const simultaneous = trail.applyChanges(new Map([[10, 1]]), [
    { startLine: 1, endLine: 1, lineBreaks: 2 }, { startLine: 5, endLine: 5, lineBreaks: 1 }
  ], 9);
  assert.equal(simultaneous.get(13), 1); assert.equal(simultaneous.get(7), 9);
  assert.equal(trail.countLineBreaks('a\r\nb\nc\rd'), 3);
  assert.deepEqual([...state], [[1, 1], [5, 2], [10, 3]], 'input is not mutated');
});

test('trail age boundaries, pruning, order, and huge insertions are bounded', () => {
  for (const [age, expected] of [[0, 0], [119999, 0], [120000, 1], [299999, 1], [300000, 2], [599999, 2], [600000, null]]) assert.equal(trail.bucket(age, 10), expected);
  assert.deepEqual([...trail.prune(new Map([[1, 0], [2, 599999]]), 600000, 10)], [[2, 599999]]);
  assert.deepEqual(trail.recentLines(new Map([[2, 1], [4, 8], [0, 5]])), [4, 0, 2]);
  assert.equal(trail.applyChange(new Map(), { startLine: 0, endLine: 0, lineBreaks: 10000000 }, 1).size, 2000);
  assert.equal(trail.prune(new Map(Array.from({ length: 3000 }, (_, i) => [i, i])), 3000, 10).size, 2000);
});

test('Rust scanner identifies exact calls, panic macros, and unsafe with UTF-16 offsets', () => {
  const prefix = String.fromCodePoint(0x1f680, 0x4f60), text = prefix + ' value .\n unwrap () ; other . expect ("why"); panic!(); unreachable!(); todo!(); unimplemented!(); unsafe {}';
  const risks = scanRust(text);
  assert.deepEqual(risks.map(risk => risk.kind), ['unwrap', 'expect', 'panic', 'unreachable', 'todo', 'unimplemented', 'unsafe']);
  assert.equal(risks[0].start, text.indexOf('.')); assert.equal(text.slice(risks.at(-1).start, risks.at(-1).end), 'unsafe');
  assert.deepEqual(scanRust('unwrap_or(); x.unwrap_or_else(f); x.unwrap_or_default(); x.expect_err("x"); mypanic!(); r#unsafe;'), []);
});

test('Rust scanner skips comments, nested comments, escaped, raw, byte, and char literals', () => {
  const text = [
    '// x.unwrap() unsafe', '/// panic!()', '/* outer unsafe /* inner panic!() */ x.unwrap() */',
    'let a = "quote \\" unsafe x.unwrap()";', 'let b = r###"panic!() " and x.unwrap()"###;',
    'let c = br##"unsafe panic!()"##;', 'let d = b"unsafe";', "let e = 'u'; let f = b'!'; let g = '\\u{1F680}';",
    "fn example<'a>(x: &'a str) -> &'static str { x.unwrap() }"
  ].join('\n');
  assert.deepEqual(scanRust(text).map(risk => risk.kind), ['unwrap']);
});

test('Rust test bodies are skipped by default but ordinary code is still inspected', () => {
  const text = '#[cfg(test)] mod tests { #[test] fn sample() { x.unwrap(); unsafe {} } } #[test] fn other() { panic!() } fn prod() { x.expect("x"); }';
  assert.deepEqual(scanRust(text).map(risk => risk.kind), ['expect']);
  assert.deepEqual(scanRust(text, false).map(risk => risk.kind), ['unwrap', 'unsafe', 'panic', 'expect']);
  assert.deepEqual(scanRust('"unterminated panic!()'), []);
});
