/*
 * Extension entry point.
 *
 * With every feature off (the default), activation only registers the hub command and a
 * settings listener: no editor listeners, decorations, timers, or file reads.
 */
import * as vscode from 'vscode';
import { openFeatureHub } from './hub';
import { patchMarkerPresent, patchProvidesBeams, patchProvidesKeyframes } from './patchStatus';
import { TypingMotion } from './typingMotion';
import { KeywordFlowSignal } from './keywordFlow';
import { FocusMode } from './focusMode';
import { LineMist } from './lineMist';
import { MethodBeams } from './methodBeams';
import { EditTrail } from './editTrail';
import { RiskRadar } from './riskRadar';
import { PolishEffects } from './polishEffects';
import { TodoMarker } from './todoMarker';
import { POLISH_EFFECTS } from './workbenchSignal';

export function activate(context: vscode.ExtensionContext): void {
  // Patch detection is lazy and cached; the hub re-checks because the patch may change between sessions.
  let patchCheck: Promise<boolean> | undefined;
  const detectPatch = (fresh = false): Promise<boolean> => {
    if (fresh || !patchCheck) patchCheck = patchProvidesKeyframes(vscode.env.appRoot);
    return patchCheck;
  };

  const typing = new TypingMotion(() => detectPatch());
  const themeLabels: string[] = context.extension.packageJSON.contributes.themes.map((theme: { label: string }) => theme.label);
  const keywordFlow = new KeywordFlowSignal(themeLabels);
  const focus = new FocusMode(), mist = new LineMist(themeLabels), trail = new EditTrail(), radar = new RiskRadar();
  const polish = new PolishEffects(themeLabels), todo = new TodoMarker();
  let beamPatch: Promise<boolean> | undefined;
  const beams = new MethodBeams(themeLabels, () => beamPatch ??= patchProvidesBeams(vscode.env.appRoot));
  context.subscriptions.push(
    typing,
    keywordFlow,
    focus, mist, beams, trail, radar, polish, todo,
    vscode.commands.registerCommand('whiteFlow.openFeatures', async () => {
      beamPatch = undefined;
      await openFeatureHub(await detectPatch(true), await patchMarkerPresent(vscode.env.appRoot));
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('whiteFlow.typingMotion') || event.affectsConfiguration('workbench.reduceMotion')) {
        void typing.refresh();
      }
      if (event.affectsConfiguration('whiteFlow.keywordFlow') || event.affectsConfiguration('workbench.colorTheme') ||
          event.affectsConfiguration('workbench.reduceMotion')) keywordFlow.refresh();
      if (event.affectsConfiguration('whiteFlow.focusMode')) focus.refresh();
      if (event.affectsConfiguration('whiteFlow.lineMist') || event.affectsConfiguration('workbench.colorTheme') ||
        event.affectsConfiguration('workbench.reduceMotion')) mist.refresh();
      if (event.affectsConfiguration('whiteFlow.methodBeams') || event.affectsConfiguration('workbench.colorTheme') ||
        event.affectsConfiguration('workbench.reduceMotion')) beams.refresh();
      if (event.affectsConfiguration('whiteFlow.editTrail')) trail.refresh();
      if (event.affectsConfiguration('whiteFlow.riskRadar')) radar.refresh();
      if (event.affectsConfiguration('whiteFlow.todoMarker')) todo.refresh();
      if (POLISH_EFFECTS.some(effect => event.affectsConfiguration(`whiteFlow.${effect.setting}`)) ||
        event.affectsConfiguration('workbench.colorTheme') || event.affectsConfiguration('workbench.reduceMotion')) polish.refresh();
    })
  );
  if (TypingMotion.isEnabled()) void typing.refresh();
  keywordFlow.refresh();
  focus.refresh(); mist.refresh(); beams.refresh(); trail.refresh(); radar.refresh();
  polish.refresh(); todo.refresh();
}

export function deactivate(): void {
  // Disposables registered on the extension context are released by VS Code.
}
