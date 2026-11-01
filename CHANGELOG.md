# Changelog

## 0.3.0 - Unreleased

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
