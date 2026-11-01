# Compatibility And Limitations

| Surface | Status |
| --- | --- |
| Color theme | Uses the supported VS Code color-theme format |
| VSIX installation and feature-hub activation | Checked in ordinary desktop VS Code 1.98.2 on Windows; other versions and platforms remain unvalidated |
| Typing motion (fade) | Supported extension API; requires VS Code 1.98 or newer. No cross-platform visual guarantee. |
| Typing motion (rise) | Observed on Windows VS Code 1.98.2 with a separate legacy-compatible local adapter; the public portable installer is not covered by that observation |
| Keyword Flow switch (0.3.0 source) | Mocked extension and synthetic renderer tests; the declaration bridge uses undocumented behavior and has no desktop validation for this version |
| Focus Mode, Edit Trail, Risk Radar (0.3.0 source) | Supported APIs with mocked tests, not validated in a real desktop editor |
| Line Mist and Method Beams (0.3.0 source) | Synthetic renderer tests only; matching updated layers required for full effects |
| Polish and TODO Marker (0.3.0 source) | Mocked/synthetic checks only; no real-editor validation for this version |
| Appearance CSS and keyword runtime | Derived from assets previously exercised on Windows with VS Code 1.98.2 |
| Portable external-resource installer | Synthetic fixture tests only; no end-to-end desktop validation for this distribution |
| Other versions and operating systems | Not validated; experimental |

The earlier local setup used a different injection method. Its working appearance does not establish that this portable installer will load successfully in every Electron workbench. Content Security Policy, resource loading, startup timing, and internal DOM structure can differ. File verification is not visual verification.

The GitHub Release VSIX contains the theme and extension, not that private adapter or any installed application files. Blur-rise, keyword flow, and complete workbench styling still require an independently reviewed, compatible application patch. Do not copy another person's settings, application HTML, private scripts, or backups to reproduce the appearance.

