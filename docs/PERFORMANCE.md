# Performance And Accessibility

## Runtime Design

The keyword effect uses one interval at six updates per second. Each tick changes `background-position` on one shared stylesheet rule. There is no animation loop per token and no continuous animation-frame callback.

The runtime reads the token-color stylesheet to find matching color classes. It does not inspect code text, enumerate every code span each frame, or mutate editor tokens. A debounced refresh handles token stylesheet changes.

The interval stops when the window loses focus, the document becomes hidden, or a keyboard/wheel event comes from the editor. It resumes after a short idle delay. OS reduced-motion or forced-color preferences disable the gradient treatment. Selection styles restore solid foreground colors for readability.

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
