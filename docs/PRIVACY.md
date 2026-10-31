# Privacy And Data Boundaries

## Runtime

The appearance runtime contains no network client, telemetry endpoint, analytics, storage API, or code upload feature. It reads theme token CSS and editor activity events only to coordinate appearance. It does not read code text, settings, credentials, project files, or interpreter configuration.

The supported theme is static data with no activation script. Selecting it changes the chosen color theme through VS Code itself; it does not change font settings or development tools.

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
