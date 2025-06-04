/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import gql from 'graphql-tag'

import { TROPHY_BADGES_SELECTED_MAX } from '@constants/badges'
import Factory, { cleanDatabase } from '@db/factories'
import { rewardTrophyBadge } from '@graphql/queries/rewardTrophyBadge'
import { setTrophyBadgeSelected } from '@graphql/queries/setTrophyBadgeSelected'
import type { ApolloTestSetup } from '@root/test/helpers'
import { createApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let regularUser, administrator, moderator, badge, verification

let authenticatedUser: Context['user']
const context = () => ({ authenticatedUser })
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

afterAll(() => {
  void server.stop()
  void database.driver.close()
  database.neode.close()
})

describe('Badges', () => {
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
            isDefault
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
      beforeEach(() => {
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
              badgeVerification: { id: 'verification_moderator', isDefault: false },
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
              badgeVerification: { id: 'verification_admin', isDefault: false },
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
              badgeVerification: { id: 'verification_moderator', isDefault: false },
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

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        authenticatedUser = null
        await expect(mutate({ mutation: rewardTrophyBadge, variables })).resolves.toMatchObject({
          data: { rewardTrophyBadge: null },
          errors: [{ message: 'Not Authorized!' }],
        })
      })
    })

    describe('authenticated as moderator', () => {
      beforeEach(() => {
        authenticatedUser = moderator.toJson()
      })

      describe('rewards badge to user', () => {
        it('throws authorization error', async () => {
          await expect(mutate({ mutation: rewardTrophyBadge, variables })).resolves.toMatchObject({
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
              mutation: rewardTrophyBadge,
              variables: { userId: 'regular-user-id', badgeId: 'non-existent-badge-id' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('non-existent user', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardTrophyBadge,
              variables: { userId: 'non-existent-user-id', badgeId: 'trophy_rhino' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      describe('badge is a verification Badge', () => {
        it('rejects with a telling error message', async () => {
          await expect(
            mutate({
              mutation: rewardTrophyBadge,
              variables: { userId: 'regular-user-id', badgeId: 'verification_moderator' },
            }),
          ).resolves.toMatchObject({
            data: { rewardTrophyBadge: null },
            errors: [
              {
                message:
                  'Could not reward badge! Ensure the user and the badge exist and the badge is of the correct type.',
              },
            ],
          })
        })
      })

      it('rewards a badge to the user', async () => {
        await expect(mutate({ mutation: rewardTrophyBadge, variables })).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeVerification: { id: 'default_verification', isDefault: true },
              badgeTrophies: [{ id: 'trophy_rhino' }],
              badgeTrophiesSelected: [
                { id: 'trophy_rhino' },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('rewards a second different badge to the same user', async () => {
        await Factory.build('badge', {
          id: 'trophy_racoon',
          type: 'trophy',
          description: 'You earned a racoon',
          icon: '/img/badges/trophy_blue_racoon.svg',
        })
        await mutate({
          mutation: rewardTrophyBadge,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'trophy_racoon',
          },
        })
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'trophy_rhino',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophies: expect.arrayContaining([
                { id: 'trophy_racoon' },
                { id: 'trophy_rhino' },
              ]),
              badgeTrophiesSelected: [
                { id: 'trophy_racoon' },
                {
                  id: 'trophy_rhino',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('does not select a badge again when already rewarded and unselected by the user', async () => {
        await Factory.build('badge', {
          id: 'trophy_racoon',
          type: 'trophy',
          description: 'You earned a racoon',
          icon: '/img/badges/trophy_blue_racoon.svg',
        })
        await mutate({
          mutation: rewardTrophyBadge,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'trophy_rhino',
          },
        })
        await mutate({
          mutation: rewardTrophyBadge,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'trophy_racoon',
          },
        })
        authenticatedUser = await regularUser.toJson()
        await mutate({
          mutation: setTrophyBadgeSelected,
          variables: {
            slot: 0,
            badgeId: null,
          },
        })
        authenticatedUser = await administrator.toJson()
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'trophy_rhino',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophies: expect.arrayContaining([
                { id: 'trophy_racoon' },
                { id: 'trophy_rhino' },
              ]),
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                },
                { id: 'trophy_racoon' },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('does fill gaps in the selection array when rewarding new badges', async () => {
        await Factory.build('badge', {
          id: 'trophy_racoon',
          type: 'trophy',
          description: 'You earned a racoon',
          icon: '/img/badges/trophy_blue_racoon.svg',
        })
        await mutate({
          mutation: rewardTrophyBadge,
          variables: {
            userId: 'regular-user-id',
            badgeId: 'trophy_rhino',
          },
        })
        authenticatedUser = await regularUser.toJson()
        await mutate({
          mutation: setTrophyBadgeSelected,
          variables: {
            slot: 1,
            badgeId: 'trophy_rhino',
          },
        })
        authenticatedUser = await administrator.toJson()
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'trophy_racoon',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophies: expect.arrayContaining([
                { id: 'trophy_racoon' },
                { id: 'trophy_rhino' },
              ]),
              badgeTrophiesSelected: [
                { id: 'trophy_racoon' },
                { id: 'trophy_rhino' },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('does not select badge when maximum selected are already reached', async () => {
        for (let i = 0; i < TROPHY_BADGES_SELECTED_MAX; i++) {
          await Factory.build('badge', {
            id: `trophy_${i}`,
            type: 'trophy',
            description: `You earned a ${i}`,
            icon: `/img/badges/trophy_blue_${i}.svg`,
          })
          await mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-id',
              badgeId: `trophy_${i}`,
            },
          })
        }
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-id',
              badgeId: 'trophy_rhino',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophies: expect.arrayContaining([
                { id: 'trophy_0' },
                { id: 'trophy_1' },
                { id: 'trophy_2' },
                { id: 'trophy_3' },
                { id: 'trophy_4' },
                { id: 'trophy_5' },
                { id: 'trophy_6' },
                { id: 'trophy_7' },
                { id: 'trophy_8' },
                { id: 'trophy_rhino' },
              ]),
              badgeTrophiesSelected: [
                { id: 'trophy_0' },
                { id: 'trophy_1' },
                { id: 'trophy_2' },
                { id: 'trophy_3' },
                { id: 'trophy_4' },
                { id: 'trophy_5' },
                { id: 'trophy_6' },
                { id: 'trophy_7' },
                { id: 'trophy_8' },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('rewards the same badge as well to another user', async () => {
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
          mutation: rewardTrophyBadge,
          variables,
        })
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables: {
              userId: 'regular-user-2-id',
              badgeId: 'trophy_rhino',
            },
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-2-id',
              badgeTrophies: [{ id: 'trophy_rhino' }],
              badgeTrophiesSelected: [
                { id: 'trophy_rhino' },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
      })

      it('creates no duplicate reward relationships', async () => {
        await mutate({
          mutation: rewardTrophyBadge,
          variables,
        })
        await expect(
          mutate({
            mutation: rewardTrophyBadge,
            variables,
          }),
        ).resolves.toMatchObject({
          data: {
            rewardTrophyBadge: {
              id: 'regular-user-id',
              badgeTrophiesCount: 1,
              badgeTrophies: [{ id: 'trophy_rhino' }],
              badgeTrophiesSelected: [
                { id: 'trophy_rhino' },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
                {
                  id: 'default_trophy',
                },
              ],
            },
          },
          errors: undefined,
        })
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
      await regularUser.relateTo(badge, 'selected', { slot: 6 })
    })

    const revokeBadgeMutation = gql`
      mutation ($badgeId: ID!, $userId: ID!) {
        revokeBadge(badgeId: $badgeId, userId: $userId) {
          id
          badgeTrophies {
            id
          }
          badgeVerification {
            id
            isDefault
          }
          badgeTrophiesSelected {
            id
            isDefault
          }
        }
      }
    `

    describe('check test setup', () => {
      it('user has one badge and has it selected', async () => {
        authenticatedUser = await regularUser.toJson()
        const userQuery = gql`
          {
            User(id: "regular-user-id") {
              badgeTrophiesCount
              badgeTrophies {
                id
              }
              badgeVerification {
                id
                isDefault
              }
              badgeTrophiesSelected {
                id
                isDefault
              }
            }
          }
        `
        const expected = {
          data: {
            User: [
              {
                badgeTrophiesCount: 1,
                badgeTrophies: [{ id: 'trophy_rhino' }],
                badgeVerification: {
                  id: 'verification_moderator',
                  isDefault: false,
                },
                badgeTrophiesSelected: [
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'trophy_rhino',
                    isDefault: false,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                  {
                    id: 'default_trophy',
                    isDefault: true,
                  },
                ],
              },
            ],
          },
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
              badgeVerification: { id: 'verification_moderator', isDefault: false },
              badgeTrophies: [],
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
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
              badgeVerification: { id: 'verification_moderator', isDefault: false },
              badgeTrophies: [],
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
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
              badgeVerification: { id: 'default_verification', isDefault: true },
              badgeTrophies: [{ id: 'trophy_rhino' }],
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'trophy_rhino',
                  isDefault: false,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
              ],
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
              badgeVerification: { id: 'default_verification', isDefault: true },
              badgeTrophies: [{ id: 'trophy_rhino' }],
              badgeTrophiesSelected: [
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'trophy_rhino',
                  isDefault: false,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
                },
                {
                  id: 'default_trophy',
                  isDefault: true,
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
