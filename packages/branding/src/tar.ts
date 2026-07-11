// Minimal, dependency-free tar + gzip for brand archives — a brand build bundles its resolved
// branding.json + assets/ + html/ into ONE `<id>.tar.gz`, and every consumer (webapp serverMiddleware,
// branding plugin, maintenance generator) reads the files back FROM that archive instead of loose
// files. Only the file entries we write are supported (no dirs/symlinks); everything is loaded into
// memory (a brand archive is tiny, ~70 KB). Server-only: uses node:zlib — do NOT import from the
// package index (keeps it out of the webapp client bundle).
// Plain 'zlib' (not 'node:zlib') so webpack 4 (Nuxt 2 webapp) can stub it via node:{zlib:'empty'}
// when this server-only module is referenced from a client-bundled file behind a process.server guard.
import { gunzipSync, gzipSync } from 'zlib'

const BLOCK = 512

function octal(value: number, fieldLength: number): string {
  // e.g. size (12-byte field) → 11 octal digits + NUL
  return value.toString(8).padStart(fieldLength - 1, '0') + '\0'
}

function tarHeader(name: string, size: number): Buffer {
  const h = Buffer.alloc(BLOCK)
  h.write(name, 0, 100, 'utf8')
  h.write('0000644\0', 100) // mode
  h.write('0000000\0', 108) // uid
  h.write('0000000\0', 116) // gid
  h.write(octal(size, 12), 124) // size
  h.write(octal(0, 12), 136) // mtime (0 → reproducible)
  h.fill(0x20, 148, 156) // checksum field = spaces while summing
  h.write('0', 156) // typeflag: regular file
  h.write('ustar\0', 257) // magic
  h.write('00', 263) // version

  let sum = 0
  for (let i = 0; i < BLOCK; i++) sum += h[i]
  h.write(sum.toString(8).padStart(6, '0'), 148) // 6 octal digits
  h[154] = 0 // NUL
  h[155] = 0x20 // space
  return h
}

/** Bundle `[{ name, data }]` file entries into a gzipped tar buffer. */
export function writeTarGz(entries: { name: string; data: Buffer }[]): Buffer {
  const blocks: Buffer[] = []
  for (const { name, data } of entries) {
    blocks.push(tarHeader(name, data.length))
    blocks.push(data)
    const pad = (BLOCK - (data.length % BLOCK)) % BLOCK
    if (pad) blocks.push(Buffer.alloc(pad))
  }
  blocks.push(Buffer.alloc(BLOCK * 2)) // two zero blocks terminate the archive
  return gzipSync(Buffer.concat(blocks))
}

/** Read a gzipped tar buffer into a map of `relative/path → file contents`. */
export function readTarGz(gz: Buffer): Map<string, Buffer> {
  const tar = gunzipSync(gz)
  const files = new Map<string, Buffer>()
  let off = 0
  while (off + BLOCK <= tar.length) {
    const header = tar.subarray(off, off + BLOCK)
    if (header.every((b) => b === 0)) break // end-of-archive
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '')
    const size = parseInt(
      header.subarray(124, 136).toString('utf8').replace(/[^0-7]/g, '') || '0',
      8,
    )
    const type = String.fromCharCode(header[156])
    off += BLOCK
    if (type === '0' || type === '\0' || type === '') {
      files.set(name, Buffer.from(tar.subarray(off, off + size)))
    }
    off += Math.ceil(size / BLOCK) * BLOCK
  }
  return files
}
