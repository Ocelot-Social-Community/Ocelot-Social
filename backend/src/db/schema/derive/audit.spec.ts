import { entities, Post, relationships, Role, User } from '@db/schema/index'

import { auditFor, auditQueryFor, auditsFor } from './audit'
import { CAPABILITIES, statementFor } from './ddl'
import { allRules } from './rules'

import type { BackendProfile } from './ddl'
import type { Rule } from './rules'

const PROFILES = [...CAPABILITIES.keys()]
const RULES = allRules(entities, relationships)

const audit = (violation: string, profile: BackendProfile = 'neo4j-community') =>
  auditsFor(RULES, profile).find((query) => query.violation === violation)

describe('the enforced/audited partition', () => {
  // The point of the whole derive layer: a rule is either enforced by the database or
  // counted by a query. A rule that is neither is a rule nobody checks — which is the state
  // this migration exists to leave behind.
  it.each(PROFILES)('covers every rule exactly once on %s', (profile) => {
    for (const rule of RULES) {
      const enforced = statementFor(rule, profile) !== null
      const audited = auditFor(rule, profile) !== null
      expect({ rule, enforced, audited }).toMatchObject({ enforced: !audited, audited: !enforced })
    }
  })

  it('shifts rules from audited to enforced as the backend gains capability', () => {
    const audited = PROFILES.map((profile) => auditsFor(RULES, profile).length)
    expect(audited).toEqual([...audited].sort((a, b) => b - a))
    // Memgraph enforces strictly more of the same declaration than Neo4j Community does.
    expect(audited[audited.length - 1]).toBeLessThan(audited[0])
  })

  it('never leaves the value-shape rules to the database, on any profile', () => {
    for (const profile of PROFILES) {
      expect(audit(`User.slug pattern`, profile)).toBeDefined()
      expect(audit(`User.name minLength`, profile)).toBeDefined()
      expect(audit(`Post.postType enum`, profile)).toBeDefined()
    }
  })
})

