// Discover brand archives under a served directory — the ONE place that defines the archive layout,
// used by every server-side consumer (webapp serverMiddleware, branding plugin, brandingHtml, backend
// bootstrap). ANY `*.tar.gz` found RECURSIVELY under the base dir is treated as a brand archive, so it
// does not matter whether brands publish to `<base>/<brand>/dist/<id>.tar.gz`, `<base>/<id>.tar.gz`,
// `<base>/<brand>/build/<id>.tar.gz`, … — all are found and loaded. Each archive carries its brand id
// + version INSIDE branding.json (injected at build); duplicates of the same id (a versioned file and
// its latest copy, or several versions) dedupe to the HIGHEST version.
//
// Server-only: uses node:fs — do NOT import from the package index (keeps it out of the webapp client
// bundle; consumers require it under a `process.server` guard).
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

import { readTarGz } from './tar'

export interface BrandArchive {
  id: string
  version: string | null
  label: string
  file: string
}

interface CachedMeta {
  mtimeMs: number
  id: string
  version: string | null
  label: string
}

// path → decompressed meta, so an archive is read+decompressed at most once per change (by mtime).
const metaCache = new Map<string, CachedMeta>()
// path → decompressed file map, for serving entries (same mtime-keyed reuse).
const fileCache = new Map<string, { mtimeMs: number; files: Map<string, Buffer> }>()

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

// Read a single archive's id/version/label from its branding.json (mtime-cached). Null if it isn't a
// readable brand archive (missing/garbled branding.json, or no id — a stray .tar.gz).
function readMeta(file: string): CachedMeta | null {
  let stat
  try {
    stat = statSync(file)
  } catch {
    return null
  }
  const cached = metaCache.get(file)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached
  try {
    const files = readTarGz(readFileSync(file))
    const entry = files.get('branding.json')
    if (!entry) return null
    const json = JSON.parse(entry.toString('utf8'))
    const id: unknown = json.id
    if (typeof id !== 'string' || !id) return null
    const meta: CachedMeta = {
      mtimeMs: stat.mtimeMs,
      id,
      version: typeof json.metadata?.version === 'string' ? json.metadata.version : null,
      label: typeof json.metadata?.applicationName === 'string' ? json.metadata.applicationName : id,
    }
    metaCache.set(file, meta)
    return meta
  } catch {
    return null
  }
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
      byId.set(meta.id, { id: meta.id, version: meta.version, label: meta.label, file })
    }
  }
  return byId
}

/** The decompressed entries of one archive file (mtime-cached), or null when unreadable. */
export function readArchive(file: string): Map<string, Buffer> | null {
  let stat
  try {
    stat = statSync(file)
  } catch {
    return null
  }
  const cached = fileCache.get(file)
  if (cached && cached.mtimeMs === stat.mtimeMs) return cached.files
  try {
    const files = readTarGz(readFileSync(file))
    fileCache.set(file, { mtimeMs: stat.mtimeMs, files })
    return files
  } catch {
    return null
  }
}

/** The image's baked default brand id (a `DEFAULT` marker file at the served root), or '' when none. */
export function readDefaultMarker(baseDir: string): string {
  try {
    return readFileSync(join(baseDir, 'DEFAULT'), 'utf8').trim()
  } catch {
    return ''
  }
}
