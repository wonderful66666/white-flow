/*
 * Detects whether the optional workbench patch is active and provides the typing keyframes.
 * Reads only White Flow's own marker and asset file inside the running VS Code application.
 * Never writes, and never reads user settings or workspace files.
 */
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { RISE_KEYFRAMES } from './typingRules';

/** Keep in sync with HTML_LOCATIONS and BEGIN in tools/manage.cjs. */
export const WORKBENCH_ENTRIES: readonly string[] = [
  'out/vs/code/electron-sandbox/workbench/workbench.html',
  'out/vs/code/electron-sandbox/workbench/workbench.esm.html',
  'out/vs/code/electron-browser/workbench/workbench.html',
  'out/vs/code/electron-browser/workbench/workbench.esm.html',
  'out/vs/code/electron-browser/workbench.html'
];
const PATCH_MARKER = '<!-- WHITE-FLOW:BEGIN -->';
const ASSET_FILE = path.join('white-flow-assets', 'workbench.css');

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, 'utf8');
  } catch {
    return null;
  }
}

/** Marker detection does not imply that the installed runtime supports the newest protocol. */
export async function patchMarkerPresent(appRoot: string): Promise<boolean> {
  if (!appRoot) return false;
  for (const entry of WORKBENCH_ENTRIES) {
    const html = await readText(path.join(appRoot, entry));
    if (html?.includes(PATCH_MARKER)) return true;
  }
  return false;
}

/** True when a marked workbench entry sits next to a patch stylesheet that defines the rise keyframes. */
export async function patchProvidesKeyframes(appRoot: string): Promise<boolean> {
  if (!appRoot) return false;
  for (const entry of WORKBENCH_ENTRIES) {
    const html = await readText(path.join(appRoot, entry));
    if (html === null || !html.includes(PATCH_MARKER)) continue;
    const css = await readText(path.join(appRoot, path.dirname(entry), ASSET_FILE));
    if (css !== null && css.includes(`@keyframes ${RISE_KEYFRAMES}`)) return true;
  }
  return false;
}
