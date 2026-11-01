'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function removeTempDirectory(directory, prefix) {
  const parent = fs.realpathSync.native(os.tmpdir());
  const resolved = fs.realpathSync.native(directory);
  assert.equal(path.dirname(resolved), parent, 'Cleanup must remain under the temporary directory');
  assert.ok(prefix.startsWith('white-flow-') && path.basename(resolved).startsWith(prefix));
  assert.equal(fs.lstatSync(directory).isSymbolicLink(), false);
  fs.rmSync(resolved, { recursive: true, force: true });
}

module.exports = { removeTempDirectory };
