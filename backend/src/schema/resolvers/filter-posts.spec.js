import { createTestClient } from 'apollo-server-testing'
import Factory, { cleanDatabase } from '../../db/factories'
import { getNeode, getDriver } from '../../db/neo4j'
import createServer from '../../server'
import CONFIG from '../../config'
import { filterPosts, createPostMutation } from '../../graphql/posts'

CONFIG.CATEGORIES_ACTIVE = false

const driver = getDriver()
const neode = getNeode()

let query
let mutate
let authenticatedUser
let user

beforeAll(async () => {
  await cleanDatabase()

  const { server } = createServer({
    context: () => {
      return {
        driver,
        neode,
        user: authenticatedUser,
      }
    },
  })
  query = createTestClient(server).query
  mutate = createTestClient(server).mutate
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
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
      mutation: createPostMutation(),
      variables: {
        id: 'a1',
        title: 'I am an article',
        content: 'I am an article written by user.',
      },
    })
    await mutate({
      mutation: createPostMutation(),
      variables: {
        id: 'a2',
        title: 'I am anonther article',
        content: 'I am another article written by user.',
      },
    })
    await mutate({
      mutation: createPostMutation(),
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
      mutation: createPostMutation(),
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
      } = await query({ query: filterPosts() })
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
      } = await query({ query: filterPosts(), variables: { filter: { postType_in: ['Article'] } } })
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
      } = await query({ query: filterPosts(), variables: { filter: { postType_in: ['Event'] } } })
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
    it('finds the articles', async () => {
      const {
        data: { Post: result },
      } = await query({
        query: filterPosts(),
        variables: { filter: { postType_in: ['Article', 'Event'] } },
      })
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
})
