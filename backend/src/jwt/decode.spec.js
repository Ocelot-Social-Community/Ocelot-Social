import Factory, { cleanDatabase } from '../db/factories'
import { getDriver, getNeode } from '../db/neo4j'
import decode from './decode'

const driver = getDriver()
const neode = getNeode()

// here is the decoded JWT token:
// {
//   role: 'user',
//   locationName: null,
//   name: 'Jenny Rostock',
//   about: null,
//   avatar: 'https://s3.amazonaws.com/uifaces/faces/twitter/sasha_shestakov/128.jpg',
//   id: 'u3',
//   email: 'user@example.org',
//   slug: 'jenny-rostock',
//   iat: 1550846680,
//   exp: 1637246680,
//   aud: 'http://localhost:3000',
//   iss: 'http://localhost:4000',
//   sub: 'u3'
// }
export const validAuthorizationHeader =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoidXNlciIsImxvY2F0aW9uTmFtZSI6bnVsbCwibmFtZSI6Ikplbm55IFJvc3RvY2siLCJhYm91dCI6bnVsbCwiYXZhdGFyIjoiaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tL3VpZmFjZXMvZmFjZXMvdHdpdHRlci9zYXNoYV9zaGVzdGFrb3YvMTI4LmpwZyIsImlkIjoidTMiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5vcmciLCJzbHVnIjoiamVubnktcm9zdG9jayIsImlhdCI6MTU1MDg0NjY4MCwiZXhwIjoxNjM3MjQ2NjgwLCJhdWQiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjQwMDAiLCJzdWIiOiJ1MyJ9.eZ_mVKas4Wzoc_JrQTEWXyRn7eY64cdIg4vqQ-F_7Jc'

beforeAll(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
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
    beforeEach(() => {
      authorizationHeader = validAuthorizationHeader
    })
    it('returns null', returnsNull)

    describe('and corresponding user in the database', () => {
      let user
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
      })

      it('returns user object without email', async () => {
        await expect(decode(driver, authorizationHeader)).resolves.toMatchObject({
          role: 'user',
          name: 'Jenny Rostock',
          id: 'u3',
          slug: 'jenny-rostock',
        })
      })

      it('sets `lastActiveAt`', async () => {
        let user = await neode.first('User', { id: 'u3' })
        await expect(user.toJson()).resolves.not.toHaveProperty('lastActiveAt')
        await decode(driver, authorizationHeader)
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
        await decode(driver, authorizationHeader)
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
    })
  })
})
