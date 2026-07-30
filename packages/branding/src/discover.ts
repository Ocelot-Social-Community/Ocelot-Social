// Discover brand archives under a served directory — the ONE place that defines the archive layout,
// used by every server-side consumer (webapp serverMiddleware, branding plugin, brandingHtml, backend
// bootstrap). ANY `*.tar.gz` found RECURSIVELY under the base dir is treated as a brand archive, so it
// does not matter whether brands publish to `<base>/<brand>/dist/<id>.tar.gz`, `<base>/<id>.tar.gz`,
// `<base>/<brand>/build/<id>.tar.gz`, … — all are found and loaded. Each archive carries its brand id
// + version INSIDE manifest.json (injected at build); duplicates of the same id (a versioned file and
// its latest copy, or several versions) dedupe to the HIGHEST version.
//
// Server-only: uses node:fs — do NOT import from the package index (keeps it out of the webapp client
// bundle; consumers require it under a `process.server` guard).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { BUCKET_NAMES, composeConfig, parseSource } from './buckets.js'
import { readTarGz } from './tar.js'

import type { ArchiveManifest, BucketName } from './buckets.js'
import type { BrandingConfig, DeepPartial } from './schema.js'

// Re-exported so a server-only consumer that already imports this subpath (webapp plugin) gets the
// schema-compat check without a second import. compat is pure (no node deps).
export { checkSchemaCompat, describeSchemaCompat } from './compat.js'
// Same reason: every consumer of this subpath serves archives BY ID and must validate the id first
// (see BRAND_ID_PATTERN) — re-exported so none of them has to keep its own copy of the guard.
export { BRAND_ID_PATTERN, isValidBrandId } from './buckets.js'

/** A composition map: each bucket slot → a source string (`id[@version][/name]`); `_default` is the
 *  base for unspecified slots (typically the `activeBranding` id). An empty/absent slot → framework
 *  default. */
export type CompositionMap = Partial<Record<BucketName | '_default', string>>

export interface BrandArchive {
  id: string
  version: string | null
  /** The @ocelot-social/branding schema version the archive was built with — feed to checkSchemaCompat. */
  schemaVersion: string | null
  label: string
  file: string
}

interface ArchiveMeta {
  id: string
  version: string | null
  schemaVersion: string | null
  label: string
}

// path → decompressed meta, so an archive is read+decompressed at most once per change (by mtime).
const metaCache = new Map<string, { mtimeMs: number; value: ArchiveMeta }>()
// path → decompressed file map, for serving entries (same mtime-keyed reuse).
const fileCache = new Map<string, { mtimeMs: number; value: Map<string, Buffer> }>()

// mtime-keyed read-through cache: stat the file, return the cached value while unchanged, otherwise
// (re)compute + cache. Returns null when the file can't be statted, or when compute returns/throws
// null — neither is cached, so a later fix is picked up. The one place the stat→hit→read→cache→catch
// pattern lives, so readMeta and readArchive can't drift apart.
function statCached<T>(
  file: string,
  cache: Map<string, { mtimeMs: number; value: T }>,
  compute: () => T | null,
): T | null {
  let stat
  try {
    stat = statSync(file)
  } catch {
    return null
  }
  const cached = cache.get(file)
  if (cached?.mtimeMs === stat.mtimeMs) return cached.value
  try {
    const value = compute()
    if (value === null) return null
    cache.set(file, { mtimeMs: stat.mtimeMs, value })
    return value
  } catch {
    return null
  }
}

// Recursively collect `*.tar.gz` paths, skipping dotdirs (.git) and node_modules.
function walk(dir: string, out: string[]): void {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.tar.gz')) out.push(full)
  }
}

