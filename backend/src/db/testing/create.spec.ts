import { Post, User } from '@db/schema/index'

import { findNode } from './create'
import { declaredProperty } from './defaults'

// No database: the guard runs before the session is opened, which is the point of it — a typo
// should cost nothing and be reported where it was made, not turn into an empty result.

describe('declaredProperty', () => {
  it('passes a name the entity declares', () => {
    expect(declaredProperty(User, 'slug')).toBe('slug')
    expect(declaredProperty(Post, 'title')).toBe('title')
  })

  it('names the entity and the file to look in when it does not', () => {
    expect(() => declaredProperty(User, 'slugg')).toThrow(
      'User declares no property slugg. See src/db/schema/entities/User.ts',
    )
  })

  it('rejects a property another entity declares', () => {
    // The plausible version of the mistake: `title` exists, just not on User.
    expect(() => declaredProperty(User, 'title')).toThrow('User declares no property title')
  })

  it('rejects a key that is not a declared property at all', () => {
    // Guards the lookup against inherited keys as well — the check asks the declaration, not
    // the object's prototype chain.
    for (const key of ['constructor', 'toString', '__proto__']) {
      expect(() => declaredProperty(User, key)).toThrow('declares no property')
    }
  })
})

describe('findNode', () => {
  it('rejects an undeclared property before it reaches the database', async () => {
    // Without this it was a `MATCH (node:User {slugg: $value})` — valid Cypher, no match, and
    // a `null` indistinguishable from "no such user". The factory then built half a fixture
    // and the spec failed later on an unrelated assertion.
    await expect(findNode(User, 'slugg', 'peter-pan')).rejects.toThrow(
      'User declares no property slugg',
    )
  })
})
