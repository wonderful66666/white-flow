# White Flow

A white VS Code theme with optional workbench polish and restrained, multicolor keyword accents. Existing editor font settings are left alone.

**Status: experimental source distribution, not a Marketplace release.** The color theme uses the supported theme API. The optional workbench patch uses unsupported internals and is experimental. Read the [compatibility notes](docs/COMPATIBILITY.md) before installing it.

![Synthetic White Flow preview](demo/preview.png)

The preview uses fictional files and sample code, not a screenshot of a personal workspace. Open `demo/index.html` locally to see the animation. It is a visual demonstration, not a working editor or proof of desktop compatibility.

## Two Independent Layers

| Layer | What it does | Installation |
| --- | --- | --- |
| Color theme | White editor, quiet neutral surfaces, purple keywords, green strings, blue functions | Standard VS Code theme extension |
| Optional patch | Rounded controls, subtle borders, short popup effects, low-frequency keyword color flow | Explicit local application-file modification |

The theme has no activation script. The patch does not install React, Motion, Magic UI, or React Bits into VS Code. It is a small CSS/DOM adaptation inspired by those visual styles, not an official integration.

## Start Safely

1. Read [Installation](docs/INSTALLATION.md), including the difference between a normal theme and an application patch.
2. Try the theme alone first. Select **White Flow Light** in an extension development host, or package the theme for local installation.
3. For optional effects, run the read-only plan, choose a private backup directory outside this project, and explicitly confirm installation.
4. Keep the private state directory for restoration. Never commit or upload it.

Node.js 22 or newer is needed for the local tools. There are no npm dependencies and no automatic install hooks. The optional installer never downloads anything or elevates privileges automatically.

```sh
node --test
node --check src/keyword-flow.js
node tools/audit-release.cjs
```

The installer does not read or write user settings, keybindings, interpreter paths, Conda environments, language toolchains, or font preferences. It modifies a workbench HTML entry and adds three owned appearance files beside it. This can trigger VS Code integrity warnings and may break after an update.

## Motion And Accessibility

Keyword color flow uses one shared CSS rule, updated at six ticks per second. It pauses during keyboard/wheel activity and when the window is hidden or unfocused. Reduced-motion and forced-color preferences disable the animated text treatment; selections fall back to static token colors.

Only tokens whose theme colors match the configured accent palette receive the effect. This is color-class matching, not semantic keyword recognition. Some function names may also animate. There is no claim of zero overhead or measured desktop CPU usage. See [Performance](docs/PERFORMANCE.md).

## Project Layout

- `themes/`: supported color-theme data, with no font or machine configuration.
- `src/`: optional appearance assets.
- `tools/`: explicit installer, restore command, and release audit.
- `test/`: synthetic installer and privacy fixtures.
- `demo/`: fictional public preview with no external resources.
- `docs/`: installation, compatibility, performance, and release guidance.

## Privacy And Licensing

No personal settings, local backups, credentials, author identity, server addresses, or real workspace screenshots belong in this repository. The audit uses an explicit release-file allowlist, but it cannot prove the absence of all sensitive information. Review images and future Git history manually. See [Privacy](docs/PRIVACY.md) and the [Release Checklist](docs/RELEASE_CHECKLIST.md).

Project code is offered under the [MIT License](LICENSE), with separate notices in [Third-Party Notices](THIRD_PARTY_NOTICES.md). No React Bits component source is redistributed. White Flow is not affiliated with Microsoft, shadcn/ui, Magic UI, or React Bits.
