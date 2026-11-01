# Changelog

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
