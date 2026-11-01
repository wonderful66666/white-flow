/*
 * Feature hub: one place to switch optional features on and off.
 * Writes only whiteFlow.* settings through the VS Code configuration API.
 */
import * as vscode from 'vscode';
import { resolveStyle } from './typingRules';

interface FeatureItem extends vscode.QuickPickItem {
  /** Boolean setting under the whiteFlow section. */
  readonly setting: string;
}

const SETTINGS_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('gear'),
  tooltip: 'Open White Flow settings'
};

function features(config: vscode.WorkspaceConfiguration, patchKeyframes: boolean, patchPresent: boolean): FeatureItem[] {
  const typingStyle = resolveStyle(config.get('typingMotion.style'), patchKeyframes);
  return [{
    label: '$(keyboard) Typing Motion',
    description: typingStyle === 'rise' ? 'blur in and rise' : 'fade in',
    detail: 'Only the newest typed character moves, and only vertically, so the cursor and clicks stay accurate.',
    picked: config.get<boolean>('typingMotion.enabled', false),
    setting: 'typingMotion.enabled'
  }, {
    label: '$(symbol-keyword) Keyword Flow',
    description: patchPresent ? 'workbench patch detected' : 'patch missing: no effect',
    detail: 'Requires the optional patch and White Flow theme. Aurora and Spectrum palettes are in settings.',
    picked: config.get<boolean>('keywordFlow.enabled', false),
    setting: 'keywordFlow.enabled'
  }, {
    label: '$(eye) Focus Mode', description: 'supported API',
    detail: 'Keep the innermost function clear and dim surrounding code using language-provider symbols.',
    picked: config.get<boolean>('focusMode.enabled', false), setting: 'focusMode.enabled'
  }, {
    label: '$(color-mode) Line Mist', description: patchPresent ? 'workbench patch detected' : 'patch missing: no effect',
    detail: 'Pale aurora current-line band. Requires the updated patch and White Flow theme.',
    picked: config.get<boolean>('lineMist.enabled', false), setting: 'lineMist.enabled'
  }, {
    label: '$(references) Method Beams', description: patchPresent ? 'workbench patch detected' : 'patch missing: gutter fallback',
    detail: 'Connect same-file call hierarchy locations; renderer support depends on the installed patch version.',
    picked: config.get<boolean>('methodBeams.enabled', false), setting: 'methodBeams.enabled'
  }, {
    label: '$(history) Edit Trail', description: 'supported API',
    detail: 'Short-lived gutter marks and navigation through recent edits, stored only in memory.',
    picked: config.get<boolean>('editTrail.enabled', false), setting: 'editTrail.enabled'
  }, {
    label: '$(warning) Risk Radar (Rust)', description: 'supported API',
    detail: 'Lexical hints for panic-prone Rust operations; not a proof of safety.',
    picked: config.get<boolean>('riskRadar.enabled', false), setting: 'riskRadar.enabled'
  }];
}

export async function openFeatureHub(patchKeyframes: boolean, patchPresent = patchKeyframes): Promise<void> {
  const config = vscode.workspace.getConfiguration('whiteFlow');
  const items = features(config, patchKeyframes, patchPresent);
  const picker = vscode.window.createQuickPick<FeatureItem>();
  picker.title = 'White Flow Features';
  picker.placeholder = patchPresent
    ? 'Everything is off by default. Workbench patch detected; feature support depends on its version.'
    : 'Everything is off by default. Workbench patch not detected: supported effects only.';
  picker.canSelectMany = true;
  picker.matchOnDetail = true;
  picker.items = items;
  picker.selectedItems = items.filter(item => item.picked);
  picker.buttons = [SETTINGS_BUTTON];

  const accepted = await new Promise<readonly FeatureItem[] | undefined>(resolve => {
    let result: readonly FeatureItem[] | undefined;
    picker.onDidTriggerButton(() => {
      picker.hide();
      void vscode.commands.executeCommand('workbench.action.openSettings', 'whiteFlow');
    });
    picker.onDidAccept(() => {
      result = picker.selectedItems;
      picker.hide();
    });
    picker.onDidHide(() => {
      picker.dispose();
      resolve(result);
    });
    picker.show();
  });
  if (!accepted) return;

  const chosen = new Set(accepted.map(item => item.setting));
  for (const item of items) {
    const enabled = chosen.has(item.setting);
    if (config.get<boolean>(item.setting, false) !== enabled) {
      // Update an existing workspace override instead of hiding a global change beneath it.
      const target = config.inspect<boolean>(item.setting)?.workspaceValue !== undefined
        ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
      await config.update(item.setting, enabled, target);
    }
  }
}
