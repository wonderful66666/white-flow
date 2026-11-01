# Performance And Accessibility

## Runtime Design

### Typing motion

Typing motion is off by default and registers no editor listeners or decorations until enabled. When enabled, rise uses one decoration type with a short CSS animation; fade reuses three opacity decoration types with at most three short timers for an eligible edit batch. A subsequent edit in that document settles the earlier effect. Disabling the feature or reducing motion explicitly disposes listeners, decorations, and timers, including when patch detection was still pending.

Long inserted text is rejected by length before code-point inspection. Other work is bounded to short text and at most sixteen simultaneous changes. Short paste can still look like typing to the document-change API. This is not a continuous animation per character or a guarantee about actual desktop latency.

### Keyword flow

The new renderer starts off. A 1500 ms check looks for the extension's allowlisted palette signal, checking its last still-attached stylesheet first. Eligible sources are head style elements and adopted stylesheets; token styles and the renderer's own style are excluded from signal discovery. Inaccessible sheets are ignored. CSSOM insertions do not trigger a DOM mutation observer, so this small polling step is intentional.

The signal check runs only while the window is focused and visible. When the feature is off there is no token override or 6 Hz color ticker, though this slow foreground check remains. Off transitions remove the runtime stylesheet and stop color ticks. Palette changes reuse the same shared rule; disposal releases both intervals and pending refresh work. Allow about 1500 ms plus the short refresh debounce for a checkbox change to appear.

The keyword effect uses one interval at six updates per second. Each tick changes `background-position` on one shared stylesheet rule. There is no animation loop per token and no continuous animation-frame callback.

The runtime reads the token-color stylesheet to find matching color classes. It does not inspect code text, enumerate every code span each frame, or mutate editor tokens. A debounced refresh handles token stylesheet changes.

The color interval stops when the window loses focus, the document becomes hidden, or a keyboard/wheel event comes from the editor. It resumes after a short idle delay while enabled. OS reduced-motion or forced-color preferences disable the gradient treatment. Selection styles restore solid foreground colors for readability.

Only the purple keyword color class is targeted. The two palettes use OKLCH interpolation when supported; otherwise the renderer validates an ordinary-gradient fallback before applying transparent text fill. No desktop contrast, CPU, GPU, or latency guarantee is inferred from a synthetic browser check.

The base skin also uses short CSS transitions and a one-shot popup border effect. These are separate from the keyword ticker.

## Real Costs

Low timer frequency does not make repainting free. Gradient text can still cause additional rasterization and compositing. Cost depends on visible token count, display scaling, GPU drivers, other extensions, editor layout, and the VS Code/Electron version. Large files do not necessarily mean many visible tokens, because Monaco virtualizes the viewport.

No cross-machine CPU, GPU, battery, or typing-latency claim is made for this distribution. Synthetic browser task-time measurements are not equivalent to whole-process CPU usage or actual VS Code responsiveness.

## Compare Locally

1. Use the same disposable installation, sample file, viewport, extensions, and display scale.
2. Measure the supported theme alone, then the theme plus optional patch.
3. Compare idle, continuous typing, scrolling, selection, background, reduced-motion, and forced-color states.
4. Record renderer CPU, GPU behavior, dropped frames, and input latency separately. Repeat runs and account for warm-up.
5. Restore the optional patch if interaction feels less responsive or text becomes harder to read.

Do not post traces or screenshots from private workspaces without reviewing their contents and metadata.