describe('generated queries', () => {
  it('counts nodes missing a required property', () => {
    expect(audit('User.id exists')?.cypher).toBe(
      'MATCH (n:User) WHERE n.id IS NULL RETURN count(n) AS violations',
    )
  })

  it('counts nodes whose property violates the pattern, ignoring absent ones', () => {
    expect(audit('User.slug pattern')?.cypher).toBe(
      "MATCH (n:User) WHERE n.slug IS NOT NULL AND NOT n.slug =~ '^[a-z0-9_-]+$' " +
        'RETURN count(n) AS violations',
    )
  })

  it('counts nodes below a minimum length', () => {
    expect(audit('User.name minLength')?.cypher).toBe(
      'MATCH (n:User) WHERE n.name IS NOT NULL AND size(n.name) < 3 RETURN count(n) AS violations',
    )
  })

  it('counts nodes outside an enum, treating null as absent', () => {
    expect(audit('Post.pinned enum')?.cypher).toBe(
      'MATCH (n:Post) WHERE n.pinned IS NOT NULL AND NOT n.pinned IN [true] ' +
        'RETURN count(n) AS violations',
    )
  })

  it('counts duplicate values where uniqueness cannot be enforced', () => {
    // Composite uniqueness on Neo4j Community is the audited case; the pilot has no composite
    // key, so the single-property one is checked through a profile that can enforce it.
    expect(
      auditFor({ kind: 'unique', label: 'X', properties: ['a', 'b'] }, 'neo4j-community'),
    ).toMatchObject({
      cypher:
        'MATCH (n:X) WHERE n.a IS NOT NULL AND n.b IS NOT NULL ' +
        'WITH [n.a, n.b] AS key, count(*) AS nodes WHERE nodes > 1 ' +
        'RETURN count(key) AS violations',
    })
  })

  // Nodes missing the property are where an audit most easily disagrees with the database,
  // and a single-property uniqueness audit is never reached through `auditFor` — every
  // profile enforces it — so only `auditQueryFor`, the pre-flight in planConstraints(), sees
  // this query. That is also what makes a false count expensive: it skips the constraint.
  describe('nodes without the property', () => {
    const COMPOSITE: Rule = { kind: 'unique', label: 'X', properties: ['a', 'b'] }

    it('leaves them out of a single-property uniqueness audit, as the constraint does', () => {
      // `Post.slug` is the live case: declared unique, NOT required. Two slugless posts share
      // the key [null] and must not read as a duplicate — on any profile, since every one of
      // them spells a single-property rule as plain uniqueness.
      for (const profile of PROFILES) {
        expect(
          auditQueryFor({ kind: 'unique', label: 'Post', properties: ['slug'] }, profile),
        ).toMatchObject({
          cypher:
            'MATCH (n:Post) WHERE n.slug IS NOT NULL WITH [n.slug] AS key, count(*) AS nodes ' +
            'WHERE nodes > 1 RETURN count(key) AS violations',
          sampleCypher:
            'MATCH (n:Post) WHERE n.slug IS NOT NULL WITH [n.slug] AS key, collect(id(n)) AS ids ' +
            'WHERE size(ids) > 1 RETURN head(ids) AS id, key AS detail LIMIT 10',
        })
      }
    })

    it('keeps them where the profile spells a composite key as NODE KEY', () => {
      // Neo4j Enterprise is the one that does. A node key REQUIRES the properties, so letting
      // the pre-flight pass would only move the failure to the CREATE — which stops the
      // deployment in both enforcement modes, unlike a skip.
      expect(auditQueryFor(COMPOSITE, 'neo4j-enterprise')?.cypher).not.toContain('IS NOT NULL')
    })

    it('leaves them out where a composite key is plain uniqueness, or cannot be created', () => {
      // Memgraph expresses it as a composite UNIQUE, which ignores nodes missing a property;
      // Neo4j Community cannot express it at all, and then presence is the `exists` rule's
      // business. Counting them on either would skip a constraint the server would accept.
      for (const profile of ['memgraph', 'neo4j-community'] as const) {
        expect(auditQueryFor(COMPOSITE, profile)?.cypher).toContain(
          'WHERE n.a IS NOT NULL AND n.b IS NOT NULL',
        )
      }
    })

    it('excludes them from every value-shape audit', () => {
      // The counterpart to the `exists` audit, which counts precisely those nodes: a value
      // rule says what a value must look like, not that there has to be one.
      for (const violation of ['User.slug pattern', 'User.name minLength', 'Post.pinned enum']) {
        expect(audit(violation)?.cypher).toContain('IS NOT NULL AND')
      }
    })
  })

  it('counts users whose single-role invariant is broken', () => {
    // The rule the authorisation layer assumes and that no engine can enforce.
    expect(audit('User-[:HAS_ROLE] exactly-one')?.cypher).toBe(
      'MATCH (n:User) WITH n, size([(n)-[:HAS_ROLE]->() | 1]) AS edges ' +
        'WHERE edges <> 1 RETURN count(n) AS violations',
    )
  })

  it('falls back to a disjunction where a rule names several source labels', () => {
    // Cypher has no `(n:A|B)` for a node, so the predicate form is not a style choice here.
    // BELONGS_TO carries two unrelated uses and three source labels.
    expect(
      audit('EmailAddress|UnverifiedEmailAddress|Report-[:BELONGS_TO] at-most-one')?.cypher,
    ).toBe(
      'MATCH (n) WHERE n:EmailAddress OR n:UnverifiedEmailAddress OR n:Report ' +
        'WITH n, size([(n)-[:BELONGS_TO]->() | 1]) AS edges ' +
        'WHERE edges > 1 RETURN count(n) AS violations',
    )
  })

  it('counts edges between the wrong labels', () => {
    expect(audit('[:WROTE] endpoints User->Post|Comment')?.cypher).toBe(
      'MATCH (a)-[r:WROTE]->(b) WHERE NOT (a:User AND (b:Post OR b:Comment)) ' +
        'RETURN count(r) AS violations',
    )
  })

  it('does not let the two ends of BELONGS_TO be combined freely', () => {
    // Its sources and targets are BOTH polymorphic, so pairing the two lists with an OR claimed
    // all nine combinations. Four are nonsense — an address does not belong to a post — and the
    // audit called a graph holding them clean. The branches say which five are real; the
    // resolvers are where they come from: reports.ts guards `resource:User OR resource:Post OR
    // resource:Comment`, registration.ts and emails.ts attach an address to a User and nothing
    // else.
    expect(
      audit(
        '[:BELONGS_TO] endpoints EmailAddress|UnverifiedEmailAddress->User, Report->User|Post|Comment',
      )?.cypher,
    ).toBe(
      'MATCH (a)-[r:BELONGS_TO]->(b) WHERE NOT (' +
        '((a:EmailAddress OR a:UnverifiedEmailAddress) AND b:User) OR ' +
        '(a:Report AND (b:User OR b:Post OR b:Comment))' +
        ') RETURN count(r) AS violations',
    )
  })

  it('escapes the backslashes in a pattern instead of letting Cypher read them', () => {
    // The literal is parsed before the regex engine sees it, so an interpolated pattern is read
    // twice. WHITESPACE spells its characters as `\t`, `\u00a0` and so on; those survive the
    // double reading by luck, because inside a character class the character and its escape ask
    // the same question. `\\` would not — see the note on cypherString. Doubling them makes what
    // the engine receives equal to what was declared, for any sequence.
    expect(audit('SocialMedia.url pattern')?.cypher).toContain(String.raw`\\t\\n\\f\\r`)
  })

  it('asks about property types through apoc, which 4.4 has and valueType() is not', () => {
    expect(audit('Role.protected type')?.cypher).toContain(
      "apoc.meta.cypher.type(n.protected) <> 'BOOLEAN'",
    )
  })

  it('emits no type audit where the backend enforces the type', () => {
    expect(audit('Role.protected type', 'memgraph')).toBeUndefined()
  })

  it('still audits a `number` on memgraph, which has no IS TYPED for the union', () => {
    // The other half of the partition: no constraint means the audit has to stay, and it asks
    // the question the declaration poses rather than the narrower one a constraint could.
    expect(audit('Location.lat type', 'memgraph')?.cypher).toContain(
      "NOT apoc.meta.cypher.type(n.lat) IN ['INTEGER', 'FLOAT']",
    )
  })
})

