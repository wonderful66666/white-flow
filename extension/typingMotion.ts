/*
 * Typing motion: the newest typed character fades or rises into place.
 *
 * VS Code splits the character into its own span because a decoration covers it, so the
 * editor keeps measuring text correctly. Nothing here touches editor DOM. Only one batch of
 * characters is decorated at a time: the next keystroke settles the previous character at once.
 */
import * as vscode from 'vscode';
import {
  FADE_OPACITIES, MotionStyle, clampDuration, motionSpans, resolveStyle, riseDeclaration
} from './typingRules';

type Timer = ReturnType<typeof setTimeout>;

export class TypingMotion implements vscode.Disposable {
  private listener: vscode.Disposable | undefined;
  private frames: vscode.TextEditorDecorationType[] = [];
  private readonly timers = new Set<Timer>();
  private painted: readonly vscode.TextEditor[] = [];
  private durationMs = clampDuration(undefined);
  private currentStyle: MotionStyle | undefined;
  private revision = 0;
  private disposed = false;

  /** @param hasPatchKeyframes Resolves whether the optional workbench patch provides the rise keyframes. */
  constructor(private readonly hasPatchKeyframes: () => Promise<boolean>) {}

  /** On in settings and not overridden by the editor's reduced-motion setting. */
  static isEnabled(): boolean {
    const enabled = vscode.workspace.getConfiguration('whiteFlow.typingMotion').get<boolean>('enabled', false);
    return enabled && vscode.workspace.getConfiguration('workbench').get<string>('reduceMotion') !== 'on';
  }

  /** The style in use, or undefined while the feature is off. */
  get style(): MotionStyle | undefined {
    return this.currentStyle;
  }

  /** Re-reads settings. When the feature is off or motion is reduced, no listener or decoration type exists. */
  async refresh(): Promise<void> {
    const revision = ++this.revision;
    this.stop();
    if (this.disposed || !TypingMotion.isEnabled()) return;
    const config = vscode.workspace.getConfiguration('whiteFlow.typingMotion');
    const setting = config.get<string>('style', 'auto');
    const style = resolveStyle(setting, setting !== 'fade' ? await this.hasPatchKeyframes() : false);
    if (this.disposed || revision !== this.revision || !TypingMotion.isEnabled()) return;
    this.stop();
    this.durationMs = clampDuration(config.get<number>('durationMs'));
    // ClosedClosed: a decoration never grows when the next character is typed against its edge.
    const rangeBehavior = vscode.DecorationRangeBehavior.ClosedClosed;
    this.frames = style === 'rise'
      ? [vscode.window.createTextEditorDecorationType({ textDecoration: riseDeclaration(this.durationMs), rangeBehavior })]
      : FADE_OPACITIES.map(opacity => vscode.window.createTextEditorDecorationType({ opacity, rangeBehavior }));
    this.currentStyle = style;
    this.listener = vscode.workspace.onDidChangeTextDocument(event => this.onDidChange(event));
  }

  dispose(): void {
    this.disposed = true;
    this.revision++;
    this.stop();
  }

  private onDidChange(event: vscode.TextDocumentChangeEvent): void {
    if (this.painted.some(editor => editor.document === event.document)) this.settle();
    // Undo and redo report a reason; typing does not.
    if (event.reason !== undefined || event.contentChanges.length === 0) return;
    const editors = vscode.window.visibleTextEditors.filter(editor => editor.document === event.document);
    if (editors.length === 0) return;
    const spans = motionSpans(event.contentChanges);
    if (spans.length === 0) return;
    const { document } = event;
    const ranges = spans.map(span => new vscode.Range(document.positionAt(span.start), document.positionAt(span.start + span.length)));
    this.play(editors, ranges);
  }

  /** Rise holds one CSS animation for the whole duration. Fade steps through opacity frames. */
  private play(editors: readonly vscode.TextEditor[], ranges: readonly vscode.Range[]): void {
    this.settle();
    this.painted = editors;
    const step = this.durationMs / this.frames.length;
    this.frames.forEach((frame, index) => {
      const show = () => {
        if (index > 0) this.paint(this.frames[index - 1], []);
        this.paint(frame, ranges);
      };
      if (index === 0) show();
      else this.later(index * step, show);
    });
    this.later(this.durationMs + 20, () => this.settle());
  }

  private paint(frame: vscode.TextEditorDecorationType, ranges: readonly vscode.Range[]): void {
    for (const editor of this.painted) {
      if (editor.document.isClosed) continue;
      try { editor.setDecorations(frame, ranges); } catch {
        // A tab can close while a short timer is pending. Do not retry a stale editor handle.
      }
    }
  }

  private later(delayMs: number, action: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      action();
    }, delayMs);
    this.timers.add(timer);
  }

  /** Removes every motion decoration so the text renders as ordinary tokens again. */
  private settle(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const frame of this.frames) this.paint(frame, []);
    this.painted = [];
  }

  private stop(): void {
    this.settle();
    this.listener?.dispose();
    this.listener = undefined;
    for (const frame of this.frames) frame.dispose();
    this.frames = [];
    this.currentStyle = undefined;
  }
}
