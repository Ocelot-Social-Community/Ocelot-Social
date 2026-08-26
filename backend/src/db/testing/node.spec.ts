import { User } from '@db/schema/index'

import { TestNode } from './node'

// No database: everything here answers from what the write already returned, and the checks
// in `update` deliberately run before a session is opened, so they are testable the same way.

const node = (properties: Record<string, unknown>) => new TestNode(User, properties, 1)

describe('TestNode.get', () => {
  it('reads a property the node carries', () => {
    expect(node({ slug: 'peter-pan' }).get('slug')).toBe('peter-pan')
  })

  it('answers undefined for one it does not', () => {
    expect(node({ slug: 'peter-pan' }).get('name')).toBeUndefined()
  })

  it('keeps a stored falsy value distinguishable from an absent one', () => {
    const user = node({ deleted: false, about: null, name: '' })
    expect(user.get('deleted')).toBe(false)
    expect(user.get('about')).toBeNull()
    expect(user.get('name')).toBe('')
  })

  it.each(['toString', 'constructor', 'hasOwnProperty', '__proto__', 'valueOf'])(
    'does not resolve %s off the prototype',
    (inherited) => {
      // `this.stored[property]` would hand back a function here — a node property that does
      // not exist reading as something truthy, from an argument the caller controls.
      expect(node({ slug: 'peter-pan' }).get(inherited)).toBeUndefined()
    },
  )
})

describe('TestNode.properties', () => {
  it('hands back a copy, so a caller cannot edit the handle', () => {
    const user = node({ slug: 'peter-pan' })
    const copy = user.properties()
    copy.slug = 'someone-else'
    expect(user.get('slug')).toBe('peter-pan')
  })
})

describe('TestNode.update', () => {
  // A valid User, so a rejection below is about the patch and not about the node it starts from.
  const stored = {
    id: 'u1',
    name: 'Jenny Rostock',
    slug: 'jenny-rostock',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
  }

  it('refuses a property the entity does not declare, and names it', async () => {
    // `SET n += $properties` writes whatever it is handed, so this used to ADD a property
    // rather than change one — leaving a fixture the declaration says cannot exist, found much
    // later by the audit if at all.
    await expect(node(stored).update({ nmae: 'Jenny' })).rejects.toThrow(
      'User declares no property nmae',
    )
  })

  it('refuses a value the declaration rejects', async () => {
    // `name` has minLength 3.
    await expect(node(stored).update({ name: 'no' })).rejects.toThrow(
      'Cannot update a User fixture',
    )
  })

  it('judges the node the patch produces, not the patch alone', async () => {
    // `required` is a statement about the finished node: validating `{ deleted: true }` on its
    // own would fail every entity in the registry, since a patch carries none of the required
    // properties. What is checked is `stored` with the patch applied.
    const withoutDatabase = node(stored).update({ deleted: true })
    await expect(withoutDatabase).rejects.not.toThrow('must have required property')
  })

  it('ignores an undeclared property the node already carries', async () => {
    // It may predate the handle — a migration spec writes a legacy shape on purpose — and it is
    // the audit's business, not this caller's. Rejecting it here would fail an update for
    // something the caller did not do.
    const legacy = node({ ...stored, myRole: 'owner' })
    await expect(legacy.update({ name: 'Jenny R.' })).rejects.not.toThrow('undeclared property')
  })
})
