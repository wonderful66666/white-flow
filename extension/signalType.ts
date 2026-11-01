import * as vscode from 'vscode';

/** Owns a declaration-only type; never apply it to ranges. Builders whitelist every value. */
export class SignalType implements vscode.Disposable {
  private type: vscode.TextEditorDecorationType | undefined;
  private disposed = false;

  set(declaration: string | null): void {
    this.clear();
    if (!this.disposed && declaration) this.type = vscode.window.createTextEditorDecorationType({ textDecoration: declaration });
  }

  clear(): void { this.type?.dispose(); this.type = undefined; }
  dispose(): void { this.disposed = true; this.clear(); }
}
