/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
    await driver.close()
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
      id: 'trophy_rhino',
      type: 'trophy',
      description: 'You earned a rhino',
      icon: '/img/badges/trophy_blue_rhino.svg',
    })

    verification = await Factory.build('badge', {
      id: 'verification_moderator',
      type: 'verification',
      description: 'You are a moderator',
      icon: '/img/badges/verification_red_moderator.svg',
    })
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('setVerificationBadge', () => {
    const variables = {
      badgeId: 'verification_moderator',
      userId: 'regular-user-id',
    }

    const setVerificationBadgeMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        setVerificationBadge(badgeId: $badgeId, userId: $userId) {
          id
          badgeVerification {
            id
          }
          badgeTrophies {
            id
          }
        }
      }
    `

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(
          mutate({ mutation: setVerificationBadgeMutation, variables }),
        ).resolves.toMatchObject({
          data: { setVerificationBadge: null },
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
          await expect(
            mutate({ mutation: setVerificationBadgeMutation, variables }),
          ).resolves.toMatchObject({
            data: { setVerificationBadge: null },
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
              mutation: setVerificationBadgeMutation,
              variables: { userId: 'regular-user-id', badgeId: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { setVerificationBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: setVerificationBadgeMutation,
              variables: { userId: 'non-existent-user-id', badgeId: 'verification_moderator' },
            }),
          ).resolves.toMatchObject({
            data: { setVerificationBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('badge is not a verification badge', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: setVerificationBadgeMutation,
              variables: { userId: 'regular-user-id', badgeId: 'trophy_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { setVerificationBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      it('rewards a verification badge to the user', async () => {
        const expected = {
          data: {
            setVerificationBadge: {
              id: 'regular-user-id',
              badgeVerification: { id: 'verification_moderator' },
              badgeTrophies: [],
            },
          },
          errors: undefined,
        }
        await expect(
          mutate({ mutation: setVerificationBadgeMutation, variables }),
        ).resolves.toMatchObject(expected)
      })

      it('overrides the existing verification if a second verification badge is rewarded to the same user', async () => {
        await Factory.build('badge', {
          id: 'verification_admin',
          type: 'verification',
          description: 'You are an admin',
          icon: '/img/badges/verification_red_admin.svg',
        })
        const expected = {
          data: {
            setVerificationBadge: {
              id: 'regular-user-id',
              badgeVerification: { id: 'verification_admin' },
              badgeTrophies: [],
            },
          },
          errors: undefined,
        }
        await mutate({
          mutation: setVerificationBadgeMutation,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'verification_moderator',
          },
        })
        await expect(
          mutate({
            mutation: setVerificationBadgeMutation,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'verification_admin',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards the same verification badge as well to another user', async () => {
        const expected = {
          data: {
            setVerificationBadge: {
              id: 'regular-user-2-id',
              badgeVerification: { id: 'verification_moderator' },
              badgeTrophies: [],
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
          mutation: setVerificationBadgeMutation,
          variables,
        })
        await expect(
          mutate({
            mutation: setVerificationBadgeMutation,
            variables: {
              userId: 'regular-user-2-id',
              badgeId: 'verification_moderator',
            },
          }),
        ).resolves.toMatchObject(expected)
      })
    })
  })

  describe('rewardTrophyBadge', () => {
    const variables = {
      badgeId: 'trophy_rhino',
      userId: 'regular-user-id',
    }

    const rewardTrophyBadgeMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        rewardTrophyBadge(badgeId: $badgeId, userId: $userId) {
          id
          badgeVerification {
            id
          }
          badgeTrophies {
            id
          }
        }
      }
    `

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(
          mutate({ mutation: rewardTrophyBadgeMutation, variables }),
        ).resolves.toMatchObject({
          data: { rewardTrophyBadge: null },
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
          await expect(
            mutate({ mutation: rewardTrophyBadgeMutation, variables }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
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
              mutation: rewardTrophyBadgeMutation,
              variables: { userId: 'regular-user-id', badgeId: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardTrophyBadgeMutation,
              variables: { userId: 'non-existent-user-id', badgeId: 'trophy_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('badge is a verification Badge', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardTrophyBadgeMutation,
              variables: { userId: 'regular-user-id', badgeId: 'verification_moderator' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Error: Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      it('rewards a badge to the user', async () => {
        const expected = {
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeVerification: null,
              badgeTrophies: [{ id: 'trophy_rhino' }],
            },
          },
          errors: undefined,
        }
        await expect(
          mutate({ mutation: rewardTrophyBadgeMutation, variables }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards a second different badge to the same user', async () => {
        await Factory.build('badge', {
          id: 'trophy_racoon',
          type: 'trophy',
          description: 'You earned a racoon',
          icon: '/img/badges/trophy_blue_racoon.svg',
        })
        const trophies = [{ id: 'trophy_racoon' }, { id: 'trophy_rhino' }]
        const expected = {
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophies: expect.arrayContaining(trophies),
            },
          },
          errors: undefined,
        }
        await mutate({
          mutation: rewardTrophyBadgeMutation,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'trophy_rhino',
          },
        })
        await expect(
          mutate({
            mutation: rewardTrophyBadgeMutation,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'trophy_racoon',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('rewards the same badge as well to another user', async () => {
        const expected = {
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-2-id',
              badgeTrophies: [{ id: 'trophy_rhino' }],
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
          mutation: rewardTrophyBadgeMutation,
          variables,
        })
        await expect(
          mutate({
            mutation: rewardTrophyBadgeMutation,
            variables: {
              userId: 'regular-user-2-id',
              badgeId: 'trophy_rhino',
            },
          }),
        ).resolves.toMatchObject(expected)
      })

      it('creates no duplicate reward relationships', async () => {
        await mutate({
          mutation: rewardTrophyBadgeMutation,
          variables,
        })
        await mutate({
          mutation: rewardTrophyBadgeMutation,
          variables,
        })

        const userQuery = gql`
          {
            User(id: "regular-user-id") {
              badgeTrophiesCount
              badgeTrophies {
                id
              }
            }
          }
        `
        const expected = {
          data: { User: [{ badgeTrophiesCount: 1, badgeTrophies: [{ id: 'trophy_rhino' }] }] },
          errors: undefined,
        }

        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })
  })

  describe('revokeBadge', () => {
    const variables = {
      badgeId: 'trophy_rhino',
      userId: 'regular-user-id',
    }

    beforeEach(async () => {
      await regularUser.relateTo(badge, 'rewarded')
      await regularUser.relateTo(verification, 'verifies')
    })

    const revokeBadgeMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        revokeBadge(badgeId: $badgeId, userId: $userId) {
          id
          badgeVerification {
            id
          }
          badgeTrophies {
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
              badgeTrophiesCount
              badgeTrophies {
                id
              }
            }
          }
        `
        const expected = {
          data: { User: [{ badgeTrophiesCount: 1, badgeTrophies: [{ id: 'trophy_rhino' }] }] },
          errors: undefined,
        }
        await expect(query({ query: userQuery })).resolves.toMatchObject(expected)
      })
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: revokeBadgeMutation, variables })).resolves.toMatchObject({
          data: { revokeBadge: null },
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
          await expect(mutate({ mutation: revokeBadgeMutation, variables })).resolves.toMatchObject(
            {
              data: { revokeBadge: null },
              errors: [{ message: 'Not Authorized!' }],
            },
          )
        })
      })
    })

    describe('authenticated admin', () => {
      beforeEach(async () => {
        authenticatedUser = await administrator.toJson()
      })

      it('removes a badge from user', async () => {
        await expect(mutate({ mutation: revokeBadgeMutation, variables })).resolves.toMatchObject({
          data: {
            revokeBadge: {
              id: 'regular-user-id',
              badgeVerification: { id: 'verification_moderator' },
              badgeTrophies: [],
            },
          },
          errors: undefined,
        })
      })

      it('does not crash when revoking multiple times', async () => {
        await mutate({ mutation: revokeBadgeMutation, variables })
        await expect(mutate({ mutation: revokeBadgeMutation, variables })).resolves.toMatchObject({
          data: {
            revokeBadge: {
              id: 'regular-user-id',
              badgeVerification: { id: 'verification_moderator' },
              badgeTrophies: [],
            },
          },
          errors: undefined,
        })
      })

      it('removes a verification from user', async () => {
        await expect(
          mutate({
            mutation: revokeBadgeMutation,
            variables: {
              badgeId: 'verification_moderator',
              userId: 'regular-user-id',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            revokeBadge: {
              id: 'regular-user-id',
              badgeVerification: null,
              badgeTrophies: [{ id: 'trophy_rhino' }],
            },
          },
          errors: undefined,
        })
      })

      it('does not crash when removing verification multiple times', async () => {
        await mutate({
          mutation: revokeBadgeMutation,
          variables: {
            badgeId: 'verification_moderator',
            userId: 'regular-user-id',
          },
        })
        await expect(
          mutate({
            mutation: revokeBadgeMutation,
            variables: {
              badgeId: 'verification_moderator',
              userId: 'regular-user-id',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            revokeBadge: {
              id: 'regular-user-id',
              badgeVerification: null,
              badgeTrophies: [{ id: 'trophy_rhino' }],
            },
          },
          errors: undefined,
        })
      })
    })
  })
})