// Compare dotted numeric versions; null sorts lowest. Returns a-b sign.
function compareVersions(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (!a) return -1
  if (!b) return 1
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = parseInt(pa[i] ?? '0', 10) || 0
    const y = parseInt(pb[i] ?? '0', 10) || 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

// Read a single archive's id/version/label from its manifest.json (mtime-cached). Null if it isn't a
// readable brand archive (missing/garbled manifest.json, or no id — a stray .tar.gz).
function readMeta(file: string): ArchiveMeta | null {
  return statCached(file, metaCache, () => {
    const manifest = readManifest(readTarGz(readFileSync(file)))
    if (!manifest || typeof manifest.id !== 'string' || !manifest.id) return null
    return {
      id: manifest.id,
      version: typeof manifest.version === 'string' ? manifest.version : null,
      schemaVersion: typeof manifest.schemaVersion === 'string' ? manifest.schemaVersion : null,
      label: typeof manifest.label === 'string' ? manifest.label : manifest.id,
    }
  })
}

/** Parse an archive's manifest.json (the library index), or null when missing/garbled. */
export function readManifest(files: Map<string, Buffer>): ArchiveManifest | null {
  const entry = files.get('manifest.json')
  if (!entry) return null
  try {
    return JSON.parse(entry.toString('utf8')) as ArchiveManifest
  } catch {
    return null
  }
}

/**
 * Compose an archive's effective config from its instance fragments. `selection` maps a bucket type
 * to the instance NAME to use for that slot; a type without a selection uses its `default` instance.
 * A type the archive does not provide falls back to the framework default (composeConfig). Returns
 * null when the archive has no readable manifest. Manifest-level id/version are attached to the result
 * so consumers keep them (id is not a bucket-owned config leaf).
 */
export function composeArchive(
  files: Map<string, Buffer>,
  selection: Partial<Record<BucketName, string>> = {},
): (BrandingConfig & { id?: string }) | null {
  const manifest = readManifest(files)
  if (!manifest) return null
  const instances = Array.isArray(manifest.instances) ? manifest.instances : []
  const sources: Partial<Record<BucketName, DeepPartial<BrandingConfig>>> = {}
  for (const type of BUCKET_NAMES) {
    const name = selection[type] ?? 'default'
    const entry = instances.find((i) => i.type === type && i.name === name)
    const raw = entry && files.get(entry.file)
    if (!raw) continue
    try {
      sources[type] = JSON.parse(raw.toString('utf8')) as DeepPartial<BrandingConfig>
    } catch {
      // skip an unreadable fragment → that slot falls back to the framework default
    }
  }
  const composed = composeConfig(sources) as BrandingConfig & { id?: string }
  composed.id = manifest.id
  return composed
}

/** Read + compose one archive file's effective config in one call (mtime-cached read). */
export function readArchiveConfig(
  file: string,
  selection: Partial<Record<BucketName, string>> = {},
): (BrandingConfig & { id?: string }) | null {
  const files = readArchive(file)
  return files ? composeArchive(files, selection) : null
}

/**
 * Compose an effective config ACROSS archives from a composition map — each of the six bucket slots
 * is taken from the source (archive + instance) the map assigns it, with `_default` filling the rest.
 * This is what lets a network run e.g. the THEME of one brand with the IDENTITY of another. Slots with
 * no (or an unresolvable) source fall back to the framework default. `getFiles(id)` resolves a brand
 * id to its decompressed archive files (or null) — injected so this core is testable without fs.
 *
 * Unlike composeArchive (a single archive → one `id` attached), the result carries NO `id`: a
 * cross-brand mix has no single brand id. The webapp tracks the primary id separately as the map's
 * `_default` (see plugins/branding.js `brandingId`).
 */
export function composeFromArchives(
  getFiles: (id: string) => Map<string, Buffer> | null,
  map: CompositionMap,
): BrandingConfig {
  const sources: Partial<Record<BucketName, DeepPartial<BrandingConfig>>> = {}
  const filesById = new Map<string, Map<string, Buffer> | null>()
  for (const slot of BUCKET_NAMES) {
    const src = parseSource(map[slot] ?? map._default)
    if (!src) continue // vanilla / unset → framework default for this slot
    if (!filesById.has(src.id)) filesById.set(src.id, getFiles(src.id))
    const files = filesById.get(src.id)
    if (!files) continue
    const manifest = readManifest(files)
    const instances = Array.isArray(manifest?.instances) ? manifest.instances : []
    const entry = instances.find((i) => i.type === slot && i.name === src.name)
    const raw = entry && files.get(entry.file)
    if (!raw) continue
    try {
      sources[slot] = JSON.parse(raw.toString('utf8')) as DeepPartial<BrandingConfig>
    } catch {
      // unreadable fragment → that slot falls back to the framework default
    }
  }
  return composeConfig(sources)
}

/** Resolve a composition map against the archives discovered under `baseDir` (mtime-cached reads). */
export function composeComposition(baseDir: string, map: CompositionMap): BrandingConfig {
  const archives = discoverArchives(baseDir)
  return composeFromArchives((id) => {
    const archive = archives.get(id)
    return archive ? readArchive(archive.file) : null
  }, map)
}

/** All brand archives under `baseDir`, keyed by brand id (highest version per id wins). */
export function discoverArchives(baseDir: string): Map<string, BrandArchive> {
  const paths: string[] = []
  walk(baseDir, paths)
  const byId = new Map<string, BrandArchive>()
  for (const file of paths) {
    const meta = readMeta(file)
    if (!meta) continue
    const existing = byId.get(meta.id)
    if (!existing || compareVersions(meta.version, existing.version) > 0) {
      byId.set(meta.id, {
        id: meta.id,
        version: meta.version,
        schemaVersion: meta.schemaVersion,
        label: meta.label,
        file,
      })
    }
  }
  return byId
}

/** The decompressed entries of one archive file (mtime-cached), or null when unreadable. */
export function readArchive(file: string): Map<string, Buffer> | null {
  return statCached(file, fileCache, () => readTarGz(readFileSync(file)))
}

/** The image's baked default brand id (a `DEFAULT` marker file at the served root), or '' when none. */
export function readDefaultMarker(baseDir: string): string {
  try {
    return readFileSync(join(baseDir, 'DEFAULT'), 'utf8').trim()
  } catch {
    return ''
  }
}
