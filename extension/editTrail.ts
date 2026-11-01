import * as vscode from 'vscode';
import { bounded, eligible, paint } from './featureSupport';
import { applyChanges, bucket, countLineBreaks, prune, recentLines } from './trailRules';

export class EditTrail implements vscode.Disposable {
  private types: vscode.TextEditorDecorationType[] = [];
  private listeners: vscode.Disposable[] = [];
  private states = new Map<string, Map<number, number>>();
  private interval: ReturnType<typeof setInterval> | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private minutes = 10;
  private disposed = false;

  refresh(): void {
    this.stop();
    const config = vscode.workspace.getConfiguration('whiteFlow.editTrail');
    if (this.disposed || !config.get<boolean>('enabled', false)) return;
    this.minutes = bounded(config.get('minutes'), 10, 2, 60);
    const alphas = [1, .6, .32, .16];
    this.types = alphas.map((opacity, i) => vscode.window.createTextEditorDecorationType({
      gutterIconPath: vscode.Uri.parse('data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="8" height="24"><rect x="2.5" width="3" height="24" rx="1.5" fill="#7C3AED" opacity="${opacity}"/></svg>`)),
      gutterIconSize: 'contain', overviewRulerColor: ['#7C3AEDFF', '#7C3AED99', '#7C3AED52', '#7C3AED29'][i],
      overviewRulerLane: vscode.OverviewRulerLane.Left
    }));
    this.listeners = [
      vscode.workspace.onDidChangeTextDocument(event => {
        if (!['file', 'untitled'].includes(event.document.uri.scheme) || !event.contentChanges.length) return;
        const key = event.document.uri.toString();
        this.states.set(key, prune(applyChanges(this.states.get(key) || new Map(), event.contentChanges.map(change => ({
          startLine: change.range.start.line, endLine: change.range.end.line,
          startCharacter: change.range.start.character, lineBreaks: countLineBreaks(change.text)
        })), Date.now()), Date.now(), this.minutes));
        clearTimeout(this.timer); this.timer = undefined;
        if (vscode.window.state.focused) this.timer = setTimeout(() => { this.timer = undefined; this.redraw(); }, 500);
      }),
      vscode.workspace.onDidCloseTextDocument(document => this.states.delete(document.uri.toString())),
      vscode.window.onDidChangeVisibleTextEditors(() => this.redraw()),
      vscode.window.onDidChangeWindowState(() => this.syncTimer()),
      vscode.commands.registerCommand('whiteFlow.editTrail.previous', () => this.jump(1)),
      vscode.commands.registerCommand('whiteFlow.editTrail.next', () => this.jump(-1))
    ];
    this.syncTimer();
  }

  private syncTimer(): void {
    clearInterval(this.interval); this.interval = undefined;
    if (!vscode.window.state.focused) { clearTimeout(this.timer); this.timer = undefined; return; }
    if (this.types.length) { this.redraw(); this.interval = setInterval(() => this.redraw(), 30000); }
  }

  private redraw(): void {
    if (!this.types.length || !vscode.window.state.focused) return;
    const now = Date.now();
    for (const [key, state] of this.states) {
      const next = prune(state, now, this.minutes);
      if (next.size) this.states.set(key, next); else this.states.delete(key);
    }
    for (const editor of vscode.window.visibleTextEditors) {
      if (!eligible(editor)) continue;
      const ranges: vscode.Range[][] = [[], [], [], []];
      for (const [line, time] of this.states.get(editor.document.uri.toString()) || []) {
        if (line >= editor.document.lineCount) continue;
        const age = now - time, group = bucket(age, this.minutes);
        // Preserve the three public age buckets; the oldest one has two visual shades.
        if (group !== null) ranges[group === 2 && age >= this.minutes * 60000 * .75 ? 3 : group].push(new vscode.Range(line, 0, line, 0));
      }
      this.types.forEach((type, i) => paint(editor, type, ranges[i]));
    }
  }

  private jump(direction: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!eligible(editor)) return;
    const key = editor.document.uri.toString(), state = prune(this.states.get(key) || new Map(), Date.now(), this.minutes);
    this.states.set(key, state);
    const lines = recentLines(state).filter(line => line < editor.document.lineCount);
    if (!lines.length) return;
    const current = lines.indexOf(editor.selection.active.line);
    const index = current < 0 ? 0 : (current + direction + lines.length) % lines.length;
    const position = new vscode.Position(lines[index], 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
  }

  private stop(): void {
    clearInterval(this.interval); clearTimeout(this.timer); this.interval = undefined; this.timer = undefined;
    this.listeners.splice(0).forEach(listener => listener.dispose());
    this.types.forEach(type => type.dispose()); this.types = []; this.states.clear();
  }

  dispose(): void { this.disposed = true; this.stop(); }
}
