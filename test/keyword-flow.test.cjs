'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { signalDeclaration } = require('../out/workbenchSignal.js');

test('keyword signal emits only the two exact allowlisted declarations', () => {
  for (const palette of ['aurora', 'spectrum']) {
    const value = signalDeclaration({ enabled: true, palette });
    assert.equal(value, 'none; --white-flow-keyword-flow: ' + palette);
    assert.doesNotMatch(value, /[{}]/);
  }
});

test('disabled or unknown keyword signal values emit nothing', () => {
  const invalid = [undefined, null, false, {}, { enabled: false, palette: 'aurora' },
    { enabled: 'true', palette: 'aurora' }, { enabled: true },
    ...['', 'AURORA', 'rainbow', '__proto__', 'aurora; color: red', 'x{}'].map(palette => ({ enabled: true, palette }))];
  for (const state of invalid) assert.equal(signalDeclaration(state), null);
});