describe('coverage of the pilot registry', () => {
  it.each([User.label, Role.label, Post.label])('produces node audits for %s', (label) => {
    const violations = auditsFor(RULES, 'neo4j-community').map((query) => query.violation)
    expect(violations.some((violation) => violation.startsWith(`${label}.`))).toBe(true)
  })

  it('produces edge audits keyed by relationship type', () => {
    const violations = auditsFor(RULES, 'neo4j-community').map((query) => query.violation)
    for (const relationship of relationships) {
      expect(violations).toContainEqual(expect.stringContaining(`:${relationship.type}]`))
    }
  })

  it('gives every audit a stable, unique identifier', () => {
    const violations = auditsFor(RULES, 'neo4j-community').map((query) => query.violation)
    expect(new Set(violations).size).toBe(violations.length)
  })
})

describe('edge properties', () => {
  // Until edge-scoped rules existed, a declaration could state `SELECTED.slot must be an
  // integer` and nothing anywhere would look at it: no engine constrains edge properties, and
  // no rule was emitted for them either.
  it('audits an edge property type against the edges, not against nodes', () => {
    expect(audit('[:SELECTED].slot type')?.cypher).toBe(
      "MATCH ()-[n:SELECTED]->() WHERE n.slot IS NOT NULL AND apoc.meta.cypher.type(n.slot) <> 'INTEGER' " +
        'RETURN count(n) AS violations',
    )
  })

  it('audits a required edge property', () => {
    expect(audit('[:EMOTED].emotion exists')?.cypher).toBe(
      'MATCH ()-[n:EMOTED]->() WHERE n.emotion IS NULL RETURN count(n) AS violations',
    )
  })

  it('audits an edge enum', () => {
    expect(audit('[:MEMBER_OF].role enum')?.cypher).toContain(
      "NOT n.role IN ['pending', 'usual', 'admin', 'owner']",
    )
  })

  it('leaves edge rules unenforced on every profile, including memgraph', () => {
    for (const profile of PROFILES) {
      expect(audit('[:SELECTED].slot type', profile)).toBeDefined()
    }
  })
})
