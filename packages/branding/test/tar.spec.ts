// tar + gzip codec round-trip. writeTarGz/readTarGz are the archive container every consumer reads,
// so a byte-exact round-trip (incl. binary payloads and block-padding edge cases) is the contract.
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MAX_ARCHIVE_BYTES, readTarGz, writeTarGz } from '../dist/tar.js'

test('round-trips a set of entries byte-for-byte, including nested paths', () => {
  const entries = [
    { name: 'manifest.json', data: Buffer.from('{"id":"acme"}\n', 'utf8') },
    { name: 'fragments/theme.default.json', data: Buffer.from('{"theme":{}}', 'utf8') },
    { name: 'assets/logo.svg', data: Buffer.from('<svg/>', 'utf8') },
  ]
  const files = readTarGz(writeTarGz(entries))
  assert.equal(files.size, entries.length)
  for (const { name, data } of entries) {
    assert.ok(files.has(name), `missing ${name}`)
    assert.deepEqual(files.get(name), data)
  }
})

test('produces a gzip stream (magic bytes 1f 8b)', () => {
  const gz = writeTarGz([{ name: 'a', data: Buffer.from('x') }])
  assert.equal(gz[0], 0x1f)
  assert.equal(gz[1], 0x8b)
})

test('preserves arbitrary binary payloads (non-utf8 bytes)', () => {
  const data = Buffer.from([0x00, 0xff, 0x10, 0x80, 0x7f, 0x00, 0xab])
  const files = readTarGz(writeTarGz([{ name: 'assets/font.woff2', data }]))
  assert.deepEqual(files.get('assets/font.woff2'), data)
})

test('handles an empty (zero-byte) file entry', () => {
  const files = readTarGz(writeTarGz([{ name: 'empty', data: Buffer.alloc(0) }]))
  assert.ok(files.has('empty'))
  assert.equal(files.get('empty').length, 0)
})

test('handles a payload that is an exact multiple of the 512-byte block (no padding branch)', () => {
  const data = Buffer.alloc(1024, 0x41) // exactly 2 blocks → pad === 0
  const files = readTarGz(writeTarGz([{ name: 'block-aligned', data }]))
  assert.deepEqual(files.get('block-aligned'), data)
})

test('handles a payload needing padding (non-block-multiple)', () => {
  const data = Buffer.alloc(513, 0x42) // 1 byte into a second block → padding written
  const files = readTarGz(writeTarGz([{ name: 'needs-pad', data }]))
  assert.deepEqual(files.get('needs-pad'), data)
})

test('an empty archive yields no files', () => {
  assert.equal(readTarGz(writeTarGz([])).size, 0)
})

test('readTarGz caps decompression size (gzip-bomb guard), default ceiling is generous', () => {
  const gz = writeTarGz([{ name: 'big', data: Buffer.alloc(4096, 0x41) }]) // inflates past 512 bytes
  // a tiny ceiling → throws instead of decompressing (would OOM on a real bomb)
  assert.throws(() => readTarGz(gz, 100))
  // the default ceiling reads the same archive fine
  assert.ok(MAX_ARCHIVE_BYTES > 4096)
  assert.ok(readTarGz(gz).has('big'))
})
