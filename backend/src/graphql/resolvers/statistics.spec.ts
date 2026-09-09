/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeAll, afterAll, afterEach, describe, beforeEach, it, expect } from 'vitest'

import Factory, { assignRoleEdge, cleanDatabase } from '@db/factories'
import statistics from '@graphql/queries/statistics.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let currentUser

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

describe('statistics', () => {
  describe('unauthenticated', () => {
    beforeEach(() => {
      authenticatedUser = null
    })

    it('throws authorization error', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated as user', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      authenticatedUser = await currentUser.toJson()
    })

    it('throws authorization error', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated as moderator', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
        role: 'moderator',
      })
      authenticatedUser = await currentUser.toJson()
    })

    it('throws authorization error', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: null,
        errors: [{ message: 'Not Authorized!' }],
      })
    })
  })

  describe('authenticated as admin', () => {
    beforeEach(async () => {
      currentUser = await database.neode.create('User', {
        name: 'Current User',
        id: 'u1',
      })
      // Single-role model: admin permissions come from a HAS_ROLE edge, not a
      // legacy user.role property.
      await assignRoleEdge(currentUser, 'admin')
      authenticatedUser = await currentUser.toJson()
    })

    describe('countUsers', () => {
      beforeEach(async () => {
        await Promise.all(
          [...Array(6).keys()].map(() => {
            return Factory.build('user')
          }),
        )
      })

      it('returns the count of all users', async () => {
        await expect(query({ query: statistics })).resolves.toMatchObject({
          data: { statistics: { users: 6 } },
          errors: undefined,
        })
      })
    })

    describe('countPosts', () => {
      beforeEach(async () => {
        await Promise.all(
          [...Array(3).keys()].map(() => {
            return Factory.build('post')
          }),
        )
      })

      it('returns the count of all posts', async () => {
        await expect(query({ query: statistics })).resolves.toMatchObject({
          data: { statistics: { posts: 3 } },
          errors: undefined,
        })
      })
    })

    describe('countComments', () => {
      beforeEach(async () => {
        await Promise.all(
          [...Array(2).keys()].map(() => {
            return Factory.build('comment')
          }),
        )
      })

      it('returns the count of all comments', async () => {
        await expect(query({ query: statistics })).resolves.toMatchObject({
          data: { statistics: { comments: 2 } },
          errors: undefined,
        })
      })
    })

    describe('countFollows', () => {
      let users

      beforeEach(async () => {
        users = await Promise.all(
          [...Array(2).keys()].map(() => {
            return Factory.build('user')
          }),
        )
        await users[0].relateTo(users[1], 'following')
      })

      it('returns the count of all follows', async () => {
        await expect(query({ query: statistics })).resolves.toMatchObject({
          data: { statistics: { follows: 1 } },
          errors: undefined,
        })
      })
    })

    describe('countShouts', () => {
      let users, posts

      beforeEach(async () => {
        users = await Promise.all(
          [...Array(2).keys()].map(() => {
            return Factory.build('user')
          }),
        )
        posts = await Promise.all(
          [...Array(3).keys()].map(() => {
            return Factory.build('post')
          }),
        )
        await Promise.all([
          users[0].relateTo(posts[1], 'shouted'),
          users[1].relateTo(posts[0], 'shouted'),
        ])
      })

      it('returns the count of all shouts', async () => {
        await expect(query({ query: statistics })).resolves.toMatchObject({
          data: { statistics: { shouts: 2 } },
          errors: undefined,
        })
      })
    })
  })

  // apoc.meta.stats() reports only labels that EXIST — on a network with nothing in it the `User`
  // and `EmailAddress` entries are absent from the map rather than zero. Without the `?? 0` every
  // counter read off them is NaN, and the two that are DIFFERENCES (users minus deleted, emails
  // minus users) stay NaN. A freshly installed network is exactly when an admin opens this page
  // for the first time.
  describe('on a network with no data at all', () => {
    beforeEach(async () => {
      await cleanDatabase()
      // A LITERAL viewer with no User node of its own — the one way to ask this question, since
      // any admin stored in the database would put `User` (and its `EmailAddress`) straight back
      // into apoc's label map. The harness honours a literal roleName for exactly this case.
      authenticatedUser = { id: 'nobody', roleName: 'admin' } as Context['user']
    })

    it('reports zeros rather than NaN', async () => {
      await expect(query({ query: statistics })).resolves.toMatchObject({
        data: {
          statistics: { users: 0, usersDeleted: 0, emails: 0, invites: 0, posts: 0, reports: 0 },
        },
        errors: undefined,
      })
    })
  })
})
