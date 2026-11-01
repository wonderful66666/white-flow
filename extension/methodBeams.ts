import * as vscode from 'vscode';
import { beamPairs, onDefinition, Beam } from './beamRules';
import { eligible, paint } from './featureSupport';
import { SignalType } from './signalType';
import { beamsDeclaration } from './workbenchSignal';

export class MethodBeams implements vscode.Disposable {
  private readonly signal = new SignalType();
  private listeners: vscode.Disposable[] = [];
  private types: vscode.TextEditorDecorationType[] = [];
  private gutter: vscode.TextEditorDecorationType[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private revision = 0;
  private resultRevision = 0;
  private lastEdit = new Map<string, number>();
  private painted: vscode.TextEditor | undefined;
  private disposed = false;

  constructor(private readonly themeLabel: string, private readonly hasPatch: () => Promise<boolean>) {}

  refresh(): void {
    this.stop();
    if (this.disposed || !vscode.workspace.getConfiguration('whiteFlow.methodBeams').get<boolean>('enabled', false)) return;
    this.types = [
      vscode.window.createTextEditorDecorationType({ backgroundColor: '#F4F4F5', border: '1px solid #E4E4E7', borderRadius: '4px' }),
      vscode.window.createTextEditorDecorationType({ backgroundColor: '#FFFFFF', border: '1px solid #D4D4D8', borderRadius: '4px',
        textDecoration: 'none; box-shadow: 0 1px 3px rgb(24 24 27 / .10), 0 0 0 4px #F4F4F5' })
    ];
    this.listeners = [
      vscode.window.onDidChangeTextEditorSelection(() => this.schedule()),
      vscode.window.onDidChangeActiveTextEditor(() => { this.clear(); this.schedule(); }),
      vscode.window.onDidChangeWindowState(state => { if (!state.focused) { this.revision++; this.clear(); } else this.schedule(); }),
      vscode.workspace.onDidChangeTextDocument(event => {
        this.lastEdit.set(event.document.uri.toString(), Date.now());
        if (event.document === vscode.window.activeTextEditor?.document) { this.revision++; clearTimeout(this.timer); this.clear(); }
      }),
      vscode.workspace.onDidCloseTextDocument(document => { this.lastEdit.delete(document.uri.toString());
        if (this.painted?.document === document) { this.revision++; this.clear(); }
      })
    ];
    this.schedule();
  }

  private schedule(): void {
    this.revision++; this.clear(); clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.update(this.revision); }, 250);
  }

  private async update(revision: number): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!this.types.length || !eligible(editor) || !vscode.window.state.focused ||
      editor.selections.length !== 1 || !editor.selection.isEmpty ||
      Date.now() - (this.lastEdit.get(editor.document.uri.toString()) ?? -Infinity) < 500) return;
    const document = editor.document, version = document.version, cursor = editor.selection.active;
    const current = () => revision === this.revision && !!this.types.length && editor === vscode.window.activeTextEditor &&
      document.version === version && !document.isClosed && vscode.window.state.focused;
    try {
      const items = await vscode.commands.executeCommand<vscode.CallHierarchyItem[]>('vscode.prepareCallHierarchy', document.uri, cursor);
      if (!current() || !items?.length) return;
      const item = items[0], key = document.uri.toString();
      const incoming = onDefinition(cursor, key, item)
        ? await vscode.commands.executeCommand<vscode.CallHierarchyIncomingCall[]>('vscode.provideIncomingCalls', item) || [] : [];
      if (!current()) return;
      const pairs = beamPairs(cursor, key, item, incoming);
      if (!pairs.length) return;
      const patch = await this.hasPatch().catch(() => false);
      if (!current()) return;
      this.painted = editor;
      const calls = onDefinition(cursor, key, item)
        ? incoming.filter(call => pairs.some(pair => call.from.uri.toString() === key && call.fromRanges[0]?.start.line + 1 === pair.from)).map(call => call.fromRanges[0])
        : [document.getWordRangeAtPosition(cursor) || new vscode.Range(cursor, cursor)];
      paint(editor, this.types[0], calls); paint(editor, this.types[1], [item.selectionRange]);
      const workbench = vscode.workspace.getConfiguration('workbench');
      if (patch && workbench.get<string>('colorTheme') === this.themeLabel) {
        this.resultRevision = this.resultRevision % 9999999999 + 1;
        this.signal.set(beamsDeclaration(pairs.map(pair => `${pair.from}-${pair.to}`).join(','), this.resultRevision,
          workbench.get<string>('reduceMotion') === 'on' ? 'still' : 'on'));
      } else this.paintGutter(editor, pairs);
    } catch { if (current()) this.clear(); }
  }

  private paintGutter(editor: vscode.TextEditor, pairs: readonly Beam[]): void {
    if (!this.gutter.length) {
      const paths = ['M4 16V8Q4 4 8 4H13M10 1L13 4 10 7', 'M4 0V16', 'M4 0V8Q4 12 8 12H12'];
      this.gutter = paths.map((d, i) => vscode.window.createTextEditorDecorationType({
        gutterIconPath: vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="${d}" fill="none" stroke="#A1A1AA" stroke-width="1.5"/>${i === 2 ? '<circle cx="12" cy="12" r="1.5" fill="#A1A1AA"/>' : ''}</svg>`)),
        gutterIconSize: 'contain'
      }));
    }
    const spans: vscode.Range[][] = [[], [], []];
    for (const pair of pairs) {
      spans[0].push(new vscode.Range(pair.to - 1, 0, pair.to - 1, 0));
      spans[2].push(new vscode.Range(pair.from - 1, 0, pair.from - 1, 0));
      const low = Math.min(pair.from, pair.to), high = Math.max(pair.from, pair.to);
      if (high - low > 1) spans[1].push(new vscode.Range(low, 0, high - 2, Number.MAX_SAFE_INTEGER));
    }
    this.gutter.forEach((type, i) => paint(editor, type, spans[i]));
  }

  private clear(): void {
    this.signal.clear();
    if (this.painted) for (const type of [...this.types, ...this.gutter]) paint(this.painted, type, []);
    this.painted = undefined;
  }

  private stop(): void {
    this.revision++; clearTimeout(this.timer); this.timer = undefined; this.clear();
    this.listeners.splice(0).forEach(listener => listener.dispose());
    [...this.types, ...this.gutter].forEach(type => type.dispose()); this.types = []; this.gutter = []; this.lastEdit.clear();
  }

  dispose(): void { this.disposed = true; this.stop(); this.signal.dispose(); }
}
