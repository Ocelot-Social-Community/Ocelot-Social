import { entities, Role, User } from '@db/schema/index'

import {
  compareSchemaObjects,
  declaredIndexStatements,
  declaredObjects,
  describeSchemaObject,
  inexpressibleObjects,
  isKnownProfile,
} from './drift'

import type { SchemaObject } from './drift'

const constraint = (label: string, ...properties: string[]): SchemaObject => ({
  kind: 'unique',
  label,
  properties,
})

const existence = (label: string, property: string): SchemaObject => ({
  kind: 'exists',
  label,
  properties: [property],
})

describe('declaredObjects', () => {
  it('lists the uniqueness constraints a community backend can hold', () => {
    const objects = declaredObjects([User], 'neo4j-community')
    expect(objects).toContainEqual(constraint('User', 'id'))
    expect(objects).toContainEqual(constraint('User', 'slug'))
  })

  it('lists the index the neode model asked for but never produced', () => {
    // `Role.name` was declared `indexed: true` in db/models/Role.ts, but neode read the flag
    // from `index`, so no statement was ever generated and the index was absent from every
    // running database. The drift check reported it as MISSING on its first run, and
    // `migrate init` creates it from this declaration now.
    expect(declaredObjects([Role], 'neo4j-community')).toContainEqual({
      kind: 'index',
      label: 'Role',
      properties: ['name'],
    })
  })

  it('lists fulltext indices by their property set', () => {
    expect(declaredObjects([User], 'neo4j-community')).toContainEqual({
      kind: 'index',
      label: 'User',
      properties: ['name', 'slug'],
    })
  })

  it('does not want a fulltext index from a profile that cannot create one', () => {
    // Memgraph has text indices, but not this object — indexStatementsFor reports it as
    // UNSUPPORTED there. Declaring it anyway made the same index MISSING in the drift report
    // AND unsupported in the apply report, from the same run; and since `missing` feeds the
    // exit code, `check memgraph` against a database without it could never come back clean.
    const declared = declaredObjects([User], 'memgraph')
    expect(declared).not.toContainEqual({
      kind: 'index',
      label: 'User',
      properties: ['name', 'slug'],
    })
    // The rest of User is unaffected — this is about one object class, not about the profile.
    expect(declared).toContainEqual(constraint('User', 'slug'))
  })

  it('reports nothing missing for what a profile cannot express', () => {
    // The end-to-end shape of the same thing: everything declared for a profile has to be
    // creatable on it, or `check` reports work that no `apply` can ever do.
    const { missing } = compareSchemaObjects(declaredObjects([User], 'memgraph'), [])
    const { unsupported } = declaredIndexStatements([User], 'memgraph')
    expect(unsupported).toHaveLength(1)
    for (const object of missing) {
      expect(describeSchemaObject(object)).not.toContain('name, slug')
    }
  })

  it('grows with the capability of the backend', () => {
    // Existence constraints only become real objects where the backend can hold them.
    expect(declaredObjects(entities, 'memgraph').length).toBeGreaterThan(
      declaredObjects(entities, 'neo4j-community').length,
    )
  })
})

describe('inexpressibleObjects', () => {
  const userFulltext = { kind: 'index' as const, label: 'User', properties: ['name', 'slug'] }

  it('names what a profile cannot create, so it is not read as surplus either', () => {
    // The other half of the same report. `check memgraph` against the RUNNING Neo4j — the
    // documented "what would break after the migration" run — finds the fulltext index
    // present. Undeclared for that profile, it would come back as SURPLUS "declared nowhere":
    // untrue, and an invitation to drop an index the current backend needs.
    expect(inexpressibleObjects([User], 'memgraph')).toEqual([userFulltext])
    const { surplus } = compareSchemaObjects(declaredObjects([User], 'memgraph'), [userFulltext])
    expect(surplus).toEqual([userFulltext])
    // …which is why run-audit subtracts exactly this set before printing and counting.
  })

  it('is empty where the profile can create everything the declaration names', () => {
    for (const profile of ['neo4j-community', 'neo4j-enterprise'] as const) {
      expect(inexpressibleObjects(entities, profile)).toEqual([])
    }
  })
})

