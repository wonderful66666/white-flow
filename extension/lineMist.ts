import * as vscode from 'vscode';
import { SignalType } from './signalType';
import { mistDeclaration } from './workbenchSignal';

export class LineMist implements vscode.Disposable {
  private readonly signal = new SignalType();
  private disposed = false;
  constructor(private readonly themeLabel: string) {}

  refresh(): void {
    this.signal.clear();
    const config = vscode.workspace.getConfiguration('whiteFlow.lineMist');
    if (this.disposed || !config.get<boolean>('enabled', false)) return;
    const workbench = vscode.workspace.getConfiguration('workbench');
    if (workbench.get<string>('colorTheme') !== this.themeLabel) return;
    this.signal.set(mistDeclaration({
      enabled: true,
      drift: config.get<boolean>('drift', true) && workbench.get<string>('reduceMotion') !== 'on' ? 'drift' : 'still',
      glow: config.get<boolean>('cursorGlow', true) ? 'on' : 'off'
    }));
  }

  dispose(): void { this.disposed = true; this.signal.dispose(); }
}
