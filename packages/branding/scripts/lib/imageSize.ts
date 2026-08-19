// What an image file actually IS, read from its own bytes.
//
// Written here rather than pulled in (image-size, probe-image-size, sharp) because this package is a
// build-time dependency of every brand repo: a native or transitive dependency for four fixed-offset
// header reads would cost every one of them an install, and this file is the whole of what those
// libraries would be used for. No decoding happens — only the header that names the dimensions.
//
// The FORMAT comes from the magic bytes, never from the extension. That distinction is the point: the
// consumers of `assets.icon` (the PWA manifest, `<link rel="apple-touch-icon">`) derive their `type`
// attribute from the path (webapp/utils/iconType.js), so a mislabelled file is announced as something
// it is not — and a browser that cannot decode what it was promised drops the icon rather than
// sniffing it. A build-time check is the only place that mismatch is visible before a phone shows it.

/** A file's container format and pixel dimensions, or null for bytes no known format claims. */
export interface ImageInfo {
  format: 'png' | 'gif' | 'jpeg' | 'webp' | 'svg' | 'ico'
  /** Whether the format stores pixels. `svg` is a document, `ico` a container of several images. */
  raster: boolean
  /** Pixel size, or null where the format carries none (svg) or the header is truncated. */
  width: number | null
  height: number | null
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const ICO_SIGNATURE = Buffer.from([0x00, 0x00, 0x01, 0x00])

const raster = (
  format: 'png' | 'gif' | 'jpeg' | 'webp',
  size: { width: number; height: number } | null,
): ImageInfo => ({ format, raster: true, width: size?.width ?? null, height: size?.height ?? null })

/** PNG: the IHDR chunk is mandatory and FIRST, so both dimensions sit at fixed offsets. */
function pngSize(data: Buffer): { width: number; height: number } | null {
  if (data.length < 24) {
    return null
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
}

/** GIF: the logical-screen descriptor follows the 6-byte signature, little-endian. */
function gifSize(data: Buffer): { width: number; height: number } | null {
  if (data.length < 10) {
    return null
  }
  return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) }
}

/**
 * JPEG: dimensions live in a start-of-frame segment, whose position depends on how many segments
 * (EXIF, quantisation tables, comments) precede it — so the segment chain has to be walked.
 */
function jpegSize(data: Buffer): { width: number; height: number } | null {
  let pos = 2 // past the SOI marker
  while (pos + 9 < data.length) {
    if (data[pos] !== 0xff) {
      return null
    } // desynchronised — not a segment boundary any more
    const marker = data[pos + 1]
    // SOF0..SOF15 carry the frame header. The three exceptions in that range are other things
    // entirely: DHT (c4), JPG (c8) and DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      // Height precedes width here, unlike every other format in this file.
      return { height: data.readUInt16BE(pos + 5), width: data.readUInt16BE(pos + 7) }
    }
    pos += 2 + data.readUInt16BE(pos + 2) // segment length covers itself but not the marker
  }
  return null
}

/**
 * WebP: one RIFF container, three incompatible payloads. VP8 is the original lossy bitstream, VP8L
 * the lossless one, VP8X the extended header a file with alpha / animation / ICC starts with — each
 * stores the canvas size differently, and a brand's icon (alpha, hence usually VP8X) hits the one
 * that looks least like the others.
 */
function webpSize(data: Buffer): { width: number; height: number } | null {
  if (data.length < 30) {
    return null
  }
  const chunk = data.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') {
    // Lossy: a 3-byte frame tag, then the 3-byte sync code that confirms the layout.
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) {
      return null
    }
    // 14 bits each; the top 2 are a scaling hint this does not apply.
    return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff }
  }
  if (chunk === 'VP8L') {
    if (data[20] !== 0x2f) {
      return null
    } // lossless signature byte
    // 14 bits of (width - 1) then 14 of (height - 1), packed into one little-endian word.
    const bits = data.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8X') {
    // Extended: canvas size as two 24-bit little-endian (size - 1) values.
    return {
      width: data.readUIntLE(24, 3) + 1,
      height: data.readUIntLE(27, 3) + 1,
    }
  }
  return null
}

/**
 * Identify an image by its bytes. Returns null when nothing claims them — a caller should treat that
 * as "unknown", not as "invalid": being unable to name a format is not evidence the file is broken.
 */
export function readImage(data: Buffer): ImageInfo | null {
  if (data.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return raster('png', pngSize(data))
  }
  if (data.subarray(0, 4).equals(ICO_SIGNATURE)) {
    return { format: 'ico', raster: false, width: null, height: null }
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    return raster('jpeg', jpegSize(data))
  }
  const ascii6 = data.toString('ascii', 0, 6)
  if (ascii6 === 'GIF87a' || ascii6 === 'GIF89a') {
    return raster('gif', gifSize(data))
  }
  if (ascii6.startsWith('RIFF') && data.toString('ascii', 8, 12) === 'WEBP') {
    return raster('webp', webpSize(data))
  }
  // SVG last and by content: it is text, so it has no magic number — an XML declaration, a doctype or
  // a comment may precede the root element. Bounded to the head of the file so a stray `<svg` deep
  // inside some other text format cannot claim it.
  if (/<svg[\s>]/i.test(data.toString('utf8', 0, 1024))) {
    return { format: 'svg', raster: false, width: null, height: null }
  }
  return null
}
