import { describe, expect, it } from 'vitest'

import { MANDATORY_GROUP_ROLE_NAMES } from './defaults'
import { GROUP_ROLE_INTEGRITY_AUDITS } from './integrity'

describe('group role integrity audits', () => {
  it('counts violations in the shape the audit runner reads', () => {
    // The runner takes column 0 of the first record as a number and runs the sample query only
    // when that count is non-zero (see db/schema/derive/runner.ts), so every audit has to
    // return a count and a sample of `id` + `detail`.
    for (const audit of GROUP_ROLE_INTEGRITY_AUDITS) {
      expect(audit.violation).not.toBe('')
      expect(audit.cypher).toContain('RETURN count(')
      expect(audit.cypher).toContain('AS violations')
      expect(audit.sampleCypher).toContain('AS id')
      expect(audit.sampleCypher).toContain('AS detail')
      expect(audit.sampleCypher).toContain('LIMIT 10')
    }
  })

  it('names them so a report line says what is wrong', () => {
    expect(GROUP_ROLE_INTEGRITY_AUDITS.map((audit) => audit.violation)).toEqual([
      'Group has every mandatory role definition',
      'MEMBER_OF.role names a role the group defines',
      'Group.nonMemberRead mirrors its non-member role',
      'A pending membership has somewhere to wait',
    ])
  })

  it('asks for the mandatory roles the code defines, not for a list of its own', () => {
    // A fifth mandatory role would otherwise be invisible to the audit.
    const [mandatory] = GROUP_ROLE_INTEGRITY_AUDITS

    for (const name of MANDATORY_GROUP_ROLE_NAMES) {
      expect(mandatory.cypher).toContain(`'${name}'`)
    }

    expect(mandatory.cypher).toContain(`size(names) < ${String(MANDATORY_GROUP_ROLE_NAMES.length)}`)
  })

  it('reads the derived columns null-safely, so an unwritten column is not a finding', () => {
    // `null <> false` is null in Cypher, not true — without the coalesce the audit would count
    // every group whose columns the backfill has not reached as a mismatch.
    const columns = GROUP_ROLE_INTEGRITY_AUDITS[2]

    expect(columns.cypher).toContain('coalesce(g.nonMemberRead, false)')
    expect(columns.cypher).toContain('coalesce(g.nonMemberContentRead, false)')
    expect(columns.cypher).toContain('coalesce(g.showMembers, false)')
  })

  it('quotes the permission keys it matches inside the stored list', () => {
    const columns = GROUP_ROLE_INTEGRITY_AUDITS[2]

    expect(columns.cypher).toContain('\'"group.read"\'')
    expect(columns.cypher).toContain('\'"group.content.read"\'')
    expect(columns.cypher).toContain('\'"group.members.read"\'')
  })
})
