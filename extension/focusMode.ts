import * as vscode from 'vscode';
import { bounded, eligible, paint } from './featureSupport';
import { dimRanges, focusLines } from './focusRules';

type Symbols = readonly (vscode.DocumentSymbol | vscode.SymbolInformation)[];

export class FocusMode implements vscode.Disposable {
  private type: vscode.TextEditorDecorationType | undefined;
  private listeners: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private cache = new Map<string, { version: number; symbols: Symbols }>();
  private painted: vscode.TextEditor | undefined;
  private revision = 0;
  private disposed = false;

  refresh(): void {
    this.stop();
    const config = vscode.workspace.getConfiguration('whiteFlow.focusMode');
    if (this.disposed || !config.get<boolean>('enabled', false)) return;
    this.type = vscode.window.createTextEditorDecorationType({
      opacity: bounded(config.get('opacity'), 0.4, 0.25, 0.7).toString(), isWholeLine: true
    });
    this.listeners = [
      vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor === vscode.window.activeTextEditor) this.schedule(80);
      }),
      vscode.window.onDidChangeActiveTextEditor(() => { this.clear(); this.schedule(80); }),
      vscode.workspace.onDidChangeTextDocument(event => {
        this.cache.delete(event.document.uri.toString());
        if (event.document === vscode.window.activeTextEditor?.document) { this.clear(); this.schedule(300); }
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        this.cache.delete(document.uri.toString());
        if (this.painted?.document === document) { this.revision++; this.clear(); }
      })
    ];
    this.schedule(80);
  }

  private schedule(delay: number): void {
    this.revision++;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.update(this.revision); }, delay);
  }

  private async update(revision: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!this.type || !eligible(editor, 50000)) { this.clear(); return; }
    const document = editor.document, version = document.version, key = document.uri.toString();
    let cached = this.cache.get(key);
    if (!cached || cached.version !== version) {
      let symbols: Symbols;
      try {
        symbols = (await vscode.commands.executeCommand<Symbols>('vscode.executeDocumentSymbolProvider', document.uri) || [])
          .filter(symbol => !('location' in symbol) || symbol.location.uri.toString() === key);
      }
      catch { if (revision === this.revision) this.clear(); return; }
      if (!this.type || revision !== this.revision || editor !== vscode.window.activeTextEditor || document.version !== version || document.isClosed) return;
      cached = { version, symbols }; this.cache.set(key, cached);
    }
    if (revision !== this.revision || editor !== vscode.window.activeTextEditor) return;
    const focus = focusLines(cached.symbols, editor.selection.active.line);
    this.clear(); this.painted = editor;
    paint(editor, this.type, dimRanges(document.lineCount, focus).map(span =>
      new vscode.Range(span.start, 0, span.end, Number.MAX_SAFE_INTEGER)));
  }

  private clear(): void {
    if (this.painted && this.type) paint(this.painted, this.type, []);
    this.painted = undefined;
  }

  private stop(): void {
    this.revision++; clearTimeout(this.timer); this.timer = undefined;
    this.clear(); this.listeners.splice(0).forEach(listener => listener.dispose());
    this.type?.dispose(); this.type = undefined; this.cache.clear();
  }

  dispose(): void { this.disposed = true; this.stop(); }
}
