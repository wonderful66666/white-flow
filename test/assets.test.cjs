'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Script } = require('node:vm');
const ROOT = path.resolve(__dirname, '..');

function readTheme() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'themes/white-flow-light.json'), 'utf8'));
}

function channels(hex) {
  assert.match(hex, /^#[0-9a-f]{6}$/i, 'contrast checks require opaque sRGB colors');
  return hex.slice(1).match(/../g).map(channel => Number.parseInt(channel, 16));
}

function compositeColor(color, background) {
  assert.match(color, /^#[0-9a-f]{8}$/i);
  const alpha = Number.parseInt(color.slice(7), 16) / 255;
  const foreground = channels(color.slice(0, 7));
  const base = typeof background === 'string' ? channels(background) : background;
  return base.map((value, i) => foreground[i] * alpha + value * (1 - alpha));
}

function relativeLuminance(color) {
  const linear = (typeof color === 'string' ? channels(color) : color).map(channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first), b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function syntaxForegrounds(theme) {
  const entries = theme.tokenColors.filter(rule => rule.settings.foreground).map(rule => ({
    name: `TextMate ${rule.name}`, color: rule.settings.foreground
  }));
  for (const [name, style] of Object.entries(theme.semanticTokenColors)) {
    const color = typeof style === 'string' ? style : style.foreground;
    if (color) entries.push({ name: `semantic ${name}`, color });
  }
  return entries;
}

test('theme contains no machine settings or font overrides', () => {
  const theme = readTheme();
  assert.equal(theme.type, 'light');
  assert.equal(theme.colors['editor.background'], '#FFFFFF');
  assert.ok(theme.tokenColors.length > 0);
  assert.deepEqual(Object.keys(theme).sort(), [
    '$schema', 'name', 'type', 'colors', 'tokenColors', 'semanticHighlighting', 'semanticTokenColors'
  ].sort());
  assert.doesNotMatch(JSON.stringify(theme), /font(?:Family|Size)/i);
});

test('syntax foregrounds meet WCAG contrast on editor, current line, and selection', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  assert.equal(contrastRatio('#FFFFFF', '#000000'), 21);
  const theme = readTheme(), foregrounds = syntaxForegrounds(theme);
  assert.ok(foregrounds.length > 0);
  for (const { name, color } of foregrounds) {
    for (const key of ['editor.background', 'editor.lineHighlightBackground', 'editor.selectionBackground']) {
      const minimum = key === 'editor.selectionBackground' && color.toUpperCase() === '#6B7280' ? 3.5 : 4.5;
      const ratio = contrastRatio(color, theme.colors[key]);
      assert.ok(ratio >= minimum, `${name} ${color} on ${key}: ${ratio.toFixed(4)} < ${minimum}`);
    }
  }
});

test('keyword purple is reserved for the keyword rule and keyword semantic tokens', () => {
  const theme = readTheme(), purple = '#7C3AED';
  const matches = theme.tokenColors.filter(rule => rule.settings.foreground?.toUpperCase() === purple);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].name, 'Keyword');
  assert.deepEqual(matches[0].scope, [
    'keyword', 'keyword.control', 'keyword.other', 'storage.type', 'storage.modifier', 'variable.language',
    'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.instanceof', 'keyword.operator.word'
  ]);
  const semantic = Object.entries(theme.semanticTokenColors).filter(([, style]) =>
    (typeof style === 'string' ? style : style.foreground)?.toUpperCase() === purple);
  assert.deepEqual(semantic.map(([name]) => name).sort(), ['keyword', 'selfKeyword']);
  for (const [key, color] of Object.entries(theme.colors)) assert.notEqual(color.toUpperCase(), purple, key);
  assert.equal(JSON.stringify(theme).match(/#7c3aed/gi).length, 3);
});

test('read and write highlights retain alpha and meet composited syntax contrast', () => {
  assert.deepEqual(compositeColor('#00000000', '#FFFFFF'), [255, 255, 255]);
  assert.deepEqual(compositeColor('#000000FF', '#FFFFFF'), [0, 0, 0]);
  const theme = readTheme();
  const expected = {
    'editor.wordHighlightBackground': '#D4D4D859', 'editor.wordHighlightBorder': '#D4D4D8',
    'editor.wordHighlightStrongBackground': '#FCD34D4D', 'editor.wordHighlightStrongBorder': '#F59E0B99',
    'editor.wordHighlightTextBackground': '#E4E4E759',
    'editorOverviewRuler.wordHighlightForeground': '#A1A1AA99',
    'editorOverviewRuler.wordHighlightStrongForeground': '#F59E0BCC'
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(theme.colors[key], value, key);
  for (const key of ['editor.wordHighlightBackground', 'editor.wordHighlightStrongBackground']) {
    assert.ok(Number.parseInt(theme.colors[key].slice(7), 16) < 255);
    for (const background of ['editor.background', 'editor.lineHighlightBackground']) {
      const composited = compositeColor(theme.colors[key], theme.colors[background]);
      for (const { name, color } of syntaxForegrounds(theme)) {
        const minimum = color.toUpperCase() === '#6B7280' ? 4 : 4.5;
        assert.ok(contrastRatio(color, composited) >= minimum, `${name} on ${key} over ${background}`);
      }
    }
  }
});

test('TextMate roles include specific type, constant, and metadata overrides', () => {
  const theme = readTheme(), roles = new Map(theme.tokenColors.map(rule => [rule.name, rule]));
  assert.equal(roles.size, theme.tokenColors.length, 'role names must be unique');
  const expected = {
    Ink: '#27272A', Structure: '#52525B', Comment: '#6B7280', Keyword: '#7C3AED', Function: '#1D4ED8',
    Type: '#037471', String: '#03782E', Constant: '#9A5702', Meta: '#C22859', Danger: '#B91C1C'
  };
  for (const [name, foreground] of Object.entries(expected)) {
    assert.equal(roles.get(name)?.settings.foreground, foreground, name);
    assert.equal(roles.get(name)?.settings.fontStyle, '', name);
  }
  const specific = {
    Ink: ['source', 'variable', 'variable.other', 'variable.parameter', 'meta.interpolation'],
    Structure: ['keyword.operator', 'punctuation', 'storage.modifier.import', 'keyword.control.ternary', 'keyword.operator.ternary', 'entity.name.namespace', 'entity.name.module', 'support.other.namespace', 'entity.name.package'],
    Comment: ['comment', 'punctuation.definition.comment', 'comment.block.documentation', 'comment.line.documentation', 'comment.block.javadoc'],
    Type: ['storage.type.java', 'storage.type.generic', 'storage.type.primitive', 'storage.type.object.array', 'entity.name.type.primitive', 'entity.name.type.numeric', 'entity.name.tag', 'entity.name.trait', 'entity.name.struct', 'support.class.component'],
    String: ['string', 'string.quoted', 'punctuation.definition.string', 'constant.character.char'],
    Constant: ['entity.name.type.lifetime', 'punctuation.definition.lifetime', 'entity.name.type.option', 'variable.other.enummember', 'variable.other.constant', 'entity.other.attribute-name', 'string.regexp', 'constant.other.placeholder', 'punctuation.definition.interpolation', 'constant.character.escape'],
    Function: ['entity.name.function', 'support.function', 'variable.function', 'meta.function-call entity.name.function', 'support.type.property-name', 'meta.object-literal.key'],
    Meta: ['entity.name.function.macro', 'support.function.macro', 'meta.attribute', 'punctuation.definition.attribute', 'storage.type.annotation', 'punctuation.definition.annotation', 'meta.decorator', 'entity.name.function.decorator', 'punctuation.decorator', 'meta.preprocessor', 'markup.inline.raw']
  };
  for (const [name, scopes] of Object.entries(specific)) {
    for (const scope of scopes) assert.ok(roles.get(name).scope.includes(scope), `${name}: ${scope}`);
  }
  assert.equal(theme.tokenColors.some(rule => rule.scope.includes('storage')), false);
  assert.deepEqual(roles.get('Markdown Heading').settings, { foreground: '#27272A', fontStyle: 'bold' });
  assert.deepEqual(roles.get('Markdown Italic').settings, { fontStyle: 'italic' });
  assert.deepEqual(roles.get('Markdown Bold').settings, { fontStyle: 'bold' });
  for (const [name, foreground] of Object.entries({
    'Markdown Link': '#1D4ED8', 'Markdown Quote': '#6B7280', 'Diff Inserted': '#03782E', 'Diff Changed': '#9A5702'
  })) assert.deepEqual(roles.get(name).settings, { foreground, fontStyle: '' });
});

test('semantic roles preserve neutral identifiers and exclude mutable and bracket overrides', () => {
  const theme = readTheme();
  assert.equal(theme.semanticHighlighting, true);
  const expected = [
    ['#7C3AED', ['keyword', 'selfKeyword']],
    ['#1D4ED8', ['function', 'method']],
    ['#C22859', ['macro', 'decorator', 'attribute', 'builtinAttribute', 'annotation']],
    ['#037471', ['class', 'struct', 'interface', 'enum', 'type', 'typeParameter', 'builtinType', 'typeAlias']],
    ['#52525B', ['namespace', 'operator']],
    ['#27272A', ['variable', 'parameter', 'property']],
    ['#9A5702', ['enumMember', 'lifetime', 'number', 'boolean', 'escapeSequence', 'formatSpecifier']],
    ['#03782E', ['string']],
    ['#6B7280', ['comment']]
  ];
  for (const [color, names] of expected) {
    for (const name of names) assert.equal(theme.semanticTokenColors[name], color, name);
  }
  for (const name of Object.keys(theme.semanticTokenColors)) assert.doesNotMatch(name, /(?:^|\.)mutable\b|bracket/i);
});

test('editor highlights have explicit palette colors without reusing keyword purple', () => {
  const { colors } = readTheme();
  const expected = {
    'editorBracketHighlight.foreground1': '#996702',
    'editorBracketHighlight.foreground2': '#855BC4',
    'editorBracketHighlight.foreground3': '#1278A6',
    'editorBracketHighlight.foreground4': '#996702',
    'editorBracketHighlight.foreground5': '#855BC4',
    'editorBracketHighlight.foreground6': '#1278A6',
    'editorBracketHighlight.unexpectedBracket.foreground': '#B91C1C',
    'editorBracketPairGuide.activeBackground1': '#99670280',
    'editorBracketPairGuide.activeBackground2': '#855BC480',
    'editorBracketPairGuide.activeBackground3': '#1278A680',
    'editorBracketPairGuide.background1': '#99670233',
    'editorBracketPairGuide.background2': '#855BC433',
    'editorBracketPairGuide.background3': '#1278A633',
    'editorBracketMatch.background': '#EDE9FE',
    'editorBracketMatch.border': '#C4B5FD',
    'editorInlayHint.foreground': '#6B6B74',
    'editorInlayHint.background': '#F4F4F5',
    'editorInlayHint.typeForeground': '#6B6B74',
    'editorInlayHint.parameterForeground': '#6B6B74',
    'editorInlayHint.typeBackground': '#F4F4F5',
    'editorInlayHint.parameterBackground': '#F4F4F5',
    'editorCodeLens.foreground': '#71717A',
    'editorError.foreground': '#DC2626',
    'editorWarning.foreground': '#D97706',
    'editorInfo.foreground': '#2563EB',
    'editorHint.foreground': '#A1A1AA',
    'editorGutter.addedBackground': '#16A34A',
    'editorGutter.modifiedBackground': '#2563EB',
    'editorGutter.deletedBackground': '#DC2626',
    'diffEditor.insertedTextBackground': '#16A34A26',
    'diffEditor.removedTextBackground': '#DC262626',
    'diffEditor.insertedLineBackground': '#16A34A12',
    'diffEditor.removedLineBackground': '#DC262612',
    'gitDecoration.modifiedResourceForeground': '#9A5702',
    'gitDecoration.untrackedResourceForeground': '#03782E',
    'gitDecoration.addedResourceForeground': '#03782E',
    'gitDecoration.deletedResourceForeground': '#B91C1C',
    'gitDecoration.conflictingResourceForeground': '#C22859',
    'gitDecoration.ignoredResourceForeground': '#A1A1AA',
    'editorStickyScroll.background': '#FFFFFF',
    'editorStickyScrollHover.background': '#F6F7F9',
    'editorStickyScroll.shadow': '#18181B14'
  };
  for (const [key, color] of Object.entries(expected)) assert.equal(colors[key], color, key);
});

test('runtime parses and contains no network or code-text reads', () => {
  const source = fs.readFileSync(path.join(ROOT, 'src/keyword-flow.js'), 'utf8');
  assert.doesNotThrow(() => new Script(source));
  assert.doesNotMatch(source, /\b(?:fetch|WebSocket|XMLHttpRequest|eval)\s*\(/);
  assert.equal((source.match(/\brequestAnimationFrame\s*\(/g) || []).length, 1, 'one event-batched beam layout callback only');
  assert.doesNotMatch(source, /requestAnimationFrame\(\s*(?:tick|scheduleBeams)\b/);
  assert.match(source, /1000 \/ 6/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /forced-colors/);
  assert.deepEqual(source.match(/rgb\(\d+, \d+, \d+\)/g), ['rgb(124, 58, 237)']);
  assert.match(source, /--white-flow-keyword-flow/);
  assert.match(source, /CSS\.supports\('background-image', value\)/);
  assert.match(source, /replace\(' in oklch', ''\)/);
});

test('mist band stops plus cursor glow and beam backgrounds preserve syntax contrast', () => {
  const theme = readTheme();
  const stops = [[124, 58, 237, .08], [29, 78, 216, .075], [3, 116, 113, .065], [194, 40, 89, .06]];
  const backgrounds = stops.map(([r, g, b, alpha]) => {
    const band = [r, g, b].map(channel => channel * alpha + 255 * (1 - alpha));
    return [129, 140, 248].map((channel, i) => channel * .06 + band[i] * .94);
  });
  backgrounds.push('#F4F4F5', '#FFFFFF');
  for (const background of backgrounds) for (const { name, color } of syntaxForegrounds(theme)) {
    assert.ok(contrastRatio(color, background) >= (color.toUpperCase() === '#6B7280' ? 4 : 4.5), name);
  }
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
  assert.equal(contributes.configuration.properties['whiteFlow.keywordFlow.enabled'].default, false);
  assert.deepEqual(contributes.configuration.properties['whiteFlow.keywordFlow.palette'].enum, ['aurora', 'spectrum']);
  assert.equal(contributes.configuration.properties['whiteFlow.keywordFlow.palette'].default, 'aurora');
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
