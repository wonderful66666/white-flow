'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseArgs } = require('node:util');

const REPOSITORY = path.resolve(__dirname, '..');
const BEGIN = '<!-- WHITE-FLOW:BEGIN -->';
const END = '<!-- WHITE-FLOW:END -->';
const ASSET_DIRECTORY = 'white-flow-assets';
const PAYLOADS = ['workbench.css', 'keyword-flow.css', 'keyword-flow.js'];
const HTML_LOCATIONS = [
  'out/vs/code/electron-sandbox/workbench/workbench.html',
  'out/vs/code/electron-sandbox/workbench/workbench.esm.html',
  'out/vs/code/electron-browser/workbench/workbench.html',
  'out/vs/code/electron-browser/workbench/workbench.esm.html',
  'out/vs/code/electron-browser/workbench.html'
];

function fail(message, code = 'UNSAFE_OPERATION') {
  const error = new Error(message);
  error.publicMessage = message;
  error.code = code;
  throw error;
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash = file => fs.existsSync(file) ? digest(fs.readFileSync(file)) : null;

function canonical(file) {
  const resolved = path.resolve(file);
  let ancestor = resolved;
  const missing = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) fail('No existing ancestor for the requested path.');
    missing.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  return path.join(fs.realpathSync.native(ancestor), ...missing);
}

function within(file, directory) {
  const relative = path.relative(directory, file);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}

