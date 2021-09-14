import { handler } from './webfinger'
import Factory, { cleanDatabase } from '../../db/factories'
import { getDriver } from '../../db/neo4j'
import CONFIG from '../../config'

let resource, res, json, status, contentType

const driver = getDriver()

const request = () => {
  json = jest.fn()
  status = jest.fn(() => ({ json }))
  contentType = jest.fn(() => ({ json }))
  res = { status, contentType }
  const req = {
    app: {
      get: (key) => {
        return {
          driver,
        }[key]
      },
    },
    query: {
      resource,
    },
  }
  return handler(req, res)
}

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

describe('webfinger', () => {
  describe('no ressource', () => {
    beforeEach(() => {
      resource = undefined
    })

    it('sends HTTP 400', async () => {
      await request()
      expect(status).toHaveBeenCalledWith(400)
      expect(json).toHaveBeenCalledWith({
        error: 'Query parameter "?resource=acct:<USER>@<DOMAIN>" is missing.',
      })
    })
  })

  describe('?resource query param', () => {
    describe('is missing acct:', () => {
      beforeEach(() => {
        resource = 'some-user@domain'
      })

      it('sends HTTP 400', async () => {
        await request()
        expect(status).toHaveBeenCalledWith(400)
        expect(json).toHaveBeenCalledWith({
          error: 'Query parameter "?resource=acct:<USER>@<DOMAIN>" is missing.',
        })
      })
    })

    describe('has no domain', () => {
      beforeEach(() => {
        resource = 'acct:some-user@'
      })

      it('sends HTTP 400', async () => {
        await request()
        expect(status).toHaveBeenCalledWith(400)
        expect(json).toHaveBeenCalledWith({
          error: 'Query parameter "?resource=acct:<USER>@<DOMAIN>" is missing.',
        })
      })
    })

    describe('with acct:', () => {
      beforeEach(() => {
        resource = 'acct:some-user@domain'
      })

      it('returns error as json', async () => {
        await request()
        expect(status).toHaveBeenCalledWith(404)
        expect(json).toHaveBeenCalledWith({
          error: 'No record found for "some-user@domain".',
        })
      })

      describe('given a user for acct', () => {
        beforeEach(async () => {
          await Factory.build('user', { slug: 'some-user' })
        })

        it('returns user object', async () => {
          await request()
          expect(contentType).toHaveBeenCalledWith('application/jrd+json')
          expect(json).toHaveBeenCalledWith({
            links: [
              {
                href: `${CONFIG.CLIENT_URI}/activitypub/users/some-user`,
                rel: 'self',
                type: 'application/activity+json',
              },
            ],
            subject: `acct:some-user@${new URL(CONFIG.CLIENT_URI).host}`,
          })
        })
      })
    })
  })
})
