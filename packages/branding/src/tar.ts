// tar + gzip for brand archives — a brand build bundles its manifest.json + bucket-instance fragments
// + assets/ + html/ into ONE `<id>.tar.gz`, and every consumer (webapp serverMiddleware, branding
// plugin, maintenance generator) reads the files back FROM that archive instead of loose files.
//
// The tar framing is delegated to `nanotar` (in-memory, zero-fs); gzip stays on the Node built-in
// `node:zlib` (no extra dependency, synchronous). Server-only: uses node:zlib — do NOT import from the
// package index (keeps it out of the webapp client bundle; consumers require it under a process.server
// guard). Only regular file entries are produced/read (no dirs/symlinks); a brand archive is tiny.
import { gunzipSync, gzipSync } from 'node:zlib'

import { createTar, parseTar } from 'nanotar'

/** Bundle `[{ name, data }]` file entries into a gzipped tar buffer. */
export function writeTarGz(entries: { name: string; data: Buffer }[]): Buffer {
  return gzipSync(createTar(entries))
}

/** Read a gzipped tar buffer into a map of `relative/path → file contents`. */
export function readTarGz(gz: Buffer): Map<string, Buffer> {
  // gunzipSync returns a POOLED Buffer (non-zero byteOffset); nanotar's parseTar reads from the
  // underlying ArrayBuffer's offset 0, so hand it a normalized, offset-0 view or it misreads.
  const tar = new Uint8Array(gunzipSync(gz))
  const files = new Map<string, Buffer>()
  for (const entry of parseTar(tar)) {
    // parseTar yields `data: undefined` for a zero-byte file — preserve it as an empty buffer.
    if (entry.type === 'file')
      files.set(entry.name, entry.data ? Buffer.from(entry.data) : Buffer.alloc(0))
  }
  return files
}
