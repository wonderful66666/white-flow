import * as vscode from 'vscode';
import { SignalType } from './signalType';
import { POLISH_EFFECTS, polishDeclaration } from './workbenchSignal';
import { matchesTheme, ThemeLabels } from './themeSupport';

/** One allowlisted aggregate signal; no editor listeners or document reads. */
export class PolishEffects implements vscode.Disposable {
  private readonly signal = new SignalType();
  private disposed = false;
  constructor(private readonly themeLabels: ThemeLabels) {}

  refresh(): void {
    this.signal.clear();
    if (this.disposed) return;
    const tokens = POLISH_EFFECTS.filter(effect => vscode.workspace.getConfiguration(`whiteFlow.${effect.setting}`)
      .get<boolean>('enabled', false) === true).map(effect => effect.token);
    if (!tokens.length) return;
    const workbench = vscode.workspace.getConfiguration('workbench');
    if (!matchesTheme(workbench.get<string>('colorTheme'), this.themeLabels)) return;
    this.signal.set(polishDeclaration(tokens, workbench.get<string>('reduceMotion') === 'on'));
  }

  dispose(): void { this.disposed = true; this.signal.dispose(); }
}
