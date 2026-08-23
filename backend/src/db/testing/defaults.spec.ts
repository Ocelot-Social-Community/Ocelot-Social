import { timestamp } from './defaults'

// No database: the point of this helper is what it guarantees in-process, and a round trip
// would hide it — two writes 40ms apart differ even with `new Date()`.

describe('timestamp', () => {
  const stamps = Array.from({ length: 200 }, () => timestamp())

  it('hands out a distinct value every time', () => {
    // `new Date().toISOString()` returns ONE value for all 200 in the same tick. Fixtures are
    // written straight in Cypher and are that fast, so nodes and edges built back to back tie.
    expect(new Set(stamps).size).toBe(stamps.length)
  })

  it('increases strictly, so a sort by it is stable', () => {
    // Ordering is the reason this exists: resolvers sort on these — `posts.spec`'s "pinned
    // post appears first even when created before other posts" for a node property, and
    // notifications.ts `ORDER BY notification.updatedAt` for an EDGE one, where `notification`
    // is the NOTIFIED relationship itself.
    expect(stamps).toEqual([...stamps].sort())
    expect(stamps.every((stamp, index) => index === 0 || stamp > stamps[index - 1])).toBe(true)
  })

  it('stays a valid ISO instant', () => {
    // It is written into properties the declaration types with ISO_DATE_TIME.
    for (const stamp of [stamps[0], stamps[stamps.length - 1]]) {
      expect(stamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    }
  })
})
