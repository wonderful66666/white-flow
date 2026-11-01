# Development Guide

White Flow is a color theme and an extension in one package. The theme is static data. The extension adds optional features that are all off by default. A separate, unsupported workbench patch can enhance some features. This guide records the technical choices and the rules every feature follows.

## Technology Choices

| Area | Choice | Why |
| --- | --- | --- |
| Extension code | TypeScript, compiled to CommonJS in `out/` | The VS Code API is large; types catch broken call sites before anything runs and act as documentation. |
| Runtime dependencies | None | Users receive only project code. TypeScript and type definitions are development dependencies. |
| Heavy computation (later) | Rust compiled to WebAssembly | For work such as whole-project call graphs or line layout, where speed matters. Keep API glue in TypeScript; cross the WebAssembly boundary with coarse calls. |
| Optional workbench patch | Plain CSS and browser JavaScript in `src/` | It runs inside the workbench page, outside the extension API. |
| Tools and tests | Node.js CommonJS scripts, `node:test` | No test framework dependency. They can migrate to TypeScript later. |

Node.js 22 or newer is required for development. Extensions run on the Node.js version bundled with VS Code, so extension code must not depend on newer Node.js APIs than the minimum supported VS Code ships.

## Layout

- `themes/`: the color theme. No fonts, machine settings, or code.
- `extension/`: TypeScript sources. `main.ts` is the entry point, `hub.ts` the feature hub, and each feature lives in its own module.
- `out/`: compiled JavaScript. Generated, ignored by Git, included in a VSIX.
- `src/`: optional workbench patch assets.
- `tools/`: patch installer and release audit.
- `test/`: Node.js tests. Pure logic is tested without VS Code.

## Build And Check

```sh
npm ci --ignore-scripts
npm run compile
node --test
node --check src/keyword-flow.js
node tools/audit-release.cjs
```

`npm test` compiles and then runs the tests. To try the extension, run `npm run compile` and start an Extension Development Host from this folder.

## Rules For Every Feature

### Off by default, quiet when off

- Each feature has a `whiteFlow.<feature>.enabled` setting that defaults to `false` and appears in the feature hub.
- With a feature off, it must register no editor listeners, decorations, timers, or file reads.
- The hub button appears only while the White Flow theme is selected. The command stays available in the Command Palette.
- Activation uses `onStartupFinished`, never `*`.

### Never move text sideways, never edit editor DOM

The editor places the cursor, selections, and click targets by measuring where characters are. Anything that changes horizontal positions, even only visually, makes the cursor and the text disagree.

- Change text rendering only through the decoration API. When a decoration covers a character, VS Code splits it into its own span and keeps measuring correctly.
- Do not create, wrap, or reorder editor DOM nodes from extension or patch code.
- Motion on text is vertical only (`position: relative` with `top`), short, and finished within one keystroke interval. `transform` has no effect on the inline spans that hold code.
- Decorations around typed text use the `ClosedClosed` range behavior so they never grow into the next character.
- The editor recreates a line's DOM after edits and scrolling. Effects must look right when replayed from the start on a recreated node, or must avoid animations on text that can be re-rendered.

### Two tiers: supported API first, patch as enhancement

Each feature must work, in a simpler form, with the supported extension API alone. The patch may add keyframes or styles that the extension API cannot provide. Detect the patch by its marker and asset content; fall back silently when it is missing or older. Example: typing motion fades in with the API and rises with the patch.

### Accessibility and performance

- Honor `workbench.reduceMotion` in the extension and `prefers-reduced-motion` and `forced-colors` in patch CSS. Prefer defining keyframes only inside a media query that allows motion.
- Do not run a continuous animation loop per element. Prefer one shared rule, short one-shot animations, and work proportional to user actions.
- Skip long, multiline, and large multi-cursor edits. Document change events cannot identify short paste or every programmatic insertion, so describe that heuristic limitation honestly.

### Data boundaries

- No network access, telemetry, or uploads.
- Read code text only in memory and only as much as a feature needs; never store or transmit it. Prefer language features already provided by VS Code (definitions, call hierarchy) over parsing code.
- Write only `whiteFlow.*` settings, through the configuration API, after an explicit user choice.
- The extension may read White Flow's own patch marker and assets inside the application directory. It never writes there; only `tools/manage.cjs` modifies application files, on explicit confirmation.

### Third-party ideas and code

- Magic UI (MIT): ideas and code may be adapted with its notice kept in `licenses/`.
- React Bits (MIT plus Commons Clause): ideas only. Do not copy, port, or translate component source, even with attribution. Write the technique from scratch from general CSS and DOM knowledge.
- Any new dependency or third-party source needs a license review and an entry in `THIRD_PARTY_NOTICES.md`.

### Repository hygiene

- Public files are English and ASCII-only; the release audit enforces this.
- Add every new public file to `release-files.json` on purpose.
- Tests use synthetic fixtures. Never test against a contributor's installed editor or real settings.

## Adding A Feature

1. Put pure decision logic in its own module without `vscode` imports, and unit test it.
2. Put VS Code wiring in a class that implements `vscode.Disposable` and creates nothing until enabled.
3. Add the `enabled` setting (default `false`) and any options to `package.json`, and an item in `hub.ts`.
4. If the patch enhances it, add patch CSS in `src/`, a detection check, and a supported fallback.
5. Update `README.md`, `docs/COMPATIBILITY.md`, `docs/PRIVACY.md` if it reads anything new, and `CHANGELOG.md`.
