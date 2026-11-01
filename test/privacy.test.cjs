'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findingsForText } = require('../tools/audit-release.cjs');
const { removeTempDirectory } = require('../tools/fixture-cleanup.cjs');

test('privacy rules detect synthetic sensitive content', () => {
  // Assemble synthetic fixtures so the release itself contains no realistic credentials.
  const fixtures = [
    ['absolute-drive-path', ['Q:', '\\', 'Users', '\\', 'sample', '\\'].join('')],
    ['email-address', ['person', '@', 'example', '.', 'invalid'].join('')],
    ['ip-address', [192, 0, 2, 5].join('.')],
    ['private-key', ['-----BEGIN ', 'PRIVATE KEY', '-----'].join('')],
    ['credential-token', 'sk-' + 'x'.repeat(32)],
    ['non-ascii-text', String.fromCodePoint(0x4e2d)]
  ];
  for (const [rule, input] of fixtures) assert.ok(findingsForText(input).includes(rule), rule);
});

test('generic placeholders and environment-driven paths are accepted', () => {
  assert.deepEqual(findingsForText('<private-state-directory> / ${HOME} / %APPDATA% / White Flow'), []);
});

test('audit skips only root build directories and still flags nested ones', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { audit } = require('../tools/audit-release.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'white-flow-audit-'));
  try {
    fs.writeFileSync(path.join(root, 'release-files.json'), JSON.stringify(['release-files.json', 'a.txt']));
    fs.writeFileSync(path.join(root, 'a.txt'), 'plain');
    for (const dir of ['out', 'node_modules']) {
      fs.mkdirSync(path.join(root, dir));
      fs.writeFileSync(path.join(root, dir, 'x.js'), 'generated');
    }
    const clean = audit(root);
    assert.equal(clean.pass, true);
    assert.deepEqual(clean.localBuildDirectoriesSkipped.sort(), ['node_modules/', 'out/']);
    fs.mkdirSync(path.join(root, 'docs', 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'node_modules', 'y.js'), 'nested');
    const nested = audit(root);
    assert.equal(nested.pass, false);
    assert.ok(nested.findings.some(f => f.rule === 'private-or-generated-directory'));
  } finally {
    removeTempDirectory(root, 'white-flow-audit-');
  }
});
