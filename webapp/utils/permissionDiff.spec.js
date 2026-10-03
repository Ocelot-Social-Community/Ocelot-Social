import { diffBetween, permissionSetOf, samePermissions } from '~/utils/permissionDiff'

const catalog = [
  { key: 'group.read', group: 'visibility' },
  { key: 'group.post.create', group: 'content' },
  { key: 'group.role.manage', group: 'administration' },
]

describe('permissionSetOf', () => {
  it('reads a role as the rights it stores', () => {
    expect([...permissionSetOf({ permissions: ['group.read'] }, catalog)]).toEqual(['group.read'])
  })

  it('reads a PROTECTED role as the whole catalog, whatever it stores', () => {
    // `owner` stores an empty list and means everything. Taken literally it would hold nothing,
    // and a hover over it marked every right as "removed".
    const owner = { permissions: [], protected: true }

    expect([...permissionSetOf(owner, catalog)]).toEqual(catalog.map(({ key }) => key))
  })

  it('reads no role as no rights rather than throwing', () => {
    // The pages call this during the window between mount and the first query result.
    expect(permissionSetOf(null, catalog).size).toBe(0)
  })
})

describe('diffBetween', () => {
  it('marks what the second set adds and what it drops', () => {
    const diff = diffBetween(catalog, new Set(['group.read']), new Set(['group.post.create']))

    expect(diff).toEqual({ 'group.read': 'removed', 'group.post.create': 'added' })
  })

  it('leaves agreeing rights out entirely, so two diffs can be layered', () => {
    // The network roles page shows a conflict diff and a hover diff at once:
    // `{ ...conflictDiff, ...hoverDiff }`. A key present with a falsy value would let the
    // hover erase a conflict marking instead of leaving it alone.
    const diff = diffBetween(catalog, new Set(['group.read']), new Set(['group.read']))

    expect(Object.keys(diff)).toEqual([])
  })

  it('ignores a right that is not in the catalog', () => {
    // A role can still hold a key the catalog no longer offers — a removed feature, a
    // half-finished migration. The matrix has no row for it, so the diff must not invent one.
    const diff = diffBetween(catalog, new Set(['group.type.change']), new Set())

    expect(diff).toEqual({})
  })
})

describe('samePermissions', () => {
  it('ignores order', () => {
    expect(samePermissions(['a', 'b'], ['b', 'a'])).toBe(true)
  })

  it('notices a different right', () => {
    expect(samePermissions(['a', 'b'], ['a', 'c'])).toBe(false)
  })

  it('does not call a list with a repeat the same as a longer one', () => {
    // A length check plus a one-way lookup gets this wrong, which is why both sides are sets.
    expect(samePermissions(['a', 'b'], ['a', 'a'])).toBe(false)
  })

  it('treats a missing list as an empty one', () => {
    expect(samePermissions(undefined, [])).toBe(true)
  })
})
