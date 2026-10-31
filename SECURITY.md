# Security

The optional workbench patch modifies application resources and executes appearance code inside the editor renderer. Use only source you have reviewed. A normal color theme is the lower-risk option.

Do not put passwords, tokens, keys, installation paths, private state, full settings, or unreviewed traces in public issues. If private vulnerability reporting is enabled on the eventual repository, use that channel. Otherwise arrange a private reporting channel with the maintainer before sharing sensitive details. No personal contact address is included in this local candidate.

The project must not weaken Content Security Policy, suppress integrity checks, upload code, read credentials, or elevate automatically. Report any behavior that crosses these boundaries. There is no promise of compatibility with future internal workbench changes.

The release audit is a heuristic, not a security boundary. Independently review Git history and release assets. Rotate any credential that has actually been exposed.
