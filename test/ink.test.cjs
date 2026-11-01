'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const themes = ['light', 'ink'].map(name => JSON.parse(read('themes/white-flow-' + name + '.json')));
const roles = {
  "#27272A": "#171A21",
  "#52525B": "#3F3F46",
  "#6B7280": "#5E6574",
  "#7C3AED": "#6D20D9",
  "#1D4ED8": "#1847D1",
  "#037471": "#00605E",
  "#03782E": "#046426",
  "#9A5702": "#814801",
  "#C22859": "#AC0448",
  "#B91C1C": "#AF0811"
};
const surfaces = {
  "editor.background": "#FAFAFB",
  "panel.background": "#FAFAFB",
  "breadcrumb.background": "#FAFAFB",
  "editorStickyScroll.background": "#FAFAFB",
  "tab.activeBackground": "#FAFAFB",
  "tab.unfocusedActiveBackground": "#FAFAFB",
  "editorGutter.background": "#F5F6F8",
  "editorStickyScrollGutter.background": "#F5F6F8",
  "sideBar.background": "#F5F6F8",
  "sideBarSectionHeader.background": "#F5F6F8",
  "activityBar.background": "#F5F6F8",
  "statusBar.background": "#F5F6F8",
  "statusBar.noFolderBackground": "#F5F6F8",
  "titleBar.activeBackground": "#F5F6F8",
  "editorGroupHeader.tabsBackground": "#F3F4F6",
  "tab.inactiveBackground": "#F3F4F6",
  "titleBar.inactiveBackground": "#F3F4F6",
  "sideBar.border": "#E3E5EA",
  "sideBarSectionHeader.border": "#E3E5EA",
  "activityBar.border": "#E3E5EA",
  "editorGroup.border": "#E3E5EA",
  "editorGroupHeader.tabsBorder": "#E3E5EA",
  "panel.border": "#E3E5EA",
  "statusBar.border": "#E3E5EA",
  "statusBar.noFolderBorder": "#E3E5EA",
  "titleBar.border": "#E3E5EA",
  "list.inactiveSelectionBackground": "#E8EAEF",
  "list.hoverBackground": "#ECEEF2",
  "list.focusBackground": "#ECEEF2",
  "editor.lineHighlightBackground": "#F1F3F6"
};

