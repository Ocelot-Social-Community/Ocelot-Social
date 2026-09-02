/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import GroupWithLocationFilter from '@graphql/queries/groups/GroupWithLocationFilter.gql'
import PostWithLocationFilter from '@graphql/queries/posts/PostWithLocationFilter.gql'
import UserWithLocationFilter from '@graphql/queries/users/UserWithLocationFilter.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

beforeAll(async () => {
  await cleanDatabase()
  const apolloSetup = await createApolloTestSetup({ context })
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

afterEach(async () => {
  await cleanDatabase()
})

describe('hasLocation filter', () => {
  describe('User', () => {
    beforeEach(async () => {
      const location = await Factory.build('location', {
        id: 'loc-hamburg',
        name: 'Hamburg',
        type: 'region',
        lng: 10.0,
        lat: 53.55,
      })
      const userWithLocation = await Factory.build('user', {
        id: 'u-with-loc',
        name: 'User With Location',
      })
      await userWithLocation.relateTo(location, 'isIn')
      await Factory.build('user', {
        id: 'u-without-loc',
        name: 'User Without Location',
      })
      authenticatedUser = await userWithLocation.toJson()
    })

    it('returns all users without filter', async () => {
      const result = await query({ query: UserWithLocationFilter })
      expect(result.data?.User.length).toBeGreaterThanOrEqual(2)
    })

    it('returns only users with location when hasLocation is true', async () => {
      const result = await query({
        query: UserWithLocationFilter,
        variables: { filter: { hasLocation: true } },
      })
      const ids = result.data?.User.map((u: { id: string }) => u.id)
      expect(ids).toContain('u-with-loc')
      expect(ids).not.toContain('u-without-loc')
    })
  })

  describe('Group', () => {
    beforeEach(async () => {
      const location = await Factory.build('location', {
        id: 'loc-berlin',
        name: 'Berlin',
        type: 'region',
        lng: 13.4,
        lat: 52.52,
      })
      const owner = await Factory.build('user', { id: 'group-owner', name: 'Owner' })
      authenticatedUser = await owner.toJson()

      const groupWithLocation = await Factory.build('group', {
        id: 'g-with-loc',
        name: 'Group With Location',
        groupType: 'public',
        ownerId: 'group-owner',
      })
      await groupWithLocation.relateTo(location, 'isIn')

      await Factory.build('group', {
        id: 'g-without-loc',
        name: 'Group Without Location',
        groupType: 'public',
        ownerId: 'group-owner',
      })
    })

    it('returns all groups without filter', async () => {
      const result = await query({ query: GroupWithLocationFilter })
      expect(result.data?.Group.length).toBeGreaterThanOrEqual(2)
    })

    it('returns only groups with location when hasLocation is true', async () => {
      const result = await query({
        query: GroupWithLocationFilter,
        variables: { hasLocation: true },
      })
      const ids = result.data?.Group.map((g: { id: string }) => g.id)
      expect(ids).toContain('g-with-loc')
      expect(ids).not.toContain('g-without-loc')
    })
  })

  describe('Post', () => {
    beforeEach(async () => {
      const author = await Factory.build('user', { id: 'post-author', name: 'Author' })
      authenticatedUser = await author.toJson()

      await Factory.build('location', {
        id: 'loc-munich',
        name: 'Munich',
        type: 'region',
        lng: 11.58,
        lat: 48.14,
      })
      await Factory.build('post', {
        id: 'p-with-loc',
        title: 'Event With Location',
        postType: 'Event',
        authorId: 'post-author',
      })
      // Post model has no isIn relationship defined in Neode, use Cypher directly
      const session = database.driver.session()
      try {
        await session.writeTransaction((txc) =>
          txc.run(`
            MATCH (p:Post {id: 'p-with-loc'}), (l:Location {id: 'loc-munich'})
            MERGE (p)-[:IS_IN]->(l)
          `),
        )
      } finally {
        await session.close()
      }

      await Factory.build('post', {
        id: 'p-without-loc',
        title: 'Event Without Location',
        postType: 'Event',
        authorId: 'post-author',
      })
    })

    it('returns all posts without hasLocation filter', async () => {
      const result = await query({
        query: PostWithLocationFilter,
      })
      expect(result.data?.Post.length).toBeGreaterThanOrEqual(2)
    })

    it('returns only posts with location when hasLocation is true', async () => {
      const result = await query({
        query: PostWithLocationFilter,
        variables: { filter: { hasLocation: true } },
      })
      const ids = result.data?.Post.map((p: { id: string }) => p.id)
      expect(ids).toContain('p-with-loc')
      expect(ids).not.toContain('p-without-loc')
    })
  })
})
