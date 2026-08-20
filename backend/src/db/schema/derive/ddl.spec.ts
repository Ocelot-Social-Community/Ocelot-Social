import { Post, Role, User } from '@db/schema/index'
import { defineEntity } from '@db/schema/types'

import { CAPABILITIES, indexStatementsFor, statementFor } from './ddl'
import { allRules, rulesForEntity } from './rules'

import type { BackendProfile } from './ddl'

const PROFILES = [...CAPABILITIES.keys()]

const statements = (entity: Parameters<typeof rulesForEntity>[0], profile: BackendProfile) =>
  rulesForEntity(entity)
    .map((rule) => statementFor(rule, profile))
    .filter((statement): statement is string => statement !== null)

describe('statementFor', () => {
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

describe('indexStatementsFor', () => {
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
