# Installation And Restoration

The published asset described below is v0.2.0. The Keyword Flow switch is in the unreleased 0.3.0 source and requires a matching updated extension build and renderer patch; it is not added to an old VSIX by updating documentation.

## Install The Release Asset

Use desktop VS Code 1.98 or newer. Download `white-flow-vscode-0.2.0.vsix` from the [v0.2.0 Release](https://github.com/wonderful66666/white-flow/releases/tag/v0.2.0). Choose the actual `.vsix` under **Assets**, not **Source code (zip)** or **Source code (tar.gz)**.

1. Open the Command Palette with Ctrl+Shift+P, or Cmd+Shift+P on macOS.
2. Run **Extensions: Install from VSIX...** and select the downloaded file.
3. Reload the window if VS Code requests it.
4. Run **White Flow: Open Feature Hub**, select **Typing Motion** if desired, and press Enter to apply. All features are off by default.
5. Optionally select **White Flow Light** from **Preferences: Color Theme**. The command works with any theme; the title-bar button appears only with White Flow Light.

You can also use the official CLI:

```sh
code --install-extension ./white-flow-vscode-0.2.0.vsix
```

No build tools, Node.js, npm, Python, Conda, developer mode, or extension-development startup command are required to use this VSIX. If an old process was launched in Extension Development Host mode, save your work, close all VS Code windows, and launch your usual VS Code shortcut normally once. Do not keep using `--extensionDevelopmentPath` for everyday use.

The package is unsigned and uses the local identifier `white-flow-local.white-flow-vscode`; it is not a verified Marketplace publication. Review the source and the SHA-256 checksum shown in the Release notes before trusting it. The release publishes the extension package only, never a user profile, private patch adapter, configuration, key, or backup.

To verify a download in PowerShell, compare this result with the Release notes:

```powershell
Get-FileHash ./white-flow-vscode-0.2.0.vsix -Algorithm SHA256
```

VSIX-installed extensions do not receive Marketplace auto-updates by default. Download and install a newer VSIX manually when updating. To remove this extension, use its **Uninstall** action in the Extensions view, or:

```sh
code --uninstall-extension white-flow-local.white-flow-vscode
```

Uninstalling the extension does not remove an independently installed workbench patch. Restore that patch separately using its matching private state directory.

## Which Effects Need The Patch?

| Effect | VSIX Alone | VSIX Plus Optional Patch |
| --- | --- | --- |
| White Flow Light color theme | Yes; select it manually | Yes |
| Feature hub | Yes | Yes |
| Typing fade | Yes, when enabled | Yes, with style `fade` |
| Blur-and-rise typing | No; falls back to fade | Requires the patch marker and typing keyframes |
| Keyword color flow (0.3.0 source) | No | Requires the updated runtime, enabled hub switch, White Flow theme, and purple keyword class |
| Rounded workbench controls and popup polish | No | Requires the workbench CSS |

**Full visual effects require both layers. Installing the VSIX does not install, update, or elevate the optional patch.** Source code for the public patch is in `src/` and `tools/manage.cjs`, available in a source checkout or the source archive. Its portable installer is still fixture-tested only. A working legacy local setup is not proof that this installer will work on your desktop. Read [Compatibility](COMPATIBILITY.md) and try a disposable installation first.

## Motion Troubleshooting

- Check that Typing Motion is selected in the hub and confirm with Enter; cancelling the picker saves nothing.
- **Workbench: Reduce Motion** set to `on` disables both typing styles even if the feature checkbox is enabled. Choose `off` only when you explicitly want motion. The extension never changes this setting itself.
- With style `auto` or `rise`, missing patch keyframes cause a supported fade fallback. Seeing the theme does not prove the patch is installed.
- OS reduced-motion and forced-color preferences disable the patch keyframes. The API-only fade cannot detect those OS preferences when the workbench setting is `auto`.
- The default effect is short (140 ms) and applies to new short insertions, not existing text or entire lines. Some short paste can also animate because edit-origin detection is heuristic.
- Reload the window after applying or restoring the application patch. Do not disable security protections if effects fail to load.

## Build Or Try The Source

Open this folder in VS Code and build the extension once with `npm ci --ignore-scripts` and `npm run compile`. To try it, run **Debug: Start Debugging** with a VS Code Extension Development launch configuration, or start a separate development host:

```sh
code --new-window --extensionDevelopmentPath .
```

In that host, run **Preferences: Color Theme** and select **White Flow Light**. This does not install the optional patch or change fonts. Use the sparkle button in the editor title bar, or **White Flow: Open Feature Hub**, to enable optional features. To stop using the theme, select your previous theme.

To build a local VSIX, review the extension manifest. The current `white-flow-local` value is a local identifier, not a registered publisher; a Marketplace account is not required to install the provided VSIX. Publishing your own Marketplace listing requires your own registered publisher. Use Microsoft's official [extension packaging instructions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension). Packaging tools are not bundled or downloaded by this project. Run `npm run compile` before packaging. The VSIX allowlist includes the theme, compiled extension code in `out/`, documentation, preview image, and notices, not TypeScript sources, the application patch, or local state. The interactive demo and commands below require the source checkout, not just the installed theme package.

## Upgrade Keyword Flow To 0.3.0

1. Obtain an updated extension build from the 0.3.0 source. The existing published v0.2.0 VSIX does not expose Keyword Flow settings.
2. Save work and quit the affected editor. Restore the old patch with the installer and private state that own it. The public installer must not be used to overwrite another injector or a private legacy adapter.
3. Reapply the updated public source patch with a new private state directory, using the plan and apply commands below. Changed payload hashes intentionally require restore/reapply rather than silently replacing an active installation.
4. Reopen the editor and select **White Flow Light** if you explicitly want its theme. Open **White Flow: Open Feature Hub**, check **Keyword Flow**, and press Enter. The checkbox is off by default; it has no visual effect without a compatible patch and the correct theme.
5. Set **White Flow > Keyword Flow: Palette** to **aurora** or **spectrum**. Keep Workbench Reduce Motion not set to `on` only if you want motion. Allow about 1500 ms plus the refresh debounce for a change to appear.

An old installed script remains always-on until restored and reapplied, even when the updated extension checkbox is off. The updated script starts off, including when the extension is disabled, uninstalled, on another theme, or unable to send its signal. A detected marker means only that a patch is present, not that an old script supports the new protocol. Keep all old backups private and do not force an installer past its safety checks.

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
npm ci --ignore-scripts
npm run compile
node --test
node --check src/keyword-flow.js
node tools/audit-release.cjs
```

Tests create disposable fake application directories under the system temporary directory. They never discover or modify a real VS Code installation. Set the standard `TEMP` and `TMP` environment variables before running tests if those fixtures must live on a specific drive.
