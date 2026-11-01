# Privacy And Data Boundaries

## Extension

The extension contains no network client, telemetry, analytics, or upload feature. With every feature off it reads no files and registers no editor listeners.

When typing motion is enabled, the extension receives document change events from VS Code. It inspects the size, line-break and bracket shape, and presence of non-ASCII characters in short inserted text, in memory, to decide whether an insertion is eligible for motion. This is a heuristic, not a reliable distinction between typing and paste. It does not store, log, or transmit code text.

To choose the richer effect, the extension reads White Flow's own patch marker and patch stylesheet inside the running VS Code application directory. It never writes there. The feature hub writes only `whiteFlow.*` settings, through the VS Code configuration API, when you accept a choice.

Keyword Flow sends only an enabled palette name through an unapplied decoration type's stylesheet declaration. It creates no editor-range decoration, text-change listener, timer, document read, or file read for this signal. The values are strictly limited to `aurora` and `spectrum`. The type is absent while the feature is off, the theme differs from the manifest's White Flow label, or Workbench Reduce Motion is `on`.

Focus Mode asks VS Code's configured symbol provider for symbol ranges/kinds and caches provider metadata per URI/version in memory. Method Beams asks its call-hierarchy provider for locations; it sends only up to five numeric same-file line pairs, a counter, and a fixed motion flag to the renderer. Neither feature parses source to infer calls. Language services have their own behavior and privacy policies, including in remote workspaces; White Flow adds no network or upload channel.

Edit Trail keeps only document keys, rebased line numbers, and timestamps in memory, capped at 2,000 per document, with no persistence. Risk Radar lexes bounded Rust text in memory and retains only offset/range findings and fixed hover messages, never the text. Read/write highlight colors add no listener or processing.

Polish sends only fixed effect tokens, never save events, diagnostic messages, filenames, or source text. Its extension-side sender has no document listeners, timers, or file reads. TODO Marker reads only bounded visible comment candidates plus overscan, transiently in memory, and paints ranges with fixed tag colors/strokes. It retains no source text and adds no language server, network service, or persistence.

## Patch Runtime

The runtime contains no network client, telemetry endpoint, analytics, storage API, or upload feature. It reads token CSS, activity events, primary-cursor `style.left`, numeric gutter labels, and element bounds/visibility. It does not read code text, settings, credentials, project files, or interpreter configuration. It never modifies editor nodes: mist uses owned head styles and beams uses an owned body-level SVG.

The renderer reads only known allowlisted properties from head styles and optional adopted stylesheets, excluding token sheets and its own styles. Signals are appearance metadata, not source text or arbitrary settings. A slow foreground check also runs while effects are off to detect activation. Diagnostics contain states, palette, token classes, and counters, never document text. No alternate file, storage, network, or custom-event bridge is used.

Save Shine observes the save modifier gesture and active/dirty class changes, retaining a short-lived tab reference and timestamp, not its label or filename. Celebrate reads the first numeric counter from the Problems status item, not code, logs, or compiler output. It keeps only the current numeric count and cooldown time. Feedback is canceled in background/reduced-motion states and all observers, temporary rules, and owned overlays are released on disable/disposal. Runtime diagnostics expose effect tokens and feedback counters only. Native workbench DOM is never changed by these effects.

The color theme itself is static data. Selecting it changes the chosen color theme through VS Code itself; it does not change font settings or development tools.

## Installer

The optional installer uses only explicit command-line paths and local files. It does not discover user profiles, open real settings, enumerate extensions, modify Conda, download dependencies, or upload data. Normal output redacts filesystem paths.

The private state directory does contain local installation paths, the original workbench, and restoration hashes. Treat it as private. A custom injector already present in an original workbench might itself contain sensitive material. The installer refuses known earlier patches but cannot recognize every third-party modification.

Private state must remain outside the repository and application directories. Do not upload it in issues, release archives, logs, or support requests. Filesystem permission modes are not encryption, and Windows access control depends on the parent directory. Choose a directory with appropriate local permissions.

## Publication Checks

`release-files.json` lists the only intended public files. `node tools/audit-release.cjs` checks unexpected files, suspicious paths, email and IP patterns, common credential shapes, private filenames, non-English characters, links, and PNG metadata. Findings identify file/rule names without printing the suspected secret.

This is a heuristic working-tree audit, not a guarantee. It can miss short identifiers, unusual secrets, personal content in pixels, custom formats, and information in Git history. It may also report harmless patterns. Review every finding manually; do not automatically redact real credentials and then publish the original history.

The public preview must contain fictional code and filenames only. Never use screenshots of a real file tree, terminal, account menu, title bar, connection, or private project without manual review.

## Git Identity And History

Release archives exclude the local `.git` directory and its configuration. Public Git history still exposes commit metadata and the repository owner's public account. Before creating commits, configure the public name and GitHub-provided no-reply address you actually intend to expose, using repository-local Git configuration. Never use a private email address or a workstation-derived identity. Review the staged diff and author identity before committing.

`.gitignore` does not remove files already tracked, sanitize old commits, hide commit metadata, or prevent every accidental upload. Audit all branches and tags before making a repository public. If a real credential was ever exposed, revoke or rotate it; deleting a file is not sufficient.
