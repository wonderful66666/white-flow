import * as vscode from 'vscode';
import { paint } from './featureSupport';
import { RiskKind, scanRust } from './rustScanner';

const HINTS: Record<RiskKind, string> = {
  unwrap: 'May panic if this is None or Err. Consider ?, match, if let, or unwrap_or.',
  expect: 'Panics with this message if the value is None or Err.',
  panic: 'Always panics when reached.', unreachable: 'Always panics when reached.',
  todo: 'Always panics when reached.', unimplemented: 'Always panics when reached.',
  unsafe: 'Unsafe code: the compiler cannot check these guarantees for you.'
};

export class RiskRadar implements vscode.Disposable {
  private type: vscode.TextEditorDecorationType | undefined;
  private listeners: vscode.Disposable[] = [];
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private results = new Map<string, { version: number; ranges: vscode.DecorationOptions[] }>();
  private ignoreTests = true;
  private disposed = false;

  refresh(): void {
    this.stop();
    const config = vscode.workspace.getConfiguration('whiteFlow.riskRadar');
    if (this.disposed || !config.get<boolean>('enabled', false)) return;
    this.ignoreTests = config.get<boolean>('ignoreTests', true);
    this.type = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline wavy #D97706',
      overviewRulerColor: '#F59E0BB3', overviewRulerLane: vscode.OverviewRulerLane.Right });
    this.listeners = [
      vscode.workspace.onDidOpenTextDocument(document => this.scan(document)),
      vscode.workspace.onDidChangeTextDocument(event => {
        if (!this.accepts(event.document)) return;
        const key = event.document.uri.toString(); clearTimeout(this.timers.get(key)); this.results.delete(key);
        this.apply(event.document, []);
        this.timers.set(key, setTimeout(() => { this.timers.delete(key); this.scan(event.document); }, 300));
      }),
      vscode.workspace.onDidCloseTextDocument(document => {
        const key = document.uri.toString(); clearTimeout(this.timers.get(key)); this.timers.delete(key); this.results.delete(key);
      }),
      vscode.window.onDidChangeVisibleTextEditors(editors => {
        for (const document of new Set(editors.map(editor => editor.document))) this.scan(document);
      })
    ];
    for (const document of vscode.workspace.textDocuments) this.scan(document);
  }

  private accepts(document: vscode.TextDocument): boolean {
    return !document.isClosed && document.languageId === 'rust' && ['file', 'untitled'].includes(document.uri.scheme);
  }

  private scan(document: vscode.TextDocument): void {
    if (!this.type || !this.accepts(document)) return;
    const key = document.uri.toString(), cached = this.results.get(key);
    if (cached?.version === document.version) { this.apply(document, cached.ranges); return; }
    if (document.offsetAt(new vscode.Position(document.lineCount - 1, Number.MAX_SAFE_INTEGER)) > 1048576) {
      this.results.delete(key); this.apply(document, []); return;
    }
    const text = document.getText();
    if (text.length > 1048576 || Buffer.byteLength(text, 'utf8') > 1048576) { this.results.delete(key); this.apply(document, []); return; }
    const ranges = scanRust(text, this.ignoreTests).slice(0, 5000).map(risk => ({
      range: new vscode.Range(document.positionAt(risk.start), document.positionAt(risk.end)),
      hoverMessage: new vscode.MarkdownString(HINTS[risk.kind])
    }));
    this.results.set(key, { version: document.version, ranges }); this.apply(document, ranges);
  }

  private apply(document: vscode.TextDocument, ranges: readonly vscode.DecorationOptions[]): void {
    if (!this.type) return;
    for (const editor of vscode.window.visibleTextEditors) if (editor.document === document) paint(editor, this.type, ranges);
  }

  private stop(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear(); this.listeners.splice(0).forEach(listener => listener.dispose());
    this.type?.dispose(); this.type = undefined; this.results.clear();
  }

  dispose(): void { this.disposed = true; this.stop(); }
}