function noLinks(file) {
  let current = path.resolve(file);
  while (true) {
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) fail('Symbolic links and junctions are not accepted.');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function safeChild(directory, name) {
  if (!name || path.basename(name) !== name || name === '.' || name === '..') fail('Invalid managed filename.');
  const file = path.join(directory, name);
  noLinks(file);
  if (!within(canonical(file), canonical(directory))) fail('Managed path escapes its directory.');
  return file;
}

function stripOwnedBlock(html) {
  const start = html.indexOf(BEGIN), end = html.indexOf(END);
  if (start < 0 && end < 0) return html;
  if (start < 0 || end < start || html.indexOf(BEGIN, start + BEGIN.length) >= 0 ||
      html.indexOf(END, end + END.length) >= 0) fail('Unexpected White Flow marker structure.');
  let stop = end + END.length;
  if (html.slice(stop, stop + 2) === '\r\n') stop += 2;
  else if (html[stop] === '\n') stop++;
  return html.slice(0, start) + html.slice(stop);
}

function atomicWrite(file, bytes, expectedHash) {
  noLinks(file);
  if (fileHash(file) !== expectedHash) fail('A target changed concurrently. Nothing was overwritten.');
  const temporary = file + '.white-flow-' + crypto.randomUUID() + '.tmp';
  try {
    const mode = fs.statSync(file).mode & 0o777;
    fs.writeFileSync(temporary, bytes, { flag: 'wx', mode });
    if (fileHash(file) !== expectedHash) fail('A concurrent update prevented this operation.');
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function locateApp(input) {
  if (!input) fail('Provide --app-root explicitly.');
  noLinks(input);
  const requested = canonical(input);
  for (const candidate of [requested, path.join(requested, 'resources', 'app'), path.join(requested, 'Contents', 'Resources', 'app')]) {
    noLinks(candidate);
    const packageFile = path.join(candidate, 'package.json');
    if (!fs.existsSync(packageFile)) continue;
    noLinks(packageFile);
    const metadata = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    for (const location of HTML_LOCATIONS) {
      const html = path.join(candidate, location);
      if (fs.existsSync(html)) {
        noLinks(html);
        if (!within(canonical(html), canonical(candidate))) fail('Workbench path escapes the application root.');
        return { appRoot: canonical(candidate), workbench: canonical(html), version: String(metadata.version) };
      }
    }
  }
  fail('A supported workbench entry was not found. No files were changed.', 'UNSUPPORTED_INSTALLATION');
}

function createManager(options = {}) {
  const repository = canonical(options.repository || REPOSITORY);
  if (!options.stateDir) fail('Provide a private --state-dir outside the repository and application.');
  noLinks(options.stateDir);
  const stateDir = canonical(options.stateDir);
  if (within(stateDir, repository) || within(repository, stateDir)) fail('Private state must not overlap the repository.');
  const manifestFile = path.join(stateDir, 'install.json');

  function assertStateOutsideApp(appRoot) {
    if (within(stateDir, appRoot) || within(appRoot, stateDir)) fail('Private state must not overlap the VS Code installation.');
  }

  function readManifest() {
    noLinks(manifestFile);
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (manifest.format !== 1 || manifest.product !== 'white-flow' || !/^[a-f0-9-]{36}$/.test(manifest.id || '')) fail('Invalid private installation record.');
    if (!Array.isArray(manifest.payloads) || manifest.payloads.length !== PAYLOADS.length ||
        manifest.payloads.some((item, index) => item.name !== PAYLOADS[index] || !/^[a-f0-9]{64}$/.test(item.sha256))) fail('Invalid payload record.');
    const app = locateApp(manifest.appRoot);
    assertStateOutsideApp(app.appRoot);
    const original = safeChild(stateDir, 'workbench.original');
    if (fileHash(original) !== manifest.originalHash) fail('Backup checksum mismatch. Restore stopped.');
    return { manifest, app, original };
  }

  function writeManifest(manifest) {
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
  }

  function assetsFor(app) {
    const folder = path.join(path.dirname(app.workbench), ASSET_DIRECTORY);
    noLinks(folder);
    if (!within(canonical(folder), app.appRoot)) fail('Asset destination escapes the application root.');
    return folder;
  }

  function inspect() {
    const app = locateApp(options.appRoot);
    assertStateOutsideApp(app.appRoot);
    const bytes = fs.readFileSync(app.workbench);
    const html = bytes.toString('utf8');
    if (!Buffer.from(html).equals(bytes)) fail('The workbench is not valid UTF-8. Nothing was changed.');
    if ((html.match(/<\/head>/gi) || []).length !== 1) fail('Unexpected workbench document structure.');
    if (html.includes('SHADCN-WHITE-SKIN:BEGIN') || html.includes('KEYWORD-FLOW-B:BEGIN')) fail('Restore the previous local-only skin before using this portable installer.');
    const payloads = PAYLOADS.map(name => {
      const file = safeChild(path.join(repository, 'src'), name);
      const content = fs.readFileSync(file);
      return { name, content, sha256: digest(content) };
    });
    return { app, html, payloads, assetDir: assetsFor(app) };
  }

  function plan() {
    const { app, html, payloads } = inspect();
    return { operation: 'plan', version: app.version, payloadCount: payloads.length,
      alreadyMarked: html.includes(BEGIN), writesPerformed: false, pathsRedacted: true,
      settingsRead: false, settingsWritten: false, requiresExplicitConfirmation: true };
  }

  function cleanAssets(app, manifest) {
    const assetDir = assetsFor(app);
    if (!fs.existsSync(assetDir)) return { preserved: 0 };
    const ownerFile = safeChild(assetDir, 'owner.json');
    if (!fs.existsSync(ownerFile)) return { preserved: 1 };
    const owner = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
    if (owner.id !== manifest.id) return { preserved: 1 };
    let preserved = 0;
    for (const item of manifest.payloads) {
      const file = safeChild(assetDir, item.name);
      if (!fs.existsSync(file)) continue;
      if (fileHash(file) === item.sha256) fs.unlinkSync(file);
      else preserved++;
    }
    fs.unlinkSync(ownerFile);
    // Remove only an empty, owned directory. Never recursively delete a tree.
    try { fs.rmdirSync(assetDir); } catch (error) { if (!['ENOTEMPTY', 'EEXIST'].includes(error.code)) throw error; }
    return { preserved };
  }

  function apply() {
    if (!options.confirm) fail('Apply requires --confirm. Run plan first.');
    const { app, html, payloads, assetDir } = inspect();
    if (fs.existsSync(manifestFile)) {
      const { manifest, app: recordedApp } = readManifest();
      if (recordedApp.appRoot === app.appRoot && manifest.phase === 'active' && fileHash(app.workbench) === manifest.installedHash &&
          payloads.every((item, index) => item.sha256 === manifest.payloads[index].sha256 && fileHash(safeChild(assetDir, item.name)) === item.sha256)) {
        return { operation: 'apply', alreadyApplied: true, settingsWritten: false, pathsRedacted: true };
      }
      fail('A private installation record already exists. Restore it and use a new private state directory for a new installation.');
    }
    if (html.includes(BEGIN) || html.includes(END) || fs.existsSync(assetDir)) fail('An unmanaged patch or asset directory already exists. Nothing was overwritten.');
    const patch = BEGIN + '\n' +
      '<link rel="stylesheet" href="./' + ASSET_DIRECTORY + '/workbench.css">\n' +
      '<link rel="stylesheet" href="./' + ASSET_DIRECTORY + '/keyword-flow.css">\n' +
      '<script src="./' + ASSET_DIRECTORY + '/keyword-flow.js" defer></script>\n' + END + '\n';
    const next = html.replace(/<\/head>/i, patch + '</head>');
    if (stripOwnedBlock(next) !== html) fail('Patch would change unrelated document bytes.');
    fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
    const original = safeChild(stateDir, 'workbench.original');
    fs.writeFileSync(original, html, { flag: 'wx', mode: 0o600 });
    const manifest = { format: 1, product: 'white-flow', id: crypto.randomUUID(), phase: 'backed-up',
      appRoot: app.appRoot, version: app.version, originalHash: digest(html), installedHash: digest(next),
      payloads: payloads.map(({ name, sha256 }) => ({ name, sha256 })) };
    writeManifest(manifest);
    try {
      fs.mkdirSync(assetDir);
      fs.writeFileSync(safeChild(assetDir, 'owner.json'), JSON.stringify({ id: manifest.id, product: 'white-flow' }), { flag: 'wx' });
      for (const item of payloads) fs.writeFileSync(safeChild(assetDir, item.name), item.content, { flag: 'wx' });
      atomicWrite(app.workbench, next, manifest.originalHash);
      manifest.phase = 'active'; writeManifest(manifest);
    } catch (error) {
      if (fileHash(app.workbench) === manifest.installedHash) atomicWrite(app.workbench, html, manifest.installedHash);
      cleanAssets(app, manifest);
      throw error;
    }
    return verify();
  }

  function verify() {
    const { app, manifest } = readManifest();
    const assetDir = assetsFor(app);
    const assetsMatch = manifest.payloads.every(item => fileHash(safeChild(assetDir, item.name)) === item.sha256);
    const workbenchMatches = fileHash(app.workbench) === manifest.installedHash;
    return { operation: 'verify', active: manifest.phase === 'active', backupVerified: true,
      assetsMatch, workbenchMatches, settingsRead: false, settingsWritten: false,
      pathsRedacted: true, reloadRequired: true, pass: manifest.phase === 'active' && assetsMatch && workbenchMatches };
  }

  function restore() {
    if (!options.confirm) fail('Restore requires --confirm.');
    const { app, manifest, original } = readManifest();
    const bytes = fs.readFileSync(app.workbench), hash = digest(bytes);
    let restored = bytes, mode = 'already-absent';
    if (app.version === manifest.version && hash === manifest.installedHash) {
      restored = fs.readFileSync(original); mode = 'exact-original';
    } else if (bytes.toString('utf8').includes(BEGIN) || bytes.toString('utf8').includes(END)) {
      restored = Buffer.from(stripOwnedBlock(bytes.toString('utf8'))); mode = 'owned-block-only';
    }
    if (!restored.equals(bytes)) atomicWrite(app.workbench, restored, hash);
    const cleanup = cleanAssets(app, manifest);
    manifest.phase = 'restored'; writeManifest(manifest);
    return { operation: 'restore', mode, assetsPreservedForReview: cleanup.preserved,
      settingsRead: false, settingsWritten: false, pathsRedacted: true, reloadRequired: true };
  }

  return { plan, apply, restore, verify };
}

function help() {
  return 'White Flow optional workbench installer\n' +
    'node tools/manage.cjs plan --app-root <installation> --state-dir <private-directory>\n' +
    'node tools/manage.cjs apply --app-root <installation> --state-dir <private-directory> --confirm\n' +
    'node tools/manage.cjs verify --state-dir <private-directory>\n' +
    'node tools/manage.cjs restore --state-dir <private-directory> --confirm\n' +
    'No automatic elevation, settings edits, CSP changes, telemetry, or uploads.\n';
}

function main(args = process.argv.slice(2)) {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true,
      options: { 'app-root': { type: 'string' }, 'state-dir': { type: 'string' }, confirm: { type: 'boolean' }, help: { type: 'boolean' } } });
    if (values.help || !positionals.length) { process.stdout.write(help()); return 0; }
    const action = positionals[0];
    if (positionals.length !== 1 || !['plan', 'apply', 'restore', 'verify'].includes(action)) fail('Unknown operation. Use --help.');
    const manager = createManager({ appRoot: values['app-root'], stateDir: values['state-dir'], confirm: values.confirm });
    const result = manager[action]();
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return result.pass === false ? 1 : 0;
  } catch (error) {
    const message = error.publicMessage || 'The file operation failed. Check permissions and private state locally; paths are omitted.';
    process.stderr.write('White Flow: ' + message + '\n');
    return 1;
  }
}

module.exports = { createManager, locateApp, stripOwnedBlock, within, BEGIN, END, PAYLOADS, HTML_LOCATIONS, main };
if (require.main === module) process.exitCode = main();
