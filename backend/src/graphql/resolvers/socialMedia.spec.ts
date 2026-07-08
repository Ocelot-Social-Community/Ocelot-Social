/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import Factory, { cleanDatabase } from '@db/factories'
import CreateSocialMedia from '@graphql/queries/users/CreateSocialMedia.gql'
import DeleteSocialMedia from '@graphql/queries/users/DeleteSocialMedia.gql'
import UpdateSocialMedia from '@graphql/queries/users/UpdateSocialMedia.gql'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'
import type { NetworkPolicy } from '@src/policy'
import type { RoleDefinition } from '@src/role'

let authenticatedUser: Context['user']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']
// Per-test role override: when set, the in-memory RoleService is built from these
// definitions instead of the defaults — used to test the socialMedia.create gate by
// giving the viewer a role that lacks it.
let rolesOverride: RoleDefinition[] | undefined
// Per-test network-policy override — these are policy VALUES, not a policy service.
// createApolloTestSetup feeds them to createInMemoryPolicyService (see test/helpers.ts), so
// the resolver/shield receive a REAL PolicyService on context.policy whose getEffective()
// returns these values — the same getEffective the production paths call. Unset keys fall
// back to their schema defaults, so socialMediaEnabled is `true` (feature on) unless a test
// flips it off to check the gate.
let policyOverride: Partial<NetworkPolicy> | undefined

const context = () => ({ authenticatedUser, roles: rolesOverride, policy: policyOverride })

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

