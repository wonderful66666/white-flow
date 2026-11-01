# Contributing

Read the [Development Guide](docs/DEVELOPMENT.md) first. Keep changes focused on appearance, opt-in editor features, and explicit local restoration. Preserve native editor layout, hit testing, keyboard behavior, text readability, and reduced-motion support.

Run `npm ci --ignore-scripts`, `npm run compile`, `node --test`, `node --check src/keyword-flow.js`, and `node tools/audit-release.cjs` before proposing a change. Use only synthetic application fixtures in tests. Do not run tests against a contributor's installed editor.

Documentation, code comments, sample filenames, and public demo text are English. Do not add personal paths, author contact details, private settings, credentials, downloaded component collections, or real workspace images. Update `release-files.json` intentionally when adding a public file.

Do not add network requests, telemetry, automatic elevation, startup patching, user-settings discovery, or security-policy bypasses. Keep the theme and extension features working without the optional unsupported workbench patch; the patch may only enhance them. New dependencies and third-party source require a license review.

When reporting compatibility, state the VS Code and operating-system versions and whether you verified file installation, actual rendered appearance, and restoration. Do not describe browser-only previews as desktop validation.
