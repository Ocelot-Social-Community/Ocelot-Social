# release-please configuration

One config/manifest pair **per released package**, not one shared pair for the monorepo:

| Package               | Config                  | Manifest                  | Workflow                                                  |
| --------------------- | ----------------------- | ------------------------- | --------------------------------------------------------- |
| `packages/ui`         | `ui-config.json`        | `ui-manifest.json`        | [`ui-release.yml`](../workflows/ui-release.yml)             |
| `packages/branding`   | `branding-config.json`  | `branding-manifest.json`  | [`branding-release.yml`](../workflows/branding-release.yml) |

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
   keys the action's outputs (`packages/<name>--release_created`).
2. Keep `component-no-space: true` together with the
   `chore(package/${component}): release ${version}` title pattern: `${component}` renders bare only
   with that flag, and release-please needs the placeholder in the pattern to parse its own pull
   request titles back.
3. Give the package its own release workflow whose `on: push: paths` lists `packages/<name>/**` plus
   only that package's two files here. Never list another package's files, and never share a config.
