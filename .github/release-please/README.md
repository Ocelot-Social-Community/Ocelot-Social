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
repository, so the list is duplicated by necessity. **When you change one, change all three** —
[`lint.mjs`](./lint.mjs) fails the build if they drift apart.

## The lint

[`lint.mjs`](./lint.mjs), run by [`release-please-lint.yml`](../workflows/release-please-lint.yml) on
any change under this directory, under `.github/workflows/`, or to a file one of the configs bumps,
checks the invariants that otherwise break silently — none of them turns a release workflow red on
its own:

| Check | What it catches |
| ----- | --------------- |
| Every config validates against release-please's own JSON schema | Options that moved between versions, or sit at the wrong level. `component-no-space` is valid per package and rejected at the top level, and the runtime accepts both — so no amount of release testing reveals it. |
| `<name>-config.json` ↔ `<name>-manifest.json` exist in pairs, and their package paths match | A manifest key the config does not release is a version nobody bumps; a config path the manifest does not list makes release-please treat the package as unreleased and start its changelog from the repository's first commit. |
| Every config has `changelog-sections`, and all of them are identical | The drift described above. A config without the list silently falls back to the defaults. |
| Every config is the `config-file` of exactly **one** workflow, paired with its own `manifest-file` | Two is the `@ocelot-social/ui@0.0.2` race below. Zero is quieter: the package simply stops releasing. Read out of the parsed workflow, not searched for in its text — the file names also occur in comments and in `publish.yml`'s version-guard error message, and a substring match would count those as releases. |
| A workflow that filters by path is triggered by its own config and manifest, and by no other package's | Losing the path means a config change no longer starts a run. Listing a foreign one is the cross-trigger shape the `ui@0.0.2` race actually had. Decided by matching the patterns ([`path-filter.mjs`](./path-filter.mjs)), not by looking for the literal path: `.github/release-please/**` is a cross-trigger too, and a string comparison does not see it. |
| The filter rule gating the lint job matches every file the lint reads | The checks above only help if they run when one of those files changes, and the rule is a hand-written copy of what the configs bump — this is the only thing keeping it honest. The chain from the job's `if:` to the rule is resolved, not assumed ([`workflow-gate.mjs`](./workflow-gate.mjs)), so rewiring the gate fails loudly instead of leaving the check pointing at a list nobody uses. Matched with the same `picomatch` version `dorny/paths-filter` bundles — any other matcher would answer a slightly different question than the action does. |
| Every file a config bumps carries the version its manifest records | The lockstep bump silently stopping — see below. Covers the `extra-files` *and* what the `node` release-type bumps on its own: `package.json` plus both version fields of `package-lock.json`. The latter are easy to miss precisely because no config mentions them. This check also fires on the release pull request itself, since that pull request edits `<name>-manifest.json`: a file the bump missed still shows the old version while the manifest already shows the new one. |
| No `extra-files` entry is a bare string ending in `.json`/`.yaml`/`.toml`/`.xml` | The trap below. |

### The `extra-files` trap

`extra-files` accepts strings and objects, and release-please picks a **different updater** per form
and per file extension. A bare string ending in `.yaml` does not get the marker-based updater — it
gets `CompositeUpdater(GenericYaml('$.version'), Generic)`, which reparses and reserialises the
YAML. That strips every comment in the file, including the `# x-release-please-version` markers the
second half of the composite would have needed, and it only ever addresses `$.version` — so
`appVersion` is left on the previous release. Nothing fails; the chart is just wrong, and the
branded deployments then resolve an `appVersion` that no longer matches the release.

Hence `{ "type": "generic", "path": "…/Chart.yaml" }` for the Helm charts: `generic` is the only
form that uses the `Generic` updater alone, which does line-level replacement and honours the
markers on both `version` and `appVersion`. Bare strings stay fine for extensions release-please has
no parser for — `packages/branding`'s `src/version.ts` is one.

The lockstep set is what the configs list, nothing is discovered: `styleguide/package.json` carries
its own unrelated version and is deliberately absent. A **newly added** chart or application
directory is therefore not noticed by the lint — add it to `extra-files` when you add it.

The lint pins its own `release-please` version rather than reading the one the action bundles. A
bump there may legitimately turn it red — that is the point, and the pull request that bumps it is a
better place to find out than a release run.

### Why the workflow has no `paths:` filter

Its lint job is a **required status check**, and that changes what a path filter does. Actions never
starts a run it filters away, so no check run is reported for it — and branch protection cannot tell
"never reported" from "still running". The check sits at *Expected — waiting for status to be
reported* and the pull request can never be merged. Since the common pull request touches none of
the bump targets, the workflow-level filter this lint shipped with blocked essentially every open
pull request until it was moved.

A job skipped by an `if:` inside a workflow that **did** run reports success, which is the behaviour
a required check needs. So the workflow triggers on every pull request and the `lint` job is gated
by `dorny/paths-filter`, exactly as `branding-lint.yml` and `maintenance-lint.yml` are. The path
list moved to the `release-please` rule in [`.github/file-filters.yml`](../file-filters.yml), which
— being plain YAML with anchor support, unlike the Actions workflow parser — also ends the previous
version's duplication of the same list for `push` and for `pull_request`.

One caveat comes with the pattern: if the `files-changed` job itself fails, `lint` is skipped and
therefore still reports success. Make `Detect File Changes` required alongside the lint if that
matters.

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
fact. Two settings follow from that:

- **`draft: true`.** The release is not public until `publish.yml` has moved the container image
  tags onto the release commit's images and appended them to the notes. The branded downstream
  repositories resolve their base images by exactly those tags, so a release announced before they
  exist is a release nobody can deploy.
- **`force-tag-creation: true`.** A draft release carries a tag *name* but no git ref — GitHub only
  creates the tag when the draft is published. This flag makes release-please create
  `refs/tags/<version>` outright, before the release, so the tag is there from the merge on.

`publish.yml` does **not** gate on the action's `release_created` output, even though that is the
obvious thing to read. It is true exactly once, because release-please refuses to create an existing
release a second time — the same property that lost `@ocelot-social/ui@0.0.2` below. A re-run after
a failed image retag would report `false` and skip the retag entirely, leaving the version tags
unapplied with no way to recover but by hand. The workflow asks the repository instead: does the
`<version>` tag point at this commit? That is true on the release commit and on every re-run of it,
and false on every later one.

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
5. End that workflow with a `release_notes` job, modelled on the one in `ui-release.yml`: it appends
   the install instructions to the release release-please created, because release-please knows the
   changelog but not where the artefact was published. Keep its `always() && needs.publish.result ==
   'success'` gate — a failed GitHub Packages mirror must not withhold the notes for a successful
   npm publish, and the mirror line is written only when that job actually succeeded.
