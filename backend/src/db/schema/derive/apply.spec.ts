import { entities, relationships } from '@db/schema/index'

import { applyPlan, enforce, planConstraints, SchemaEnforcementError } from './apply'

import type { ApplyReport, SchemaRunner } from './apply'

// The sequencing is the logic worth testing: what runs before what, what a violation does to
// the rest of the run, and what a report means per environment. A stub runner exercises all
// of it without a database — the real Cypher is covered by ddl.spec.ts and audit.spec.ts.

interface StubOptions {
  /** Keyed by audit cypher; the stub answers with the number of violations for it. */
  violations?: Map<string, number>
  rejects?: string[]
  /** Statements the stub answers with Neo4j's "an equivalent index already exists". */
  alreadyThere?: string[]
  /** What `SHOW INDEXES` reports, in the column shape 4.4 uses. */
  indices?: {
    name: string
    labelsOrTypes: string[]
    properties: string[]
    uniqueness: 'UNIQUE' | 'NONUNIQUE'
    type: 'BTREE' | 'FULLTEXT'
  }[]
}

const stubRunner = (options: StubOptions = {}) => {
  const calls: string[] = []
  const runner: SchemaRunner = {
    count: async (cypher) => {
      calls.push(`count ${cypher}`)
      return Promise.resolve(options.violations?.get(cypher) ?? 0)
    },
    sample: async (cypher) => {
      calls.push(`sample ${cypher}`)
      return Promise.resolve(
        cypher === 'SHOW INDEXES' ? (options.indices ?? []) : [{ id: 1, detail: 'offending' }],
      )
    },
    execute: async (cypher) => {
      calls.push(`execute ${cypher}`)
      if (options.alreadyThere?.some((fragment) => cypher.includes(fragment))) {
        return Promise.reject(
          Object.assign(
            new Error(
              'Failed to invoke procedure: Caused by: org.neo4j.kernel.api.exceptions.schema.' +
                'EquivalentSchemaRuleAlreadyExistsException: An equivalent index already exists',
            ),
            { code: 'Neo.ClientError.Procedure.ProcedureCallFailed' },
          ),
        )
      }
      if (options.rejects?.some((fragment) => cypher.includes(fragment))) {
        const error = Object.assign(new Error('Unable to create Constraint(...)\nsecond line'), {
          code: 'Neo.DatabaseError.Schema.ConstraintCreationFailed',
        })
        return Promise.reject(error)
      }
      return Promise.resolve()
    },
  }
  return { runner, calls }
}

const CONSTRAINT = 'CREATE CONSTRAINT User_slug_unique'
const AUDIT = 'MATCH (n:User) ... duplicates'

const plan = [
  {
    statement: CONSTRAINT,
    violation: 'User.slug unique',
    auditCypher: AUDIT,
    sampleCypher: 'SAMPLE User.slug',
  },
  { statement: 'CREATE CONSTRAINT Role_id_unique', violation: 'Role.id unique', auditCypher: 'A2' },
]

// The same statement, for a key the database may already index without a constraint.
const supersedingPlan = [
  {
    statement: CONSTRAINT,
    violation: 'User.slug unique',
    auditCypher: AUDIT,
    sampleCypher: 'SAMPLE User.slug',
    supersedesIndexOn: { label: 'User', properties: ['slug'] },
  },
]

const presentIndex = (
  name: string,
  label: string,
  properties: string[],
  uniqueness: 'UNIQUE' | 'NONUNIQUE' = 'NONUNIQUE',
) => ({ name, labelsOrTypes: [label], properties, uniqueness, type: 'BTREE' as const })

describe('planConstraints', () => {
  const items = planConstraints(entities, relationships, 'neo4j-community')

  it('plans one statement per enforceable rule', () => {
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.statement).toContain('CREATE CONSTRAINT')
    }
  })

  it('carries a pre-flight audit for every statement', () => {
    // Without one, the only feedback would be Neo4j's error — which names a single
    // conflicting pair and cannot be acted on.
    for (const item of items) {
      expect(item.auditCypher).toBeDefined()
      expect(item.sampleCypher).toBeDefined()
    }
  })

  it('plans strictly more on a more capable backend', () => {
    expect(planConstraints(entities, relationships, 'memgraph').length).toBeGreaterThan(
      items.length,
    )
  })
})

