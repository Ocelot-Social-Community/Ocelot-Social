import { describe, expect, it } from 'vitest'

import {
  memberHoldsInGroup,
  nonMemberReadsContent,
  nonMemberReadsGroup,
  nonMemberReadsMembers,
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

describe(memberHoldsInGroup, () => {
  it('matches the right against the role the membership names', () => {
    const condition = memberHoldsInGroup('g', 'group.content.read', '$viewerId')

    expect(condition).toContain(
      'MATCH (g)<-[membershipForRight:MEMBER_OF]-(:User { id: $viewerId })',
    )
    expect(condition).toContain(
      'MATCH (g)-[:HAS_GROUP_ROLE]->(roleForRight:GroupRole { name: membershipForRight.role })',
    )
  })

  it('quotes the key so one right cannot match another', () => {
    // The needle is matched against the stored JSON list. Without the quotes,
    // `group.read` would also be found inside `group.read.history`, and a right nobody
    // granted would be held.
    expect(memberHoldsInGroup('g', 'group.read', '$viewerId')).toContain(
      'roleForRight.permissions CONTAINS \'"group.read"\'',
    )
    expect(memberHoldsInGroup('g', 'group.members.read', '$viewerId')).not.toContain(
      '\'"group.read"\'',
    )
  })
})
