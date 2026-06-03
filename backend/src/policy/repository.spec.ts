/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
// (neo4j-driver record.get() is typed `any`; same disable the DB-backed specs use.)
//
// Integration tests for the (:Setting) repository — exercised against the real
// Neo4j so the raw Cypher (MERGE, JSON (de)serialisation, last-change filtering,
// the id-uniqueness encoding) is verified end-to-end. PolicyService.spec.ts
// mocks this module; here we run it for real.

import databaseContext from '@context/database'
import { cleanDatabase } from '@db/factories'

import {
  POLICY_NAMESPACE,
  readAllSettings,
  readLastChange,
  writeSetting,
  deleteSetting,
} from './repository'

const db = databaseContext()

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(() => {
  void db.driver.close()
  db.neode.close()
})

describe('writeSetting / readAllSettings', () => {
  it('round-trips JSON-encoded values of different shapes', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-1')
    await writeSetting(db, POLICY_NAMESPACE, 'maxUploads', 42, 'admin-1')
    await writeSetting(db, POLICY_NAMESPACE, 'branding', { color: '#fff' }, 'admin-1')

    const settings = await readAllSettings(db, POLICY_NAMESPACE)

    expect(settings).toEqual({
      publicRegistration: true,
      maxUploads: 42,
      branding: { color: '#fff' },
    })
  })

  it('scopes reads to the given namespace', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-1')
    await writeSetting(db, 'branding', 'logo', 'url', 'admin-1')

    const policy = await readAllSettings(db, POLICY_NAMESPACE)
    expect(policy).toEqual({ publicRegistration: true })
  })

  it('upserts on (namespace, key) — a second write updates rather than duplicates', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', false, 'admin-1')
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-2')

    const settings = await readAllSettings(db, POLICY_NAMESPACE)
    expect(settings).toEqual({ publicRegistration: true })

    const result = await db.query({
      query: `MATCH (s:Setting {namespace: $namespace, key: $key}) RETURN count(s) AS n`,
      variables: { namespace: POLICY_NAMESPACE, key: 'publicRegistration' },
    })
    expect(result.records[0].get('n').toNumber()).toBe(1)
  })

  it('encodes uniqueness in the id property (<namespace>.<key>)', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-1')

    const result = await db.query({
      query: `MATCH (s:Setting {namespace: $namespace, key: $key}) RETURN s.id AS id`,
      variables: { namespace: POLICY_NAMESPACE, key: 'publicRegistration' },
    })
    expect(result.records[0].get('id')).toBe('policy.publicRegistration')
  })

  it('skips entries with malformed JSON instead of throwing', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-1')
    // Inject a node whose value is not valid JSON.
    await db.write({
      query: `CREATE (s:Setting {namespace: $namespace, key: $key, value: $value})`,
      variables: { namespace: POLICY_NAMESPACE, key: 'broken', value: 'not-json' },
    })

    const settings = await readAllSettings(db, POLICY_NAMESPACE)
    expect(settings).toEqual({ publicRegistration: true }) // 'broken' silently skipped
  })

  it('returns an empty object when the namespace has no settings', async () => {
    expect(await readAllSettings(db, POLICY_NAMESPACE)).toEqual({})
  })
})

describe('readLastChange', () => {
  it('returns null when nothing has been written', async () => {
    expect(await readLastChange(db, POLICY_NAMESPACE)).toBeNull()
  })

  it('ignores system writes (actor "system:*")', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'system:seed')
    expect(await readLastChange(db, POLICY_NAMESPACE)).toBeNull()
  })

  it('returns the most recent human change (actor + timestamp)', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', false, 'system:seed')
    await writeSetting(db, POLICY_NAMESPACE, 'inviteRegistration', true, 'admin-7')

    const last = await readLastChange(db, POLICY_NAMESPACE)
    expect(last?.actor).toBe('admin-7')
    expect(typeof last?.timestamp).toBe('string')
  })
})

describe('deleteSetting', () => {
  it('removes the setting node', async () => {
    await writeSetting(db, POLICY_NAMESPACE, 'publicRegistration', true, 'admin-1')
    expect(await readAllSettings(db, POLICY_NAMESPACE)).toEqual({ publicRegistration: true })

    await deleteSetting(db, POLICY_NAMESPACE, 'publicRegistration')
    expect(await readAllSettings(db, POLICY_NAMESPACE)).toEqual({})
  })

  it('is a no-op when the setting does not exist', async () => {
    await expect(deleteSetting(db, POLICY_NAMESPACE, 'missing')).resolves.toBeUndefined()
  })
})
