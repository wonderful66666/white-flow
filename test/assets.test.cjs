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

test('the package has no runtime dependencies, install hooks, or eager activation', () => {
  const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(metadata.main, './out/main.js');
  // Activation after startup only; never "*" and never during startup.
  assert.deepEqual(metadata.activationEvents, ['onStartupFinished']);
  assert.deepEqual(metadata.extensionKind, ['ui']);
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) assert.equal(metadata.scripts[hook], undefined, hook);
  assert.equal(metadata.dependencies, undefined);
});

test('every feature is off by default and the hub button only appears with the theme', () => {
  const { contributes } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const toggles = Object.entries(contributes.configuration.properties).filter(([key]) => key.endsWith('.enabled'));
  assert.ok(toggles.length > 0);
  for (const [key, schema] of toggles) assert.equal(schema.default, false, key);
  const [button] = contributes.menus['editor/title'];
  assert.equal(button.command, 'whiteFlow.openFeatures');
  assert.equal(button.when, `config.workbench.colorTheme == '${contributes.themes[0].label}'`);
});

test('typing keyframes exist only when motion is allowed', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/workbench.css'), 'utf8');
  const guarded = css.match(/@media \(prefers-reduced-motion: no-preference\) and \(forced-colors: none\) \{\s*@keyframes white-flow-type-in \{[^}]*\}[^}]*\}\s*\}/);
  assert.ok(guarded, 'keyframes must sit inside the reduced-motion and forced-colors guard');
  assert.doesNotMatch(guarded[0], /\b(?:left|right|transform|scale|width|margin)\b/, 'vertical motion only');
  assert.equal(css.match(/@keyframes white-flow-type-in/g).length, 1);
});
