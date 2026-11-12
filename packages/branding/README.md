# @ocelot-social/branding

The shared **branding schema, framework defaults and runtime resolver** for [ocelot.social](https://ocelot.social) — the single source consumed by both the backend and the webapp so brand‑tunable constants (group limits, registration lengths, metadata, logo paths, menu, theme, …) cannot drift between the two.

Authored in TypeScript, built to a CommonJS `dist/` with type declarations. The package is `type: module`; the compiled `dist/` carries a `{"type":"commonjs"}` marker so `require()` keeps working (verified in CI with `publint` + `are-the-types-wrong`).

## Install

```bash
npm install @ocelot-social/branding
```

## Authoring a brand (config repos)

A brand declares only the values it overrides; everything else falls back to the framework default. Type‑checked against the schema:

```ts
// brand.config.ts
import { defineBranding } from '@ocelot-social/branding'

export default defineBranding({
  metadata: { applicationName: 'Acme' },
  theme: { cssVars: { 'color-primary': 'rgb(0, 120, 255)' } },
  group: { nameLengthMax: 40 },
})
```

`defineBranding` is the gate: a wrong **shape** is a TypeScript compile error, and a well‑typed but nonsensical **value** (e.g. `group.nameLengthMin > nameLengthMax`, a zero‑length nonce, an empty `applicationName`) throws at build time via `validateBranding` — so a brand can't ship a broken config.

Build it into a distributable archive with the bundled CLI (needs **Node ≥ 23** — it runs the TypeScript sources via native type‑stripping):

```bash
npx ocelot-brand-archive .        # → dist/<id>.tar.gz (+ versioned) + a DEFAULT marker with --default
```

The archive is a **library of bucket instances** (`manifest.json` + sparse `fragments/<type>.<name>.json` + `assets/` + `html/`), not a merged config — consumers compose the effective config at load time. The six bucket types are described in [Buckets](#buckets); how to read the resolved config in [Consuming the resolved config](#consuming-the-resolved-config-backend--webapp), the version check in [Schema compatibility](#schema-compatibility).

**i18n overrides** can be authored inline (`locales: { de: { … } }` in the config) or, more conveniently, as conventional JSON files in the brand dir: `locales/<code>.json` (whole locale) and/or `locales/<code>/<feature>.json` (modular — a locale split into per‑feature namespace files so a feature owns its slice). The build deep‑merges them all into `locales` (file wins per leaf). Either way the runtime is identical — the modular split is authoring‑only, not runtime tree‑shaking.

## Buckets

The branding config is split into six **buckets**. Every leaf of the config except `locales` belongs to exactly one of them, so a brand can take one slice from another brand and the rest from itself — for example the colours of brand B with the identity of brand A.

| Bucket       | Owns                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `theme`      | The look: `theme` (colours, fonts), `donation`, `map`, the login and registration layouts, `assets.css`                         |
| `identity`   | Who the instance is: `metadata` (names, organisation, jurisdiction), `about`                                                    |
| `logos`      | The marks: `logos`, `assets.favicon`, `assets.icon`, `assets.iconSizes` (the sizes stay with their icon)                        |
| `legal`      | Static and legal content: `termsAndConditions`, `assets.html`, `links.pages`                                                    |
| `navigation` | `headerMenu`, `links.landingPage`, `links.footerOrder`                                                                          |
| `behavior`   | Framework rules and limits: `group`, `user`, `post`, `comment`, `dateTime`, `badges`, `category`, the registration code lengths |

Some domains are split by sub-path (`assets.css` belongs to `theme`, `assets.favicon` to `logos`, `assets.html` to `legal`); the longest matching path wins. `locales` belongs to no bucket: it rides along with every bucket instance of a brand and accumulates from every source. A brand that changes only `locales` provides no instance, so its `locales` are not composed.

An archive holds **instances** of these buckets, one sparse file per instance (`fragments/<type>.<name>.json`), listed in `manifest.json`. It may hold several instances of one type (a `dark` and a `light` theme) and need not provide every type. A bucket is only written if the brand actually changes it; everything else is inherited from the framework defaults at load time. A classic full brand yields one instance per type, named `default`.

Which instance fills which slot is chosen per type with a source string `<id>[@<version>][/<name>]`, for example `acme` (its `default` instance) or `acme@1.2.0/dark`. An empty source means the framework default.

Archives may become uploadable, so unpacking is capped at 128 MiB (`MAX_ARCHIVE_BYTES`); a larger archive throws instead of exhausting memory. Brand ids must match `BRAND_ID_PATTERN` before they are used as a lookup, so a `../` can never reach the file system.

## Consuming the resolved config (backend / webapp)

`branding` is a **named** export that resolves at _access_ time — read a value inside a function/component and it reflects the runtime‑injected brand (or the framework defaults when none is injected):

```ts
import { branding, getBranding, setBranding } from '@ocelot-social/branding'

branding.group.nameLengthMax // resolves now, honours a runtime-injected brand
setBranding(config) // a bootstrap injects a brand before the app reads values
setBranding(undefined) // reset to the framework defaults
```

Server‑only helpers (they use `node:fs`/`node:zlib`, so import them under a `process.server` guard, **not** from the index — keeps them out of the client bundle):

```ts
import { discoverArchives, composeComposition } from '@ocelot-social/branding/dist/discover.js'
```

### Schema compatibility

Every archive records the `@ocelot-social/branding` version it was built with (`manifest.schemaVersion`). Compare it against the running package to catch drift:

```ts
import { checkSchemaCompat, describeSchemaCompat } from '@ocelot-social/branding'

const verdict = checkSchemaCompat(archive.schemaVersion) // 'ok' | 'archive-newer' | 'archive-older' | 'unknown'
if (verdict !== 'ok') console.warn(describeSchemaCompat(verdict, archive.schemaVersion))
```

The breaking axis is the **major** version once ≥ 1.0.0, and the **minor** while 0.x (SemVer caret).

## Scripts

| Script                    | What it does                                                        |
| ------------------------- | ------------------------------------------------------------------- |
| `npm run build`           | Compile `src/` → CommonJS `dist/` (+ `.d.ts`, + the CJS marker)     |
| `npm run lint`            | ESLint (shared `eslint-config-it4c`), zero warnings                 |
| `npm run typecheck`       | `tsc --noEmit` over `src/` + `scripts/`                             |
| `npm run test`            | `node --test` (TypeScript via native type‑stripping)                |
| `npm run test:coverage`   | tests with a coverage gate (lines/functions 100, branches ≥ 90)     |
| `npm run validate`        | `publint` + `are-the-types-wrong` (published‑package correctness)   |
| `npm run schema:snapshot` | Regenerate the schema‑shape lock after an intentional schema change |
| `npm run check`           | build → lint → typecheck → test:coverage → validate                 |

## Changing the framework tokens

Every custom property the framework declares (`webapp/assets/css/root-tokens.css`,
`ocelot-ui-variables.css`) is something a brand may set — the admin lists them. Taking one away turns
every brand's value for it into a silent no-op, so it is a decision, never a side effect of a refactor.

- **Adding** a token needs no step of its own: `npm run tokens:snapshot` adds it to
  `scripts/public-tokens.snapshot.json`, the list of names that have been public.
- **Renaming or removing** one breaks the brands that set it, so it is a deliberate step. The
  `public token lock` test only sees a declaration disappear. The steps: remove the old name from the
  stylesheets, run `npm run tokens:snapshot` (it regenerates `src/frameworkTokens.generated.ts`, which
  the test reads — commit it), then delete the name from `scripts/public-tokens.snapshot.json` (the
  command only ever adds). Until the name is deleted there the test fails, which makes the break
  visible in the diff. A rename or a removal is a breaking change: give the squash commit a
  `BREAKING CHANGE:` footer, so the version moves on its breaking axis. In the release notes name the
  old token and, if there is one, the new one.
- **An alias does not count as a rename.** With `--old: var(--new)` left in the stylesheet `--old` is
  still declared, so the test stays green, yet a value a brand sets for `--old` reaches nobody. To
  break on purpose, remove the old name from the stylesheets and from the snapshot.

## Changing the schema

The schema **shape** (the set of config leaf paths + their types + the bucket partition) is locked by a
committed snapshot (`test/schema-shape.snapshot.json`). Any add/remove/rename/retype of a field, or a
bucket reassignment, fails the `SCHEMA SHAPE LOCK` test — a shape change cannot ship unnoticed. When the
change is intentional:

1. Title the PR `feat(package/branding):` / `fix(package/branding):` so release-please bumps
   `SCHEMA_VERSION` (the archive‑compatibility axis surfaced via `checkSchemaCompat`). `SCHEMA_VERSION`
   (`src/version.ts`) is bumped in lock‑step with `package.json` by release-please (`extra-files`) — in
   its own release PR, _after_ yours is merged. Step 1 is therefore **not** enforced by the lock test:
   at the time it runs the version is unchanged by construction, and the test cannot see the diff that
   would tell it a shape change is in flight. Only step 2 is mechanically checked.
2. Run `npm run schema:snapshot` and commit the updated snapshot (its diff shows exactly which paths
   changed — useful for review).

A default _value_ change (e.g. `group.nameLengthMax` 50 → 60) is **not** a shape change and does not
trip the lock: old and new archives stay structurally compatible.

## License

MIT
