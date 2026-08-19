// The header reader behind the assets.icon check. Every fixture here is built byte by byte rather
// than checked in as a binary: the parser reads nothing BUT those bytes, so a hand-built header
// exercises exactly as much of it as a real file would — and it stays readable in review, which a
// base64 blob does not.
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { readImage } from './imageSize.ts'

/** PNG: 8-byte signature, then the mandatory IHDR chunk carrying both dimensions. */
function png(width: number, height: number): Buffer {
  const data = Buffer.alloc(24)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data)
  data.write('IHDR', 12, 'ascii')
  data.writeUInt32BE(width, 16)
  data.writeUInt32BE(height, 20)
  return data
}

function gif(width: number, height: number): Buffer {
  const data = Buffer.alloc(10)
  data.write('GIF89a', 0, 'ascii')
  data.writeUInt16LE(width, 6)
  data.writeUInt16LE(height, 8)
  return data
}

/**
 * JPEG with a leading APP0 segment, so the frame header is NOT at a fixed offset — which is the whole
 * reason the parser walks the chain instead of indexing into it.
 */
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.alloc(18)
  app0.writeUInt16BE(0xffe0, 0)
  app0.writeUInt16BE(16, 2) // segment length, covering itself but not the marker
  app0.write('JFIF\0', 4, 'ascii')
  const sof = Buffer.alloc(11)
  sof.writeUInt16BE(0xffc0, 0) // SOF0
  sof.writeUInt16BE(9, 2)
  sof.writeUInt8(8, 4) // sample precision
  sof.writeUInt16BE(height, 5) // height FIRST in a JPEG frame header
  sof.writeUInt16BE(width, 7)
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.alloc(8)])
}

/** WebP: one RIFF wrapper around whichever of the three payload layouts. */
function webp(chunk: string, payload: Buffer): Buffer {
  const head = Buffer.alloc(16)
  head.write('RIFF', 0, 'ascii')
  head.writeUInt32LE(payload.length + 12, 4)
  head.write('WEBP', 8, 'ascii')
  head.write(chunk, 12, 'ascii')
  return Buffer.concat([head, payload, Buffer.alloc(Math.max(0, 30 - 16 - payload.length))])
}

function webpLossy(width: number, height: number): Buffer {
  const payload = Buffer.alloc(18)
  payload.writeUInt32LE(14, 0) // chunk size
  Buffer.from([0x9d, 0x01, 0x2a]).copy(payload, 7) // sync code, after the 3-byte frame tag
  payload.writeUInt16LE(width, 10)
  payload.writeUInt16LE(height, 12)
  return webp('VP8 ', payload)
}

function webpLossless(width: number, height: number): Buffer {
  const payload = Buffer.alloc(13)
  payload.writeUInt32LE(9, 0)
  payload.writeUInt8(0x2f, 4) // lossless signature
  // 14 bits of (width - 1), then 14 of (height - 1), in one little-endian word.
  payload.writeUInt32LE((width - 1) | ((height - 1) << 14), 5)
  return webp('VP8L', payload)
}

function webpExtended(width: number, height: number): Buffer {
  const payload = Buffer.alloc(18)
  payload.writeUInt32LE(10, 0)
  payload.writeUIntLE(width - 1, 8, 3) // 24-bit canvas size, minus one
  payload.writeUIntLE(height - 1, 11, 3)
  return webp('VP8X', payload)
}

