import { describe, beforeEach, afterAll, it, expect } from 'vitest'

import databaseContext from '@context/database'
import { cleanDatabase } from '@db/factories'

import { readGroupTemplate, seedRolesForGroupsWithoutRoles } from './repository'
import { seedGroupRoleTemplates } from './seedTemplates'

const NOW = '2026-10-08T12:00:00.000Z'
const database = databaseContext()

// Against the database, because what is under test is a Cypher fallback: which template a group
// from before the templates is repaired from. A fake database would only echo the answer back.
describe('groups from before the templates', () => {
  beforeEach(async () => {
    await cleanDatabase()
    await seedGroupRoleTemplates(database, NOW)
  })

  afterAll(async () => {
    await cleanDatabase()
    await database.driver.close()
  })

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

  it('keep the template they run on over a type left behind', async () => {
    await database.write({
      query: `CREATE (:Group {id: 'both', template: 'closed', groupType: 'public'})`,
    })

    expect(await readGroupTemplate(database, 'both')).toBe('closed')
  })
})
