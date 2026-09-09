/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import searchPosts from '@graphql/queries/posts/searchPosts.gql'
import searchResults from '@graphql/queries/searchResults.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
let user
// Per-test network-policy override; unset keys fall back to their schema defaults.
// Used to switch the groups feature off, which the search resolvers fold in themselves.
let policyOverride: Record<string, unknown> = {}

const contextFn = () => ({
  authenticatedUser,
  policy: policyOverride,
})

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context: contextFn })
  query = apolloSetup.query
  database = apolloSetup.database
  server = apolloSetup.server
})

afterAll(async () => {
  await cleanDatabase()
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('resolvers/searches', () => {
  let variables

  describe('given one user', () => {
    beforeAll(async () => {
      user = await Factory.build('user', {
        id: 'a-user',
        name: 'John Doe',
        slug: 'john-doe',
      })
      authenticatedUser = await user.toJson()
    })

    describe('query contains first name of user', () => {
      it('finds the user', async () => {
        variables = { query: 'John' }

        await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
          data: {
            searchResults: [
              {
                id: 'a-user',
                name: 'John Doe',
                slug: 'john-doe',
              },
            ],
          },
        })
      })
    })

    describe('adding one post', () => {
      beforeAll(async () => {
        await Factory.build(
          'post',
          {
            id: 'a-post',
            title: 'Beitrag',
            content: 'Ein erster Beitrag',
          },
          { authorId: 'a-user' },
        )
      })

      describe('query contains title of post', () => {
        it('finds the post', async () => {
          variables = { query: 'beitrag' }

          await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
            data: {
              searchResults: [
                {
                  __typename: 'Post',
                  id: 'a-post',
                  title: 'Beitrag',
                  content: 'Ein erster Beitrag',
                },
              ],
            },
            errors: undefined,
          })
        })
      })

      describe('casing', () => {
        it('does not matter', async () => {
          variables = { query: 'BEITRAG' }

          await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
            data: {
              searchResults: [
                {
                  __typename: 'Post',
                  id: 'a-post',
                  title: 'Beitrag',
                  content: 'Ein erster Beitrag',
                },
              ],
            },
            errors: undefined,
          })
        })
      })

      describe('query consists of words not present in the corpus', () => {
        it('returns empty search results', async () => {
          await expect(
            query({ query: searchResults, variables: { query: 'Unfug' } }),
          ).resolves.toMatchObject({ data: { searchResults: [] } })
        })
      })

      describe('testing different post content', () => {
        beforeAll(async () => {
          return Promise.all([
            Factory.build(
              'post',
              {
                id: 'b-post',
                title: 'Aufruf',
                content: 'Jeder sollte seinen Beitrag leisten.',
              },
              { authorId: 'a-user' },
            ),
            Factory.build(
              'post',
              {
                id: 'g-post',
                title: 'Zusammengesetzte Wörter',
                content: `Ein Bindestrich kann zwischen zwei Substantiven auch dann gesetzt werden, wenn drei gleichlautende Buchstaben aufeinandertreffen. Das ist etwa bei einem „Teeei“ der Fall, das so korrekt geschrieben ist. Möglich ist hier auch die Schreibweise mit Bindestrich: Tee-Ei.`,
              },
              { authorId: 'a-user' },
            ),
            Factory.build(
              'post',
              {
                id: 'c-post',
                title: 'Die binomischen Formeln',
                content: `1. binomische Formel: (a + b)² = a² + 2ab + b²
2. binomische Formel: (a - b)² = a² - 2ab + b²
3. binomische Formel: (a + b)(a - b) = a² - b²`,
              },
              { authorId: 'a-user' },
            ),
            Factory.build(
              'post',
              {
                id: 'd-post',
                title: 'Der Panther',
                content: `Sein Blick ist vom Vorübergehn der Stäbe
so müd geworden, daß er nichts mehr hält.
Ihm ist, als ob es tausend Stäbe gäbe
und hinter tausend Stäben keine Welt.`,
              },
              { authorId: 'a-user' },
            ),
          ])
        })

        describe('a post which content contains the title of the first post', () => {
          describe('query contains the title of the first post', () => {
            it('finds both posts', async () => {
              variables = { query: 'beitrag' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: expect.arrayContaining([
                    {
                      __typename: 'Post',
                      id: 'a-post',
                      title: 'Beitrag',
                      content: 'Ein erster Beitrag',
                    },
                    {
                      __typename: 'Post',
                      id: 'b-post',
                      title: 'Aufruf',
                      content: 'Jeder sollte seinen Beitrag leisten.',
                    },
                  ]),
                },
                errors: undefined,
              })
            })
          })
        })

        describe('a post that contains a hyphen between two words and German quotation marks', () => {
          describe('hyphens in query', () => {
            it('will be treated as ordinary characters', async () => {
              variables = { query: 'tee-ei' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'g-post',
                      title: 'Zusammengesetzte Wörter',
                      content: `Ein Bindestrich kann zwischen zwei Substantiven auch dann gesetzt werden, wenn drei gleichlautende Buchstaben aufeinandertreffen. Das ist etwa bei einem „Teeei“ der Fall, das so korrekt geschrieben ist. Möglich ist hier auch die Schreibweise mit Bindestrich: Tee-Ei.`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })

          describe('german quotation marks in query to test unicode characters („ ... “)', () => {
            it('will be treated as ordinary characters', async () => {
              variables = { query: '„teeei“' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'g-post',
                      title: 'Zusammengesetzte Wörter',
                      content: `Ein Bindestrich kann zwischen zwei Substantiven auch dann gesetzt werden, wenn drei gleichlautende Buchstaben aufeinandertreffen. Das ist etwa bei einem „Teeei“ der Fall, das so korrekt geschrieben ist. Möglich ist hier auch die Schreibweise mit Bindestrich: Tee-Ei.`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })
        })

        describe('a post that contains a simple mathematical exprssion and line breaks', () => {
          describe('query a part of the mathematical expression', () => {
            it('finds that post', async () => {
              variables = { query: '(a - b)²' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'c-post',
                      title: 'Die binomischen Formeln',
                      content: `1. binomische Formel: (a + b)² = a² + 2ab + b²<br>
2. binomische Formel: (a - b)² = a² - 2ab + b²<br>
3. binomische Formel: (a + b)(a - b) = a² - b²`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })

          describe('query the same part of the mathematical expression without spaces', () => {
            it('finds that post', async () => {
              variables = { query: '(a-b)²' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'c-post',
                      title: 'Die binomischen Formeln',
                      content: `1. binomische Formel: (a + b)² = a² + 2ab + b²<br>
2. binomische Formel: (a - b)² = a² - 2ab + b²<br>
3. binomische Formel: (a + b)(a - b) = a² - b²`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })

          describe('query the mathematical expression over line break', () => {
            it('finds that post', async () => {
              variables = { query: '+ b² 2.' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'c-post',
                      title: 'Die binomischen Formeln',
                      content: `1. binomische Formel: (a + b)² = a² + 2ab + b²<br>
2. binomische Formel: (a - b)² = a² - 2ab + b²<br>
3. binomische Formel: (a + b)(a - b) = a² - b²`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })
        })

        describe('a post that contains a poem', () => {
          describe('query for more than one word, e.g. the title of the poem', () => {
            it('finds the poem and another post that contains only one word but with lower score', async () => {
              variables = { query: 'der panther' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: [
                    {
                      __typename: 'Post',
                      id: 'd-post',
                      title: 'Der Panther',
                      content: `Sein Blick ist vom Vorübergehn der Stäbe<br>
so müd geworden, daß er nichts mehr hält.<br>
Ihm ist, als ob es tausend Stäbe gäbe<br>
und hinter tausend Stäben keine Welt.`,
                    },
                    {
                      __typename: 'Post',
                      id: 'g-post',
                      title: 'Zusammengesetzte Wörter',
                      content: `Ein Bindestrich kann zwischen zwei Substantiven auch dann gesetzt werden, wenn drei gleichlautende Buchstaben aufeinandertreffen. Das ist etwa bei einem „Teeei“ der Fall, das so korrekt geschrieben ist. Möglich ist hier auch die Schreibweise mit Bindestrich: Tee-Ei.`,
                    },
                  ],
                },
                errors: undefined,
              })
            })
          })

          describe('query for the first four letters of two longer words', () => {
            it('finds the posts that contain words starting with these four letters', async () => {
              variables = { query: 'Vorü Subs' }

              await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
                data: {
                  searchResults: expect.arrayContaining([
                    {
                      __typename: 'Post',
                      id: 'd-post',
                      title: 'Der Panther',
                      content: `Sein Blick ist vom Vorübergehn der Stäbe<br>
so müd geworden, daß er nichts mehr hält.<br>
Ihm ist, als ob es tausend Stäbe gäbe<br>
und hinter tausend Stäben keine Welt.`,
                    },
                    {
                      __typename: 'Post',
                      id: 'g-post',
                      title: 'Zusammengesetzte Wörter',
                      content: `Ein Bindestrich kann zwischen zwei Substantiven auch dann gesetzt werden, wenn drei gleichlautende Buchstaben aufeinandertreffen. Das ist etwa bei einem „Teeei“ der Fall, das so korrekt geschrieben ist. Möglich ist hier auch die Schreibweise mit Bindestrich: Tee-Ei.`,
                    },
                  ]),
                },
                errors: undefined,
              })
            })
          })
        })
      })

      describe('adding two users that have the same word in their slugs', () => {
        beforeAll(async () => {
          await Promise.all([
            Factory.build('user', {
              id: 'c-user',
              name: 'Rainer Maria Rilke',
              slug: 'rainer-maria-rilke',
            }),
            Factory.build('user', {
              id: 'd-user',
              name: 'Erich Maria Remarque',
              slug: 'erich-maria-remarque',
            }),
          ])
        })

        describe('query the word that both slugs contain', () => {
          it('finds both users', async () => {
            variables = { query: '-maria-' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.arrayContaining([
                  {
                    __typename: 'User',
                    id: 'c-user',
                    name: 'Rainer Maria Rilke',
                    slug: 'rainer-maria-rilke',
                  },
                  {
                    __typename: 'User',
                    id: 'd-user',
                    name: 'Erich Maria Remarque',
                    slug: 'erich-maria-remarque',
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })
      })

      describe('adding a user and a hashtag with a name that is content of a post', () => {
        beforeAll(async () => {
          await Promise.all([
            Factory.build('user', {
              id: 'f-user',
              name: 'Peter Panther',
              slug: 'peter-panther',
            }),
            await Factory.build('tag', { id: 'Panther' }),
          ])
        })

        describe('query the word that contains the post, the hashtag and the name of the user', () => {
          it('finds the user, the post and the hashtag', async () => {
            variables = { query: 'panther' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.arrayContaining([
                  {
                    __typename: 'User',
                    id: 'f-user',
                    name: 'Peter Panther',
                    slug: 'peter-panther',
                  },
                  {
                    __typename: 'Post',
                    id: 'd-post',
                    title: 'Der Panther',
                    content: `Sein Blick ist vom Vorübergehn der Stäbe<br>
so müd geworden, daß er nichts mehr hält.<br>
Ihm ist, als ob es tausend Stäbe gäbe<br>
und hinter tausend Stäben keine Welt.`,
                  },
                  {
                    __typename: 'Tag',
                    id: 'Panther',
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })

        describe('@query the word that contains the post, the hashtag and the name of the user', () => {
          it('only finds the user', async () => {
            variables = { query: '@panther' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.not.arrayContaining([
                  {
                    __typename: 'Post',
                    id: 'd-post',
                    title: 'Der Panther',
                    content: `Sein Blick ist vom Vorübergehn der Stäbe<br>
so müd geworden, daß er nichts mehr hält.<br>
Ihm ist, als ob es tausend Stäbe gäbe<br>
und hinter tausend Stäben keine Welt.`,
                  },
                  {
                    __typename: 'Tag',
                    id: 'Panther',
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })

        describe('!query the word that contains the post, the hashtag and the name of the user', () => {
          it('only finds the post', async () => {
            variables = { query: '!panther' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.not.arrayContaining([
                  {
                    __typename: 'User',
                    id: 'f-user',
                    name: 'Peter Panther',
                    slug: 'peter-panther',
                  },
                  {
                    __typename: 'Tag',
                    id: 'Panther',
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })

        describe('#query the word that contains the post, the hashtag and the name of the user', () => {
          it('only finds the hashtag', async () => {
            variables = { query: '#panther' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.not.arrayContaining([
                  {
                    __typename: 'User',
                    id: 'f-user',
                    name: 'Peter Panther',
                    slug: 'peter-panther',
                  },
                  {
                    __typename: 'Post',
                    id: 'd-post',
                    title: 'Der Panther',
                    content: `Sein Blick ist vom Vorübergehn der Stäbe<br>
so müd geworden, daß er nichts mehr hält.<br>
Ihm ist, als ob es tausend Stäbe gäbe<br>
und hinter tausend Stäben keine Welt.`,
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })
      })

      describe('adding a post, written by a user who is muted by the authenticated user', () => {
        beforeAll(async () => {
          const mutedUser = await Factory.build('user', {
            id: 'muted-user',
            name: 'Muted',
            slug: 'muted',
          })
          await user.relateTo(mutedUser, 'muted')
          await Factory.build(
            'post',
            {
              id: 'muted-post',
              title: 'Beleidigender Beitrag',
              content: 'Dieser Beitrag stammt von einem bleidigendem Nutzer.',
            },
            { authorId: 'muted-user' },
          )
        })

        describe('query for text in a post written by a muted user', () => {
          it('does not include the post of the muted user in the results', async () => {
            variables = { query: 'beitrag' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: expect.not.arrayContaining([
                  {
                    __typename: 'Post',
                    id: 'muted-post',
                    title: 'Beleidigender Beitrag',
                    content: 'Dieser Beitrag stammt von einem bleidigendem Nutzer.',
                  },
                ]),
              },
              errors: undefined,
            })
          })
        })
      })

      describe('adding a tag', () => {
        beforeAll(async () => {
          await Factory.build('tag', { id: 'myHashtag' })
        })

        describe('query the first four characters of the tag', () => {
          it('finds the tag', async () => {
            variables = { query: 'myha' }

            await expect(query({ query: searchResults, variables })).resolves.toMatchObject({
              data: {
                searchResults: [
                  {
                    __typename: 'Tag',
                    id: 'myHashtag',
                  },
                ],
              },
              errors: undefined,
            })
          })
        })
      })

      describe('searchPostQuery', () => {
        describe('query with limit 1', () => {
          it('has a count greater than 1', async () => {
            variables = { query: 'beitrag', firstPosts: 1, postsOffset: 0 }

            await expect(query({ query: searchPosts, variables })).resolves.toMatchObject({
              data: {
                searchPosts: {
                  postCount: 2,
                  posts: [
                    {
                      __typename: 'Post',
                      id: 'a-post',
                      title: 'Beitrag',
                      content: 'Ein erster Beitrag',
                    },
                  ],
                },
              },
              errors: undefined,
            })
          })
        })
      })
    })
  })
})

// The typed entry points (searchUsers / searchHashtags / searchGroups / searchChatTargets)
// and the groupsEnabled folds. The database is shared with the block above — it is only
// wiped in beforeAll/afterAll — so every fixture below uses the token "quokka", which
// appears in no other fixture of this file.
describe('resolvers/searches — typed entry points', () => {
  // No .gql documents exist for these fields yet, so the operations are inline.
  const searchUsersQuery = `
    query ($query: String!, $firstUsers: Int, $usersOffset: Int) {
      searchUsers(query: $query, firstUsers: $firstUsers, usersOffset: $usersOffset) {
        userCount
        users { id name slug }
      }
    }
  `
  const searchHashtagsQuery = `
    query ($query: String!, $firstHashtags: Int, $hashtagsOffset: Int) {
      searchHashtags(query: $query, firstHashtags: $firstHashtags, hashtagsOffset: $hashtagsOffset) {
        hashtagCount
        hashtags { id }
      }
    }
  `
  const searchGroupsQuery = `
    query ($query: String!, $firstGroups: Int, $groupsOffset: Int) {
      searchGroups(query: $query, firstGroups: $firstGroups, groupsOffset: $groupsOffset) {
        groupCount
        groups { id myRole }
      }
    }
  `
  const searchChatTargetsQuery = `
    query ($query: String!, $limit: Int) {
      searchChatTargets(query: $query, limit: $limit) {
        __typename
        ... on User { id }
        ... on Group { id }
      }
    }
  `
  const searchResultsWithGroupsQuery = `
    query ($query: String!, $limit: Int) {
      searchResults(query: $query, limit: $limit) {
        __typename
        ... on Post { id }
        ... on User { id }
        ... on Tag { id }
        ... on Group { id }
      }
    }
  `

  // Group.description carries a `min: 100` validation; keep it explicit so the fixtures
  // never depend on how long a faker paragraph happens to be.
  const groupDescription =
    'A quokka appreciation group whose description is comfortably longer than the hundred character minimum the Group model demands.'

  let authorJson: Context['user']

  beforeAll(async () => {
    const [author] = await Promise.all([
      Factory.build('user', { id: 'quokka-author', name: 'Quokka Author', slug: 'quokka-author' }),
      Factory.build('user', { id: 'quokka-fan', name: 'Quokka Fan', slug: 'quokka-fan' }),
      Factory.build('tag', { id: 'quokka' }),
      Factory.build('tag', { id: 'quokkas' }),
    ])
    authorJson = await author.toJson()
    await Promise.all([
      Factory.build(
        'post',
        { id: 'quokka-post', title: 'Quokka', content: 'Ein Beitrag über das Quokka.' },
        { authorId: 'quokka-author' },
      ),
      Factory.build(
        'group',
        { id: 'qg-own', name: 'Quokka Owners', groupType: 'public', description: groupDescription },
        { ownerId: 'quokka-author' },
      ),
      Factory.build(
        'group',
        {
          id: 'qg-foreign',
          name: 'Quokka Strangers',
          groupType: 'public',
          description: groupDescription,
        },
        { ownerId: 'quokka-fan' },
      ),
    ])
  })

  afterEach(() => {
    policyOverride = {}
  })

  describe('searchPosts', () => {
    it('returns nothing to an anonymous caller', async () => {
      // Post search is bound to the viewer — the query joins the viewer's MUTED and
      // CANNOT_SEE edges to filter the result. With no viewer nothing matches, which is
      // the fail-closed side: it must never fall through to an unfiltered post listing.
      authenticatedUser = null

      const { data, errors } = await query({
        query: searchPosts,
        variables: { query: 'quokka', firstPosts: 10, postsOffset: 0 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchPosts).toEqual({ postCount: 0, posts: [] })
    })
  })

  describe('searchUsers', () => {
    it('reports the total match count independently of the requested page', async () => {
      // The count must not be computed from the page: a client showing "2 results" while
      // paging one hit at a time would otherwise stop after the first page.
      authenticatedUser = null
      const variables = { query: 'quokka', firstUsers: 1, usersOffset: 0 }

      const firstPage = await query({ query: searchUsersQuery, variables })

      expect(firstPage.errors).toBeUndefined()
      expect(firstPage.data.searchUsers.userCount).toBe(2)
      expect(firstPage.data.searchUsers.users).toHaveLength(1)

      const secondPage = await query({
        query: searchUsersQuery,
        variables: { ...variables, usersOffset: 1 },
      })

      expect(secondPage.data.searchUsers.users).toHaveLength(1)
      // A dropped SKIP would hand back the same hit twice.
      expect(secondPage.data.searchUsers.users[0].id).not.toBe(
        firstPage.data.searchUsers.users[0].id,
      )
    })
  })

  describe('searchHashtags', () => {
    it('reports the total match count independently of the requested page', async () => {
      authenticatedUser = null
      const variables = { query: 'quokka', firstHashtags: 1, hashtagsOffset: 0 }

      const firstPage = await query({ query: searchHashtagsQuery, variables })

      expect(firstPage.errors).toBeUndefined()
      expect(firstPage.data.searchHashtags.hashtagCount).toBe(2)
      expect(firstPage.data.searchHashtags.hashtags).toHaveLength(1)

      const secondPage = await query({
        query: searchHashtagsQuery,
        variables: { ...variables, hashtagsOffset: 1 },
      })

      expect(secondPage.data.searchHashtags.hashtags[0].id).not.toBe(
        firstPage.data.searchHashtags.hashtags[0].id,
      )
    })
  })

  describe('searchGroups', () => {
    it("annotates every hit with the viewer's own membership role", async () => {
      // myRole is what the client renders "join" vs "open" from; resolving it against
      // the wrong viewer would offer a stranger's group as if it were the viewer's.
      authenticatedUser = authorJson

      const { data, errors } = await query({
        query: searchGroupsQuery,
        variables: { query: 'quokka', firstGroups: 10, groupsOffset: 0 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchGroups.groupCount).toBe(2)
      expect(data.searchGroups.groups).toEqual(
        expect.arrayContaining([
          { id: 'qg-own', myRole: 'owner' },
          { id: 'qg-foreign', myRole: null },
        ]),
      )
    })

    it('returns nothing to an anonymous caller', async () => {
      // Group search is bound to the viewer (memberships decide what a closed/hidden
      // group may expose). Without a viewer the query must fall through to nothing
      // rather than degrade into an unfiltered group listing.
      authenticatedUser = null

      const { data, errors } = await query({
        query: searchGroupsQuery,
        variables: { query: 'quokka', firstGroups: 10, groupsOffset: 0 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchGroups).toEqual({ groupCount: 0, groups: [] })
    })
  })

  describe('searchChatTargets', () => {
    it('offers users plus the groups the caller is actually a member of', async () => {
      // A chat target the caller cannot post to is a dead end in the UI — and offering a
      // foreign group as a target would leak its existence.
      authenticatedUser = authorJson

      const { data, errors } = await query({
        query: searchChatTargetsQuery,
        variables: { query: 'quokka', limit: 10 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchChatTargets).toEqual(
        expect.arrayContaining([
          { __typename: 'User', id: 'quokka-author' },
          { __typename: 'User', id: 'quokka-fan' },
          { __typename: 'Group', id: 'qg-own' },
        ]),
      )
      expect(data.searchChatTargets).not.toContainEqual({ __typename: 'Group', id: 'qg-foreign' })
    })

    it('drops group targets while the groups feature is off', async () => {
      // Mirrors searchGroups being gated away entirely; direct-message targets must
      // survive, otherwise switching groups off breaks chat as a whole.
      authenticatedUser = authorJson
      policyOverride = { groupsEnabled: false }

      const { data, errors } = await query({
        query: searchChatTargetsQuery,
        variables: { query: 'quokka', limit: 10 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchChatTargets).toContainEqual({ __typename: 'User', id: 'quokka-author' })
      expect(
        (data.searchChatTargets as { __typename: string }[]).some(
          (target) => target.__typename === 'Group',
        ),
      ).toBe(false)
    })

    describe('with more matches than any page could hold', () => {
      // Written straight to Neo4j: the clamp only becomes observable above 50 hits, and
      // 55 factory users (each with an image and an email node) would dominate the runtime.
      beforeAll(async () => {
        await database.write({
          query: `UNWIND range(1, 55) AS i
                  CREATE (:User {
                    id: 'wombat-' + toString(i),
                    name: 'Wombat ' + toString(i),
                    slug: 'wombat-' + toString(i),
                    deleted: false,
                    disabled: false
                  })`,
          variables: {},
        })
      })

      it('caps an oversized limit at 50', async () => {
        // The limit reaches Cypher directly, so an unclamped one lets a single request
        // pull the whole user table.
        authenticatedUser = authorJson

        const { data, errors } = await query({
          query: searchChatTargetsQuery,
          variables: { query: 'wombat', limit: 1000 },
        })

        expect(errors).toBeUndefined()
        expect(data.searchChatTargets).toHaveLength(50)
      })

      it('falls back to 10 for a limit of 0', async () => {
        authenticatedUser = authorJson

        const { data, errors } = await query({
          query: searchChatTargetsQuery,
          variables: { query: 'wombat', limit: 0 },
        })

        expect(errors).toBeUndefined()
        expect(data.searchChatTargets).toHaveLength(10)
      })

      it('still returns one hit for a negative limit', async () => {
        // A negative LIMIT is a Cypher error, so the lower clamp keeps a hostile
        // argument from turning into a 500.
        authenticatedUser = authorJson

        const { data, errors } = await query({
          query: searchChatTargetsQuery,
          variables: { query: 'wombat', limit: -5 },
        })

        expect(errors).toBeUndefined()
        expect(data.searchChatTargets).toHaveLength(1)
      })
    })
  })

  describe('searchResults', () => {
    it('serves an anonymous caller the viewer-independent entities only', async () => {
      // Users and tags carry no per-viewer filtering, posts and groups do (mutes,
      // restrictions, memberships) and are therefore bound to a viewer. Anonymous search
      // must still answer instead of erroring on the missing user id.
      authenticatedUser = null

      const { data, errors } = await query({
        query: searchResultsWithGroupsQuery,
        variables: { query: 'quokka', limit: 5 },
      })

      expect(errors).toBeUndefined()

      const typenames = (data.searchResults as { __typename: string }[]).map((r) => r.__typename)

      expect(typenames).toContain('User')
      expect(typenames).toContain('Tag')
      expect(typenames).not.toContain('Post')
      expect(typenames).not.toContain('Group')
    })

    it('restricts an "&" query to groups', async () => {
      authenticatedUser = authorJson

      const { data, errors } = await query({
        query: searchResultsWithGroupsQuery,
        variables: { query: '&quokka', limit: 5 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchResults).toEqual(
        expect.arrayContaining([{ __typename: 'Group', id: 'qg-own' }]),
      )
      expect(
        (data.searchResults as { __typename: string }[]).every((r) => r.__typename === 'Group'),
      ).toBe(true)
    })

    it('answers an "&" query with nothing while the groups feature is off', async () => {
      // searchResults is public (no shield gate), so the feature fold has to happen in
      // the resolver — otherwise the global search box stays a way to enumerate groups
      // after the feature was switched off.
      authenticatedUser = authorJson
      policyOverride = { groupsEnabled: false }

      const { data, errors } = await query({
        query: searchResultsWithGroupsQuery,
        variables: { query: '&quokka', limit: 5 },
      })

      expect(errors).toBeUndefined()
      expect(data.searchResults).toEqual([])
    })

    it('drops groups from an untyped query while the groups feature is off', async () => {
      authenticatedUser = authorJson
      policyOverride = { groupsEnabled: false }

      const { data, errors } = await query({
        query: searchResultsWithGroupsQuery,
        variables: { query: 'quokka', limit: 5 },
      })

      expect(errors).toBeUndefined()

      const typenames = (data.searchResults as { __typename: string }[]).map((r) => r.__typename)

      expect(typenames).not.toContain('Group')
      // The other entity types keep working — the fold is scoped to groups.
      expect(typenames).toEqual(expect.arrayContaining(['Post', 'User', 'Tag']))
    })
  })
})
