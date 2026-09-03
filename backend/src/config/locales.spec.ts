import { readdir } from 'node:fs/promises'
import path from 'node:path'

import { describe, it, expect } from 'vitest'

import { SUPPORTED_LOCALES, isSupportedLocale, resolveLocale } from './locales'
import { SOFTWARE_DEFAULTS } from './softwareDefaults'

describe('sUPPORTED_LOCALES', () => {
  it('matches the email locale template files on disk, so the list cannot drift', async () => {
    const files = await readdir(path.join(import.meta.dirname, '../emails/locales'))
    const onDisk = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace(/\.json$/, ''))
      .sort()

    expect([...SUPPORTED_LOCALES].sort()).toEqual(onDisk)
  })

  it('includes the software-default language, so the fallback is itself valid', () => {
    expect(SUPPORTED_LOCALES).toContain(SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT)
  })
})

describe(isSupportedLocale, () => {
  it('accepts a supported locale case-insensitively, rejects everything else', () => {
    expect(isSupportedLocale('fr')).toBe(true)
    expect(isSupportedLocale('FR')).toBe(true)
    expect(isSupportedLocale('')).toBe(false)
    expect(isSupportedLocale(undefined)).toBe(false)
    expect(isSupportedLocale('xx')).toBe(false)
  })
})

describe(resolveLocale, () => {
  const FALLBACK = SOFTWARE_DEFAULTS.LANGUAGE_DEFAULT // 'en'

  it('keeps a supported locale', () => {
    expect(resolveLocale('de', FALLBACK)).toBe('de')
  })

  it('normalises case to the canonical lowercase form', () => {
    expect(resolveLocale('DE', FALLBACK)).toBe('de')
  })

  it('falls back for an empty string — the ?? gap this closes (LANGUAGE_DEFAULT="")', () => {
    expect(resolveLocale('', FALLBACK)).toBe('en')
  })

  it('falls back for a missing (undefined) value', () => {
    expect(resolveLocale(undefined, FALLBACK)).toBe('en')
  })

  it('falls back for an unsupported code, rather than passing an invalid default locale', () => {
    expect(resolveLocale('xx', FALLBACK)).toBe('en')
  })
})
