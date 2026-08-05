// Brand the standalone maintenance page from a brand's typed config.
//
//   node scripts/build-maintenance-branding.ts <brand-dir> <maintenance-dir>
//
// The maintenance page is a SEPARATE static Nuxt app served (by nginx) when the main app is down — so
// it cannot use the runtime branding injection (the webapp that serves /branding/* is offline). It is
// therefore branded at BUILD time, from the brand's own archive: colours, web fonts, squared logo,
// metadata and the `maintenance` i18n strings, so a brand defines each of them ONCE and both the live
// app and the maintenance page follow.
//
// EVERYTHING IT WRITES IS GENERATED AND SELF-CONTAINED. It never edits a committed source: the
// maintenance app reads each artifact as an OPTIONAL overlay (absent → vanilla), and every path below
// is git-ignored, so `git status` after branding is empty and undoing it is a delete.
//
//   app/assets/css/brand.css          @font-face rules + the :root token overrides
//   app/constants/metadata.brand.json identity/OG overlay (+ LOGO, the served logo path)
//   app/locales/<code>.json           the `maintenance` strings this brand translates
//   public/brand/<path>               the brand's served files — logo, OG image, web fonts — each
//                                     keeping its path from the archive (minus the `assets/` prefix)
//
// Idempotent: the whole generated tree is removed before it is rewritten, so a rebuild for a different
// brand — or for one that has since dropped its fonts/colours — leaves nothing of the previous run.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

import { composeArchive } from '../dist/discover.js'
import { readTarGz } from '../dist/tar.js'
import { resolveThemeColor } from '../dist/theme.js'

import { buildBrandArchive } from './lib/build-brandings.ts'

const [brandArg, maintenanceArg] = process.argv.slice(2)
if (!brandArg || !maintenanceArg) {
  console.error('usage: build-maintenance-branding.ts <brand-dir> <maintenance-dir>')
  process.exit(1)
}
const brandDir = resolve(brandArg)
const maintenanceDir = resolve(maintenanceArg)

// The paths this script owns, read from the file that is their SINGLE source — maintenance's
// tools/brand.mjs deletes the same list for `npm run brand:reset`, and a path that reached only one of
// the two would survive the reset and contaminate the next brand. A JSON file rather than an export so
// the reset keeps working without this package's dist/ being built.
const { servedDir: SERVED_DIR, paths: GENERATED } = JSON.parse(
  readFileSync(new URL('./maintenance-generated-paths.json', import.meta.url), 'utf8'),
) as { servedDir: string; paths: string[] }

// Clear first: this is the ONLY cleanup step there is. Without it a brand that dropped a font (or a
// rebuild for a different brand) would leave the previous one behind, and the app would keep loading
// a locale overlay nobody generates any more.
for (const rel of GENERATED) rmSync(join(maintenanceDir, rel), { recursive: true, force: true })

const out = (rel: string): string => {
  const path = join(maintenanceDir, rel)
  mkdirSync(dirname(path), { recursive: true })
  return path
}

// Bundle the brand into its archive and read config + assets back FROM it — the same artifact the live
// app + serverMiddleware consume, so the maintenance page can't drift from them.
const { id, gz } = await buildBrandArchive(brandDir)
const archive = readTarGz(gz)
// Compose the effective config from the archive's instance fragments (no merged branding.json).
// buildBrandArchive always writes a manifest, so composeArchive is non-null here.
const config = composeArchive(archive)
if (!config) throw new Error(`could not compose config from archive for ${id}`)

/**
 * Copy an archive entry under `dir` and return the URL it is served from, KEEPING the entry's own
 * path. Reducing it to its basename would let two entries collide: `assets/logo.png` (the logo) and
 * `assets/og/logo.png` (the OG image) would land on one file, the second silently overwriting the
 * first — as would two font weights filed under `fonts/regular/` and `fonts/bold/`.
 *
 * The entry becomes a filesystem path here, so it must not escape `dir`. It cannot: an entry only
 * exists if `archive.get()` returned data for it, and the archive is built by collectFiles from the
 * brand directory, which names every entry relative to it (`assets/…`). A `../` path is therefore not
 * a key of that map — archiveEntry rejects it as "not in archive" before this is reached. (A symlink
 * inside assets/ can point anywhere, but its CONTENT is what travels; the entry name stays relative.)
 */