describe('readImage', () => {
  // Table-driven: what matters is that ALL four raster formats answer the same question the same way,
  // since the icon check treats them interchangeably.
  const RASTER: [string, Buffer][] = [
    ['png', png(512, 512)],
    ['gif', gif(512, 512)],
    ['jpeg', jpeg(512, 512)],
    ['webp (lossy VP8)', webpLossy(512, 512)],
    ['webp (lossless VP8L)', webpLossless(512, 512)],
    ['webp (extended VP8X)', webpExtended(512, 512)],
  ]

  for (const [name, data] of RASTER) {
    test(`reads the dimensions of a ${name}`, () => {
      const image = readImage(data)

      assert.equal(image?.raster, true)
      assert.equal(image?.width, 512)
      assert.equal(image?.height, 512)
    })
  }

  // Non-square, and deliberately asymmetric per format: a parser that swapped the two fields would
  // still pass every square fixture above. JPEG stores height first, so it is the likeliest to swap.
  test('keeps width and height apart', () => {
    assert.deepEqual(pick(readImage(png(200, 100))), { width: 200, height: 100 })
    assert.deepEqual(pick(readImage(gif(200, 100))), { width: 200, height: 100 })
    assert.deepEqual(pick(readImage(jpeg(200, 100))), { width: 200, height: 100 })
    assert.deepEqual(pick(readImage(webpLossy(200, 100))), { width: 200, height: 100 })
    assert.deepEqual(pick(readImage(webpLossless(200, 100))), { width: 200, height: 100 })
    assert.deepEqual(pick(readImage(webpExtended(200, 100))), { width: 200, height: 100 })
  })

  // The two the icon slot must reject. Both are perfectly valid images — they just cannot be what an
  // install icon needs, and the extension-derived MIME type means nobody downstream notices.
  test('names svg and ico as non-raster', () => {
    const svg = readImage(Buffer.from('<?xml version="1.0"?>\n<svg viewBox="0 0 512 512"></svg>'))
    assert.equal(svg?.format, 'svg')
    assert.equal(svg?.raster, false)

    const ico = readImage(Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]))
    assert.equal(ico?.format, 'ico')
    assert.equal(ico?.raster, false)
  })

  // Bounded lookahead: a `<svg` far inside some other text file must not claim it.
  test('does not read an svg out of an unrelated document', () => {
    assert.equal(readImage(Buffer.from(`${'x'.repeat(2000)}<svg>`)), null)
  })

  test('returns null for bytes no format claims', () => {
    assert.equal(readImage(Buffer.from('not an image at all')), null)
    assert.equal(readImage(Buffer.alloc(0)), null)
  })

  // A file cut short still has to be identifiable — the caller reports a truncated PNG differently
  // from an unrecognised one, and only a format-with-no-dimensions can tell the two apart.
  // Every format guards its own header length, and each guard is a separate line of defence: the
  // signature is short enough to match before the bytes carrying the dimensions have arrived, so a
  // reader without the guard would read past the end of a half-written file rather than say `null`.
  test('identifies a truncated file but reports no dimensions', () => {
    const TRUNCATED: [string, Buffer][] = [
      ['png', png(512, 512).subarray(0, 12)],
      // The GIF signature is 6 bytes, the screen descriptor sits at 6..10.
      ['gif', gif(512, 512).subarray(0, 8)],
      // A WebP announces itself in the first 12 bytes; the chunk header follows.
      ['webp', webpLossy(512, 512).subarray(0, 20)],
    ]

    for (const [format, cut] of TRUNCATED) {
      const image = readImage(cut)

      assert.equal(image?.format, format)
      assert.equal(image?.raster, true)
      // BOTH, not just width: the two are separately nullable fields of the contract, and asserting
      // one of them would pass a reader that came back with half a size.
      assert.deepEqual(pick(image), { width: null, height: null })
    }
  })

  // A RIFF/WebP wrapper around a payload chunk this reader does not know: still a WebP, no dimensions.
  test('identifies a webp whose payload chunk is unknown', () => {
    const image = readImage(webp('XXXX', Buffer.alloc(14)))

    assert.equal(image?.format, 'webp')
    assert.equal(image?.width, null)
  })

  // Desynchronised segment chains and broken signatures: the parser must give up, not read garbage
  // from whatever offset it happened to reach.
  test('gives up on a malformed payload rather than inventing a size', () => {
    const badSync = webpLossy(512, 512)
    badSync.writeUInt8(0x00, 23) // break the VP8 sync code
    assert.equal(readImage(badSync)?.width, null)

    const badSignature = webpLossless(512, 512)
    badSignature.writeUInt8(0x00, 20)
    assert.equal(readImage(badSignature)?.width, null)

    // A JPEG whose segment chain does not land on a marker boundary.
    const desynced = jpeg(512, 512)
    desynced.writeUInt16BE(3, 4) // nonsense APP0 length
    assert.equal(readImage(desynced)?.width, null)

    // …and one whose chain simply runs out before the frame header: valid segments, no SOF. The walk
    // has to end at the buffer rather than read past it.
    const noFrame = jpeg(512, 512).subarray(0, 20)
    assert.equal(readImage(noFrame)?.format, 'jpeg')
    assert.equal(readImage(noFrame)?.width, null)
  })
})

/** Just the dimensions, so a mismatch prints as two numbers instead of the whole record. */
function pick(image: ReturnType<typeof readImage>): {
  width: number | null
  height: number | null
} {
  return { width: image?.width ?? null, height: image?.height ?? null }
}
