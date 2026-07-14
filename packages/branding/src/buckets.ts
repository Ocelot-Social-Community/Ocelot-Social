// The bucket taxonomy — a TOTAL partition of BrandingConfig into named, independently composable
// slices. This is what lets a brand reuse another brand's content per slice (e.g. the colour THEME
// of brand B with the IDENTITY of brand A). See docu/branding-buckets-konzept.md §4.
//
// Each bucket owns a set of dot-paths into BrandingConfig. Split domains are owned at the SUB-PATH
// level by different buckets (e.g. `assets.css`→theme, `assets.favicon`→logos, `assets.html`→legal;
// `links.pages`→legal vs `links.footerOrder`→navigation). bucketOfPath uses LONGEST-prefix matching,
// so a more-specific path could override a broader one if ever needed; today every leaf resolves to
// exactly one bucket. Exhaustiveness is verified against brandingDefaults in buckets.spec.
//
// Pure (no node deps) so both webapp and backend — and the admin composition UI — can import it.

import { brandingDefaults } from './defaults.js'
import { clone, isPlainObject } from './internal.js'

import type { BrandingConfig, DeepPartial } from './schema.js'

export type BucketName = 'theme' | 'identity' | 'logos' | 'legal' | 'navigation' | 'behavior'

/** One entry in an archive's manifest: a bucket instance and the archive file its fragment lives in.
 *  An archive is a LIBRARY of these — it may carry several of the SAME type (e.g. theme `dark` and
 *  `light`) and need not provide every type; a classic full-brand archive yields one per type named
 *  `default`. Composition picks one instance per slot; the effective config has exactly one per type. */
export interface ArchiveInstanceEntry {
  type: BucketName
  name: string
  /** Path of the instance's fragment file inside the archive, e.g. 'fragments/theme.default.json'. */
  file: string
}

/**
 * The archive manifest (`manifest.json`) — the library index. Lists every bucket instance the archive
 * provides (an archive may carry several of the same type and need not provide every type). id +
 * version identify the archive (injected by the build); discovery reads this instead of a merged
 * config.
 */
export interface ArchiveManifest {
  id: string
  version: string | null
  /** Human label (metadata.applicationName of the default identity instance), for the admin list. */
  label: string
  /**
   * Version of the `@ocelot-social/branding` package the archive was BUILT with — the schema / API
   * compatibility axis (see docu/branding-buckets-konzept.md §11), distinct from `version` (the
   * brand's own iteration). Injected by the build; null when unknown.
   */
  schemaVersion: string | null
  instances: ArchiveInstanceEntry[]
}

/** The file path an instance's fragment is stored at inside an archive. */
export function instanceFile(type: BucketName, name: string): string {
  return `fragments/${type}.${name}.json`
}

/** A parsed per-slot composition source: which archive id (+ optional version) + instance name. */
export interface BucketSource {
  id: string
  version: string | null
  name: string
}

/**
 * Parse a composition source string `<id>[@<version>][/<name>]` into its parts (name defaults to
 * `default`). The bucket TYPE is implied by the slot the source is written for, so it is not part of
 * the per-slot address. Returns null for an empty/invalid spec (→ that slot uses the framework
 * default). Examples: `acme` → {acme,null,default}; `acme@1.2.0/dark` → {acme,1.2.0,dark}.
 */
export function parseSource(spec: unknown): BucketSource | null {
  if (typeof spec !== 'string' || !spec) return null
  let rest = spec
  let name = 'default'
  const slash = rest.indexOf('/')
  if (slash !== -1) {
    name = rest.slice(slash + 1) || 'default'
    rest = rest.slice(0, slash)
  }
  let version: string | null = null
  const at = rest.indexOf('@')
  if (at !== -1) {
    version = rest.slice(at + 1) || null
    rest = rest.slice(0, at)
  }
  if (!rest) return null
  return { id: rest, version, name }
}

/** Inverse of parseSource — build the shortest source string for a source (admin composition UI). */
export function formatSource({
  id,
  version = null,
  name = 'default',
}: Partial<BucketSource>): string {
  if (!id) return ''
  return `${id}${version ? `@${version}` : ''}${name && name !== 'default' ? `/${name}` : ''}`
}

export const BUCKET_NAMES: BucketName[] = [
  'theme',
  'identity',
  'logos',
  'legal',
  'navigation',
  'behavior',
]

/** Which config paths each bucket owns. Longest matching path wins (see file header). */
export const BUCKET_PATHS: Record<BucketName, string[]> = {
  // The reusable LOOK: colours (incl. the browser-chrome/PWA theme_color, = the color-primary token),
  // fonts, brand stylesheet, layouts, donation-bar colour style. The headline unit a brand pulls.
  theme: ['theme', 'donation', 'login.layout', 'registration.layout', 'assets.css'],
  // WHO the instance is: names, organisation, jurisdiction, OG image, cookie name, version, the
  // brand's self-description. (locales is CROSS-CUTTING — see below — not owned by a bucket.)
  identity: ['metadata', 'about'],
  // The instance's marks.
  logos: ['logos', 'assets.favicon'],
  // Static / legal content: page HTML, T&C version, per-page link overrides (external URLs).
  legal: ['termsAndConditions', 'assets.html', 'links.pages'],
  // Menus and footer ordering / landing target.
  navigation: ['headerMenu', 'links.landingPage', 'links.footerOrder'],
  // Framework UX / validation rules (group limits, comment lengths, category counts, registration
  // code lengths, date formatting, badge cap).
  behavior: [
    'group',
    'comment',
    'dateTime',
    'badges',
    'category',
    'registration.nonceLength',
    'registration.inviteCodeLength',
  ],
}

