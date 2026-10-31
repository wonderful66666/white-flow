'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createManager, BEGIN, END, stripOwnedBlock } = require('../tools/manage.cjs');
const REPOSITORY = path.resolve(__dirname, '..');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'white-flow-test-'));
  const appRoot = path.join(root, 'Application With Spaces', 'resources', 'app');
  const workbench = path.join(appRoot, 'out/vs/code/electron-sandbox/workbench/workbench.html');
  const stateDir = path.join(root, 'Private State');
  fs.mkdirSync(path.dirname(workbench), { recursive: true });
  fs.writeFileSync(path.join(appRoot, 'package.json'), JSON.stringify({ version: '1.98.2' }));
  const html = '<html><head><meta http-equiv="Content-Security-Policy" content="script-src &apos;self&apos;; style-src &apos;self&apos;"><title>Fixture</title></head><body><main>Fixture</main><script src="workbench.js" type="module"></script></body></html>';
  fs.writeFileSync(workbench, html, { mode: 0o644 });
  const options = { appRoot, stateDir, repository: REPOSITORY, confirm: true };
  const manager = createManager(options);
  t.after(() => {
    const parent = fs.realpathSync.native(os.tmpdir());
    const resolved = fs.realpathSync.native(root);
    assert.equal(path.dirname(resolved), parent);
    assert.ok(path.basename(resolved).startsWith('white-flow-test-'));
    assert.equal(fs.lstatSync(root).isSymbolicLink(), false);
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return { root, appRoot, workbench, stateDir, html, options, manager, assets: path.join(path.dirname(workbench), 'white-flow-assets') };
}

test('plan is read-only and does not disclose local paths', t => {
  const f = fixture(t), result = f.manager.plan();
  assert.equal(result.writesPerformed, false);
  assert.equal(fs.existsSync(f.stateDir), false);
  assert.equal(fs.existsSync(f.assets), false);
  assert.equal(JSON.stringify(result).includes(f.root), false);
});

test('apply requires explicit confirmation', t => {
  const f = fixture(t);
  assert.throws(() => createManager({ ...f.options, confirm: false }).apply(), /requires --confirm/);
  assert.equal(fs.readFileSync(f.workbench, 'utf8'), f.html);
});

test('apply preserves CSP and startup order; restore recovers exact bytes', t => {
  const f = fixture(t);
  assert.equal(f.manager.apply().pass, true);
  const installed = fs.readFileSync(f.workbench, 'utf8');
  assert.equal(stripOwnedBlock(installed), f.html);
  assert.match(installed, /src="\.\/white-flow-assets\/keyword-flow\.js" defer/);
  assert.equal(installed.includes('<script>'), false);
  assert.equal(f.manager.apply().alreadyApplied, true);
  assert.equal(f.manager.restore().mode, 'exact-original');
  assert.equal(fs.readFileSync(f.workbench, 'utf8'), f.html);
  assert.equal(fs.existsSync(f.assets), false);
  assert.equal(fs.existsSync(path.join(f.stateDir, 'workbench.original')), true);
});

test('application file mode is preserved on platforms with POSIX modes', t => {
  const f = fixture(t), before = fs.statSync(f.workbench).mode & 0o777;
  f.manager.apply();
  assert.equal(fs.statSync(f.workbench).mode & 0o777, before);
  f.manager.restore();
  assert.equal(fs.statSync(f.workbench).mode & 0o777, before);
});

test('restore preserves later workbench changes and never downgrades a version', t => {
  const f = fixture(t); f.manager.apply();
  fs.appendFileSync(f.workbench, '\n<!-- independent update -->');
  fs.writeFileSync(path.join(f.appRoot, 'package.json'), JSON.stringify({ version: '1.99.0' }));
  assert.equal(f.manager.restore().mode, 'owned-block-only');
  assert.equal(fs.readFileSync(f.workbench, 'utf8'), f.html + '\n<!-- independent update -->');
});

test('restore does not delete a modified asset or unknown file', t => {
  const f = fixture(t); f.manager.apply();
  fs.writeFileSync(path.join(f.assets, 'keyword-flow.css'), '/* user modification */');
  fs.writeFileSync(path.join(f.assets, 'keep.txt'), 'user data');
  assert.equal(f.manager.restore().assetsPreservedForReview, 1);
  assert.equal(fs.readFileSync(path.join(f.assets, 'keep.txt'), 'utf8'), 'user data');
  assert.equal(fs.readFileSync(path.join(f.assets, 'keyword-flow.css'), 'utf8'), '/* user modification */');
});

test('unmanaged asset directories are never overwritten', t => {
  const f = fixture(t); fs.mkdirSync(f.assets); fs.writeFileSync(path.join(f.assets, 'keep.txt'), 'keep');
  assert.throws(() => f.manager.apply(), /unmanaged/);
  assert.equal(fs.readFileSync(f.workbench, 'utf8'), f.html);
  assert.equal(fs.readFileSync(path.join(f.assets, 'keep.txt'), 'utf8'), 'keep');
});

test('private state cannot overlap source or application directories', t => {
  const f = fixture(t);
  assert.throws(() => createManager({ ...f.options, stateDir: path.join(REPOSITORY, 'backups') }), /must not overlap/);
  assert.throws(() => createManager({ ...f.options, stateDir: f.appRoot }).plan(), /must not overlap/);
});

test('a damaged backup aborts restore before modifying the application', t => {
  const f = fixture(t); f.manager.apply();
  const installed = fs.readFileSync(f.workbench);
  fs.writeFileSync(path.join(f.stateDir, 'workbench.original'), 'damaged');
  assert.throws(() => f.manager.restore(), /checksum mismatch/);
  assert.deepEqual(fs.readFileSync(f.workbench), installed);
});

test('existing local-only patches must be removed separately', t => {
  const f = fixture(t);
  fs.writeFileSync(f.workbench, f.html.replace('</head>', '<!-- SHADCN-WHITE-SKIN:BEGIN --></head>'));
  assert.throws(() => f.manager.apply(), /local-only skin/);
});

test('an installation record cannot be reused for a different application', t => {
  const first = fixture(t), second = fixture(t);
  first.manager.apply(); second.manager.apply();
  const manager = createManager({ ...second.options, stateDir: first.stateDir });
  assert.throws(() => manager.apply(), /record already exists/);
});

test('non-UTF-8 workbench bytes are not rewritten', t => {
  const f = fixture(t), bytes = Buffer.concat([Buffer.from(f.html), Buffer.from([0xff])]);
  fs.writeFileSync(f.workbench, bytes);
  assert.throws(() => f.manager.apply(), /not valid UTF-8/);
  assert.deepEqual(fs.readFileSync(f.workbench), bytes);
  assert.equal(fs.existsSync(f.stateDir), false);
});

test('settings outside the application are neither read nor written', t => {
  const f = fixture(t), settings = path.join(f.root, 'settings.json');
  const content = '{"editor.fontSize":16,"editor.fontFamily":"Monospace","language.toolchain":"unchanged"}';
  fs.writeFileSync(settings, content);
  f.manager.apply(); f.manager.restore();
  assert.equal(fs.readFileSync(settings, 'utf8'), content);
});

test('malformed or repeated ownership markers are rejected', () => {
  assert.throws(() => stripOwnedBlock(BEGIN), /marker structure/);
  assert.throws(() => stripOwnedBlock(BEGIN + BEGIN + END), /marker structure/);
  assert.throws(() => stripOwnedBlock(BEGIN + END + END), /marker structure/);
});

test('CLI errors omit filesystem details', t => {
  const f = fixture(t), missing = path.join(f.root, 'Missing Application');
  const result = spawnSync(process.execPath, [path.join(REPOSITORY, 'tools/manage.cjs'), 'plan', '--app-root', missing, '--state-dir', f.stateDir], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal((result.stdout + result.stderr).includes(f.root), false);
});
