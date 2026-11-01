/* A declaration-only signal. It is never assigned to editor text or ranges. */
import * as vscode from 'vscode';
import { signalDeclaration } from './workbenchSignal';

export class KeywordFlowSignal implements vscode.Disposable {
  private decoration: vscode.TextEditorDecorationType | undefined;
  private disposed = false;

  constructor(private readonly themeLabel: string) {}

  refresh(): void {
    this.decoration?.dispose();
    this.decoration = undefined;
    if (this.disposed) return;
    const config = vscode.workspace.getConfiguration('whiteFlow.keywordFlow');
    const declaration = signalDeclaration({
      enabled: config.get<boolean>('enabled', false),
      palette: config.get<string>('palette', 'aurora')
    });
    if (!declaration) return;
    const workbench = vscode.workspace.getConfiguration('workbench');
    if (workbench.get<string>('colorTheme') !== this.themeLabel || workbench.get<string>('reduceMotion') === 'on') return;
    this.decoration = vscode.window.createTextEditorDecorationType({ textDecoration: declaration });
  }

  dispose(): void {
    this.disposed = true;
    this.decoration?.dispose();
    this.decoration = undefined;
  }
}
