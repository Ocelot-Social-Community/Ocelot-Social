/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import Factory, { cleanDatabase } from '@db/factories'
import { CreateSocialMedia } from '@graphql/queries/CreateSocialMedia'
import { DeleteSocialMedia } from '@graphql/queries/DeleteSocialMedia'
import { UpdateSocialMedia } from '@graphql/queries/UpdateSocialMedia'
import { createApolloTestSetup } from '@root/test/helpers'

import type { ApolloTestSetup } from '@root/test/helpers'
import type { Context } from '@src/context'

let authenticatedUser: Context['user']
let query: ApolloTestSetup['query']
let database: ApolloTestSetup['database']
let server: ApolloTestSetup['server']

const context = () => ({ authenticatedUser })

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
    })
  })
})
