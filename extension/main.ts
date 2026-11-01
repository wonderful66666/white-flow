/*
 * Extension entry point.
 *
 * With every feature off (the default), activation only registers the hub command and a
 * settings listener: no editor listeners, decorations, timers, or file reads.
 */
import * as vscode from 'vscode';
import { openFeatureHub } from './hub';
import { patchMarkerPresent, patchProvidesKeyframes } from './patchStatus';
import { TypingMotion } from './typingMotion';
import { KeywordFlowSignal } from './keywordFlow';

export function activate(context: vscode.ExtensionContext): void {
  // Patch detection is lazy and cached; the hub re-checks because the patch may change between sessions.
  let patchCheck: Promise<boolean> | undefined;
  const detectPatch = (fresh = false): Promise<boolean> => {
    if (fresh || !patchCheck) patchCheck = patchProvidesKeyframes(vscode.env.appRoot);
    return patchCheck;
  };

  const typing = new TypingMotion(() => detectPatch());
  const themeLabel: string = context.extension.packageJSON.contributes.themes[0].label;
  const keywordFlow = new KeywordFlowSignal(themeLabel);
  context.subscriptions.push(
    typing,
    keywordFlow,
    vscode.commands.registerCommand('whiteFlow.openFeatures', async () => {
      await openFeatureHub(await detectPatch(true), await patchMarkerPresent(vscode.env.appRoot));
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('whiteFlow.typingMotion') || event.affectsConfiguration('workbench.reduceMotion')) {
        void typing.refresh();
      }
      if (event.affectsConfiguration('whiteFlow.keywordFlow') || event.affectsConfiguration('workbench.colorTheme') ||
          event.affectsConfiguration('workbench.reduceMotion')) keywordFlow.refresh();
    })
  );
  if (TypingMotion.isEnabled()) void typing.refresh();
  keywordFlow.refresh();
}

export function deactivate(): void {
  // Disposables registered on the extension context are released by VS Code.
}
