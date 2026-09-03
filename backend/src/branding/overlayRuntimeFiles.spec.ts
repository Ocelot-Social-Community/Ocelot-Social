/* eslint-disable n/no-sync */ // test drives the sync overlay against a real temp dir
/* eslint-disable security/detect-non-literal-fs-filename */ // temp-dir paths built in-test
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, beforeEach, afterEach, it, expect } from 'vitest'

import { overlayBrandRuntimeFiles } from './overlayRuntimeFiles'

describe(overlayBrandRuntimeFiles, () => {
  let root: string
  let emailsDir: string

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'ocelot-overlay-'))
    emailsDir = path.join(root, 'emails')
    mkdirSync(path.join(emailsDir, 'locales'), { recursive: true })
    mkdirSync(path.join(emailsDir, 'templates'), { recursive: true })
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  const run = (entries: [string, string][]) => {
    overlayBrandRuntimeFiles(new Map(entries.map(([k, v]) => [k, Buffer.from(v)])), { emailsDir })
  }

  it('overlays e-mail templates (replacing the default)', () => {
    run([['emails/templates/registration/html.pug', 'p brand registration']])

    expect(readFileSync(path.join(emailsDir, 'templates/registration/html.pug'), 'utf8')).toBe(
      'p brand registration',
    )
  })

  it('deep-merges e-mail locales over the default (brand wins, base kept)', () => {
    writeFileSync(
      path.join(emailsDir, 'locales/en.json'),
      JSON.stringify({ greeting: { hello: 'Hi', bye: 'Bye' }, keep: 'z' }),
    )
    run([
      ['emails/locales/en.json', JSON.stringify({ greeting: { hello: 'Welcome' }, extra: 'x' })],
    ])
    const merged = JSON.parse(
      readFileSync(path.join(emailsDir, 'locales/en.json'), 'utf8'),
    ) as unknown

    expect(merged).toEqual({ greeting: { hello: 'Welcome', bye: 'Bye' }, keep: 'z', extra: 'x' })
  })

  it('skips path-traversal entries (no write outside the target dir)', () => {
    run([
      ['emails/templates/../../evil.pug', 'x'],
      ['emails/locales/../../evil.json', '{}'],
    ])

    expect(existsSync(path.join(root, 'evil.pug'))).toBe(false)
    expect(existsSync(path.join(root, 'evil.json'))).toBe(false)
    expect(existsSync(path.join(root, 'emails/evil.pug'))).toBe(false)
  })

  it('writes a brand locale the framework has no default for', () => {
    run([['emails/locales/eo.json', JSON.stringify({ greeting: 'Saluton' })]])
    const written = JSON.parse(
      readFileSync(path.join(emailsDir, 'locales/eo.json'), 'utf8'),
    ) as unknown

    expect(written).toEqual({ greeting: 'Saluton' })
  })

  it('keeps the default locale when the brand ships unreadable JSON', () => {
    const target = path.join(emailsDir, 'locales/en.json')
    writeFileSync(target, JSON.stringify({ greeting: 'Hi' }))
    run([['emails/locales/en.json', '{ not json']])

    // Clobbering the default with a broken file would take every e-mail down; skipping keeps the
    // instance sending in its own language, just without the brand's overrides.
    expect(JSON.parse(readFileSync(target, 'utf8')) as unknown).toEqual({ greeting: 'Hi' })
  })

  it('writes nothing for served buckets — they are read from the archive, not from disk', () => {
    // Badge SVGs in particular: they used to be copied into the backend's public/ and are now served
    // from the archive at /branding/<id>/assets/badges/…. A write here would resurrect the two-copies
    // problem this overlay was trimmed down to avoid.
    run([
      ['assets/badges/trophy_bear.svg', 'x'],
      ['assets/logo.svg', 'x'],
      ['html/en/imprint.html', 'x'],
      ['public/img/badges/legacy.svg', 'x'],
      ['manifest.json', '{}'],
    ])

    expect(readdirSync(root)).toEqual(['emails'])
    expect(readdirSync(emailsDir).sort()).toEqual(['locales', 'templates'])
    expect(readdirSync(path.join(emailsDir, 'templates'))).toEqual([])
  })
})
