
import uniqueSlug from './uniqueSlug'

// Mirrors the (unexported) callback type uniqueSlug takes; `@jest/globals` needs a
// signature on the mock, a bare vi.fn() is Mock<UnknownFunction>.
type IsUnique = (slug: string) => Promise<boolean>

describe('uniqueSlug', () => {
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
    await expect(uniqueSlug(nullString as unknown as string, isUnique)).resolves.toEqual(
      'anonymous',
    )
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
      await expect(uniqueSlug('Foo, Bar & Friends', isUnique)).resolves.toEqual(
        'foo-bar-and-friends',
      )
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
})
