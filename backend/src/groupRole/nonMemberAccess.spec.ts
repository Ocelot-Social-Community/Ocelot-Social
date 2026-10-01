import { describe, expect, it } from 'vitest'

import { defaultNonMemberAccessFor, nonMemberAccessFrom } from './nonMemberAccess'

describe(nonMemberAccessFrom, () => {
  it('reads the four rights off the permission list', () => {
    expect(
      nonMemberAccessFrom(['group.read', 'group.content.read', 'group.members.read', 'group.join']),
    ).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: true,
      showMembers: true,
      nonMemberJoin: true,
    })
  })

  it('is false for every right a role does not hold', () => {
    expect(nonMemberAccessFrom(['group.read', 'group.join.request'])).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: false,
      // Asking to join is not joining: the longer key must not satisfy the shorter one.
      nonMemberJoin: false,
    })
  })

  it('grants nothing for a group with no non-member role at all', () => {
    // A group mid-migration, or one whose `none` role was lost: the derived columns must say
    // "no" rather than inherit the last value or fall through to the group type.
    for (const permissions of [null, undefined, []]) {
      expect(nonMemberAccessFrom(permissions)).toEqual({
        nonMemberRead: false,
        nonMemberContentRead: false,
        showMembers: false,
        nonMemberJoin: false,
      })
    }
  })
})

describe(defaultNonMemberAccessFor, () => {
  // These ARE the Cypher fallbacks (`coalesce(g.nonMemberRead, g.groupType <> 'hidden')`,
  // `coalesce(g.nonMemberContentRead, g.groupType = 'public')`, `coalesce(g.nonMemberJoin,
  // g.groupType = 'public')`) and what the migration writes for a group without roles. If a
  // template changes, this fails and the fallbacks have to be changed with it.
  it('matches the seeded template of a public group: everything open', () => {
    expect(defaultNonMemberAccessFor('public')).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: true,
      showMembers: true,
      nonMemberJoin: true,
    })
  })

  it('matches a closed group: profile readable, content and members not', () => {
    expect(defaultNonMemberAccessFor('closed')).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: false,
      // `group.join.request` instead: the door asks before it opens.
      nonMemberJoin: false,
    })
  })

  it('matches a hidden group: nothing', () => {
    expect(defaultNonMemberAccessFor('hidden')).toEqual({
      nonMemberRead: false,
      nonMemberContentRead: false,
      showMembers: false,
      nonMemberJoin: false,
    })
  })

  it('grants nothing for a group type that has no template', () => {
    expect(defaultNonMemberAccessFor('experimental')).toEqual({
      nonMemberRead: false,
      nonMemberContentRead: false,
      showMembers: false,
      nonMemberJoin: false,
    })
  })
})
