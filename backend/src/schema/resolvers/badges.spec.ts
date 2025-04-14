import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import createServer from '@src/server'

const driver = getDriver()
const instance = getNeode()

let authenticatedUser, regularUser, administrator, moderator, badge, query, mutate

describe('Badges', () => {
  const variables = {
    from: 'indiegogo_en_rhino',
    to: 'regular-user-id',
  }

  beforeAll(async () => {
    await cleanDatabase()

    const { server } = createServer({
      context: () => {
        return {
          driver,
          neode: instance,
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

  beforeEach(async () => {
    regularUser = await Factory.build(
      'user',
      {
        id: 'regular-user-id',
        role: 'user',
      },
      {
        email: 'user@example.org',
        password: '1234',
      },
    )
    moderator = await Factory.build(
      'user',
      {
        id: 'moderator-id',
        role: 'moderator',
      },
      {
        email: 'moderator@example.org',
      },
    )
    administrator = await Factory.build(
      'user',
      {
        id: 'admin-id',
        role: 'admin',
      },
      {
        email: 'admin@example.org',
      },
    )
    badge = await Factory.build('badge', {
      id: 'indiegogo_en_rhino',
      type: 'badge',
      description: 'You earned a rhino',
      icon: '/img/badges/indiegogo_en_rhino.svg',
    })
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('reward', () => {
    const rewardMutation = gql`
      mutation ($from: ID!, $to: ID!) {
        rewardBadge(badgeId: $from, userId: $to) {
          id
          badges {
            id
          }
        }
      }
    `

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: rewardMutation, variables })).resolves.toMatchObject({
          data: { rewardBadge: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated as moderator', () => {
      beforeEach(async () => {
        authenticatedUser = moderator.toJson()
      })

      describe('rewards badge to user', () => {
        it('throws authorization error', async () => {
          await expect(mutate({ mutation: rewardMutation, variables })).resolves.toMatchObject({
            data: { rewardBadge: null },
            errors: [{ message: 'Not Authorized!' }],
          })
        })
      })
    })

    describe('authenticated as admin', () => {
      beforeEach(async () => {
        authenticatedUser = await administrator.toJson()
      })

      describe('badge for id does not exist', () => {
        it('rejects with an informative error message', async () => {
          await expect(
            mutate({
              mutation: rewardMutation,
              variables: { to: 'regular-user-id', from: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { rewardBadge: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist." }],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardMutation,
              variables: { to: 'non-existent-user-id', from: 'indiegogo_en_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { rewardBadge: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist." }],
          })
        })
      })

      it('rewards a badge to user', async () => {
        const expected = {
          data: {
            rewardBadge: {
              id: 'regular-user-id',
              badges: [{ id: 'indiegogo_en_rhino' }],
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: rewardMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('rewards a second different badge to same user', async () => {
        await Factory.build('badge', {
          id: 'indiegogo_en_racoon',
          type: 'badge',
          description: 'You earned a racoon',
          icon: '/img/badges/indiegogo_en_racoon.svg',
        })
        const badges = [{ id: 'indiegogo_en_racoon' }, { id: 'indiegogo_en_rhino' }]
        const expected = {
          data: {
            rewardBadge: {
              id: 'regular-user-id',
              badges: expect.arrayContaining(badges),
            },
          },
          errors: undefined,
        }
        await mutate({
          mutation: rewardMutation,
          variables: {
            to: 'regular-user-id',
            from: 'indiegogo_en_rhino',
          },
        })
        await expect(
          mutate({
            mutation: rewardMutation,
            variables: {
              to: 'regular-user-id',
              from: 'indiegogo_en_racoon',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards the same badge as well to another user', async () => {
        const expected = {
          data: {
            rewardBadge: {
              id: 'regular-user-2-id',
              badges: [{ id: 'indiegogo_en_rhino' }],
            },
          },
          errors: undefined,
        }
        await Factory.build(
          'user',
          {
            id: 'regular-user-2-id',
          },
          {
            email: 'regular2@email.com',
          },
        )
        await mutate({
          mutation: rewardMutation,
          variables,
        })
        await expect(
          mutate({
            mutation: rewardMutation,
            variables: {
              to: 'regular-user-2-id',
              from: 'indiegogo_en_rhino',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('creates no duplicate reward relationships', async () => {
        await mutate({
          mutation: rewardMutation,
          variables,
        })
        await mutate({
          mutation: rewardMutation,
          variables,
        })

        const userQuery = gql`
          {
            User(id: "regular-user-id") {
              badgesCount
              badges {
                id
              }
            }
          }
        `
        const expected = {
          data: { User: [{ badgesCount: 1, badges: [{ id: 'indiegogo_en_rhino' }] }] },
          errors: undefined,
        }

        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })
  })

  describe('unreward', () => {
    beforeEach(async () => {
      await regularUser.relateTo(badge, 'rewarded')
    })
    const expected = {
      data: { unrewardBadge: { id: 'regular-user-id', badges: [] } },
      errors: undefined,
    }

    const unrewardMutation = gql`
      mutation ($from: ID!, $to: ID!) {
        unrewardBadge(badgeId: $from, userId: $to) {
          id
          badges {
            id
          }
        }
      }
    `

    describe('check test setup', () => {
      it('user has one badge', async () => {
        authenticatedUser = regularUser.toJson()
        const userQuery = gql`
          {
            User(id: "regular-user-id") {
              badgesCount
              badges {
                id
              }
            }
          }
        `
        const expected = {
          data: { User: [{ badgesCount: 1, badges: [{ id: 'indiegogo_en_rhino' }] }] },
          errors: undefined,
        }
        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject({
          data: { unrewardBadge: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated admin', () => {
      beforeEach(async () => {
        authenticatedUser = await administrator.toJson()
      })

      it('removes a badge from user', async () => {
        await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('does not crash when unrewarding multiple times', async () => {
        await mutate({ mutation: unrewardMutation, variables })
        await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })
    })

    describe('authenticated moderator', () => {
      beforeEach(async () => {
        authenticatedUser = await moderator.toJson()
      })

      describe('removes bage from user', () => {
        it('throws authorization error', async () => {
          await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject({
            data: { unrewardBadge: null },
            errors: [{ message: 'Not Authorized!' }],
          })
        })
      })
    })
  })
})
