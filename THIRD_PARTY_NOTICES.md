# Third-Party Notices

## Magic UI

The subtle border and text-effect direction references [Magic UI](https://github.com/magicuidesign/magicui). Its MIT notice is preserved in [licenses/Magic-UI-MIT.txt](licenses/Magic-UI-MIT.txt). No React runtime or Magic UI package is bundled. The optional workbench behavior is implemented as a separate CSS/DOM adaptation.

Upstream license: <https://github.com/magicuidesign/magicui/blob/main/LICENSE.md>.

## React Bits

[React Bits](https://github.com/DavidHDev/react-bits) was a visual reference during exploration. Its upstream license includes the Commons Clause in addition to MIT terms. It is not interchangeable with this project's plain MIT license. No downloaded React Bits component, ported component source, or component collection is redistributed here.

Review the current [React Bits license](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) before adding any upstream material. Attribution alone does not remove its restrictions.

## Other Projects And Marks

VS Code is a Microsoft product. This repository does not redistribute an installed VS Code workbench, Microsoft binaries, icons, fonts, or user configuration. Synthetic test HTML and demo markup are project-owned fixtures, not copies of application program files.

shadcn/ui, Magic UI, React Bits, React, Monaco, and VS Code names identify references or compatibility targets only. There is no affiliation, sponsorship, or endorsement. No third-party font or icon library is bundled.

## CI Actions

The workflow references official GitHub Actions repositories at explicit release tags. Their source is not vendored into this project. Review those upstream actions and their licenses before enabling automation.

## Development Dependencies

TypeScript is a development-only compiler under Apache-2.0. The Node.js and VS Code type definitions and the transitive `undici-types` definitions use MIT licenses. Versions, registry URLs, and integrity hashes are recorded in `package-lock.json`. These packages are not runtime dependencies, and their source is not included in the public source allowlist or the extension package.
