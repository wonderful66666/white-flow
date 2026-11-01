/** Exact manifest labels only; custom or similarly named themes do not qualify. */
export type ThemeLabels = string | readonly string[];

export function matchesTheme(theme: unknown, labels: ThemeLabels): boolean {
  return typeof theme === 'string' && (typeof labels === 'string' ? theme === labels : labels.includes(theme));
}
