import { describe, expect, it } from 'vitest'

import {
  memberHoldsInGroup,
  memberRoleHolds,
  nonMemberReadsContent,
  nonMemberReadsGroup,
  nonMemberReadsMembers,
  optionalMemberRoleMatch,
  roleHoldsPermission,
} from './groupAccessCypher'

describe('non-member conditions', () => {
  it('read the mirrored column, not the group type', () => {
    // The column is the group's own decision; the type only appears as the fallback for a node
    // the backfill has not written yet. If this ever stops holding, a public group that closed
    // its content starts leaking again.
    expect(nonMemberReadsGroup('g')).toBe(
      "coalesce(g.nonMemberRead, g.groupType <> 'hidden') = true",
    )
    expect(nonMemberReadsContent('g')).toBe(
      "coalesce(g.nonMemberContentRead, g.groupType = 'public') = true",
    )
    expect(nonMemberReadsMembers('g')).toBe(
      "coalesce(g.showMembers, g.groupType = 'public') = true",
    )
  })

  it('address whichever alias the calling statement bound', () => {
    expect(nonMemberReadsContent('resource')).toContain('resource.nonMemberContentRead')
  })
})

describe(roleHoldsPermission, () => {
  it('quotes the key so one right cannot match another', () => {
    // The needle is matched against the stored JSON list. Without the quotes, `group.read`
    // would also be found inside `group.read.history`, and a right nobody granted would be held.
    expect(roleHoldsPermission('r', 'group.read')).toContain('\'"group.read"\'')
    expect(roleHoldsPermission('r', 'group.members.read')).not.toContain('\'"group.read"\'')
  })

  it('lets the owner role through, which stores an empty list and means everything', () => {
    expect(roleHoldsPermission('r', 'group.content.read')).toContain("r.name = 'owner'")
  })

  it('reads a role without a stored list as holding nothing', () => {
    // coalesce, not a bare CONTAINS: `null CONTAINS '…'` is null, and a null in the middle of an
    // OR chain turns a decision into "unknown" rather than "no".
    expect(roleHoldsPermission('r', 'group.read')).toContain("coalesce(r.permissions, '')")
  })
})

describe(memberHoldsInGroup, () => {
  it('correlates the role with the membership inside ONE match clause', () => {
    // Neo4j 4.4 allows a single match clause in an existential subquery — two MATCH keywords
    // there is a syntax error, which is how this was first found: the whole search query
    // returned null.
    const condition = memberHoldsInGroup('g', 'group.content.read', '$viewerId')

    expect(condition.match(/MATCH/g)).toHaveLength(1)
    expect(condition).toContain('(:User { id: $viewerId })')
    expect(condition).toContain('WHERE roleForRight.name = membershipForRight.role')
    expect(condition).toContain('\'"group.content.read"\'')
  })
})

describe(optionalMemberRoleMatch, () => {
  it('binds the role for a projection, where an EXISTS subquery may not go', () => {
    const clauses = optionalMemberRoleMatch('group', '$viewerId')

    expect(clauses).toContain('OPTIONAL MATCH (group)<-[membershipForRight:MEMBER_OF]-')
    expect(clauses).toContain('OPTIONAL MATCH (group)-[:HAS_GROUP_ROLE]->(roleForRight:GroupRole)')
    expect(clauses).not.toContain('EXISTS')
  })

  it('pairs with a null-safe boolean expression', () => {
    // No membership ⇒ no role ⇒ the expression must say false, not null: a null would travel
    // into OR chains as "unknown" and stop the decision from being made.
    expect(memberRoleHolds('group.content.read')).toMatch(/^coalesce\(/)
    expect(memberRoleHolds('group.content.read')).toContain('roleForRight')
  })
})