describe('applyPlan', () => {
  it('creates indices before constraints, so a rejected constraint costs no index', async () => {
    const { runner, calls } = stubRunner()
    await applyPlan(runner, plan, ['CREATE INDEX Role_name_index'])
    expect(calls[0]).toBe('execute CREATE INDEX Role_name_index')
  })

  it('applies a statement whose audit is clean', async () => {
    const { runner, calls } = stubRunner()
    const report = await applyPlan(runner, plan)
    expect(report.applied).toContain(CONSTRAINT)
    expect(calls).toContain(`count ${AUDIT}`)
    expect(calls.indexOf(`count ${AUDIT}`)).toBeLessThan(calls.indexOf(`execute ${CONSTRAINT}`))
  })

  it('skips a statement whose audit finds violations, and never sends it', async () => {
    const { runner, calls } = stubRunner({ violations: new Map([[AUDIT, 3]]) })
    const report = await applyPlan(runner, plan)
    expect(report.skipped).toEqual([
      {
        statement: CONSTRAINT,
        violation: 'User.slug unique',
        violations: 3,
        sample: [{ id: 1, detail: 'offending' }],
      },
    ])
    expect(calls).not.toContain(`execute ${CONSTRAINT}`)
  })

  it('samples the offending rows only when there are any', async () => {
    // Why it matters that this is asserted in BOTH directions: the sample is a SECOND query
    // per statement, split off precisely so the normal path stays a plain count (see the
    // docblock on AuditQuery.sampleCypher). A sample fetched unconditionally would cost one
    // extra round trip per constraint on every deployment, and no other assertion would
    // notice — the report would look identical.
    const clean = stubRunner()
    await applyPlan(clean.runner, plan)
    expect(clean.calls.filter((call) => call.startsWith('sample'))).toEqual([])

    const violating = stubRunner({ violations: new Map([[AUDIT, 3]]) })
    await applyPlan(violating.runner, plan)
    expect(violating.calls.filter((call) => call.startsWith('sample'))).toEqual([
      'sample SAMPLE User.slug',
    ])
  })

  it('carries on with the remaining statements after a skip', async () => {
    const { runner } = stubRunner({ violations: new Map([[AUDIT, 1]]) })
    const report = await applyPlan(runner, plan)
    expect(report.applied).toEqual(['CREATE CONSTRAINT Role_id_unique'])
  })

  it('records a rejected statement with its Neo4j code and carries on', async () => {
    const { runner } = stubRunner({ rejects: ['User_slug_unique'] })
    const report = await applyPlan(runner, plan)
    expect(report.failed).toEqual([
      {
        statement: CONSTRAINT,
        code: 'Neo.DatabaseError.Schema.ConstraintCreationFailed',
        message: 'Unable to create Constraint(...)',
      },
    ])
    expect(report.applied).toContain('CREATE CONSTRAINT Role_id_unique')
  })

  it('does not stop the run when an index cannot be created', async () => {
    const { runner } = stubRunner({ rejects: ['INDEX'] })
    const report = await applyPlan(runner, plan, ['CREATE INDEX broken'])
    expect(report.failed).toHaveLength(1)
    expect(report.applied).toContain(CONSTRAINT)
  })

  it('counts an already-existing fulltext index as unchanged, not as a failure', async () => {
    // `db.index.fulltext.createNodeIndex` is the only 4.4 spelling for a fulltext index and
    // it is not idempotent — a second call throws. The end state is what matters, so this
    // must not turn a repeated deployment into a red one.
    const { runner } = stubRunner({ alreadyThere: ['fulltext'] })
    const report = await applyPlan(runner, [], ['CALL db.index.fulltext.createNodeIndex("x")'])
    expect(report.unchanged).toEqual(['CALL db.index.fulltext.createNodeIndex("x")'])
    expect(report.failed).toEqual([])
  })

  it('keeps unchanged out of applied, so a no-op run does not claim work', async () => {
    const { runner } = stubRunner({ alreadyThere: ['fulltext'] })
    const report = await applyPlan(runner, [], ['CALL db.index.fulltext.createNodeIndex("x")'])
    expect(report.applied).toEqual([])
  })

  describe('an index the constraint supersedes', () => {
    // Neo4j 4.4 refuses `CREATE CONSTRAINT` while a plain index holds the same key, and
    // `IF NOT EXISTS` does not help — it guards against an existing CONSTRAINT. Without this,
    // every declaration that turns an indexed property into a unique one would abort the
    // deployment of every database that already has the index.
    it('drops it first, then creates the constraint, and says so', async () => {
      const { runner, calls } = stubRunner({
        indices: [presentIndex('User_slug_index', 'User', ['slug'])],
      })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls).toEqual([
        `count ${AUDIT}`,
        'sample SHOW INDEXES',
        'execute DROP INDEX `User_slug_index` IF EXISTS',
        `execute ${CONSTRAINT}`,
      ])
      expect(report.superseded).toEqual(['User_slug_index'])
      expect(report.applied).toEqual([CONSTRAINT])
    })

    it('asks only after the audit came back clean', async () => {
      // The index is given up for a constraint that is going to be created. If the data does
      // not support one, nothing is given up and the database keeps what it has.
      const { runner, calls } = stubRunner({
        violations: new Map([[AUDIT, 2]]),
        indices: [presentIndex('User_slug_index', 'User', ['slug'])],
      })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls).not.toContain('sample SHOW INDEXES')
      expect(calls.filter((call) => call.startsWith('execute DROP'))).toEqual([])
      expect(report.superseded).toEqual([])
    })

    it('leaves the index backing a constraint alone', async () => {
      // 4.4 lists it in SHOW INDEXES as well, refuses to drop it directly, and it is exactly
      // what a re-run finds: the constraint created last time owns it.
      const { runner, calls } = stubRunner({
        indices: [presentIndex('User_slug_unique', 'User', ['slug'], 'UNIQUE')],
      })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls.filter((call) => call.startsWith('execute DROP'))).toEqual([])
      expect(report.superseded).toEqual([])
    })

    it('leaves a fulltext index on the same key alone', async () => {
      // Found by running this against a real database: `Tag` declares BOTH `unique: ['id']`
      // and a fulltext index over `['id']`, and the first version dropped tag_fulltext_search
      // on the way to the constraint. A fulltext index is a different index type and does not
      // occupy the slot the constraint needs.
      const { runner, calls } = stubRunner({
        indices: [
          { ...presentIndex('tag_fulltext_search', 'User', ['slug']), type: 'FULLTEXT' as const },
        ],
      })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls.filter((call) => call.startsWith('execute DROP'))).toEqual([])
      expect(report.superseded).toEqual([])
    })

    it('leaves an index on another key alone', async () => {
      const { runner, calls } = stubRunner({
        indices: [
          presentIndex('User_name_index', 'User', ['name']),
          presentIndex('Post_slug_index', 'Post', ['slug']),
          presentIndex('User_slug_name_index', 'User', ['slug', 'name']),
        ],
      })
      await applyPlan(runner, supersedingPlan)
      expect(calls.filter((call) => call.startsWith('execute DROP'))).toEqual([])
    })

    it('puts it back when the constraint fails after all', async () => {
      // The audit passed, so the drop looked safe — but data can change between the two, and a
      // hot label left with no index because of a constraint that did not happen is the worse
      // outcome of the two.
      const { runner, calls } = stubRunner({
        rejects: ['User_slug_unique'],
        indices: [presentIndex('User_slug_index', 'User', ['slug'])],
      })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls).toContain(
        'execute CREATE INDEX `User_slug_index` IF NOT EXISTS FOR (n:User) ON (n.slug)',
      )
      expect(report.superseded).toEqual([])
      expect(report.failed).toHaveLength(1)
    })

    it('costs one read and nothing else on a database that has no such index', async () => {
      const { runner, calls } = stubRunner({ indices: [] })
      const report = await applyPlan(runner, supersedingPlan)
      expect(calls.filter((call) => call.startsWith('execute'))).toEqual([`execute ${CONSTRAINT}`])
      expect(report.superseded).toEqual([])
    })
  })

  it('passes unsupported objects through instead of dropping them silently', async () => {
    const { runner } = stubRunner()
    const report = await applyPlan(runner, [], [], ['fulltext index x on Y(z)'])
    expect(report.unsupported).toEqual(['fulltext index x on Y(z)'])
  })
})