Microsoft documents that workbench DOM/CSS replacement is outside the supported extension surface: [Extension capabilities and restrictions](https://code.visualstudio.com/api/extension-capabilities/overview#restrictions).

## Keyword Flow Signal

The extension registers one unapplied decoration type whose `textDecoration` value carries an allowlisted `--white-flow-keyword-flow` property. Current VS Code behavior inserts this CSS rule before any range is decorated and removes it when the type is disposed. The renderer checks this metadata through CSSOM. These details are undocumented and may change. If the declaration is escaped, the rule is no longer globally exposed, or stylesheet access becomes unavailable, the new patch stays off and ordinary text remains readable.

Every label in the manifest's contributed themes is accepted by the sender: White Flow Light and White Flow Ink. The renderer accepts only their reserved `rgb(124, 58, 237)` and `rgb(109, 32, 217)` keyword colors. Blue function-name and prior broad magenta/blue matches are removed. Custom token rules that reuse either keyword purple can still broaden matching; this is not semantic token classification.

The 0.3.0 switch cannot control an older already-installed always-on script. Restore and reapply the patch after updating the extension, then reload. Conversely, a new renderer used without the updated enabled extension has no signal and shows no flow. Disabling or uninstalling the extension removes the signal; complete any reload requested by VS Code. The published v0.2.0 VSIX does not contain this switch.

## Typing Motion

The rise style places extra CSS declarations in a decoration's `textDecoration` value. VS Code copies that value into a generated rule; extensions such as power-mode style effects rely on the same behavior, but it is not a documented contract. If a release escapes the value, the effect disappears and text renders normally. Choose `whiteFlow.typingMotion.style: fade` to use only documented decoration properties.

Both `auto` and `rise` fall back to the supported fade when White Flow's marker or keyframes are absent. Edit-origin detection is heuristic: document change events do not reliably distinguish typing from short paste or programmatic insertion. Explicit `workbench.reduceMotion: on` disables both styles. The API-only fade cannot inspect OS motion preferences while that setting is `auto`.

Monaco redraws a line after edits, scrolling, and some background updates. A redraw during the short animation restarts it for that character. The extension runs in a separate process from the editor, so a typed character can be drawn a frame or two before its effect starts.

## Code Features

Read/write classification comes from the configured language provider. Focus depends on function/method/constructor symbols, supporting hierarchical DocumentSymbol and flat SymbolInformation results. Missing or differently classified symbols leave code undimmed. Method Beams likewise requires provider call-hierarchy support; unsupported commands show nothing. Only same-file results qualify. Without the new renderer section marker, or on another theme, it uses gutter decorations. Gutter icons can compete with breakpoints and other extensions.

Mist relies on `.view-overlays .current-line`, `.margin-view-overlays .current-line-margin`, and `.cursors-layer .cursor`. Rows can be recreated on typing, so no entrance animations are used. Beams relies on numeric `.margin-view-overlays .line-numbers`, the `.margin` lane, and editor/widget focus classes. Folding, wrapping, relative/hidden numbers, diff/notebook editors, and future layout changes can suppress drawing. Off-screen or unsafe estimates use line chips, not invented geometry. Missing structures fail without changing editor nodes.

Risk Radar is a lexical aid, not a Rust parser, borrow checker, macro expander, or safety proof. It skips direct `#[cfg(test)]` modules and `#[test]` functions, not arbitrary cfg expressions/custom test attributes. Shadowed macros/methods can be flagged; indirect panics and generated code can be missed. It is independent of rust-analyzer. Edit Trail is session-only and rebases marks itself because repainting cannot recover editor-adjusted decoration positions.

## Polish Selectors And Pinned References

The reference comparison used Microsoft VS Code **1.98.2** source, not a claim that current main or every desktop version has identical markup. Key labels use the [native keybinding CSS](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/base/browser/ui/keybindingLabel/keybindingLabel.css). Toast order/height handling comes from [NotificationsToasts](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/notifications/notificationsToasts.ts) and its [native styles](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/notifications/media/notificationsToasts.css). New toasts are prepended; native individual heights remain authoritative.

| Effect | Internal dependencies |
| --- | --- |
| Shared scope/preferences | `.monaco-workbench.vs`, `.monaco-reduce-motion`, legacy `.reduce-motion` |
| Engraved | `.part.sidebar.left/.right`, `.part.activitybar.left/.right`, `.part.panel`, `.part.statusbar`, `.part.editor > .content .editor-group-container > .title`, `.tabs-container > .tab.active`, `.editor-group-container:not(.empty) > .editor-container .monaco-editor:not(.monaco-editor .monaco-editor)::before`, `.monaco-editor .margin` |
| Sticky Glass | `.monaco-editor .sticky-widget:not(.peek)`, `.sticky-widget-lines-scrollable`, `.sticky-widget-line-numbers`, `.sticky-widget-lines`, `.sticky-line-content` |
| Keycaps | `.monaco-keybinding > .monaco-keybinding-key`, `.monaco-keybinding-key-separator`, `.monaco-keybinding-key-chord-separator`, `--monaco-monospace-font` |
| Backlight | `.part.editor .editor-group-watermark-wrapper`, `.editor-group-watermark`, `.watermark-container`, `.letterpress`, `.shortcuts`, `.watermark-box`; legacy direct `.editor-group-container.empty > .editor-group-watermark` fallback |
| Toast Stack | `.notifications-toasts.visible`, optional `.top-right`, `.notification-toast-container`, `.notification-toast`, `.notifications-list-container`, `.notification-fade-in`, `.notification-fade-in-done`, hover/focus-within |
| Save Shine | `.part.editor .editor-group-container.active .tabs-container > .tab.active.dirty`, dirty-class removal, `.label-name`; Ctrl/Cmd+S and the specified Alt variant only |
| Celebrate | DOM id `status.problems`, numeric error count before warnings, `.part.statusbar` parent replacement monitoring |
| Dock | `.part.activitybar:not(.horizontal) > .content .composite-bar > .monaco-action-bar .action-item .action-label`, hover/focus-visible and adjacent-item selectors |

The [pinned Sticky Scroll CSS](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/editor/contrib/stickyScroll/browser/stickyScroll.css) paints an opaque root and inherited children, so the opt-in override clears only the non-peek root/inner backgrounds before adding the specified translucent surfaces. Peek is untouched. The [legacy watermark CSS](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/editor/media/editorgroupview.css) predates the newer wrapper shape in the plan; the legacy direct-child selector is included separately. Tab classes use the [tab styles](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/editor/media/multieditortabscontrol.css), with label structure in [IconLabel](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/base/browser/ui/iconLabel/iconlabel.css). Activity icon geometry was compared with [activityaction.css](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/activitybar/media/activityaction.css).

Keycaps retain the target's 18 px outer key height by compensating padding for the extra bottom border. Different native versions, themes, CSS overrides, toast ordering, pointer hit testing, or icon structure may differ. Stacking retains hover and keyboard expansion rather than promising identical native layout behavior on every version. Glass depends on backdrop-filter and transparency preferences. Save Shine requires a valid gradient; missing selectors or policies leave normal labels unchanged. Celebrate reports a counter transition, never build success.

TODO Marker is a line-local comment/quote heuristic, not semantic comment classification. Multiline/raw/long strings and mixed-language files can be misclassified. Its marker tier relies on the same undocumented declaration behavior as typing rise and on data-image support; use flat for the supported-only tier. The encoded SVG value contains no braces/semicolons; the surrounding fixed CSS declaration necessarily uses separators.

## Theme Variables And Engraved

The supported theme files share keys and scope lists. Ink changes only its documented syntax and surface values; Light keeps its original palette, including its approximately 3.96:1 comment contrast on selection (the retained test exception is 3.5:1). Other syntax/selection contrast is at least 4.5:1; Ink comments on selection and both themes' comments under tested overlays meet 4.0:1. These tests do not cover arbitrary user overrides or combined effects.

The patch maps surfaces to these native color variables (each prefixed `--vscode-`): `editor-background`, `editorGutter-background`, `sideBar-background`, `activityBar-background`, `editorGroupHeader-tabsBackground`, `tab-activeBackground`, `commandCenter-background`, `quickInput-background`, `menu-background`, `statusBar-background`, and `panel-background`. Borders use `widget-border`, `sideBar-border`, `editorGroup-border`, `commandCenter-border`, `commandCenter-activeBorder`, and `menu-border`. Text/selection accents use `descriptionForeground`, `sideBarTitle-foreground`, `focusBorder`, and `inputOption-activeBackground`. Missing variables invalidate the individual declaration and leave native styles; surfaces are no longer forced white on other light themes. This does not make every light theme compatible with the remaining optional styling.

Light-only legacy edge shades are scoped by `[class*="-themes-white-flow-light-json"]`; Ink would use `[class*="-themes-white-flow-ink-json"]` if it needed a dedicated rule. [ColorThemeData and toCSSSelector](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/services/themes/common/colorThemeData.ts) split theme id parts into workbench classes and sanitize the extension id/path part. Suffix matching avoids tying those rules to a publisher id, but the class algorithm is still internal.

Engraved is CSS only and is absent under forced colors. It retains native border geometry and adds only box shadows on native boxes. Sidebar/activity-bar highlights mirror with `.left` and `.right`, set by the [pinned layout implementation](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/layout.ts). Top panel, status, active-tab and title edges use fixed 1 px white highlights. Non-bottom panel layouts or clipped split-view boundaries can suppress or misplace a highlight; no layout fix is attempted.

In 1.98.2 the outer `.editor-container` is not positioned by the [group styles](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/workbench/browser/parts/editor/media/editorgroupview.css). The shadow instead uses the already positioned [Monaco root](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/editor/browser/widget/codeEditor/editor.css). Its owned `::before` is absolute, 8 px tall, pointer-transparent, and at z-index 4, above ordinary code and below native widgets. The pinned [find](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/editor/contrib/find/browser/findWidget.css), [suggest](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/editor/contrib/suggest/browser/media/suggest.css), and [zone/peek](https://github.com/microsoft/vscode/blob/1.98.2/src/vs/editor/contrib/zoneWidget/browser/zoneWidget.css) layers use 35, 40, and 10 respectively. Only the pseudo-element has dimensions/position declarations; native elements do not. Nested Monaco roots, including ordinary Peek editors, are excluded. A different stacking context or a missing selector can suppress the shadow. Diff/notebook/third-party editors are not guaranteed. Static shadows do not create an animation loop and are retained under reduced motion.

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
