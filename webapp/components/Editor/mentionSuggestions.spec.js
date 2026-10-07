import { fetchMentionSuggestions, matchesMentionQuery } from './mentionSuggestions'

describe('fetchMentionSuggestions', () => {
  const apollo = {
    query: jest.fn().mockResolvedValue({
      data: {
        mentionSuggestions: [
          { relation: 'following', user: { id: 'u1', slug: 'peter-lustig', name: 'Peter Lustig' } },
        ],
      },
    }),
  }

  beforeEach(() => {
    apollo.query.mockClear()
  })

  it('flattens each suggestion into the user with its relation', async () => {
    await expect(fetchMentionSuggestions(apollo, { query: 'pe' })).resolves.toEqual([
      { id: 'u1', slug: 'peter-lustig', name: 'Peter Lustig', relation: 'following' },
    ])
  })

  it('sends the query with post and group, uncached', async () => {
    await fetchMentionSuggestions(apollo, { query: 'pe', postId: 'p1', groupId: 'g1' })
    expect(apollo.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { query: 'pe', postId: 'p1', groupId: 'g1', first: 20 },
        fetchPolicy: 'no-cache',
      }),
    )
  })

  it('sends null for a missing post or group', async () => {
    await fetchMentionSuggestions(apollo, { query: '' })
    expect(apollo.query).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { query: '', postId: null, groupId: null, first: 20 },
      }),
    )
  })
})

describe('matchesMentionQuery', () => {
  const user = { slug: 'peter-lustig', name: 'Dr. Peter Lustig' }

  it.each([
    ['', true],
    [null, true],
    ['pet', true],
    ['PETER-L', true],
    ['dr', true],
    ['lus', true],
    ['ustig', false],
    ['eter', false],
  ])('%p → %p', (query, expected) => {
    expect(matchesMentionQuery(user, query)).toBe(expected)
  })

  it('copes with a user without a name', () => {
    expect(matchesMentionQuery({ slug: 'peter' }, 'pe')).toBe(true)
    expect(matchesMentionQuery({ slug: 'peter' }, 'lu')).toBe(false)
  })
})
