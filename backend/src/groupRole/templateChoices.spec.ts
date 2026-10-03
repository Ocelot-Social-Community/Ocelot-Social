import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { readTemplateChoices, templateVisibility } from './templateChoices'

const roleRecord = (values: Record<string, unknown>) => ({
  get: (key: string) => values[key], // eslint-disable-line security/detect-object-injection -- test fixture, literal keys
})

const fakeDb = (records: Array<ReturnType<typeof roleRecord>> = []) =>
  ({
    query: vi.fn(async () => Promise.resolve({ records })),
  }) as never

const role = (template: string, name: string, permissions: string[]) =>
  roleRecord({
    template,
    name,
    label: null,
    system: true,
    protected: false,
    permissions: JSON.stringify(permissions),
    customized: false,
  })

describe(readTemplateChoices, () => {
  it('answers what each stored template makes a group, not what it is called', async () => {
    // The whole reason the visibility travels with the name: these two produce the same kind of
    // group, and `group.create_public` is what both of them cost.
    const db = fakeDb([
      role('channel', 'none', ['group.read', 'group.content.read']),
      role('public', 'none', ['group.read', 'group.content.read']),
    ])

    expect(await readTemplateChoices(db)).toEqual([
      { name: 'channel', visibility: 'public' },
      { name: 'public', visibility: 'public' },
    ])
  })

  it('orders them least private first, by what they derive to', async () => {
    // Sorting the NAMES against the privacy levels put `channel` — which is not a visibility at
    // all — at index -1, ahead of everything. The order has to come from the derived value.
    const db = fakeDb([
      role('hidden', 'none', []),
      role('channel', 'none', ['group.read', 'group.content.read']),
      role('closed', 'none', ['group.read']),
    ])

    expect((await readTemplateChoices(db)).map((choice) => choice.name)).toEqual([
      'channel',
      'closed',
      'hidden',
    ])
  })

  it('falls back to the code defaults when the database holds no template at all', async () => {
    // The state of a freshly wiped database — every test run after cleanDatabase(), and the
    // moment before the boot seed. Without this the create rule would answer "no such template"
    // for every name and no group could be created there.
    const choices = await readTemplateChoices(fakeDb([]))

    expect(choices.map((choice) => choice.name).sort()).toEqual(
      Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES).sort(),
    )
  })

  it('reads a template whose non-member role is missing as the most private one', async () => {
    const db = fakeDb([role('odd', 'usual', ['group.post.create'])])

    expect(await readTemplateChoices(db)).toEqual([{ name: 'odd', visibility: 'hidden' }])
  })
})

describe(templateVisibility, () => {
  it('answers the visibility of the named template', async () => {
    const db = fakeDb([role('channel', 'none', ['group.read', 'group.content.read'])])

    expect(await templateVisibility(db, 'channel')).toBe('public')
  })

  it('answers null for a name no template has, so a typo is not read as a right', async () => {
    const db = fakeDb([role('public', 'none', ['group.read', 'group.content.read'])])

    expect(await templateVisibility(db, 'secret-society')).toBeNull()
  })
})
