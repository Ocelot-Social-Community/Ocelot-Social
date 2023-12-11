import Factory, { cleanDatabase } from '../db/factories'
import { getDriver, getNeode } from '../db/neo4j'
import decode from './decode'
import encode from './encode'

const driver = getDriver()
const neode = getNeode()

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  driver.close()
})

// TODO: avoid database clean after each test in the future if possible for performance and flakyness reasons by filling the database step by step, see issue https://github.com/Ocelot-Social-Community/Ocelot-Social/issues/4543
afterEach(async () => {
  await cleanDatabase()
})

describe('decode', () => {
  let authorizationHeader
  const returnsNull = async () => {
    await expect(decode(driver, authorizationHeader)).resolves.toBeNull()
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
      let user, validAuthorizationHeader
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
        validAuthorizationHeader = encode(await user.toJson())
      })

      it('returns user object without email', async () => {
        await expect(decode(driver, validAuthorizationHeader)).resolves.toMatchObject({
          role: 'user',
          name: 'Jenny Rostock',
          id: 'u3',
          slug: 'jenny-rostock',
        })
      })

      it('sets `lastActiveAt`', async () => {
        let user = await neode.first('User', { id: 'u3' })
        await expect(user.toJson()).resolves.not.toHaveProperty('lastActiveAt')
        await decode(driver, validAuthorizationHeader)
        user = await neode.first('User', { id: 'u3' })
        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: expect.any(String),
        })
      })

      it('updates `lastActiveAt` for every authenticated request', async () => {
        let user = await neode.first('User', { id: 'u3' })
        await user.update({
          updatedAt: new Date().toISOString(),
          lastActiveAt: '2019-10-03T23:33:08.598Z',
        })
        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: '2019-10-03T23:33:08.598Z',
        })
        await decode(driver, validAuthorizationHeader)
        user = await neode.first('User', { id: 'u3' })
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
