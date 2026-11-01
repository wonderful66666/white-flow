# White Flow

A white VS Code theme with an optional feature hub, opt-in editor effects, and optional workbench polish. Existing editor font settings are left alone.

**Status: experimental VSIX and source release, not a Marketplace release.** The color theme and the feature hub use the supported extension API. The optional workbench patch uses unsupported internals and is experimental. Read the [compatibility notes](docs/COMPATIBILITY.md) before installing it.

**Download:** [White Flow v0.2.0](https://github.com/wonderful66666/white-flow/releases/tag/v0.2.0), then choose `white-flow-vscode-0.2.0.vsix` under **Assets**. The automatic source archives are not extension installation packages.

![Synthetic White Flow preview](demo/preview.png)

The preview uses fictional files and sample code, not a screenshot of a personal workspace. Open `demo/index.html` locally to see the animation. It is a visual demonstration, not a working editor or proof of desktop compatibility.

## Three Layers

| Layer | What it does | Installation |
| --- | --- | --- |
| Color theme | White editor, quiet neutral surfaces, purple keywords, green strings, blue functions | Standard VS Code theme |
| Feature hub | Optional features, all off by default, such as typing motion | Same extension; enable features from the hub |
| Optional patch | Rounded controls, subtle borders, short popup effects, low-frequency keyword color flow, and richer versions of hub features | Explicit local application-file modification |

While **White Flow Light** is selected, a sparkle button in the editor title bar opens the feature hub. The **White Flow: Open Feature Hub** command works with any theme. With every feature off, the extension only registers that command and a settings listener after startup.

The patch does not install React, Motion, Magic UI, or React Bits into VS Code. It is a small CSS/DOM adaptation inspired by those visual styles, not an official integration.

## Install The Released VSIX

1. Use desktop VS Code 1.98 or newer. Download the `.vsix` asset from the release above.
2. Open the Command Palette and run **Extensions: Install from VSIX...**, then select that file.
3. Reload VS Code if requested. Open it normally; an Extension Development Host is not required.
4. Run **White Flow: Open Feature Hub**, select the features you want, and press Enter to apply. Features are off by default.
5. Optionally select **White Flow Light** through **Preferences: Color Theme**. Installing the VSIX does not switch your theme or change your fonts.

The VSIX needs no Node.js, npm, Python, or Conda setup. It is a local unsigned package with the identifier `white-flow-local.white-flow-vscode`, not a verified Marketplace listing. Review the source and release checksum before installing.

**The VSIX alone does not apply the full skin.** It provides the theme, feature hub, and supported fade effect. Keyword color flow, workbench polish, and blur-and-rise typing require the separate optional application patch in this repository. See [the patch guide](docs/INSTALLATION.md#experimental-workbench-patch) before using it; it changes installed application resources, requires a private backup, and remains experimental.

If typing motion is enabled but nothing changes, check **Workbench: Reduce Motion**. `on` deliberately disables the effect. Change that preference only if you want motion; the extension never changes it automatically.

VSIX installations do not provide Marketplace auto-updates by default. Install a newer release asset manually when upgrading. See [Installation](docs/INSTALLATION.md) for checksums, removal, source builds, patch installation, and restoration.

## Build From Source

Node.js 22 or newer is needed only for source development and the optional patch tools. There are no runtime dependencies and no install hooks; TypeScript and type definitions are development dependencies only. The optional installer never downloads anything or elevates privileges automatically.

```sh
npm ci --ignore-scripts
npm run compile
node --test
node --check src/keyword-flow.js
node tools/audit-release.cjs
```

See the [Development Guide](docs/DEVELOPMENT.md) for technology choices and the rules every feature follows.

The installer does not read or write user settings, keybindings, interpreter paths, Conda environments, language toolchains, or font preferences. It modifies a workbench HTML entry and adds three owned appearance files beside it. This can trigger VS Code integrity warnings and may break after an update.

## Motion And Accessibility

### Typing motion (feature hub)

When enabled, a short insertion appears with a short effect, 140 ms by default. Only the newest insertion moves, and only vertically; horizontal text positions stay unchanged. Each edit settles the previous effect immediately. Multiline or long paste, Enter, indentation, undo, redo, ordinary ASCII replacements, and large multi-cursor edits do not animate. Change events do not identify the input source: short paste and some completion or input-method edits can also animate. With an input method, composition replacements usually stay still and a short committed non-ASCII word can animate.

- Without the patch: the character fades in through the supported decoration API.
- With the patch: the character blurs in and rises into place using keyframes from the patch stylesheet.

The extension learns about an edit slightly after the editor draws it, so the character can be visible for a frame or two before the effect starts. `workbench.reduceMotion: on` disables the effect. The API-only fade cannot detect OS motion preferences when that setting is `auto`; set it explicitly to `on` to disable motion. With the patch, OS reduced-motion and forced-color preferences also remove the rise keyframes.

### Keyword flow (patch)

Keyword color flow uses one shared CSS rule, updated at six ticks per second. It pauses during keyboard/wheel activity and when the window is hidden or unfocused. Reduced-motion and forced-color preferences disable the animated text treatment; selections fall back to static token colors.

Only tokens whose theme colors match the configured accent palette receive the effect. This is color-class matching, not semantic keyword recognition. Some function names may also animate. There is no claim of zero overhead or measured desktop CPU usage. See [Performance](docs/PERFORMANCE.md).

## Project Layout

- `themes/`: supported color-theme data, with no font or machine configuration.
- `extension/`: TypeScript sources for the feature hub and features, compiled to `out/`.
- `src/`: optional workbench patch assets.
- `tools/`: explicit installer, restore command, and release audit.
- `test/`: synthetic installer and privacy fixtures.
- `demo/`: fictional public preview with no external resources.
- `docs/`: development, installation, compatibility, performance, and release guidance.

## Privacy And Licensing

No personal settings, local backups, credentials, author identity, server addresses, or real workspace screenshots belong in this repository. The audit uses an explicit release-file allowlist, but it cannot prove the absence of all sensitive information. Review images and future Git history manually. See [Privacy](docs/PRIVACY.md) and the [Release Checklist](docs/RELEASE_CHECKLIST.md).

Project code is offered under the [MIT License](LICENSE), with separate notices in [Third-Party Notices](THIRD_PARTY_NOTICES.md). No React Bits component source is redistributed. White Flow is not affiliated with Microsoft, shadcn/ui, Magic UI, or React Bits.
