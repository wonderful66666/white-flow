# Performance And Accessibility

## Runtime Design

### Typing motion

Typing motion is off by default and registers no editor listeners or decorations until enabled. When enabled, rise uses one decoration type with a short CSS animation; fade reuses three opacity decoration types with at most three short timers for an eligible edit batch. A subsequent edit in that document settles the earlier effect. Disabling the feature or reducing motion explicitly disposes listeners, decorations, and timers, including when patch detection was still pending.

Long inserted text is rejected by length before code-point inspection. Other work is bounded to short text and at most sixteen simultaneous changes. Short paste can still look like typing to the document-change API. This is not a continuous animation per character or a guarantee about actual desktop latency.

### Keyword flow

The new renderer starts off. A 1500 ms check looks for the extension's allowlisted palette signal, checking its last still-attached stylesheet first. Eligible sources are head style elements and adopted stylesheets; token styles and the renderer's own style are excluded from signal discovery. Inaccessible sheets are ignored. CSSOM insertions do not trigger a DOM mutation observer, so this small polling step is intentional.

The signal check runs only while the window is focused and visible. When the feature is off there is no token override or 6 Hz color ticker, though this slow foreground check remains. Off transitions remove the runtime stylesheet and stop color ticks. Palette changes reuse the same shared rule; disposal releases both intervals and pending refresh work. Allow about 1500 ms plus the short refresh debounce for a checkbox change to appear.

Keyword Flow and Line Mist share one interval at six updates per second. Each tick changes at most their two shared background-position rules, with 167 ms interpolation while motion is allowed. There is no loop per token or continuous animation-frame callback.

Six Hz describes JavaScript rule writes, not the browser's paint rate. CSS interpolation and the one-shot SVG glint can render at the display refresh rate. Smoother motion is not a claim of lower GPU, battery, or repaint cost; static mist and disabled keyword flow avoid those ongoing transitions.

The runtime reads the token-color stylesheet to find matching color classes. It does not inspect code text, enumerate every code span each frame, or mutate editor tokens. A debounced refresh handles token stylesheet changes.

The color interval stops when the window loses focus, the document becomes hidden, or a keyboard/wheel event comes from the editor. It resumes after a short idle delay while enabled. OS reduced-motion or forced-color preferences disable the gradient treatment. Selection styles restore solid foreground colors for readability.

Only the purple keyword color class is targeted. The two palettes use OKLCH interpolation when supported; otherwise the renderer validates an ordinary-gradient fallback before applying transparent text fill. No desktop contrast, CPU, GPU, or latency guarantee is inferred from a synthetic browser check.

The base skin also uses short CSS transitions and a one-shot popup border effect. These are separate from the keyword ticker.

### Other code features

Read/write highlights are static theme colors. Tests composite their translucent backgrounds over both editor and current-line colors. Mist stops plus the glow center and method-highlight backgrounds have separate 4.5:1 syntax / 4.0:1 comment checks. These numerical checks do not guarantee arbitrary overrides or third-party decoration combinations. Focus Mode intentionally dims code below ordinary contrast levels and is optional for that reason.

Focus debounces selection by 80 ms and edits by 300 ms, caches per URI/version, skips documents above 50,000 lines, and bounds symbol traversal at 100,000 entries. Method Beams waits 250 ms after selection, skips the first 500 ms after edits, and caps links at five. Provider latency is external to the extension. Stale results are ignored.

Mist coalesces primary-cursor position writes to at most six per second and disconnects when glow is off or backgrounded. Rows have no entrance animation. Beam layout observes gutter/layout/widget events and requests one frame per batch, never rescheduling itself continuously. Its one-shot 420 ms glint is removed and not replayed on ordinary layout changes. Widgets hide the overlay; accessibility preferences suppress glints/transitions or replace the stroke with a system color.

Edit Trail stores at most 2,000 line/time entries per document, rebases bottom-up, redraws after 500 ms, and ages every 30 seconds only while focused. The oldest of three age buckets splits at 75% for four visual shades. Closing a document or disabling the feature frees its state.

Risk Radar lexes only Rust file/untitled text up to 1 MiB after a 300 ms debounce and decorates at most 5,000 findings. It reuses unchanged-version results. Lexical work is linear in document length, with temporary tokens/offsets; it does not expand macros, invoke a compiler, or use rust-analyzer. Disabling releases all listeners, timers, and findings.

Scanning runs in the extension host and can briefly occupy it on dense inputs. The file limit and debounce bound that work, but do not guarantee a latency target. Disable the optional scanner if it interferes with other language features.

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
