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

The archive is a **library of bucket instances** (`manifest.json` + sparse `fragments/<type>.<name>.json` + `assets/` + `html/`), not a merged config — consumers compose the effective config at load time. See [`docu/branding-buckets-konzept.md`](../../docu/branding-buckets-konzept.md).

**i18n overrides** can be authored inline (`locales: { de: { … } }` in the config) or, more conveniently, as conventional JSON files in the brand dir: `locales/<code>.json` (whole locale) and/or `locales/<code>/<feature>.json` (modular — a locale split into per‑feature namespace files so a feature owns its slice). The build deep‑merges them all into `locales` (file wins per leaf). Either way the runtime is identical — the modular split is authoring‑only, not runtime tree‑shaking.

## Consuming the resolved config (backend / webapp)

`branding` is a **named** export that resolves at *access* time — read a value inside a function/component and it reflects the runtime‑injected brand (or the framework defaults when none is injected):

```ts
import { branding, getBranding, setBranding } from '@ocelot-social/branding'

branding.group.nameLengthMax          // resolves now, honours a runtime-injected brand
setBranding(config)                   // a bootstrap injects a brand before the app reads values
setBranding(undefined)                // reset to the framework defaults
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

| Script                | What it does                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| `npm run build`       | Compile `src/` → CommonJS `dist/` (+ `.d.ts`, + the CJS marker)           |
| `npm run lint`        | ESLint (shared `eslint-config-it4c`), zero warnings                        |
| `npm run typecheck`   | `tsc --noEmit` over `src/` + `scripts/`                                    |
| `npm run test`        | `node --test` (TypeScript via native type‑stripping)                      |
| `npm run test:coverage` | tests with a coverage gate (lines/functions ≥ 95, branches ≥ 82)        |
| `npm run validate`    | `publint` + `are-the-types-wrong` (published‑package correctness)         |
| `npm run schema:snapshot` | Regenerate the schema‑shape lock after an intentional schema change   |
| `npm run check`       | build → lint → typecheck → test:coverage → validate                       |

## Changing the schema

The schema **shape** (the set of config leaf paths + their types + the bucket partition) is locked by a
committed snapshot (`test/schema-shape.snapshot.json`). Any add/remove/rename/retype of a field, or a
bucket reassignment, fails the `SCHEMA SHAPE LOCK` test — a shape change cannot ship unnoticed. When the
change is intentional:

1. Commit it as `feat(branding):` / `fix(branding):` so release-please bumps `SCHEMA_VERSION` (the
   archive‑compatibility axis surfaced via `checkSchemaCompat`). `SCHEMA_VERSION` (`src/version.ts`) is
   bumped in lock‑step with `package.json` by release-please (`extra-files`).
2. Run `npm run schema:snapshot` and commit the updated snapshot (its diff shows exactly which paths
   changed — useful for review).

A default *value* change (e.g. `group.nameLengthMax` 50 → 60) is **not** a shape change and does not
trip the lock: old and new archives stay structurally compatible.

## License

MIT
