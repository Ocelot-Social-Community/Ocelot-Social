/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable vitest/expect-expect */
/* eslint-disable @typescript-eslint/no-shadow */
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import { sign } from 'jsonwebtoken'
import { beforeAll, afterAll, afterEach, describe, expect, beforeEach, it } from 'vitest'

import Factory, { cleanDatabase } from '@db/factories'
import { getDriver } from '@db/neo4j'
import { fixtures } from '@db/testing/fixtures'
import { TEST_CONFIG } from '@root/test/helpers'

import { decode } from './decode'
import { encode } from './encode'

const driver = getDriver()
// The fixture API, not neode: a neode node cannot be related to a fixture handle, and this
// file mixes the two.
const neode = fixtures
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

describe(decode, () => {
  let authorizationHeader: string | undefined | null
  const returnsNull = async () => {
    await expect(decode(context)(authorizationHeader)).resolves.toBeNull()
  }

  describe('given API key with oak_ prefix', () => {
    describe('and valid API key in database', () => {
      beforeEach(async () => {
        await Factory.build('user', {
          id: 'api-user',
          name: 'API User',
          slug: 'api-user',
          role: 'user',
        })
        // Create API key node with known hash
        // SHA-256 of 'oak_testkey123' = known hash
        const keyHash = createHash('sha256').update('oak_testkey123').digest('hex')
        const session = driver.session()
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `MATCH (u:User { id: $userId })
             CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
               id: 'ak1',
               name: 'Test Key',
               keyHash: $keyHash,
               keyPrefix: 'oak_testke',
               createdAt: toString(datetime()),
               disabled: false
             })`,
            { userId: 'api-user', keyHash },
          )
        })
        await session.close()
      })

      it('returns user object with authMethod apiKey', async () => {
        await expect(decode(context)('Bearer oak_testkey123')).resolves.toMatchObject({
          id: 'api-user',
          name: 'API User',
          authMethod: 'apiKey',
          apiKeyId: 'ak1',
        })
      })

      it('updates lastUsedAt on the API key', async () => {
        await decode(context)('Bearer oak_testkey123')
        // Give fire-and-forget time to complete
        await delay(500)
        const session = driver.session()
        const result = await session.readTransaction(async (tx) => {
          return tx.run(`MATCH (k:ApiKey { id: 'ak1' }) RETURN k.lastUsedAt AS lastUsedAt`)
        })
        await session.close()

        expect(result.records[0].get('lastUsedAt')).toBeTruthy()
      })

      // lastUsedAt is bookkeeping, fired and NOT awaited — the caller is already holding the
      // decoded user by the time it runs. Without the `.catch` its rejection would surface as an
      // unhandled promise rejection from a request that had otherwise succeeded, which under
      // Node's default is process-fatal: a hiccup on a write nobody waits for would take the
      // backend down and log the failure against whatever request happened to be in flight.
      it('authenticates the key even when the lastUsedAt write fails', async () => {
        // decodeApiKey opens the read session first and the update session second; only the
        // latter is replaced, so the lookup itself still runs against the real database.
        let sessions = 0
        const openSession = driver.session.bind(driver)
        const sessionSpy = vi.spyOn(driver, 'session').mockImplementation((...args) => {
          sessions += 1
          if (sessions === 2) {
            return {
              writeTransaction: async () => Promise.reject(new Error('write conflict')),
              close: async () => Promise.resolve(),
            } as unknown as ReturnType<typeof driver.session>
          }
          return openSession(...args)
        })

        try {
          await expect(decode(context)('Bearer oak_testkey123')).resolves.toMatchObject({
            id: 'api-user',
            authMethod: 'apiKey',
          })

          // Let the rejected best-effort promise settle inside the test, where an unhandled
          // rejection fails the run — the same signal it would give in production.
          await delay(100)
        } finally {
          sessionSpy.mockRestore()
        }

        const session = driver.session()
        const result = await session.readTransaction(async (tx) => {
          return tx.run(`MATCH (k:ApiKey { id: 'ak1' }) RETURN k.lastUsedAt AS lastUsedAt`)
        })
        await session.close()

        expect(result.records[0].get('lastUsedAt')).toBeNull()
      })
    })

    describe('and disabled API key', () => {
      beforeEach(async () => {
        await Factory.build('user', {
          id: 'disabled-key-user',
          name: 'DK User',
          slug: 'dk-user',
          role: 'user',
        })
        const keyHash = createHash('sha256').update('oak_disabledkey').digest('hex')
        const session = driver.session()
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `MATCH (u:User { id: $userId })
             CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
               id: 'ak-disabled',
               name: 'Disabled Key',
               keyHash: $keyHash,
               keyPrefix: 'oak_disabl',
               createdAt: toString(datetime()),
               disabled: true
             })`,
            { userId: 'disabled-key-user', keyHash },
          )
        })
        await session.close()
        authorizationHeader = 'Bearer oak_disabledkey'
      })

      it('returns null', returnsNull)
    })

    describe('and expired API key', () => {
      beforeEach(async () => {
        await Factory.build('user', {
          id: 'expired-key-user',
          name: 'EK User',
          slug: 'ek-user',
          role: 'user',
        })
        const keyHash = createHash('sha256').update('oak_expiredkey').digest('hex')
        const session = driver.session()
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `MATCH (u:User { id: $userId })
             CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
               id: 'ak-expired',
               name: 'Expired Key',
               keyHash: $keyHash,
               keyPrefix: 'oak_expire',
               createdAt: toString(datetime()),
               expiresAt: '2020-01-01T00:00:00.000Z',
               disabled: false
             })`,
            { userId: 'expired-key-user', keyHash },
          )
        })
        await session.close()
        authorizationHeader = 'Bearer oak_expiredkey'
      })

      it('returns null', returnsNull)
    })

    describe('and nonexistent API key', () => {
      beforeEach(() => {
        authorizationHeader = 'Bearer oak_doesnotexist'
      })

      it('returns null', returnsNull)
    })

    describe('and API key belonging to disabled user', () => {
      beforeEach(async () => {
        await Factory.build('user', {
          id: 'disabled-user',
          name: 'Disabled User',
          slug: 'disabled-user',
          role: 'user',
          disabled: true,
        })
        const keyHash = createHash('sha256').update('oak_disableduser').digest('hex')
        const session = driver.session()
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `MATCH (u:User { id: $userId })
             CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
               id: 'ak-disabled-user',
               name: 'Key of Disabled User',
               keyHash: $keyHash,
               keyPrefix: 'oak_disabl',
               createdAt: toString(datetime()),
               disabled: false
             })`,
            { userId: 'disabled-user', keyHash },
          )
        })
        await session.close()
        authorizationHeader = 'Bearer oak_disableduser'
      })

      it('returns null', returnsNull)
    })

    describe('and API key belonging to deleted user', () => {
      beforeEach(async () => {
        await Factory.build('user', {
          id: 'deleted-user',
          name: 'Deleted User',
          slug: 'deleted-user',
          role: 'user',
          deleted: true,
        })
        const keyHash = createHash('sha256').update('oak_deleteduser').digest('hex')
        const session = driver.session()
        await session.writeTransaction(async (tx) => {
          await tx.run(
            `MATCH (u:User { id: $userId })
             CREATE (u)-[:HAS_API_KEY]->(k:ApiKey {
               id: 'ak-deleted-user',
               name: 'Key of Deleted User',
               keyHash: $keyHash,
               keyPrefix: 'oak_delete',
               createdAt: toString(datetime()),
               disabled: false
             })`,
            { userId: 'deleted-user', keyHash },
          )
        })
        await session.close()
        authorizationHeader = 'Bearer oak_deleteduser'
      })

      it('returns null', returnsNull)
    })
  })

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

  // A token that VERIFIES — right secret, right algorithm — but names no subject. jwt.verify is
  // happy with it (`sub` is an optional registered claim), so the rejection has to come from the
  // subject read: without the `?? null` the id stays undefined and the lookup runs as
  // `MATCH (user:User {id: undefined})`, which the driver rejects rather than answering "no user".
  describe('given a valid JWT Bearer token without a subject', () => {
    beforeEach(async () => {
      await Factory.build('user', { id: 'u4', name: 'No Subject', slug: 'no-subject' })
      authorizationHeader = `Bearer ${sign({}, config.JWT_SECRET, { algorithm: 'HS256' })}`
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
          name: 'Jenny Rostock',
          id: 'u3',
          slug: 'jenny-rostock',
          roleName: 'user',
        })
      })

      it('does not set `lastActiveAt`', async () => {
        let user = await neode.first('User', { id: 'u3' }, undefined)

        await expect(user.toJson()).resolves.not.toHaveProperty('lastActiveAt')

        await decode(context)(validAuthorizationHeader)
        user = await neode.first('User', { id: 'u3' }, undefined)

        await expect(user.toJson()).resolves.not.toHaveProperty('lastActiveAt')
      })

      it('does not touch `lastActiveAt` on authenticated requests', async () => {
        let user = await neode.first('User', { id: 'u3' }, undefined)
        await user.update({
          updatedAt: new Date().toISOString(),

          lastActiveAt: '2019-10-03T23:33:08.598Z',
        })

        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: '2019-10-03T23:33:08.598Z',
        })

        await decode(context)(validAuthorizationHeader)
        user = await neode.first('User', { id: 'u3' }, undefined)

        await expect(user.toJson()).resolves.toMatchObject({
          lastActiveAt: '2019-10-03T23:33:08.598Z',
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
