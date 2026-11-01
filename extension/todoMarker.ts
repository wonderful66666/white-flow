import * as vscode from 'vscode';
import { eligible, paint } from './featureSupport';
import { findTags, markerImage, supportsTodoLanguage, TODO_COLORS, TodoTag } from './todoRules';

export class TodoMarker implements vscode.Disposable {
  private types: vscode.TextEditorDecorationType[] = [];
  private listeners: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  refresh(): void {
    this.stop();
    const config = vscode.workspace.getConfiguration('whiteFlow.todoMarker');
    if (this.disposed || config.get<boolean>('enabled', false) !== true) return;
    const marker = config.get<string>('style', 'marker') === 'marker';
    this.types = (Object.keys(TODO_COLORS) as TodoTag[]).map(tag => vscode.window.createTextEditorDecorationType({
      color: TODO_COLORS[tag].foreground, fontWeight: '600', borderRadius: '3px',
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      ...(marker ? { textDecoration: `none; background-image: ${markerImage(tag)}; background-size: 100% 100%; background-repeat: no-repeat` }
        : { backgroundColor: TODO_COLORS[tag].flat })
    }));
    this.listeners = [
      vscode.window.onDidChangeTextEditorVisibleRanges(() => this.schedule()),
      vscode.window.onDidChangeVisibleTextEditors(() => this.schedule()),
      vscode.window.onDidChangeActiveTextEditor(() => this.schedule()),
      vscode.workspace.onDidChangeTextDocument(() => this.schedule())
    ];
    this.schedule();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; this.scan(); }, 200);
  }

  private scan(): void {
    if (!this.types.length) return;
    const tags = Object.keys(TODO_COLORS) as TodoTag[];
    for (const editor of vscode.window.visibleTextEditors) {
      const ranges: vscode.Range[][] = [[], [], []];
      if (eligible(editor) && supportsTodoLanguage(editor.document.languageId)) {
        const spans = editor.visibleRanges.map(range => ({ start: Math.max(0, range.start.line - 50),
          end: Math.min(editor.document.lineCount - 1, range.end.line + 50) })).sort((a, b) => a.start - b.start);
        let last = -1, scanned = 0, found = 0, characters = 0;
        for (const span of spans) {
          for (let line = Math.max(last + 1, span.start); line <= span.end && scanned < 20000 && found < 10000 && characters < 1048576; line++, scanned++) {
            const text = editor.document.lineAt(line).text;
            characters += text.length;
            if (characters > 1048576) break;
            if (text.length <= 200000) for (const match of findTags(text, editor.document.languageId)) {
              ranges[tags.indexOf(match.tag)].push(new vscode.Range(line, match.start, line, match.end));
              if (++found >= 10000) break;
            }
          }
          last = Math.max(last, span.end);
          if (scanned >= 20000 || found >= 10000 || characters >= 1048576) break;
        }
      }
      this.types.forEach((type, i) => paint(editor, type, ranges[i]));
    }
  }

  private stop(): void {
    clearTimeout(this.timer); this.timer = undefined;
    this.listeners.splice(0).forEach(listener => listener.dispose());
    this.types.forEach(type => type.dispose()); this.types = [];
  }

  dispose(): void { this.disposed = true; this.stop(); }
}
