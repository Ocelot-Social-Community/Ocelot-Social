import { branchesOf } from '@db/schema/derive/rules'
import { relationships } from '@db/schema/relationships/index'

import { allAliases, resolveAlias } from './aliases'

// The alias table is the vocabulary the specs and the seed speak: `user.relateTo(post, 'wrote')`.
// It is written by hand, and until now nothing compared it against the declaration it names.
//
// It is deliberately NOT derived. An alias is a NAME a test uses, and the declaration permits 95
// (label, type) pairs against 41 aliases — deriving would invent fifty-odd names nobody asks for.
// What can be checked is that every name in it is one the graph could actually hold.

/** Every (label, type, direction) the declaration permits, as `Label.TYPE.direction`. */
const permitted = (): Set<string> => {
  const pairs = new Set<string>()
  for (const relationship of relationships) {
    for (const branch of branchesOf(relationship)) {
      for (const entity of branch.from) {
        pairs.add(`${entity.label}.${relationship.type}.out`)
      }
      for (const entity of branch.to) {
        pairs.add(`${entity.label}.${relationship.type}.in`)
      }
    }
  }
  return pairs
}

describe('the alias table against the declaration', () => {
  it.each(allAliases().map((entry) => [`${entry.label}.${entry.alias}`, entry] as const))(
    '%s names an edge the declaration permits',
    (_name, { label, relationship }) => {
      // A wrong direction is the quiet half of this: `(a)-[:X]->(b)` and `(a)<-[:X]-(b)` are both
      // valid Cypher, so an alias pointing the wrong way builds an edge that no resolver reads
      // and no test notices until an assertion elsewhere comes back empty.
      expect(permitted()).toContain(`${label}.${relationship.type}.${relationship.direction}`)
    },
  )
})

describe('resolveAlias', () => {
  it('resolves a declared alias', () => {
    expect(resolveAlias('User', 'following')).toEqual({ type: 'FOLLOWS', direction: 'out' })
  })

  it('resolves one that points inwards', () => {
    // Both directions are in the table, and getting one wrong builds an edge nothing reads.
    expect(resolveAlias('User', 'followedBy')).toEqual({ type: 'FOLLOWS', direction: 'in' })
  })

  it('names the label it was asked about, not just the alias', () => {
    // The failure this pins: `Location.isIn` was missing while `User.isIn` and `Group.isIn` were
    // there, so the alias existed — just not for that label. The seed died on its first city with
    // an error that has to say WHICH label lacks it, or the reader goes looking in the wrong row.
    expect(() => resolveAlias('Location', 'nosuchalias')).toThrow(
      'No relationship alias "nosuchalias" on Location',
    )
  })
})
