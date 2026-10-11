import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import databaseContext from '@context/database'
import { cleanDatabase } from '@db/factories'

import {
  applyTemplateToNonMemberRoles,
  markGroupRolesCustomized,
  markGroupRolesUncustomized,
  readGroupRoles,
  readGroupTemplate,
  seedRolesForGroupsWithoutRoles,
  seedRolesForNewGroup,
  withinTransaction,
  writeGroupTemplate,
} from './repository'
import { seedGroupRoleTemplates } from './seedTemplates'

const NOW = '2026-10-08T12:00:00.000Z'
const database = databaseContext()

// Against the database, because what is under test is what Cypher reads back: a fake database
// would only echo the answer it was given.
beforeEach(async () => {
  await cleanDatabase()
  await seedGroupRoleTemplates(database, NOW)
})

afterAll(async () => {
  await cleanDatabase()
  await database.driver.close()
})

describe(writeGroupTemplate, () => {
  it('records the template a group runs on, over a type left behind from before', async () => {
    // What `untouchedGroupIdsByTemplate` counts by: a group put on the channel template has to
    // be counted under it, not under the type it was created with.
    await database.write({ query: `CREATE (:Group {id: 'g1', groupType: 'public'})` })

    await writeGroupTemplate(database, 'g1', 'channel')

    expect(await readGroupTemplate(database, 'g1')).toBe('channel')
  })
})

// Which template a group from before the templates is repaired from.
describe('groups from before the templates', () => {
  it('are repaired from the template their old type names, not the strictest one', async () => {
    // A restored dump, or a group created by an instance that had not been upgraded yet: no
    // template, no roles — but a groupType, whose values are the template names.
    await database.write({ query: `CREATE (:Group {id: 'legacy', groupType: 'public'})` })

    expect(await readGroupTemplate(database, 'legacy')).toBe('public')
    expect(await seedRolesForGroupsWithoutRoles(database, NOW)).toEqual({
      seeded: ['legacy'],
      skipped: [],
    })
    expect(await readGroupTemplate(database, 'legacy')).toBe('public')
  })

  it('fall back to the strictest template when even the type is gone', async () => {
    await database.write({ query: `CREATE (:Group {id: 'bare'})` })

    expect(await readGroupTemplate(database, 'bare')).toBe('hidden')

    await seedRolesForGroupsWithoutRoles(database, NOW)

    expect(await readGroupTemplate(database, 'bare')).toBe('hidden')
  })

  it('read as the strictest template when the group is not there at all', async () => {
    // Nothing to go by — and the answer that can only ever cost rights, never invent them.
    expect(await readGroupTemplate(database, 'no-such-group')).toBe('hidden')
  })

  it('keep the template they run on over a type left behind', async () => {
    await database.write({
      query: `CREATE (:Group {id: 'both', template: 'closed', groupType: 'public'})`,
    })

    expect(await readGroupTemplate(database, 'both')).toBe('closed')
  })
})

const groupNode = async (id: string) =>
  (
    await database.query({
      query: `MATCH (g:Group {id: $id}) RETURN properties(g) AS props`,
      variables: { id },
    })
  ).records[0].get('props') as Record<string, unknown>

describe(withinTransaction, () => {
  it('lets several writes commit or roll back as one', async () => {
    // Applying a template is a handful of statements (the template, both non-member roles, the
    // mirrored columns). Run through the transaction, a failure after them takes all of them
    // back: the group is left as it was, not with a template its rights do not match.
    const session = database.driver.session()
    try {
      await session.writeTransaction(async (transaction) => {
        await transaction.run(`CREATE (:Group {id: 'g1'})`)
        await seedRolesForNewGroup(transaction, 'g1', 'public', NOW)
      })
      const before = await readGroupRoles(database, 'g1')
      // The node as well: the columns mirrored from the `none` role are the third kind of
      // write in the batch, and the one a later refactor could quietly move out of it again.
      const nodeBefore = await groupNode('g1')

      await expect(
        session.writeTransaction(async (transaction) => {
          await applyTemplateToNonMemberRoles(
            withinTransaction(transaction),
            'g1',
            'hidden',
            'actor',
            NOW,
          )
          throw new Error('a later write fails')
        }),
      ).rejects.toThrow('a later write fails')

      expect(await readGroupTemplate(database, 'g1')).toBe('public')
      expect(await readGroupRoles(database, 'g1')).toEqual(before)
      expect(await groupNode('g1')).toEqual(nodeBefore)
    } finally {
      await session.close()
    }
  })
})

describe(markGroupRolesUncustomized, () => {
  it('puts a customised group back among the ones a template change reaches', async () => {
    await database.write({ query: `CREATE (:Group {id: 'g1', template: 'public'})` })
    await markGroupRolesCustomized(database, 'g1', NOW)

    await markGroupRolesUncustomized(database, 'g1')

    const { records } = await database.query({
      query: `MATCH (g:Group {id: 'g1'}) RETURN g.rolesCustomizedAt AS customizedAt`,
    })

    expect(records[0].get('customizedAt')).toBeNull()
  })
})
