# Compatibility And Limitations

| Surface | Status |
| --- | --- |
| Color theme | Uses the supported VS Code color-theme format |
| VSIX installation and feature-hub activation | Checked in ordinary desktop VS Code 1.98.2 on Windows; other versions and platforms remain unvalidated |
| Typing motion (fade) | Supported extension API; requires VS Code 1.98 or newer. No cross-platform visual guarantee. |
| Typing motion (rise) | Observed on Windows VS Code 1.98.2 with a separate legacy-compatible local adapter; the public portable installer is not covered by that observation |
| Keyword Flow switch (0.3.0 source) | Mocked extension and synthetic renderer tests; the declaration bridge uses undocumented behavior and has no desktop validation for this version |
| Appearance CSS and keyword runtime | Derived from assets previously exercised on Windows with VS Code 1.98.2 |
| Portable external-resource installer | Synthetic fixture tests only; no end-to-end desktop validation for this distribution |
| Other versions and operating systems | Not validated; experimental |

The earlier local setup used a different injection method. Its working appearance does not establish that this portable installer will load successfully in every Electron workbench. Content Security Policy, resource loading, startup timing, and internal DOM structure can differ. File verification is not visual verification.

The GitHub Release VSIX contains the theme and extension, not that private adapter or any installed application files. Blur-rise, keyword flow, and complete workbench styling still require an independently reviewed, compatible application patch. Do not copy another person's settings, application HTML, private scripts, or backups to reproduce the appearance.

Microsoft documents that workbench DOM/CSS replacement is outside the supported extension surface: [Extension capabilities and restrictions](https://code.visualstudio.com/api/extension-capabilities/overview#restrictions).

## Keyword Flow Signal

The extension registers one unapplied decoration type whose `textDecoration` value carries an allowlisted `--white-flow-keyword-flow` property. Current VS Code behavior inserts this CSS rule before any range is decorated and removes it when the type is disposed. The renderer checks this metadata through CSSOM. These details are undocumented and may change. If the declaration is escaped, the rule is no longer globally exposed, or stylesheet access becomes unavailable, the new patch stays off and ordinary text remains readable.

Only the manifest's White Flow theme label is accepted by the sender, and only `rgb(124, 58, 237)` keyword-color classes are accepted by the renderer. Blue function-name and prior broad magenta/blue matches are removed. Custom token rules that reuse the keyword purple can still broaden matching; this is not semantic token classification.

The 0.3.0 switch cannot control an older already-installed always-on script. Restore and reapply the patch after updating the extension, then reload. Conversely, a new renderer used without the updated enabled extension has no signal and shows no flow. Disabling or uninstalling the extension removes the signal; complete any reload requested by VS Code. The published v0.2.0 VSIX does not contain this switch.

## Typing Motion

The rise style places extra CSS declarations in a decoration's `textDecoration` value. VS Code copies that value into a generated rule; extensions such as power-mode style effects rely on the same behavior, but it is not a documented contract. If a release escapes the value, the effect disappears and text renders normally. Choose `whiteFlow.typingMotion.style: fade` to use only documented decoration properties.

Both `auto` and `rise` fall back to the supported fade when White Flow's marker or keyframes are absent. Edit-origin detection is heuristic: document change events do not reliably distinguish typing from short paste or programmatic insertion. Explicit `workbench.reduceMotion: on` disables both styles. The API-only fade cannot inspect OS motion preferences while that setting is `auto`.

Monaco redraws a line after edits, scrolling, and some background updates. A redraw during the short animation restarts it for that character. The extension runs in a separate process from the editor, so a typed character can be drawn a frame or two before its effect starts.

## Deliberate Boundaries

- Do not remove or relax Content Security Policy.
- Do not suppress application integrity checks or edit checksum databases.
- Do not modify startup scripts, binaries, user settings, or language tooling.
- Do not silently patch a different installed copy or install at startup.
- Do not assume a successful hash check means effects are visible.

The installer adds same-origin external resources without changing existing security policy. The runtime also creates an appearance stylesheet. If the installed policy rejects either mechanism, the effects may be absent. Restore the patch and use the supported theme alone.

## Internal Selectors

The patch targets light-mode `.monaco-workbench.vs` surfaces and virtualized Monaco token classes. Internal classes and layout details can change without notice. Other themes can cause different tokens to match, no tokens to match, or unexpected colors. Diff views, notebooks, embedded editors, third-party webviews, and terminal text are not covered by a compatibility guarantee.

The runtime matches token CSS colors, not a language parser. It never reads editor code text or rewrites token spans. It does not bundle a React rendering tree, code engine, syntax highlighter, or downloadable UI components.

After any VS Code update, prefer the supported theme until a disposable-install test confirms the patch still works. Never copy a backup HTML file over a newer application manually.