describe('enforce', () => {
  const clean: ApplyReport = {
    applied: ['x'],
    unchanged: [],
    skipped: [],
    failed: [],
    superseded: [],
    unsupported: [],
  }
  const withSkip: ApplyReport = {
    ...clean,
    skipped: [{ statement: 's', violation: 'User.slug unique', violations: 2, sample: [] }],
  }
  const withFailure: ApplyReport = {
    ...clean,
    failed: [{ statement: 's', code: 'Neo.DatabaseError', message: 'boom' }],
  }

  it('accepts a clean report in either mode', () => {
    expect(() => {
      enforce(clean, 'strict')
    }).not.toThrow()
    expect(() => {
      enforce(clean, 'report')
    }).not.toThrow()
  })

  it('rejects a skip in strict mode — CI must not pass on unenforceable data', () => {
    expect(() => {
      enforce(withSkip, 'strict')
    }).toThrow(SchemaEnforcementError)
  })

  it('accepts a skip in report mode — production keeps the state it already had', () => {
    // The deployment must not fail because a constraint that never existed still cannot be
    // created. Skipping leaves the database exactly as it is today.
    expect(() => {
      enforce(withSkip, 'report')
    }).not.toThrow()
  })

  it('rejects an errored statement in BOTH modes', () => {
    // A skip is a data problem someone decided about; an error is not.
    expect(() => {
      enforce(withFailure, 'strict')
    }).toThrow(SchemaEnforcementError)
    expect(() => {
      enforce(withFailure, 'report')
    }).toThrow(SchemaEnforcementError)
  })

  it('names what was not applied', () => {
    expect(() => {
      enforce(withSkip, 'strict')
    }).toThrow(/User\.slug unique/)
  })
})
