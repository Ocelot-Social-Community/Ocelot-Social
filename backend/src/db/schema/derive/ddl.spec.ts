import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { Post, Role, User } from '@db/schema/index'
import { defineEntity } from '@db/schema/types'

import { auditFor } from './audit'
import { capabilitiesFor, CAPABILITIES, indexStatementsFor, statementFor } from './ddl'
import { allRules, rulesForEntity } from './rules'

import type { BackendProfile } from './ddl'
import type { Rule } from './rules'

const PROFILES = [...CAPABILITIES.keys()]

const statements = (entity: Parameters<typeof rulesForEntity>[0], profile: BackendProfile) =>
  rulesForEntity(entity)
    .map((rule) => statementFor(rule, profile))
    .filter((statement): statement is string => statement !== null)

describe(statementFor, () => {
  describe('neo4j-community', () => {
    it('emits uniqueness constraints and nothing else', () => {
      expect(statements(User, 'neo4j-community')).toEqual([
        'CREATE CONSTRAINT User_id_unique IF NOT EXISTS FOR (n:User) REQUIRE n.id IS UNIQUE',
        'CREATE CONSTRAINT User_slug_unique IF NOT EXISTS FOR (n:User) REQUIRE n.slug IS UNIQUE',
      ])
    })

    // The whole reason the audit exists: `required` is declared but nothing enforces it here.
    it('does not emit existence constraints', () => {
      expect(statements(User, 'neo4j-community')).not.toContainEqual(
        expect.stringContaining('IS NOT NULL'),
      )
    })

    it('uses IF NOT EXISTS so repeated runs converge instead of dropping and recreating', () => {
      for (const statement of statements(User, 'neo4j-community')) {
        expect(statement).toContain('IF NOT EXISTS')
      }
    })
  })

  describe('neo4j-enterprise', () => {
    it('adds existence constraints for every required property', () => {
      const emitted = statements(Role, 'neo4j-enterprise')
      for (const property of Role.required) {
        expect(emitted).toContainEqual(
          `CREATE CONSTRAINT Role_${property}_exists IF NOT EXISTS ` +
            `FOR (n:Role) REQUIRE n.${property} IS NOT NULL`,
        )
      }
    })

    // Type constraints arrived in Neo4j 5.9; 4.4 Enterprise cannot express them either.
    it('still emits no type constraints', () => {
      expect(statements(Role, 'neo4j-enterprise')).not.toContainEqual(
        expect.stringContaining('IS TYPED'),
      )
    })
  })

  describe('memgraph', () => {
    it('emits existence and data type constraints in memgraph dialect', () => {
      const emitted = statements(Role, 'memgraph')

      expect(emitted).toContainEqual('CREATE CONSTRAINT ON (n:Role) ASSERT EXISTS (n.id)')
      expect(emitted).toContainEqual('CREATE CONSTRAINT ON (n:Role) ASSERT n.id IS TYPED STRING')
      expect(emitted).toContainEqual(
        'CREATE CONSTRAINT ON (n:Role) ASSERT n.protected IS TYPED BOOLEAN',
      )
    })

    it('types a nullable property by its single non-null type', () => {
      // `updatedBy` is ['string', 'null'] — absent is fine, present must be a string.
      expect(statements(Role, 'memgraph')).toContainEqual(
        'CREATE CONSTRAINT ON (n:Role) ASSERT n.updatedBy IS TYPED STRING',
      )
    })

    it('leaves `number` to the audit, because IS TYPED cannot spell the union', () => {
      // JSON Schema's `number` is "integer or float" and Memgraph keeps the two apart. Spelled
      // as FLOAT it would reject the value 1, which the declaration allows — and a constraint
      // silences the audit for its rule, so nothing would be left to notice.
      const Measured = defineEntity({
        label: 'Measured',
        properties: { value: { type: 'number' } },
        required: [],
      })

      expect(statements(Measured, 'memgraph')).toEqual([])
    })

    it('leaves a union wider than X|null to the audit', () => {
      const Widened = defineEntity({
        label: 'Widened',
        properties: { value: { type: ['string', 'integer'] } },
        required: [],
      })

      expect(statements(Widened, 'memgraph')).toEqual([])
    })
  })

  describe('composite uniqueness', () => {
    const Composite = defineEntity({
      label: 'Composite',
      properties: { a: { type: 'string' }, b: { type: 'string' } },
      required: [],
      unique: [['a', 'b']],
    })

    it('is a NODE KEY on neo4j enterprise', () => {
      expect(statements(Composite, 'neo4j-enterprise')).toContainEqual(
        'CREATE CONSTRAINT Composite_a_b_key IF NOT EXISTS FOR (n:Composite) REQUIRE (n.a, n.b) IS NODE KEY',
      )
    })

    it('is a native constraint on memgraph', () => {
      expect(statements(Composite, 'memgraph')).toContainEqual(
        'CREATE CONSTRAINT ON (n:Composite) ASSERT n.a, n.b IS UNIQUE',
      )
    })

    it('is not expressible on neo4j community', () => {
      expect(statements(Composite, 'neo4j-community')).toEqual([])
    })
  })
})

