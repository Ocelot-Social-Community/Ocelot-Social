import { describe, it, expect } from 'vitest'

import uniqueSlug from './uniqueSlug'

// Mirrors the (unexported) callback type uniqueSlug takes: a bare `vi.fn()` would type
// `mockResolvedValue` as `any` instead of checking it against the real callback.
type IsUnique = (slug: string) => Promise<boolean>

describe(uniqueSlug, () => {
  it('slugifies given string', async () => {
    const string = 'Hello World'
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    await expect(uniqueSlug(string, isUnique)).resolves.toEqual('hello-world')
  })

  it('increments slugified string until unique', async () => {
    const string = 'Hello World'
    const isUnique = vi.fn<IsUnique>().mockResolvedValueOnce(false).mockResolvedValueOnce(true)

    await expect(uniqueSlug(string, isUnique)).resolves.toEqual('hello-world-1')
  })

  it('slugify null string', async () => {
    const nullString = null
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    await expect(uniqueSlug(nullString as unknown as string, isUnique)).resolves.toBe('anonymous')
  })

  it('Converts umlaut to a two letter equivalent', async () => {
    const umlaut = 'ÄÖÜäöüß'
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    await expect(uniqueSlug(umlaut, isUnique)).resolves.toEqual('aeoeueaeoeuess')
  })

  it('Removes Spanish enya and diacritics', async () => {
    const diacritics = 'áàéèíìóòúùñçÁÀÉÈÍÌÓÒÚÙÑÇ'
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    await expect(uniqueSlug(diacritics, isUnique)).resolves.toEqual('aaeeiioouuncaaeeiioouunc')
  })

  // The User/Group/Post models validate slugs against /^[a-z0-9_-]+$/ — every
  // character the slugify config lets through outside that alphabet ends in an
  // opaque neode ERROR_VALIDATION on create. Guard the full alphabet contract.
  describe('always produces a slug matching /^[a-z0-9_-]+$/', () => {
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    it('strips commas (slugify keeps them once a custom `remove` is set)', async () => {
      await expect(uniqueSlug('Foo, Bar & Friends', isUnique)).resolves.toBe('foo-bar-and-friends')
    })

    it('strips apostrophes', async () => {
      await expect(uniqueSlug("O'Conner Group", isUnique)).resolves.toEqual('oconner-group')
    })

    it('keeps underscores and hyphens (both allowed by the models)', async () => {
      await expect(uniqueSlug('foo_bar-baz', isUnique)).resolves.toEqual('foo_bar-baz')
    })

    it('falls back to "anonymous" when nothing slug-able remains', async () => {
      await expect(uniqueSlug('!!!', isUnique)).resolves.toEqual('anonymous')
    })
  })

  // A character slugify neither maps to '-' nor removes (it's not whitespace and not in the
  // custom `remove` regex — '?', '#', '/', most emoji) survives slugify as its own "word" and
  // gets a real '-' separator from the space next to it. Stripping that character afterwards
  // leaves the separator orphaned — trailing, leading, or doubled up mid-string.
  describe('does not leave a stray "-" behind from a stripped character', () => {
    const isUnique = vi.fn<IsUnique>().mockResolvedValue(true)

    it('trailing: a title ending in "space + stripped character"', async () => {
      await expect(uniqueSlug('Hello World ?', isUnique)).resolves.toEqual('hello-world')
    })

    it('leading: a title starting with "stripped character + space"', async () => {
      await expect(uniqueSlug('? Leading special', isUnique)).resolves.toEqual('leading-special')
    })

    it('doubled mid-string: a stripped character surrounded by spaces', async () => {
      await expect(uniqueSlug('Middle ? special word', isUnique)).resolves.toEqual(
        'middle-special-word',
      )
    })
  })
})
