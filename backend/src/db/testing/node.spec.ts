import { User } from '@db/schema/index'

import { TestNode } from './node'

// No database: everything here answers from what the write already returned.

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
