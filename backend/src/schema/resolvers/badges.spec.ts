import { createTestClient } from 'apollo-server-testing'
import gql from 'graphql-tag'

import Factory, { cleanDatabase } from '@db/factories'
import { getNeode, getDriver } from '@db/neo4j'
import createServer from '@src/server'

const driver = getDriver()
const instance = getNeode()

let authenticatedUser, regularUser, administrator, moderator, badge, verification, query, mutate

describe('Badges', () => {
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
      id: 'badge_rhino',
      type: 'badge',
      description: 'You earned a rhino',
      icon: '/img/badges/indiegogo_en_rhino.svg',
    })

    verification = await Factory.build('badge', {
      id: 'verification_turtle',
      type: 'verification',
      description: 'You are a verified turtle',
      icon: '/img/badges/indiegogo_en_turtle.svg',
    })
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('verify', () => {
    const variables = {
      badgeId: 'verification_turtle',
      userId: 'regular-user-id',
    }

    const verifyMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        verify(badgeId: $badgeId, userId: $userId) {
          id
          verified {
            id
          }
          badges {
            id
          }
        }
      }
    `

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: verifyMutation, variables })).resolves.toMatchObject({
          data: { verify: null },
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
          await expect(mutate({ mutation: verifyMutation, variables })).resolves.toMatchObject({
            data: { verify: null },
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
              mutation: verifyMutation,
              variables: { userId: 'regular-user-id', badgeId: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { verify: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: verifyMutation,
              variables: { userId: 'non-existent-user-id', badgeId: 'verification_turtle' },
            }),
          ).resolves.toMatchObject({
            data: { verify: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      describe('badge is not a verification badge', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: verifyMutation,
              variables: { userId: 'regular-user-id', badgeId: 'badge_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { verify: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      it('rewards a verification badge to the user', async () => {
        const expected = {
          data: {
            verify: {
              id: 'regular-user-id',
              verified: { id: 'verification_turtle' },
              badges: [],
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: verifyMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('overrides the existing verification if a second verification badge is rewarded to the same user', async () => {
        await Factory.build('badge', {
          id: 'verification_racoon',
          type: 'verification',
          description: 'You are a verified racoon',
          icon: '/img/badges/indiegogo_en_racoon.svg',
        })
        const expected = {
          data: {
            verify: {
              id: 'regular-user-id',
              verified: { id: 'verification_racoon' },
              badges: [],
            },
          },
          errors: undefined,
        }
        await mutate({
          mutation: verifyMutation,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'verification_turtle',
          },
        })
        await expect(
          mutate({
            mutation: verifyMutation,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'verification_racoon',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards the same verification badge as well to another user', async () => {
        const expected = {
          data: {
            verify: {
              id: 'regular-user-2-id',
              verified: { id: 'verification_turtle' },
              badges: [],
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
          mutation: verifyMutation,
          variables,
        })
        await expect(
          mutate({
            mutation: verifyMutation,
            variables: {
              userId: 'regular-user-2-id',
              badgeId: 'verification_turtle',
            },
          }),
        ).resolves.toMatchObject(expected)
      })
    })
  })

  describe('reward', () => {
    const variables = {
      badgeId: 'badge_rhino',
      userId: 'regular-user-id',
    }

    const rewardMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        reward(badgeId: $badgeId, userId: $userId) {
          id
          verified {
            id
          }
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
          data: { reward: null },
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
            data: { reward: null },
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
              variables: { userId: 'regular-user-id', badgeId: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { reward: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardMutation,
              variables: { userId: 'non-existent-user-id', badgeId: 'badge_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { reward: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      describe('badge is a verification Badge', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardMutation,
              variables: { userId: 'regular-user-id', badgeId: 'verification_turtle' },
            }),
          ).resolves.toMatchObject({
            data: { reward: null },
            errors: [{ message: "Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type." }],
          })
        })
      })

      it('rewards a badge to the user', async () => {
        const expected = {
          data: {
            reward: {
              id: 'regular-user-id',
              verified: null,
              badges: [{ id: 'badge_rhino' }],
            },
          },
          errors: undefined,
        }
        await expect(mutate({ mutation: rewardMutation, variables })).resolves.toMatchObject(
          expected,
        )
      })

      it('rewards a second different badge to the same user', async () => {
        await Factory.build('badge', {
          id: 'badge_racoon',
          type: 'badge',
          description: 'You earned a racoon',
          icon: '/img/badges/indiegogo_en_racoon.svg',
        })
        const badges = [{ id: 'badge_racoon' }, { id: 'badge_rhino' }]
        const expected = {
          data: {
            reward: {
              id: 'regular-user-id',
              badges: expect.arrayContaining(badges),
            },
          },
          errors: undefined,
        }
        await mutate({
          mutation: rewardMutation,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'badge_rhino',
          },
        })
        await expect(
          mutate({
            mutation: rewardMutation,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'badge_racoon',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards the same badge as well to another user', async () => {
        const expected = {
          data: {
            reward: {
              id: 'regular-user-2-id',
              badges: [{ id: 'badge_rhino' }],
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
              userId: 'regular-user-2-id',
              badgeId: 'badge_rhino',
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
          data: { User: [{ badgesCount: 1, badges: [{ id: 'badge_rhino' }] }] },
          errors: undefined,
        }

        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })
  })

  describe('unreward', () => {
    const variables = {
      badgeId: 'badge_rhino',
      userId: 'regular-user-id',
    }

    beforeEach(async () => {
      await regularUser.relateTo(badge, 'rewarded')
    })
    const expected = {
      data: { unreward: { id: 'regular-user-id', badges: [] } },
      errors: undefined,
    }

    const unrewardMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        unreward(badgeId: $badgeId, userId: $userId) {
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
          data: { User: [{ badgesCount: 1, badges: [{ id: 'badge_rhino' }] }] },
          errors: undefined,
        }
        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject({
          data: { unreward: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated moderator', () => {
      beforeEach(async () => {
        authenticatedUser = await moderator.toJson()
      })

      describe('removes badge from user', () => {
        it('throws authorization error', async () => {
          await expect(mutate({ mutation: unrewardMutation, variables })).resolves.toMatchObject({
            data: { unreward: null },
            errors: [{ message: 'Not Authorized!' }],
          })
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
  })
})
