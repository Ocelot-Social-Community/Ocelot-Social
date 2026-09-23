# release-please configuration

One config/manifest pair **per released thing**, not one shared pair for the monorepo:

| Released thing        | Config                  | Manifest                  | Workflow                                                    |
| --------------------- | ----------------------- | ------------------------- | ----------------------------------------------------------- |
| the application (`.`) | `root-config.json`      | `root-manifest.json`      | [`publish.yml`](../workflows/publish.yml)                     |
| `packages/ui`         | `ui-config.json`        | `ui-manifest.json`        | [`ui-release.yml`](../workflows/ui-release.yml)               |
| `packages/branding`   | `branding-config.json`  | `branding-manifest.json`  | [`branding-release.yml`](../workflows/branding-release.yml)   |

## `changelog-sections`: the same list in all three configs

Every config carries the identical twelve-entry `changelog-sections` array, each one explicitly
`hidden: false`. release-please's defaults hide `refactor`, `build`, `chore`, `ci`, `test` and
`style`, and hiding those is not an option here: the hand-run `auto-changelog` listed every merged
pull request, dependency bumps and refactors included, and that is what these notes are read for.
The defaults would drop about 60 % of the application's entries — and far more of a package's.
`ui-v0.0.4` published 5 of the 42 commits that went into it; 34 of the 37 missing ones were its own
dependency bumps.

Sections are matched by commit **type** only — release-please has no scope-based grouping, so
`build(deps)` and `build(deps-dev)` bundle together under "Build System & Dependencies" rather than
forming a "Dependencies" section of their own.

There is no include mechanism for these config files: release-please reads each one whole from the
repository, so the list is duplicated by necessity. **When you change one, change all three.**

## The application is different from the packages

Two things the root config does that a package config must not copy:

- **`include-v-in-tag: false`.** The application's tags are `3.18.4`, not `v3.18.4`, and the branded
  downstream repositories resolve container images by exactly that string. The packages tag
  `ui-v0.0.4` and keep `true`.
- **`pull-request-title-pattern: "chore(release): v${version}"`.** `release` is one of the scopes
  [`test.lint_pr.yml`](../workflows/test.lint_pr.yml) allows; release-please's own default
  (`chore(master): release …`) would be rejected by that check. No `${component}` here, because the
  root has none — see "Adding a package" for why the packages need theirs.

The root config deliberately does **not** set `exclude-paths`: a `feat(package/ui)` is shipped by the
application, so it bumps the application's version and appears in its changelog, exactly as it did
before the migration. The packages are the other way round — release-please only ever sees the
commits that touched files under their own path, which is why turning `build` on for `packages/ui`
lists ui's dependency bumps and not the backend's.

Because the version is derived from the commits, the version tag and the GitHub release are created
when the release pull request is merged — not by [`publish.yml`](../workflows/publish.yml) after the
fact. That is why `release_created` is now the one answer to "is this commit a release?"; the old
"the version tag does not exist yet" heuristic only worked while that workflow created the tag
itself.

## Why they are split

`release-please-action` releases **every package its config file lists**, regardless of which
workflow started it. With one shared config, both release workflows did the full monorepo — and both
were triggered by the same commits, because merging any release pull request touches the shared
manifest that both workflows watched.

That race lost the `@ocelot-social/ui@0.0.2` npm publish. Two runs went for the same tag: one created
`ui-v0.0.2`, the other reported `Duplicate release tag` and then failed removing an
`autorelease: pending` label the winner had already removed. `release_created` is true only in the
run that actually creates the release — that was the *branding* workflow, which reads
`packages/branding--release_created` and therefore saw `false` — so nothing published, and re-running
could not help: release-please does not create an existing release a second time.

Split per package, each workflow's release-please knows exactly one package, so neither the trigger
overlap nor the shared tag/label state exists any more.

## Adding a package

1. Add `<name>-config.json` and `<name>-manifest.json` here, modelled on the existing pair. Package
   paths inside the config stay **repository-root relative** (`packages/<name>`) — that is also what
   keys the action's outputs (`packages/<name>--release_created`). The root path `.` is the one
   exception: its outputs come back unprefixed (`release_created`), which is why `publish.yml` reads
   them without a prefix.
2. Keep `component-no-space: true` together with the
   `chore(package/${component}): release ${version}` title pattern: `${component}` renders bare only
   with that flag (without it the title becomes `chore(package/ ui): release 0.0.5`), and
   release-please needs the placeholder in the pattern to parse its own pull request titles back.
   It belongs **inside the package's block**, next to `component`. release-please reads it from the
   top level too and inherits it into every package, but the config schema declares it per-package
   only — a top-level one is honoured at runtime and flagged by any editor or tool validating
   against `$schema`.
3. Copy the `changelog-sections` array verbatim from an existing config — see the section above for
   why it is duplicated rather than shared, and why leaving it out is not the neutral choice it
   looks like.
4. Give the package its own release workflow whose `on: push: paths` lists `packages/<name>/**` plus
   only that package's two files here. Never list another package's files, and never share a config.
