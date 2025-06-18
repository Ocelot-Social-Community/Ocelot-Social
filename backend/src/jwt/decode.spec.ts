/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Factory, { cleanDatabase } from '@db/factories'
import User from '@db/models/User'
import { getDriver, getNeode } from '@db/neo4j'
import { TEST_CONFIG } from '@root/test/helpers'

import { decode } from './decode'
import { encode } from './encode'

const driver = getDriver()
const neode = getNeode()
const config = {
  JWT_SECRET: 'supersecret',
  JWT_EXPIRES: TEST_CONFIG.JWT_EXPIRES,
  CLIENT_URI: TEST_CONFIG.CLIENT_URI,
  GRAPHQL_URI: TEST_CONFIG.GRAPHQL_URI,
}
const context = { driver, config }

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await driver.close()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('decode', () => {
  let authorizationHeader: string | undefined | null
  const returnsNull = async () => {
    await expect(decode(context)(authorizationHeader)).resolves.toBeNull()
  }

  describe('given `null` as JWT Bearer token', () => {
    beforeEach(() => {
      authorizationHeader = null
    })

    it('returns null', returnsNull)
  })

  describe('given no JWT Bearer token', () => {
    beforeEach(() => {
      authorizationHeader = undefined
    })

    it('returns null', returnsNull)
  })

  describe('given malformed JWT Bearer token', () => {
    beforeEach(() => {
      authorizationHeader = 'blah'
    })

    it('returns null', returnsNull)
  })

  describe('given valid JWT Bearer token', () => {
    describe('and corresponding user in the database', () => {
      let user
      let validAuthorizationHeader: string
      beforeEach(async () => {
        user = await Factory.build(
          'user',
          {
            role: 'user',
            name: 'Jenny Rostock',
            id: 'u3',
            slug: 'jenny-rostock',
          },
          {
            image: Factory.build('image', {
              url: 'https://s3.amazonaws.com/uifaces/faces/twitter/sasha_shestakov/128.jpg',
            }),
            email: 'user@example.org',
          },
        )
        validAuthorizationHeader = encode(context)(await user.toJson())
      })

      it('returns user object without email', async () => {
        await expect(decode(context)(validAuthorizationHeader)).resolves.toMatchObject({
          role: 'user',
          name: 'Jenny Rostock',
          id: 'u3',
          slug: 'jenny-rostock',
        })
      })

      it('sets `lastActiveAt`', async () => {
        let user = await neode.first<typeof User>('User', { id: 'u3' }, undefined)
        await expect(user.toJson()).resolves.not.toHaveProperty('lastActiveAt')
        await decode(context)(validAuthorizationHeader)
        user = await neode.first<typeof User>('User', { id: 'u3' }, undefined)
        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: expect.any(String),
        })
      })

      it('updates `lastActiveAt` for every authenticated request', async () => {
        let user = await neode.first('User', { id: 'u3' }, undefined)
        await user.update({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updatedAt: new Date().toISOString() as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lastActiveAt: '2019-10-03T23:33:08.598Z' as any,
        })
        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: '2019-10-03T23:33:08.598Z',
        })
        await decode(context)(validAuthorizationHeader)
        user = await neode.first<typeof User>('User', { id: 'u3' }, undefined)
        await expect(user.toJson()).resolves.toMatchObject({
          // should be a different time by now ;)
          lastActiveAt: expect.not.stringContaining('2019-10-03T23:33'),
        })
      })

      describe('but user is deleted', () => {
        beforeEach(async () => {
          await user.update({ updatedAt: new Date().toISOString(), deleted: true })
        })

        it('returns null', returnsNull)
      })

      describe('but user is disabled', () => {
        beforeEach(async () => {
          await user.update({ updatedAt: new Date().toISOString(), disabled: true })
        })

        it('returns null', returnsNull)
      })

      describe('and NO corresponding user in the database', () => {
        beforeEach(async () => {
          await cleanDatabase()
          authorizationHeader = validAuthorizationHeader
        })

        it('returns null', returnsNull)
      })
    })
  })
})
