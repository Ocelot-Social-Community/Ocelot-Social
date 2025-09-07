/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Factory, { cleanDatabase } from '@db/factories'
import { filterPosts } from '@graphql/queries/_filterPosts'
import { CreatePost } from '@graphql/queries/CreatePost'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let user
let authenticatedUser: Context['user']
const config = { CATEGORIES_ACTIVE: false }
const context = () => ({ authenticatedUser, config })
let mutate: ApolloTestSetup['mutate']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = createApolloTestSetup({ context })
  mutate = apolloSetup.mutate
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

describe('Filter Posts', () => {
  const now = new Date()

  beforeAll(async () => {
    user = await Factory.build('user', {
      id: 'user',
      name: 'User',
      about: 'I am a user.',
    })
    authenticatedUser = await user.toJson()
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'a1',
        title: 'I am an article',
        content: 'I am an article written by user.',
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'a2',
        title: 'I am anonther article',
        content: 'I am another article written by user.',
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'e1',
        title: 'Illegaler Kindergeburtstag',
        content: 'Elli wird fünf. Wir feiern ihren Geburtstag.',
        postType: 'Event',
        eventInput: {
          eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
          eventVenue: 'Garten der Familie Maier',
        },
      },
    })
    await mutate({
      mutation: CreatePost,
      variables: {
        id: 'e2',
        title: 'Räuber-Treffen',
        content: 'Planung der nächsten Räuberereien',
        postType: 'Event',
        eventInput: {
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
          eventVenue: 'Wirtshaus im Spessart',
        },
      },
    })
  })

  describe('no filters set', () => {
    it('finds all posts', async () => {
      const {
        data: { Post: result },
      } = (await query({ query: filterPosts })) as any
      expect(result).toHaveLength(4)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'a1' }),
          expect.objectContaining({ id: 'a2' }),
          expect.objectContaining({ id: 'e1' }),
          expect.objectContaining({ id: 'e2' }),
        ]),
      )
    })
  })

  describe('post type filter set to ["Article"]', () => {
    it('finds the articles', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: { filter: { postType_in: ['Article'] } },
      })) as any
      expect(result).toHaveLength(2)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'a1' }),
          expect.objectContaining({ id: 'a2' }),
        ]),
      )
    })
  })

  describe('post type filter set to ["Event"]', () => {
    it('finds the articles', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: { filter: { postType_in: ['Event'] } },
      })) as any
      expect(result).toHaveLength(2)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'e1' }),
          expect.objectContaining({ id: 'e2' }),
        ]),
      )
    })
  })

  describe('post type filter set to ["Article", "Event"]', () => {
    it('finds all posts', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: { filter: { postType_in: ['Article', 'Event'] } },
      })) as any
      expect(result).toHaveLength(4)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'a1' }),
          expect.objectContaining({ id: 'a2' }),
          expect.objectContaining({ id: 'e1' }),
          expect.objectContaining({ id: 'e2' }),
        ]),
      )
    })
  })

  describe('order events by event start descending', () => {
    it('finds the events ordered accordingly', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: { filter: { postType_in: ['Event'] }, orderBy: ['eventStart_desc'] },
      })) as any
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        expect.objectContaining({
          id: 'e1',
          eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
        }),
        expect.objectContaining({
          id: 'e2',
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
        }),
      ])
    })
  })

  // Does not work on months end
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('order events by event start ascending', () => {
    it('finds the events ordered accordingly', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: { filter: { postType_in: ['Event'] }, orderBy: ['eventStart_asc'] },
      })) as any
      expect(result).toHaveLength(2)
      expect(result).toEqual([
        expect.objectContaining({
          id: 'e2',
          eventStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString(),
        }),
        expect.objectContaining({
          id: 'e1',
          eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
        }),
      ])
    })
  })

  // Does not work on months end
  // eslint-disable-next-line jest/no-disabled-tests
  describe.skip('filter events by event start date', () => {
    it('finds only events after given date', async () => {
      const {
        data: { Post: result },
      } = (await query({
        query: filterPosts,
        variables: {
          filter: {
            postType_in: ['Event'],
            eventStart_gte: new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() + 2,
            ).toISOString(),
          },
        },
      })) as any
      expect(result).toHaveLength(1)
      expect(result).toEqual([
        expect.objectContaining({
          id: 'e1',
          eventStart: new Date(now.getFullYear(), now.getMonth() + 1).toISOString(),
        }),
      ])
    })
  })
})
