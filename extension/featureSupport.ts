import * as vscode from 'vscode';

export function eligible(editor: vscode.TextEditor | undefined, maxLines = Infinity): editor is vscode.TextEditor {
  return !!editor && !editor.document.isClosed && ['file', 'untitled'].includes(editor.document.uri.scheme) &&
    editor.document.lineCount <= maxLines;
}

export function paint(editor: vscode.TextEditor, type: vscode.TextEditorDecorationType,
  ranges: readonly vscode.Range[] | readonly vscode.DecorationOptions[]): void {
  if (editor.document.isClosed) return;
  try { editor.setDecorations(type, ranges); } catch { /* Editors may close while a request settles. */ }
}

export function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