function rgb(color) {
  if (Array.isArray(color)) return color;
  assert.match(color, /^#[a-f0-9]{6}(?:[a-f0-9]{2})?$/i);
  return color.slice(1, 7).match(/../g).map(value => parseInt(value, 16));
}
function over(color, background, alpha) {
  const base = rgb(background);
  const opacity = alpha ?? (color.length === 9 ? parseInt(color.slice(7), 16) / 255 : 1);
  return rgb(color).map((value, i) => value * opacity + base[i] * (1 - opacity));
}
function contrast(a, b) {
  const luminance = color => rgb(color).map(value => {
    const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function foregrounds(theme) {
  return [...theme.tokenColors.map(rule => rule.settings.foreground),
    ...Object.values(theme.semanticTokenColors).map(style => typeof style === 'string' ? style : style.foreground),
    theme.colors['editor.foreground']].filter(Boolean);
}
function checkBackground(theme, background, selection = false) {
  const comment = theme.semanticTokenColors.comment;
  for (const color of foregrounds(theme)) {
    // Light's existing selection exception is deliberately retained, not recolored.
    const minimum = color === comment ? (selection && theme === themes[0] ? 3.5 : 4) : 4.5;
    const composited = over(color, background);
    assert.ok(contrast(composited, background) >= minimum,
      theme.name + ': ' + color + ' on ' + JSON.stringify(background) + ' < ' + minimum);
  }
}

test('Ink changes only the specified values and retains identical structure and scopes', () => {
  const expected = structuredClone(themes[0]);
  expected.name = 'White Flow Ink';
  expected.colors['editor.foreground'] = '#171A21';
  Object.assign(expected.colors, surfaces);
  for (const rule of expected.tokenColors) {
    if (rule.settings.foreground) rule.settings.foreground = roles[rule.settings.foreground] || rule.settings.foreground;
  }
  for (const [key, value] of Object.entries(expected.semanticTokenColors)) {
    if (typeof value === 'string') expected.semanticTokenColors[key] = roles[value] || value;
    else if (value.foreground) value.foreground = roles[value.foreground] || value.foreground;
  }
  assert.deepEqual(themes[1], expected);
  assert.equal(themes[0].colors['editorStickyScrollGutter.background'], '#FFFFFF');
});

test('both themes register as light themes, keep fonts untouched, and reserve their keyword purple', () => {
  const metadata = JSON.parse(read('package.json'));
  assert.deepEqual(metadata.contributes.themes, [
    { label: 'White Flow Light', uiTheme: 'vs', path: './themes/white-flow-light.json' },
    { label: 'White Flow Ink', uiTheme: 'vs', path: './themes/white-flow-ink.json' }
  ]);
  const when = metadata.contributes.menus['editor/title'][0].when;
  assert.equal(when, 'config.workbench.colorTheme =~ /^White Flow (Light|Ink)$/');
  const pattern = new RegExp(when.slice(when.indexOf('/') + 1, -1));
  for (const label of ['White Flow Light', 'White Flow Ink']) assert.equal(pattern.test(label), true);
  for (const label of ['', 'White Flow', 'White Flow Light Extra', 'xWhite Flow Ink', 'Dark+']) assert.equal(pattern.test(label), false);
  for (const theme of themes) {
    assert.equal(theme.type, 'light'); assert.doesNotMatch(JSON.stringify(theme), /font(?:Family|Size)|[A-Z]:\\\\/i);
    assert.deepEqual(Object.keys(theme).sort(), Object.keys(themes[0]).sort());
    const purple = theme.semanticTokenColors.keyword;
    const keywordRules = theme.tokenColors.filter(rule => rule.settings.foreground === purple);
    assert.equal(keywordRules.length, 1); assert.equal(keywordRules[0].name, 'Keyword');
    assert.deepEqual(Object.entries(theme.semanticTokenColors).filter(([, style]) =>
      (typeof style === 'string' ? style : style.foreground) === purple).map(([key]) => key).sort(), ['keyword', 'selfKeyword']);
    assert.equal(JSON.stringify(theme).split(purple).length - 1, 3);
    for (const prefix of ['editorWidget', 'editorHoverWidget', 'editorSuggestWidget', 'quickInput', 'menu', 'notifications', 'dropdown']) {
      assert.equal(theme.colors[prefix + '.background'], '#FFFFFF', prefix);
    }
  }
});

test('both themes meet base, line, and selection contrast with the documented Light exception', () => {
  for (const theme of themes) for (const key of ['editor.background', 'editor.lineHighlightBackground', 'editor.selectionBackground']) {
    checkBackground(theme, theme.colors[key], key === 'editor.selectionBackground');
  }
  const original = contrast(themes[0].semanticTokenColors.comment, themes[0].colors['editor.selectionBackground']);
  assert.ok(original > 3.95 && original < 4, 'preserve the original Light comment color');
});

test('both themes retain composited contrast for highlights, mist, glass, markers, and engraved shadow', () => {
  const { TODO_COLORS } = require('../out/todoRules');
  const stops = [[124, 58, 237, .08], [29, 78, 216, .075], [3, 116, 113, .065], [194, 40, 89, .06]];
  for (const theme of themes) {
    const editor = theme.colors['editor.background'];
    checkBackground(theme, over([23, 26, 33], editor, .07));
    for (const key of ['editor.background', 'editor.lineHighlightBackground']) {
      const base = theme.colors[key];
      for (const highlight of ['editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground', 'editor.wordHighlightTextBackground']) {
        checkBackground(theme, over(theme.colors[highlight], base));
      }
      checkBackground(theme, over([255, 255, 255], base, .66));
      for (const marker of Object.values(TODO_COLORS)) {
        assert.ok(contrast(marker.foreground, marker.flat) >= 4.5);
        assert.ok(contrast(marker.foreground, over(marker.marker, base, .62)) >= 4.5);
      }
    }
    for (const [r, g, b, alpha] of stops) checkBackground(theme, over([129, 140, 248], over([r, g, b], editor, alpha), .06));
    for (const chip of ['#F4F4F5', '#FFFFFF']) checkBackground(theme, chip);
  }
});

test('workbench surface rules use native variables instead of forcing other light themes white', () => {
  const css = read('src/workbench.css');
  assert.doesNotMatch(css, /background(?:-color)?\s*:\s*#(?:fff(?:fff)?|fafafa|f8f8f9)\b/i);
  for (const name of ['editor-background', 'editorGutter-background', 'sideBar-background', 'activityBar-background',
    'editorGroupHeader-tabsBackground', 'tab-activeBackground', 'commandCenter-background', 'commandCenter-border',
    'quickInput-background', 'menu-background', 'menu-border', 'statusBar-background', 'panel-background']) {
    assert.ok(css.includes('var(--vscode-' + name + ')'), name);
  }
  assert.ok(css.includes('[class*="-themes-white-flow-light-json"]'));
});

test('the file-based synthetic preview projects both palettes without stale colors', () => {
  const html = read('demo/index.html');
  const data = JSON.parse(html.match(/<script id="preview-themes" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const names = ['Ink', 'Keyword', 'String', 'Function', 'Comment', 'Constant', 'Structure', 'Type', 'Meta', 'Danger'];
  const variables = new Set([...((read('src/workbench.css') + html).matchAll(/--vscode-([\w-]+)/g))].map(match => match[1]));
  for (const [i, key] of ['light', 'ink'].entries()) {
    assert.equal(data[key].name, themes[i].name);
    assert.deepEqual(data[key].tokens, names.map(name => themes[i].tokenColors.find(rule => rule.name === name).settings.foreground));
    assert.deepEqual(data[key].colors, Object.fromEntries(Object.entries(themes[i].colors)
      .filter(([name]) => variables.has(name.replaceAll('.', '-')))));
  }
  assert.match(html, /id="color-theme"/); assert.match(html, /id="engraved" type="checkbox"/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
});
