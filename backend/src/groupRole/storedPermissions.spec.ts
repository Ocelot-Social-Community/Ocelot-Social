import { describe, expect, it } from 'vitest'

import { parseStoredPermissions } from './storedPermissions'

describe(parseStoredPermissions, () => {
  it('reads a stored list back', () => {
    expect(parseStoredPermissions('["group.read","group.content.read"]')).toEqual([
      'group.read',
      'group.content.read',
    ])
  })

  it('reads a missing list as no rights at all', () => {
    expect(parseStoredPermissions(null)).toEqual([])
  })

  it('reads a damaged list as no rights, rather than failing a whole query', () => {
    // A row somebody edited by hand, or a half-written value. Granting nothing is the safe
    // answer; throwing here would take down every feed the group's posts appear in.
    expect(parseStoredPermissions('["group.read"')).toEqual([])
    expect(parseStoredPermissions('not json at all')).toEqual([])
  })

  it('reads a list that is not a list as no rights', () => {
    expect(parseStoredPermissions('{"group.read":true}')).toEqual([])
    expect(parseStoredPermissions('"group.read"')).toEqual([])
  })

  it('rethrows anything that is not a malformed list', () => {
    // JSON.parse coerces its argument to a string first, so a value whose own toString fails
    // throws something that is NOT a SyntaxError. That is a real fault — a bug or a broken
    // driver — and it has to surface instead of reading as "this role holds nothing".
    const hostile = {
      toString: () => {
        throw new TypeError('boom')
      },
    } as unknown as string

    expect(() => parseStoredPermissions(hostile)).toThrow(TypeError)
  })

  it('drops keys the catalog does not know', () => {
    // A key left behind by a downgrade. It could never be effective, and carrying it would
    // make a role look like it holds something that no longer exists.
    expect(parseStoredPermissions('["group.read","group.teleport"]')).toEqual(['group.read'])
  })
})