describe('SocialMedia', () => {
  let someUser, ownerNode, owner

  const url = 'https://twitter.com/pippi-langstrumpf'
  const newUrl = 'https://twitter.com/bullerby'

  const setUpSocialMedia = async () => {
    const socialMediaNode = await Factory.build('socialMedia', { url })
    await socialMediaNode.relateTo(ownerNode, 'ownedBy')
    return socialMediaNode.toJson()
  }

  const socialMediaAction = async (user, mutation, variables) => {
    authenticatedUser = user
    return query({ query: mutation, variables })
  }

  beforeEach(async () => {
    rolesOverride = undefined
    policyOverride = undefined
    const someUserNode = await Factory.build(
      'user',
      {
        name: 'Kalle Blomqvist',
      },
      {
        email: 'kalle@example.com',
        password: 'abcd',
      },
    )

    someUser = await someUserNode.toJson()
    ownerNode = await Factory.build(
      'user',
      {
        name: 'Pippi Langstrumpf',
      },
      {
        email: 'pippi@example.com',
        password: '1234',
      },
    )
    owner = await ownerNode.toJson()
  })

  // TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
  afterEach(async () => {
    await cleanDatabase()
  })

  describe('create social media', () => {
    let variables

    beforeEach(() => {
      variables = { url }
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const user = null
        const result = await socialMediaAction(user, CreateSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated', () => {
      let user

      beforeEach(() => {
        user = owner
      })

      it('creates social media with the given url', async () => {
        await expect(socialMediaAction(user, CreateSocialMedia, variables)).resolves.toMatchObject({
          data: {
            CreateSocialMedia: {
              id: expect.any(String),
              url,
            },
          },
        })
      })

      it('rejects an empty string as url', async () => {
        variables = { url: '' }
        const result = await socialMediaAction(user, CreateSocialMedia, variables)

        expect(result.errors![0].message).toEqual(
          expect.stringContaining('"url" is not allowed to be empty'),
        )
      })

      it('rejects invalid urls', async () => {
        variables = { url: 'not-a-url' }
        const result = await socialMediaAction(user, CreateSocialMedia, variables)

        expect(result.errors![0].message).toEqual(
          expect.stringContaining('"url" must be a valid uri'),
        )
      })

      it('denies creating social media when the socialMediaEnabled policy is off', async () => {
        policyOverride = { socialMediaEnabled: false }
        const result = await socialMediaAction(user, CreateSocialMedia, variables)
        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })

      it('denies creating social media for a role without socialMedia.create', async () => {
        rolesOverride = [
          {
            name: 'user',
            protected: false,
            permissions: [
              'post.create',
              'comment.create',
              'group.create_public',
              'group.create_closed',
              'user.invite',
            ],
          },
        ]
        const result = await socialMediaAction(user, CreateSocialMedia, variables)
        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('ownedBy', () => {
      it('resolves', async () => {
        const user = someUser
        await expect(socialMediaAction(user, CreateSocialMedia, variables)).resolves.toMatchObject({
          data: {
            CreateSocialMedia: { url, ownedBy: { name: 'Kalle Blomqvist' } },
          },
        })
      })
    })
  })

  describe('update social media', () => {
    let variables

    beforeEach(async () => {
      const socialMedia = await setUpSocialMedia()
      variables = { url: newUrl, id: socialMedia.id }
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const user = null
        const result = await socialMediaAction(user, UpdateSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as other user', () => {
      it('throws authorization error', async () => {
        const user = someUser
        const result = await socialMediaAction(user, UpdateSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as owner', () => {
      let user

      beforeEach(() => {
        user = owner
      })

      it('updates social media with the given id', async () => {
        const expected = {
          data: {
            UpdateSocialMedia: { ...variables },
          },
        }

        await expect(socialMediaAction(user, UpdateSocialMedia, variables)).resolves.toEqual(
          expect.objectContaining(expected),
        )
      })

      it('does not update if the the given id does not exist', async () => {
        variables.id = 'some-id'
        const result = await socialMediaAction(user, UpdateSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })

      it('denies updating when the socialMediaEnabled policy is off', async () => {
        policyOverride = { socialMediaEnabled: false }
        const result = await socialMediaAction(user, UpdateSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })
  })

  describe('delete social media', () => {
    let variables

    beforeEach(async () => {
      const socialMedia = await setUpSocialMedia()
      variables = { url: newUrl, id: socialMedia.id }
    })

    describe('unauthenticated', () => {
      it('throws authorization error', async () => {
        const user = null
        const result = await socialMediaAction(user, DeleteSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as other user', () => {
      it('throws authorization error', async () => {
        const user = someUser
        const result = await socialMediaAction(user, DeleteSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })

    describe('authenticated as owner', () => {
      let user

      beforeEach(() => {
        user = owner
      })

      it('deletes social media with the given id', async () => {
        const expected = {
          data: {
            DeleteSocialMedia: {
              id: variables.id,
              url,
            },
          },
        }

        await expect(socialMediaAction(user, DeleteSocialMedia, variables)).resolves.toEqual(
          expect.objectContaining(expected),
        )
      })

      it('denies deleting when the socialMediaEnabled policy is off', async () => {
        policyOverride = { socialMediaEnabled: false }
        const result = await socialMediaAction(user, DeleteSocialMedia, variables)

        expect(result.errors![0]).toHaveProperty('message', 'Not Authorized!')
      })
    })
  })

  // The socialMedia field is public (anonymous profile viewers reach it), so the
  // gate is enforced server-side in the User.socialMedia resolver — not just hidden
  // in the webapp. When the feature is off, no links are exposed at all.
  describe('reading a user’s socialMedia (server-side field gate)', () => {
    const readSocialMedia = `
      query ($id: ID!) {
        User(id: $id) {
          id
          socialMedia {
            id
            url
          }
        }
      }
    `

    beforeEach(async () => {
      await setUpSocialMedia()
      authenticatedUser = owner
    })

    it('exposes the links while the socialMediaEnabled policy is on', async () => {
      const result = await query({ query: readSocialMedia, variables: { id: owner.id } })

      expect(result.data!.User[0].socialMedia).toEqual([{ id: expect.any(String), url }])
    })

    it('exposes no links while the socialMediaEnabled policy is off', async () => {
      policyOverride = { socialMediaEnabled: false }
      const result = await query({ query: readSocialMedia, variables: { id: owner.id } })

      expect(result.data!.User[0].socialMedia).toEqual([])
    })
  })
})
