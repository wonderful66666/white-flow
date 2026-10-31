'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { findingsForText } = require('../tools/audit-release.cjs');

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
