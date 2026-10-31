'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const BLOCKED = new Set(['backups', 'reference', 'reports', 'screenshots', '.private', '.local', '.state', 'node_modules']);
const PRIVATE_NAMES = new Set(['settings.json', 'keybindings.json', 'state.json', 'install.json', 'verification.json', 'last-action.json', 'workbench.html']);
const PATTERNS = [
  ['absolute-drive-path', /\b[A-Za-z]:[\\/]/],
  ['personal-home-path', /\/(?:Users|home)\/[A-Za-z0-9_.-]+\//],
  ['email-address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['ip-address', /\b(?:\d{1,3}\.){3}\d{1,3}\b/],
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['credential-token', /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[A-Z0-9]{16})\b/],
  ['credential-assignment', /(?:api[_-]?key|access[_-]?token|password)\s*[=:]\s*["'][^"'\s<>]{12,}["']/i],
  ['non-ascii-text', /[^\x09\x0a\x0d\x20-\x7e]/]
];

function findingsForText(text) {
  return PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function pngMetadataPresent(bytes) {
  if (bytes.length < 8 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return true;
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset + length + 12 > bytes.length || ['tEXt', 'iTXt', 'zTXt', 'eXIf'].includes(type)) return true;
    offset += length + 12;
    if (type === 'IEND') return offset !== bytes.length;
  }
  return true;
}

function audit(root = ROOT) {
  const allowlist = JSON.parse(fs.readFileSync(path.join(root, 'release-files.json'), 'utf8'));
  if (!Array.isArray(allowlist) || new Set(allowlist).size !== allowlist.length) throw new Error('Invalid release allowlist.');
  const allowed = new Set(allowlist), actual = [], findings = [], hashes = [];
  function walk(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.name === '.git' && !prefix) continue;
      if (entry.isSymbolicLink()) { findings.push({ file: relative, rule: 'symbolic-link' }); continue; }
      if (entry.isDirectory()) {
        if (BLOCKED.has(entry.name)) findings.push({ file: relative, rule: 'private-or-generated-directory' });
        walk(path.join(directory, entry.name), relative + '/');
      } else actual.push(relative);
    }
  }
  walk(root);
  for (const relative of allowlist) {
    if (typeof relative !== 'string' || relative.includes('\\') || path.posix.isAbsolute(relative) || relative.split('/').includes('..')) throw new Error('Unsafe allowlist entry.');
    if (relative.split('/').some(part => BLOCKED.has(part)) || PRIVATE_NAMES.has(path.posix.basename(relative))) findings.push({ file: relative, rule: 'private-filename' });
    if (!actual.includes(relative)) findings.push({ file: relative, rule: 'missing-release-file' });
  }
  for (const relative of actual) {
    if (!allowed.has(relative)) findings.push({ file: relative, rule: 'not-allowlisted' });
    if (/\.(?:pem|key|p12|pfx|log|zip|vsix|bak)$/i.test(relative) || path.posix.basename(relative).startsWith('.env')) findings.push({ file: relative, rule: 'sensitive-or-generated-file' });
    const bytes = fs.readFileSync(path.join(root, relative));
    hashes.push({ file: relative, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    if (relative.endsWith('.png')) {
      if (relative !== 'demo/preview.png' || pngMetadataPresent(bytes)) findings.push({ file: relative, rule: 'unreviewed-image-or-metadata' });
    } else {
      for (const rule of findingsForText(bytes.toString('utf8'))) findings.push({ file: relative, rule });
    }
  }
  return { pass: findings.length === 0, filesScanned: actual.length, findings, hashes,
    gitHistoryAudited: false, gitDirectoryPresent: fs.existsSync(path.join(root, '.git')),
    note: 'Heuristic working-tree audit only. Review image content and any future Git history separately.' };
}

module.exports = { audit, findingsForText, pngMetadataPresent };
if (require.main === module) {
  try {
    const result = audit();
    console.log(JSON.stringify(result, null, 2));
    if (!result.pass) process.exitCode = 1;
  } catch {
    console.error('Release audit failed. Paths and content are omitted.');
    process.exitCode = 1;
  }
}