describe('compareSchemaObjects', () => {
  it('reports what the declaration wants and the database lacks', () => {
    const report = compareSchemaObjects([constraint('User', 'slug')], [])
    expect(report.missing).toEqual([constraint('User', 'slug')])
    expect(report.surplus).toEqual([])
  })

  it('reports what the database holds and nothing declares any more', () => {
    // The direction that only matters once `apoc.schema.assert({},{},true)` is gone: nothing
    // is dropped any more, so an undeclared constraint would otherwise live forever and keep
    // rejecting writes no one expects it to reject.
    const report = compareSchemaObjects([], [constraint('Ghost', 'id')])
    expect(report.surplus).toEqual([constraint('Ghost', 'id')])
    expect(report.missing).toEqual([])
  })

  it('matches on kind, label and property set together', () => {
    const report = compareSchemaObjects(
      [constraint('User', 'slug')],
      [{ kind: 'index', label: 'User', properties: ['slug'] }],
    )
    // Same label and property, different kind: an index does not satisfy a constraint.
    expect(report.missing).toEqual([constraint('User', 'slug')])
    expect(report.surplus).toEqual([{ kind: 'index', label: 'User', properties: ['slug'] }])
  })

  it('treats a composite key as one object, not as two', () => {
    const composite = constraint('X', 'a', 'b')
    expect(compareSchemaObjects([composite], [composite]).missing).toEqual([])
    expect(compareSchemaObjects([composite], [constraint('X', 'a')]).missing).toEqual([composite])
  })

  it('is quiet when both sides agree', () => {
    const objects = [
      constraint('User', 'id'),
      { kind: 'index' as const, label: 'Role', properties: ['name'] },
    ]
    expect(compareSchemaObjects(objects, objects)).toEqual({ missing: [], surplus: [] })
  })
})

describe('describeSchemaObject', () => {
  it('reads as the operator would say it', () => {
    expect(describeSchemaObject(constraint('User', 'slug'))).toBe('unique constraint User(slug)')
    expect(describeSchemaObject(constraint('X', 'a', 'b'))).toBe('unique constraint X(a, b)')
    // The two constraint kinds read differently, because someone deciding whether to create or
    // drop an object needs to know which one is missing.
    expect(describeSchemaObject(existence('User', 'id'))).toBe('existence constraint User(id)')
  })
})

describe('isKnownProfile', () => {
  it('accepts the three profiles and rejects a typo', () => {
    expect(isKnownProfile('neo4j-community')).toBe(true)
    expect(isKnownProfile('memgraph')).toBe(true)
    expect(isKnownProfile('neo4j-comunity')).toBe(false)
  })
})

describe('the two constraint kinds are told apart', () => {
  // `User.id` is unique AND required, so on a profile that can hold both it is two objects over
  // one label and one property. Filed under a single name they collapsed: the wanted set held
  // it twice, and a database with only the uniqueness constraint answered for the existence one
  // as well — a missing constraint reported as present, which is the one outcome that makes a
  // drift check worse than no drift check.

  it('wants both where the backend can hold both', () => {
    const declared = declaredObjects([User], 'neo4j-enterprise')
    expect(declared).toContainEqual(constraint('User', 'id'))
    expect(declared).toContainEqual(existence('User', 'id'))
  })

  it('does not let a uniqueness constraint answer for an existence constraint', () => {
    const report = compareSchemaObjects(
      [constraint('User', 'id'), existence('User', 'id')],
      [constraint('User', 'id')],
    )
    expect(report.missing).toEqual([existence('User', 'id')])
  })

  it('reports an object once per side, however often it was listed', () => {
    // `missing` and `surplus` both filtered the array rather than a set, so a duplicate printed
    // twice and counted twice towards the exit code — reportDrift returns
    // `missing.length + unwanted.length`, so the two sides carry exactly the same weight.
    const wantedTwice = compareSchemaObjects(
      [constraint('User', 'id'), constraint('User', 'id')],
      [],
    )
    expect(wantedTwice.missing).toEqual([constraint('User', 'id')])

    // The present side is the harder one to reach — Neo4j will not hold two constraints over
    // the same label and properties — but it is the same comparison, and only one half of it
    // was pinned. A reader of `surplus` should not have to check which.
    const presentTwice = compareSchemaObjects(
      [],
      [constraint('User', 'id'), constraint('User', 'id')],
    )
    expect(presentTwice.surplus).toEqual([constraint('User', 'id')])
  })
})