// (path, bucket) pairs sorted SHALLOW → DEEP, so a more-specific path (e.g. assets.favicon→logos)
// overlays the less-specific one (assets.css→theme) when composing.
const OWNED_PATHS: { path: string; depth: number; bucket: BucketName }[] = BUCKET_NAMES.flatMap(
  (bucket) => BUCKET_PATHS[bucket].map((path) => ({ path, depth: path.split('.').length, bucket })),
).sort((a, b) => a.depth - b.depth)

/** `true` when `path` is `prefix` or a descendant of it (dot-path prefix match). */
function isPrefix(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}.`)
}

/** The bucket that owns `path` (the one whose owned path is the longest matching prefix), or null. */
export function bucketOfPath(path: string): BucketName | null {
  let best: { bucket: BucketName; depth: number } | null = null
  for (const owned of OWNED_PATHS) {
    if (isPrefix(owned.path, path) && (!best || owned.depth > best.depth)) {
      best = { bucket: owned.bucket, depth: owned.depth }
    }
  }
  return best ? best.bucket : null
}

// Deep-merge `patch` INTO `target` (nested plain objects merge; everything else replaces). Used for
// the cross-cutting `locales` layer, which accumulates from every source rather than being replaced.
// NOTE: deliberately IN-PLACE and clones incoming values (so the accumulator never aliases a source
// config). This differs from internal.ts's immutable `deepMerge` (fresh object, shares patch refs) —
// two contracts, not an accidental duplicate; `clone`/`isPlainObject` are shared from internal.ts.
function deepMergeInto(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  for (const key of Object.keys(patch)) {
    const patchValue = patch[key]
    const targetValue = target[key]
    if (isPlainObject(targetValue) && isPlainObject(patchValue)) {
      deepMergeInto(targetValue, patchValue)
    } else {
      target[key] = clone(patchValue)
    }
  }
  return target
}

function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, key) => {
    if (o != null && typeof o === 'object') return (o as Record<string, unknown>)[key]
    return undefined
  }, obj)
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.')
  let node = target
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (node[key] == null || typeof node[key] !== 'object') node[key] = {}
    node = node[key] as Record<string, unknown>
  }
  node[keys[keys.length - 1]] = value
}

/**
 * Compose one effective BrandingConfig by taking each bucket's owned paths from the config chosen as
 * that bucket's source. A bucket with no source (undefined) keeps the framework default for its paths
 * — so `composeConfig({ theme: brandB })` yields brand B's look on top of vanilla everything else.
 * The caller (the runtime resolver) decides the per-bucket source from the composition map; this
 * function is pure and works the same on server and client.
 *
 * `locales` is CROSS-CUTTING: every bucket instance carries the locale strings its source brand
 * ships (see splitConfig), and they are DEEP-MERGED across all provided sources — so composing e.g.
 * `navigation` from brand B pulls in B's menu strings even though its identity/locales come from A.
 */
export function composeConfig(
  bucketSources: Partial<Record<BucketName, DeepPartial<BrandingConfig>>>,
): BrandingConfig {
  const result = clone(brandingDefaults) as unknown as Record<string, unknown>
  for (const { path, bucket } of OWNED_PATHS) {
    const source = bucketSources[bucket]
    if (!source) continue // no source for this bucket → keep the framework default
    const value = getPath(source, path)
    if (value !== undefined) setPath(result, path, clone(value))
  }
  // Cross-cutting locales: merge (not replace) every source's strings on top of the defaults. The
  // defaults always carry a `locales` object, so this is present (cloned from brandingDefaults).
  const locales = result.locales as Record<string, unknown>
  for (const bucket of BUCKET_NAMES) {
    const sourceLocales = (bucketSources[bucket] as { locales?: unknown } | undefined)?.locales
    if (isPlainObject(sourceLocales)) deepMergeInto(locales, sourceLocales)
  }
  result.locales = locales
  return result as unknown as BrandingConfig
}

// Visit every leaf of a config tree (empty objects / arrays count as leaves).
function walkLeaves(
  obj: unknown,
  prefix: string,
  cb: (path: string, value: unknown) => void,
): void {
  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj) && Object.keys(obj).length) {
    for (const key of Object.keys(obj)) {
      walkLeaves((obj as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key, cb)
    }
  } else if (prefix) {
    cb(prefix, obj)
  }
}

/**
 * Slice ONE bucket's sparse fragment out of a (full or partial) config — keeping only the leaves this
 * bucket owns (by bucketOfPath, so split domains land in the right slice, e.g. assets.css→theme but
 * assets.favicon→logos). This is how the build turns a full brand into per-type bucket instances, and
 * the inverse of composeConfig: composing all extracted fragments reproduces the original.
 */
export function extractBucket(
  config: DeepPartial<BrandingConfig>,
  bucket: BucketName,
): DeepPartial<BrandingConfig> {
  const out: Record<string, unknown> = {}
  walkLeaves(config, '', (path, value) => {
    if (bucketOfPath(path) === bucket) setPath(out, path, clone(value))
  })
  return out
}

/**
 * Split a full config into one sparse fragment per bucket type (a full-brand → its 6 instances).
 * The brand's `locales` (cross-cutting) are attached to EVERY fragment, so whichever buckets a
 * composition pulls from this brand, its strings come along and are merged (composeConfig). Duplicate
 * copies collapse on merge; locale overrides are small.
 */
export function splitConfig(
  config: DeepPartial<BrandingConfig>,
): Record<BucketName, DeepPartial<BrandingConfig>> {
  const shared = isPlainObject(config.locales) ? { locales: clone(config.locales) } : {}
  return Object.fromEntries(
    BUCKET_NAMES.map((bucket) => [bucket, { ...extractBucket(config, bucket), ...shared }]),
  ) as Record<BucketName, DeepPartial<BrandingConfig>>
}
