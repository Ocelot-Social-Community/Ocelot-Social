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
      return Promise.resolve([{ id: 1, detail: 'offending' }])
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
