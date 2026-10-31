# Installation And Restoration

## Supported Color Theme

Open this folder in VS Code. To try the theme, run **Debug: Start Debugging** with a VS Code Extension Development launch configuration, or start a separate development host:

```sh
code --new-window --extensionDevelopmentPath .
```

In that host, run **Preferences: Color Theme** and select **White Flow Light**. This does not install the optional patch or change fonts. To stop using the theme, select your previous theme.

To build a local VSIX, review the extension manifest and select your own valid publisher identifier first. The current `white-flow-local` value is a neutral placeholder, not a registered publisher. Use Microsoft's official [extension packaging instructions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension). Packaging tools are not bundled or downloaded by this project. The VSIX allowlist includes the theme, documentation, preview image, and notices, not the application patch or local state. The interactive demo and commands below require the source checkout, not just the installed theme package.

## Experimental Workbench Patch

This is not a normal theme API. VS Code extensions cannot officially replace workbench DOM/CSS. Modifying installed application files can trigger integrity warnings, fail under Content Security Policy, or require restoring the application after an update. See [Compatibility](COMPATIBILITY.md).

Use a disposable or separate VS Code installation first. Completely quit that installation before applying or restoring. Save your work. The tool does not close windows for you.

Requirements:

- Node.js 22 or newer, already installed.
- A writable supported desktop VS Code installation.
- A private state directory outside both the source checkout and the VS Code installation.
- A clean workbench without another custom injector or this project's older local-only patches.
- Appropriate filesystem permissions. There is no automatic administrator prompt or elevation.

Run commands from this project folder. Replace angle-bracket placeholders; do not type them literally.

```sh
node tools/manage.cjs plan --app-root "<installation-directory>" --state-dir "<private-state-directory>"
node tools/manage.cjs apply --app-root "<installation-directory>" --state-dir "<private-state-directory>" --confirm
node tools/manage.cjs verify --state-dir "<private-state-directory>"
```

`--app-root` may point to an installation directory, its `resources/app` directory, or a supported desktop application bundle. Links and junctions are deliberately rejected. Browser-hosted VS Code, remote servers, immutable package installs, and protected app bundles are not supported.

`plan` is read-only. `apply` saves the original workbench plus a checksum and a private installation record, then adds only the marked resource links and the owned `white-flow-assets` directory. No Content Security Policy, bootstrap script, or checksum database is modified. A successful `verify` checks file hashes, not whether Electron actually rendered the effects.

Reopen the same installation. Select **White Flow Light** manually for the intended colors. If the patch fails to load, restore it. Do not weaken Content Security Policy or disable application security protections to force it to work.

## Restore With One Command

Quit the affected VS Code installation first, then run:

```sh
node tools/manage.cjs restore --state-dir "<private-state-directory>" --confirm
```

Windows wrappers provide the same operations when `node` is on `PATH`:

```bat
Install.cmd --app-root "<installation-directory>" --state-dir "<private-state-directory>"
Restore.cmd --state-dir "<private-state-directory>"
```

The wrappers still need explicit paths; double-clicking them without arguments only shows help. They never request elevation automatically.

If the workbench is unchanged, restoration recovers the exact original HTML. If a later update changed it, restoration removes only the owned marked block rather than writing an older application version back. Unrecognized or modified asset files are preserved for review. The private backup is retained, not automatically deleted. Keep it outside any Git checkout or public archive.

Before installing a new patch version, restore the old one and use a new private state directory. A stale or damaged backup record causes the tool to stop rather than guess. If VS Code moved or the supported entry file disappeared, use the official application installer to repair it and inspect private state locally.

## Development Checks

```sh
node --test
node --check src/keyword-flow.js
node tools/audit-release.cjs
```

Tests create disposable fake application directories under the system temporary directory. They never discover or modify a real VS Code installation. Set the standard `TEMP` and `TMP` environment variables before running tests if those fixtures must live on a specific drive.
