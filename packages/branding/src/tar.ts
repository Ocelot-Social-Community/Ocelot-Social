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

// Sanity ceiling on the DECOMPRESSED size of an archive. A brand archive is normally tens of KB to a
// few MB (logos + fonts + html); this caps a gzip-bomb's blowup (a tiny .gz that inflates to GBs) so a
// hostile/corrupt archive throws instead of OOMing the process — relevant once archives can be uploaded
// (docu/branding-buckets-konzept.md §12), harmless for the trusted baked/dev archives of today.
export const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024

/** Bundle `[{ name, data }]` file entries into a gzipped tar buffer. */
export function writeTarGz(entries: { name: string; data: Buffer }[]): Buffer {
  return gzipSync(createTar(entries))
}

/** Read a gzipped tar buffer into a map of `relative/path → file contents`. Throws when the archive
 *  decompresses beyond `maxOutputBytes` (gzip-bomb guard). */
export function readTarGz(
  gz: Buffer,
  maxOutputBytes: number = MAX_ARCHIVE_BYTES,
): Map<string, Buffer> {
  // gunzipSync returns a POOLED Buffer (non-zero byteOffset); nanotar's parseTar reads from the
  // underlying ArrayBuffer's offset 0, so hand it a normalized, offset-0 view or it misreads.
  const tar = new Uint8Array(gunzipSync(gz, { maxOutputLength: maxOutputBytes }))
  const files = new Map<string, Buffer>()
  for (const entry of parseTar(tar)) {
    // parseTar yields `data: undefined` for a zero-byte file — preserve it as an empty buffer.
    if (entry.type === 'file')
      files.set(entry.name, entry.data ? Buffer.from(entry.data) : Buffer.alloc(0))
  }
  return files
}
