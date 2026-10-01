import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES, MANDATORY_GROUP_ROLE_NAMES } from './defaults'
import { seedGroupRoleTemplates } from './seedTemplates'

const NOW = '2026-10-01T10:00:00.000Z'

// What the read-back finds, as the repository's row shape. A fake rather than a database: the
// interesting behaviour is that this refuses to boot on an incomplete template, and that is
// exactly the state a database should never be in.
const fakeDatabase = (persistedNames: Record<string, string[]>) => {
  const written: Array<{ groupType: unknown; name: unknown }> = []
  return {
    written,
    db: {
      write: vi.fn(async ({ variables }: { variables: Record<string, unknown> }) => {
        written.push({ groupType: variables.groupType, name: variables.name })
        return Promise.resolve({ records: [] })
      }),
      query: vi.fn(async () =>
        Promise.resolve({
          records: Object.entries(persistedNames).flatMap(([groupType, names]) =>
            names.map((name) => ({
              get: (key: string) =>
                ({
                  groupType,
                  name,
                  label: null,
                  system: true,
                  protected: name === 'owner',
                  permissions: '[]',
                })[key as 'name'],
            })),
          ),
        }),
      ),
    } as never,
  }
}

const everyTemplateName = Object.fromEntries(
  Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES).map(([groupType, roles]) => [
    groupType,
    roles.map((role) => role.name),
  ]),
)

describe(seedGroupRoleTemplates, () => {
  it('writes every role of every group type, then hands back what is persisted', async () => {
    const { db, written } = fakeDatabase(everyTemplateName)

    const persisted = await seedGroupRoleTemplates(db, NOW)

    expect(written).toHaveLength(
      Object.values(DEFAULT_GROUP_ROLE_TEMPLATES).reduce((sum, roles) => sum + roles.length, 0),
    )
    expect(Object.keys(persisted).sort()).toEqual(Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES).sort())
  })

  it('refuses to continue when a persisted template is missing a system role', async () => {
    // A group created from such a template would have no `none`, `pending` or `owner` role:
    // nobody could look at it and nobody could administer it. Failing at boot beats serving it.
    const { db } = fakeDatabase({
      ...everyTemplateName,
      closed: ['usual', 'admin'],
    })

    await expect(seedGroupRoleTemplates(db, NOW)).rejects.toThrow(
      /template incomplete for group type\(s\) closed/,
    )
  })

  it('names the system roles it insists on, so the message is actionable', async () => {
    const { db } = fakeDatabase({ ...everyTemplateName, hidden: [] })

    await expect(seedGroupRoleTemplates(db, NOW)).rejects.toThrow(
      MANDATORY_GROUP_ROLE_NAMES.join(', '),
    )
  })

  it('takes its own timestamp when the caller gives none', async () => {
    const { db } = fakeDatabase(everyTemplateName)

    await expect(seedGroupRoleTemplates(db)).resolves.toBeDefined()
  })
})
