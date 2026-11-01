# Changelog

## 0.3.0 - Unreleased

- Add White Flow Ink: deeper syntax roles, cool matte editor, matching gutter/file surfaces, and white popups; retain Light's original colors and fonts.
- Follow native theme variables in the optional patch instead of forcing all light themes white. Preserve legacy Light-only decorative edge shades.
- Accept every contributed theme label for signals and both reserved keyword colors in the renderer; show the hub title action for Light or Ink.
- Add default-off Engraved polish: separator highlights and a bounded, static editor inset shadow, with no native geometry changes and no forced-color treatment.
- Add paired-theme contrast/structure tests and a synthetic Light/Ink/Engraved preview without regenerating the public PNG.
- Add a sorted, allowlisted aggregate polish signal, preserving keyword behavior and dropping motion-only tokens under Workbench Reduce Motion.
- Group the feature hub into Editor and Workbench patch sections without treating separators as settings.
- Add default-off Sticky Glass, Keycaps, empty-editor Backlight, keyboard-expandable Toast Stack, Save Shine, Celebrate, and activity-bar Dock.
- Add theme keybinding-label colors and preserve target native key/toast heights in synthetic browser checks.
- Add extension-only TODO Marker with visible-range overscan, quote/comment heuristics, encoded SVG strokes, a supported flat style, and contrast tests.
- Gate save feedback on a recent manual-save gesture plus dirty-state removal; debounce error-zero celebration and impose a cooldown.
- Honor current and legacy workbench motion classes plus OS motion, transparency, and forced-color preferences; clean observers, styles, and overlays on disable/disposal.
- Keep all new settings off by default, all public files English/ASCII, and all private state outside the repository.
- Add translucent read/write occurrence colors with alpha-composited contrast checks.
- Add default-off Focus Mode using cached document symbols and stale-result protection.
- Generalize the declaration-only bridge for independent palette, mist, and bounded beam metadata, with one unapplied type per feature.
- Add Aurora Mist with a shared 6 Hz drift rule, coalesced cursor glow, and accessibility fallbacks.
- Add same-file call-hierarchy Method Beams with a supported gutter fallback and optional body-level brushed-silver SVG.
- Add in-memory Edit Trail with rebased line marks, bounded foreground-only aging, and previous/next edit commands.
- Add lexical Rust Risk Radar with comment/literal/test filtering, bounded files, offset-only findings, and English hints.
- Test disabled resources, stale providers, signals, renderer geometry, timers, scanner boundaries, and composited backgrounds.
- Replace syntax colors with neutral identifiers and structure, teal types, green strings, amber constants, rose metadata, and a purple reserved for keywords.
- Add specific Java type, Rust lifetime/option/macro, annotation, Markdown, diff, and semantic-token roles without font-family or size overrides.
- Define bracket, inlay-hint, diagnostic, gutter, diff, Git, and sticky-scroll highlight colors while preserving other workbench surfaces.
- Test WCAG 2.x foreground contrast and keyword-purple exclusivity; update the synthetic HTML palette without regenerating its PNG.
- Add a default-off Keyword Flow hub switch and Aurora/Spectrum palette settings.
- Send only allowlisted palette metadata through one unapplied decoration type, gated by the White Flow theme and reduced-motion preference.
- Start the renderer off, discover CSSOM signals with a focused visible 1500 ms check, and remove token overrides when the signal disappears.
- Restrict matching to the theme's purple keyword class; blue function names and prior magenta/blue matches stay unchanged.
- Use OKLCH interpolation when supported, validate the ordinary-gradient fallback, and retain solid text if gradients are unsupported.
- Cover sender lifetime, CSSOM insertions/removal, palette changes, background timers, accessibility, and unsupported stylesheets with synthetic tests.
- Document the undocumented bridge, matching-version requirement, and mandatory restore/reapply for older always-on patches.

## 0.2.0 - 2026-11-01

- Add a TypeScript extension with a feature hub, opened from a title-bar button shown with the White Flow theme. All features are off by default; no runtime dependencies.
- Add opt-in typing motion: the newest typed character fades in through the decoration API, or blurs in and rises with keyframes from the optional patch.
- Add a development guide covering technology choices, editor DOM rules, licensing, and accessibility.
- Skip root `node_modules/` and `out/` build directories in the release audit, which still flags them elsewhere.
- Guard asynchronous refresh against disposal and stale configuration; settle effects on skipped edits and preserve workspace toggle scope.
- Fall back when patch keyframes are missing and allow the intended blur animation through the base stylesheet.
- Document short-edit detection and OS motion-preference limitations.

## 0.1.0 - 2026-10-31

- Prepare a supported white color theme without font or toolchain overrides.
- Separate optional appearance assets from the normal theme package.
- Add explicit portable installation, hash verification, and conservative restoration.
- Add English documentation, fictional preview, privacy checks, and synthetic tests.
- Keep private state outside the repository; no GitHub repository or Marketplace publication is performed by the preparation tools.

The portable installer still needs disposable desktop validation before a stable release.
