import { fetchHashtagSuggestions, matchesHashtagQuery, withNewHashtag } from './hashtagSuggestions'

describe('fetchHashtagSuggestions', () => {
  const apollo = {
    query: jest.fn().mockResolvedValue({
      data: {
        hashtagSuggestions: [{ relation: 'usedByMe', tag: { id: 'Frieden' } }],
      },
    }),
  }

  beforeEach(() => {
    apollo.query.mockClear()
  })

  it('flattens each suggestion into the tag with its relation', async () => {
    await expect(fetchHashtagSuggestions(apollo, { query: 'fr' })).resolves.toEqual([
      { id: 'Frieden', relation: 'usedByMe' },
    ])
  })

  it('sends the query, uncached', async () => {
    await fetchHashtagSuggestions(apollo, { query: 'fr' })
    expect(apollo.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { query: 'fr', first: 20 },
        fetchPolicy: 'no-cache',
      }),
    )
  })
})

describe('matchesHashtagQuery', () => {
  it.each([
    ['', true],
    [null, true],
    ['fr', true],
    ['FRIE', true],
    ['rieden', false],
  ])('%p → %p', (query, expected) => {
    expect(matchesHashtagQuery({ id: 'Frieden' }, query)).toBe(expected)
  })

  // It stands for what was typed before; Enter would create exactly that.
  it('never keeps the entry for a new tag', () => {
    expect(matchesHashtagQuery({ id: 'fri', relation: 'new' }, 'fr')).toBe(false)
  })
})

describe('withNewHashtag', () => {
  const frieden = { id: 'Frieden', relation: 'popular' }

  it('appends the typed tag when it does not exist yet', () => {
    expect(withNewHashtag([frieden], 'Frie')).toEqual([frieden, { id: 'Frie', relation: 'new' }])
  })

  it('offers it even when nothing else matches', () => {
    expect(withNewHashtag([], 'Xyz')).toEqual([{ id: 'Xyz', relation: 'new' }])
  })

  it('leaves the list alone when the tag exists', () => {
    expect(withNewHashtag([frieden], 'Frieden')).toEqual([frieden])
  })

  it('leaves the list alone while nothing is typed', () => {
    expect(withNewHashtag([frieden], '')).toEqual([frieden])
  })
})
