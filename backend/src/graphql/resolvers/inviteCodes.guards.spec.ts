/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// The parts of inviteCodes.ts no GraphQL request reaches, called directly.
//
// The `newUser` variants are the largest group here and they are NOT dead code: the
// `redeemInviteCode` MUTATION always passes newUser = false, and the only caller that passes true
// is registration.ts:142, on Signup. Driving a full signup (nonce, e-mail verification, terms) to
// arrive at a follow edge would test the registration flow, not this file — so the helper is
// called the way registration calls it.
//
// Plus the field-resolver fallbacks for a parent without a code, and the defensive row check in
// redeemInviteCode.
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'

import databaseContext from '@context/database'
import Factory, { cleanDatabase } from '@db/factories'
import { closeDriver } from '@db/neo4j'

import inviteCodesResolvers, { redeemInviteCode } from './inviteCodes'

import type { Context } from '@src/context'

let database: ReturnType<typeof databaseContext>

const contextFor = (id: string | null) =>
  ({ user: id ? { id } : null, database }) as unknown as Context

const codesOf = async (query: string, variables: Record<string, unknown> = {}) => {
  const { records } = await database.query({ query, variables })
  return records
}

beforeAll(async () => {
  await cleanDatabase()
  database = databaseContext()
})

afterAll(async () => {
  await cleanDatabase()
  await database.driver.close()
  database.neode.close()
  await closeDriver()
})

describe(redeemInviteCode, () => {
  // The mutation sits behind `isAuthenticated`, so this can only be reached by an internal
  // caller. Redeeming for nobody would write a REDEEMED edge from `undefined` and, on the group
  // branch, a MEMBER_OF edge with no member — silently, because both are MERGEs.
  it('refuses to redeem without an authenticated user', async () => {
    await expect(redeemInviteCode(contextFor(null), 'ABC123')).rejects.toThrow(
      'Missing authenticated user.',
    )
  })

  // The row check below the query. Today's Cypher MATCHes (not OPTIONAL MATCHes) both the code
  // and its host, so a row without either cannot come back — this asserts the contract that keeps
  // it that way, since turning either into an OPTIONAL MATCH would otherwise start redeeming
  // codes that have no host to follow.
  it('treats a row without an invite code or host as not redeemable', async () => {
    const stubbed = (values: Record<string, unknown>) => {
      const row = new Map(Object.entries(values))
      return {
        user: { id: 'someone' },
        database: {
          query: async () => Promise.resolve({ records: [{ get: (key: string) => row.get(key) }] }),
        },
      } as unknown as Context
    }

    await expect(
      redeemInviteCode(stubbed({ inviteCode: null, host: { id: 'host' }, group: null }), 'ABC123'),
    ).resolves.toBe(false)
    await expect(
      redeemInviteCode(stubbed({ inviteCode: { code: 'ABC123' }, host: null, group: null }), 'X'),
    ).resolves.toBe(false)
  })

  describe('redeemed by a user who is signing up (newUser)', () => {
    beforeEach(async () => {
      await cleanDatabase()
      await Factory.build('user', { id: 'invite-host', name: 'Host' })
      await Factory.build('user', { id: 'invited-user', name: 'Invited' })
    })

    // The personal-link branch. Redeeming the same link from an EXISTING account deliberately
    // does nothing (that case is covered through the mutation); on signup it is what connects the
    // brand-new account to the person who invited them — mutual FOLLOWS, plus the INVITED edge
    // the invite statistics count.
    it('follows host and new user to each other for a personal invite link', async () => {
      await database.write({
        query: `MATCH (host:User { id: 'invite-host' })
                MERGE (host)-[:GENERATED]->(:InviteCode { code: 'PERS01' })`,
      })

      await expect(redeemInviteCode(contextFor('invited-user'), 'PERS01', true)).resolves.toBe(true)

      const records = await codesOf(`
        MATCH (host:User { id: 'invite-host' }), (user:User { id: 'invited-user' })
        RETURN exists((host)-[:INVITED]->(user)) AS invited,
               exists((host)-[:FOLLOWS]->(user)) AS hostFollows,
               exists((user)-[:FOLLOWS]->(host)) AS userFollows,
               exists((user)-[:REDEEMED]->(:InviteCode { code: 'PERS01' })) AS redeemed`)

      expect(records[0].toObject()).toEqual({
        invited: true,
        hostFollows: true,
        userFollows: true,
        redeemed: true,
      })
    })

    // The group-link branch differs from the personal one: it does NOT create follow edges, only
    // the membership — but on signup it still has to record who invited whom, which is the one
    // statement `newUser` switches on here.
    it('records the invitation alongside the membership for a group invite link', async () => {
      await database.write({
        query: `MATCH (host:User { id: 'invite-host' })
                MERGE (group:Group { id: 'invite-group', groupType: 'public' })
                MERGE (host)-[:GENERATED]->(code:InviteCode { code: 'GRP001' })
                MERGE (code)-[:INVITES_TO]->(group)`,
      })

      await expect(redeemInviteCode(contextFor('invited-user'), 'GRP001', true)).resolves.toBe(true)

      const records = await codesOf(`
        MATCH (host:User { id: 'invite-host' }), (user:User { id: 'invited-user' })
        RETURN exists((host)-[:INVITED]->(user)) AS invited,
               exists((host)-[:FOLLOWS]->(user)) AS hostFollows,
               head([(user)-[m:MEMBER_OF]->(:Group { id: 'invite-group' }) | m.role]) AS role`)

      expect(records[0].toObject()).toEqual({
        invited: true,
        hostFollows: false,
        role: 'usual',
      })
    })
  })
})

// Both fields resolve from `parent.code`, which is the InviteCode's id attribute. A parent
// without one reaches them whenever a projection did not select `code` — asking the database for
// `{code: null}` would scan every InviteCode and answer with an arbitrary one.
describe('InviteCode field resolvers for a parent without a code', () => {
  it('resolves invitedTo to null', async () => {
    await expect(
      inviteCodesResolvers.InviteCode.invitedTo({}, {}, contextFor('someone'), null),
    ).resolves.toBeNull()
  })

  it('resolves isValid to false', async () => {
    await expect(
      inviteCodesResolvers.InviteCode.isValid({}, {}, contextFor('someone'), null),
    ).resolves.toBe(false)
  })
})
