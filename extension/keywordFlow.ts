/* A declaration-only signal. It is never assigned to editor text or ranges. */
import * as vscode from 'vscode';
import { signalDeclaration } from './workbenchSignal';
import { SignalType } from './signalType';
import { matchesTheme, ThemeLabels } from './themeSupport';

export class KeywordFlowSignal implements vscode.Disposable {
  private readonly signal = new SignalType();
  private disposed = false;

  constructor(private readonly themeLabels: ThemeLabels) {}

  refresh(): void {
    this.signal.clear();
    if (this.disposed) return;
    const config = vscode.workspace.getConfiguration('whiteFlow.keywordFlow');
    const declaration = signalDeclaration({
      enabled: config.get<boolean>('enabled', false),
      palette: config.get<string>('palette', 'aurora')
    });
    if (!declaration) return;
    const workbench = vscode.workspace.getConfiguration('workbench');
    if (!matchesTheme(workbench.get<string>('colorTheme'), this.themeLabels) || workbench.get<string>('reduceMotion') === 'on') return;
    this.signal.set(declaration);
  }

  dispose(): void {
    this.disposed = true;
    this.signal.dispose();
  }
}
