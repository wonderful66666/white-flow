# Release Checklist

Use this checklist before making a source repository public or publishing a release. Public source availability does not imply a stable desktop installer or a Marketplace release.

- [ ] Confirm the project name and the proposed MIT license for original project work.
- [ ] Keep Magic UI attribution and its license notice. Do not add React Bits source under this project's MIT license.
- [ ] Replace the neutral publisher placeholder only when a real extension publisher is chosen.
- [ ] Validate the portable installer on a disposable supported desktop installation, including visual loading and restoration. Fixture tests alone are insufficient.
- [ ] Keep compatibility limitations prominent if desktop validation remains incomplete.
- [ ] Run syntax checks, `node --test`, and `node tools/audit-release.cjs`.
- [ ] Inspect every allowlisted file and the fictional preview, including image metadata.
- [ ] Confirm no user settings, backups, private state, traces, reference downloads, keys, logs, or real-workspace images are present.
- [ ] Review the release allowlist before constructing an archive. Do not archive a whole live skin directory.
- [ ] Choose a public Git author name and no-reply address before creating the first commit.
- [ ] Audit any future Git history, staged diff, remotes, branches, tags, and release assets separately.
- [ ] Review workflow permissions and third-party action references before enabling CI.
- [ ] Create a remote repository or upload files only after the owner's explicit approval.
- [ ] Keep private restore data locally outside the published checkout.

## Suggested Initial Scope

Publish the supported light theme and source assets as an experimental appearance project. Do not describe the optional application patch as an officially supported extension, a guaranteed cross-platform installer, or an integration that runs original React components inside the editor.

## Suggested Repository Description

White VS Code theme with optional, reversible workbench polish and low-frequency multicolor keyword accents. Experimental appearance patch; no telemetry or font overrides.