describe(indexStatementsFor, () => {
  it('emits the 4.4 procedure form for fulltext indices', () => {
    const { statements: emitted } = indexStatementsFor(Post, 'neo4j-community')

    expect(emitted).toContainEqual(
      'CALL db.index.fulltext.createNodeIndex("post_fulltext_search",["Post"],["title","content"])',
    )
  })

  it('emits plain indices for indexed properties', () => {
    expect(indexStatementsFor(Role, 'neo4j-community').statements).toContainEqual(
      'CREATE INDEX Role_name_index IF NOT EXISTS FOR (n:Role) ON (n.name)',
    )
    expect(indexStatementsFor(Role, 'memgraph').statements).toContainEqual(
      'CREATE INDEX ON :Role(name)',
    )
  })

  // A dropped index would read as "covered" while search silently degrades. It is reported.
  it('reports fulltext indices as unsupported on memgraph rather than approximating them', () => {
    const { statements: emitted, unsupported } = indexStatementsFor(Post, 'memgraph')

    expect(emitted).not.toContainEqual(expect.stringContaining('fulltext'))
    expect(unsupported).toEqual(['fulltext index post_fulltext_search on Post(title, content)'])
  })
})

describe('every profile', () => {
  it('produces syntactically distinct DDL for the same declaration', () => {
    const perProfile = PROFILES.map((profile) => statements(User, profile).length)

    // community < enterprise < memgraph: more capability, more enforcement, same declaration.
    expect(perProfile).toEqual([...perProfile].sort((a, b) => a - b))
    expect(new Set(perProfile).size).toBeGreaterThan(1)
  })

  it('never emits an empty or duplicated statement for the pilot registry', () => {
    for (const profile of PROFILES) {
      const emitted = allRules([User, Role, Post], [])
        .map((rule) => statementFor(rule, profile))
        .filter((statement): statement is string => statement !== null)

      expect(emitted).not.toContainEqual('')
      expect(new Set(emitted).size).toBe(emitted.length)
    }
  })
})

describe('a capability the table denies is not emitted', () => {
  // The three profiles we ship all do single-property uniqueness, so the missing check cost
  // nothing today. It is tested through a profile that says otherwise, because that is the only
  // way to ask the question at all — and the answer decides whether the table is the single
  // place a profile states its limits or merely documentation next to one.
  const WITHOUT_UNIQUE = 'test-without-uniqueness' as BackendProfile

  beforeAll(() => {
    CAPABILITIES.set(WITHOUT_UNIQUE, {
      ...capabilitiesFor('neo4j-community'),
      unique: false,
    })
  })

  afterAll(() => {
    CAPABILITIES.delete(WITHOUT_UNIQUE)
  })

  it('emits no uniqueness constraint for a profile that has none', () => {
    expect(statements(User, WITHOUT_UNIQUE)).toEqual([])
  })

  it('leaves the rule to the audit instead, rather than to nobody', () => {
    // The half that makes the omission dangerous: auditFor stays quiet wherever a statement
    // exists, so emitting one the server rejects also removes the only remaining check.
    const rule = rulesForEntity(User).find(
      (entry) => entry.kind === 'unique' && entry.properties.join() === 'id',
    )

    expect(rule).toBeDefined()
    expect(auditFor(rule as Rule, WITHOUT_UNIQUE)).not.toBeNull()
  })
})
