'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Script } = require('node:vm');
const ROOT = path.resolve(__dirname, '..');

test('theme contains no machine settings or font overrides', () => {
  const theme = JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/white-flow-light.json'), 'utf8'));
  assert.equal(theme.type, 'light');
  assert.equal(theme.colors['editor.background'], '#FFFFFF');
  assert.ok(theme.tokenColors.length > 0);
  for (const key of Object.keys(theme)) assert.ok(!key.startsWith('editor.') && !key.startsWith('python.') && !key.startsWith('java.'));
  assert.equal(JSON.stringify(theme).includes('fontFamily'), false);
});

test('runtime parses and contains no network or code-text reads', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/keyword-flow.js'), 'utf8');
  assert.doesNotThrow(() => new Script(source));
  assert.doesNotMatch(source, /\b(?:fetch|WebSocket|XMLHttpRequest|eval)\s*\(/);
  assert.doesNotMatch(source, /\brequestAnimationFrame\s*\(/);
  assert.match(source, /1000 \/ 6/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /forced-colors/);
});

test('the theme package has no automatic activation or installation hooks', () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(metadata.main, undefined);
  assert.equal(metadata.activationEvents, undefined);
  assert.equal(metadata.scripts.postinstall, undefined);
  assert.equal(metadata.dependencies, undefined);
});
