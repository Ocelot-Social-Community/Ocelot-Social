import { entities, Role, User } from '@db/schema/index'

import {
  compareSchemaObjects,
  declaredObjects,
  describeSchemaObject,
  isKnownProfile,
} from './drift'

import type { SchemaObject } from './drift'

const constraint = (label: string, ...properties: string[]): SchemaObject => ({
  kind: 'constraint',
  label,
  properties,
})

describe('declaredObjects', () => {
  it('lists the uniqueness constraints a community backend can hold', () => {
    const objects = declaredObjects([User], 'neo4j-community')
    expect(objects).toContainEqual(constraint('User', 'id'))
    expect(objects).toContainEqual(constraint('User', 'slug'))
  })

  it('lists the index the neode model asked for but never produced', () => {
    // `Role.name` is declared `indexed: true` in db/models/Role.ts, but neode reads the flag
    // from `index`, so no statement was ever generated and the index is absent from every
    // running database. It is a `missing` object from the first run of the drift check on.
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

  it('grows with the capability of the backend', () => {
    // Existence constraints only become real objects where the backend can hold them.
    expect(declaredObjects(entities, 'memgraph').length).toBeGreaterThan(
      declaredObjects(entities, 'neo4j-community').length,
    )
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
    expect(describeSchemaObject(constraint('User', 'slug'))).toBe('constraint User(slug)')
    expect(describeSchemaObject(constraint('X', 'a', 'b'))).toBe('constraint X(a, b)')
  })
})

describe('isKnownProfile', () => {
  it('accepts the three profiles and rejects a typo', () => {
    expect(isKnownProfile('neo4j-community')).toBe(true)
    expect(isKnownProfile('memgraph')).toBe(true)
    expect(isKnownProfile('neo4j-comunity')).toBe(false)
  })
})
