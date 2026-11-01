'use strict';
// Requires the compiled extension: run `npm run compile` first (`npm test` does this).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { removeTempDirectory } = require('../tools/fixture-cleanup.cjs');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out');
if (!fs.existsSync(path.join(OUT, 'typingRules.js'))) {
  throw new Error('Compiled extension not found. Run `npm run compile` before `node --test`.');
}
const rules = require('../out/typingRules.js');
const { patchMarkerPresent, patchProvidesKeyframes, WORKBENCH_ENTRIES } = require('../out/patchStatus.js');
const { HTML_LOCATIONS, BEGIN } = require('../tools/manage.cjs');

const insert = (rangeOffset, text) => ({ rangeOffset, rangeLength: 0, text });
const replace = (rangeOffset, rangeLength, text) => ({ rangeOffset, rangeLength, text });
const CJK = String.fromCodePoint(0x4f60, 0x597d);

test('ordinary typing animates the typed character', () => {
  assert.deepEqual(rules.motionSpans([insert(10, 'a')]), [{ start: 10, length: 1 }]);
  assert.deepEqual(rules.motionSpans([insert(0, '=>')]), [{ start: 0, length: 2 }]);
});

test('bulk paste, Enter, indentation, and long insertions stay still', () => {
  for (const text of ['one\ntwo', '\n', '\r\n    ', '    ', '\t', 'longer', '']) {
    assert.deepEqual(rules.motionSpans([insert(3, text)]), [], JSON.stringify(text));
  }
});

test('an auto-closed pair animates only the typed opening character', () => {
  for (const pair of ['()', '[]', '{}', '""', "''", '``']) {
    assert.deepEqual(rules.motionSpans([insert(4, pair)]), [{ start: 4, length: 1 }], pair);
  }
});

test('input method: composition updates stay still, the committed word animates', () => {
  assert.deepEqual(rules.motionSpans([replace(5, 1, 'ni')]), []);
  assert.deepEqual(rules.motionSpans([replace(5, 2, CJK)]), [{ start: 5, length: 2 }]);
  // Astral characters count as one code point but two UTF-16 units.
  const emoji = String.fromCodePoint(0x1f600);
  assert.deepEqual(rules.motionSpans([insert(0, emoji)]), [{ start: 0, length: 2 }]);
});

test('ASCII replacements such as completions and renames stay still', () => {
  assert.deepEqual(rules.motionSpans([replace(0, 2, 'len')]), []);
  assert.deepEqual(rules.motionSpans([replace(0, 40, CJK)]), []);
});

test('multi-cursor typing maps every span into post-edit coordinates', () => {
  // Reported in reverse order, as editors often do. Each earlier insert shifts later ones by one.
  const spans = rules.motionSpans([insert(20, 'x'), insert(10, 'x'), insert(0, 'x')]);
  assert.deepEqual(spans, [{ start: 0, length: 1 }, { start: 11, length: 1 }, { start: 22, length: 1 }]);
  // A skipped change still shifts the ones after it.
  assert.deepEqual(rules.motionSpans([insert(0, 'a\nb'), insert(5, 'y')]), [{ start: 8, length: 1 }]);
});

test('very large multi-cursor edits are treated as bulk edits', () => {
  const many = Array.from({ length: rules.MAX_SIMULTANEOUS_EDITS + 1 }, (_, i) => insert(i * 4, 'x'));
  assert.deepEqual(rules.motionSpans(many), []);
});

test('short astral text is supported and long single-line input is rejected', () => {
  const emoji = String.fromCodePoint(0x1f600);
  assert.deepEqual(rules.motionSpans([insert(0, emoji.repeat(4))]), [{ start: 0, length: 8 }]);
  assert.deepEqual(rules.motionSpans([insert(0, 'x'.repeat(1000000))]), []);
});

test('duration, style, and decoration CSS', () => {
  assert.equal(rules.clampDuration(undefined), rules.DEFAULT_DURATION_MS);
  assert.equal(rules.clampDuration(5), rules.MIN_DURATION_MS);
  assert.equal(rules.clampDuration(5000), rules.MAX_DURATION_MS);
  assert.equal(rules.clampDuration(Number.NaN), rules.DEFAULT_DURATION_MS);
  assert.equal(rules.resolveStyle('auto', true), 'rise');
  assert.equal(rules.resolveStyle('auto', false), 'fade');
  assert.equal(rules.resolveStyle('fade', true), 'fade');
  assert.equal(rules.resolveStyle('rise', false), 'fade');
  assert.equal(rules.resolveStyle('rise', true), 'rise');
  const css = rules.riseDeclaration(120);
  assert.match(css, /^none; position: relative; animation: white-flow-type-in 120ms /);
  assert.doesNotMatch(css, /transform|left|right/, 'horizontal positions must never change');
  assert.doesNotMatch(css, /[{}]/, 'must not break out of the generated CSS rule');
});

test('patch detection mirrors the installer and needs marker plus keyframes', async () => {
  assert.deepEqual([...WORKBENCH_ENTRIES], HTML_LOCATIONS);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'white-flow-detect-'));
  try {
    assert.equal(await patchProvidesKeyframes(root), false);
    assert.equal(await patchMarkerPresent(root), false);
    const entry = path.join(root, HTML_LOCATIONS[0]);
    const assets = path.join(path.dirname(entry), 'white-flow-assets');
    fs.mkdirSync(assets, { recursive: true });
    fs.writeFileSync(entry, '<html><head></head></html>');
    fs.writeFileSync(path.join(assets, 'workbench.css'), fs.readFileSync(path.join(ROOT, 'src/workbench.css')));
    assert.equal(await patchProvidesKeyframes(root), false, 'no marker: patch restored');
    fs.writeFileSync(entry, `<html><head>${BEGIN}\n</head></html>`);
    assert.equal(await patchMarkerPresent(root), true);
    assert.equal(await patchProvidesKeyframes(root), true);
    fs.writeFileSync(path.join(assets, 'workbench.css'), '/* an older patch without typing keyframes */');
    assert.equal(await patchProvidesKeyframes(root), false, 'older patch falls back to fade');
    assert.equal(await patchMarkerPresent(root), true, 'marker detection is independent of typing keyframes');
  } finally {
    removeTempDirectory(root, 'white-flow-detect-');
  }
});

test('extension sources contain no network, telemetry, or DOM access', () => {
  for (const file of fs.readdirSync(path.join(ROOT, 'extension'))) {
    const source = fs.readFileSync(path.join(ROOT, 'extension', file), 'utf8');
    assert.doesNotMatch(source, /\b(?:fetch|WebSocket|XMLHttpRequest|eval)\s*\(|require\(['"](?:https?|net|child_process)['"]\)|from ['"]node:(?:https?|net|child_process)['"]|\btelemetry/i, file);
    // Browser DOM APIs: the extension must change editor rendering only through decorations.
    assert.doesNotMatch(source, /\b(?:querySelector(?:All)?|getElementById|createElement|MutationObserver|innerHTML)\b/, file);
    assert.doesNotMatch(source, /\b(?:writeFile|appendFile|unlink|rm)\s*\(/, file);
  }
});