function serveEntry(entry: string, data: Buffer): string {
  // Only the `assets/` prefix goes: it says nothing the target directory does not already say. What
  // follows is kept verbatim, and that is what keeps two entries distinct. Stripping more — a leading
  // segment matching the directory, say — would put `assets/Inter.woff2` and `assets/fonts/Inter.woff2`
  // back on one file.
  const rel = entry.replace(/^assets\//, '')
  const target = resolve(maintenanceDir, 'public', SERVED_DIR, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, data)
  return `/${SERVED_DIR}/${rel}`
}

/** An archive entry for a `/branding/<id>/…` path, or null when the path is external/absent. */
function archiveEntry(namespaced: string): { entry: string; data: Buffer } | null {
  const prefix = `/branding/${id}/`
  if (!namespaced.startsWith(prefix)) return null
  const entry = namespaced.slice(prefix.length)
  const data = archive.get(entry)
  if (!data) {
    console.warn(`[maintenance] ! entry not in archive: ${entry}`)
    return null
  }
  return { entry, data }
}

// --- 1+2. Theme: unpack the brand's assets and @import its own stylesheets ------------------------
// The maintenance page is standalone — /branding/<id>/… does not exist while the webapp is down — so
// the brand's assets are unpacked here under public/<SERVED_DIR>/ with their directory structure
// intact. That is the whole trick: a stylesheet keeps its own base URL, so a relative url() inside it
// (@font-face, background images) resolves without anything rewriting it. An earlier version parsed
// @font-face out of the CSS and rewrote each src by hand; unpacking makes that unnecessary, and it
// also carries rules this page never knew about.
const servedSheets: string[] = []
for (const [entry, data] of archive) {
  if (!entry.startsWith('assets/')) continue
  const url = serveEntry(entry, data)
  if (config.assets.css.some((href) => href.endsWith(`/${entry}`) || href === entry)) {
    servedSheets.push(url)
  }
}

// @import rather than inlining: an inlined rule would resolve its url() against THIS file instead of
// against the stylesheet it came from. No :root block is generated any more — the brand's own sheet
// carries its tokens (and ships with `:root:root`, so it wins over the vanilla defaults here too).
const css = [
  `/* Generated by build-maintenance-branding.ts from the "${id}" brand — do not edit. */`,
  ...servedSheets.map((url) => `@import url("${url}");`),
]
  .filter(Boolean)
  .join('\n\n')
writeFileSync(out('app/assets/css/brand.css'), `${css}\n`)

console.log(`[maintenance] theme → app/assets/css/brand.css (${servedSheets.length} stylesheets)`)

// --- 3. Images: the squared logo and the OG image --------------------------------------------------
// Their served paths travel with the metadata rather than being fixed filenames: a brand's logo may be
// .svg or .png, and app.vue falls back to the vanilla one when there is no overlay. Both come out of
// the archive as `/branding/<id>/…`, which resolves in the live webapp but NOT here — copying them and
// rewriting the path is what makes them show up at all.
function serveImage(namespaced: string, label: string): string | null {
  const found = archiveEntry(namespaced)
  if (!found) return null
  const url = serveEntry(found.entry, found.data)

  console.log(`[maintenance] ${label} → public${url}`)
  return url
}

const logoUrl = serveImage(config.logos.signupPath, 'logo')
const ogImageUrl = serveImage(config.metadata.ogImage, 'og image')
// The composed ogImage is a `/branding/<id>/…` path — served by the live webapp, never by this static
// site — so it has to become the copy just made. Falling back to the logo covers the usual case, where
// a brand sets no separate OG image and the build derived it from the squared logo. null means the
// brand referenced an image it does not ship: see the omission below.
const ogImage =
  ogImageUrl ??
  (config.metadata.ogImage.startsWith(`/branding/${id}/`) ? logoUrl : config.metadata.ogImage)

// --- 4. Metadata: identity + OG for the <head>, as an overlay the app deep-merges ------------------
// `config` is fully merged, so every field is present (the ocelot vanilla defaults when the brand
// didn't override them) — no per-field fallbacks needed.
const m = config.metadata
writeFileSync(
  out('app/constants/metadata.brand.json'),
  `${JSON.stringify(
    {
      APPLICATION_NAME: m.applicationName,
      APPLICATION_SHORT_NAME: m.applicationShortName,
      APPLICATION_DESCRIPTION: m.applicationDescription,
      ORGANIZATION_NAME: m.organizationName,
      ORGANIZATION_JURISDICTION: m.organizationJurisdiction,
      // Browser-chrome colour = the brand's primary colour (no separate metadata.themeColor field).
      THEME_COLOR: resolveThemeColor(config.theme),
      // An overlay key that is present WINS, so a value the brand cannot back with a file must be
      // omitted rather than written as null — null would blank out the vanilla one. The OG fields go
      // in as a SET for the same reason: keeping the brand's dimensions while the image fell back to
      // vanilla would describe the wrong picture, which is worse than describing none.
      ...(ogImage
        ? {
            OG_IMAGE: ogImage,
            OG_IMAGE_ALT: m.ogImageAlt,
            OG_IMAGE_WIDTH: m.ogImageWidth,
            OG_IMAGE_HEIGHT: m.ogImageHeight,
            OG_IMAGE_TYPE: m.ogImageType,
          }
        : {}),
      ...(logoUrl ? { LOGO: logoUrl } : {}),
    },
    null,
    2,
  )}\n`,
)

console.log(`[maintenance] metadata → app/constants/metadata.brand.json`)

// --- 5. i18n: the brand's own wording for the maintenance page -------------------------------------
// The page already interpolates {APPLICATION_NAME}, so the TITLE follows a brand for free; this is
// about the wording itself ("we'll be right back" instead of "scheduled maintenance"). A brand writes
// those under the same keys it uses for the live app (`config.locales.<code>.maintenance.*`, inline or
// as locales/<code>.json), so there is one place to translate a network's voice.
//
// Deliberately limited to the namespaces the maintenance page RENDERS: a brand's locale tree is the
// WEBAPP's, with hundreds of keys this page has no use for, and carrying it over would ship all of
// them in the static output.
const RENDERED_NAMESPACES = ['maintenance', 'localeSwitch']
const vanillaLocales = join(maintenanceDir, 'locales')
// The schema types `locales` as a TOTAL record, but a brand only carries the codes it translates.
const brandLocales = config.locales as Record<string, Record<string, unknown> | undefined>
let overlaid = 0
if (existsSync(vanillaLocales)) {
  for (const file of readdirSync(vanillaLocales).filter((f) => f.endsWith('.json'))) {
    const strings = brandLocales[basename(file, '.json')]
    if (!strings) continue
    const overlay: Record<string, unknown> = {}
    for (const ns of RENDERED_NAMESPACES) {
      if (strings[ns] !== undefined) overlay[ns] = strings[ns]
    }
    if (!Object.keys(overlay).length) continue
    writeFileSync(out(`app/locales/${file}`), `${JSON.stringify(overlay, null, 2)}\n`)
    overlaid++
  }
}
if (overlaid) console.log(`[maintenance] i18n → app/locales (${overlaid} locale(s))`)
