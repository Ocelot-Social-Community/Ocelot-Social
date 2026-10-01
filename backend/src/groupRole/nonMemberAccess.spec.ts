import { describe, expect, it } from 'vitest'

import { defaultNonMemberAccessFor, nonMemberAccessFrom } from './nonMemberAccess'

describe(nonMemberAccessFrom, () => {
  it('reads the three rights off the permission list', () => {
    expect(nonMemberAccessFrom(['group.read', 'group.content.read', 'group.members.read'])).toEqual(
      {
        nonMemberRead: true,
        nonMemberContentRead: true,
        showMembers: true,
      },
    )
  })

  it('is false for every right a role does not hold', () => {
    expect(nonMemberAccessFrom(['group.read'])).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: false,
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
      })
    }
  })
})

describe(defaultNonMemberAccessFor, () => {
  // These three ARE the two Cypher fallbacks (`coalesce(g.nonMemberRead, g.groupType <>
  // 'hidden')`, `coalesce(g.nonMemberContentRead, g.groupType = 'public')`) and what the
  // migration writes for a group without roles. If a template changes, this fails and the
  // fallbacks have to be changed with it.
  it('matches the seeded template of a public group: everything open', () => {
    expect(defaultNonMemberAccessFor('public')).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: true,
      showMembers: true,
    })
  })

  it('matches a closed group: profile readable, content and members not', () => {
    expect(defaultNonMemberAccessFor('closed')).toEqual({
      nonMemberRead: true,
      nonMemberContentRead: false,
      showMembers: false,
    })
  })

  it('matches a hidden group: nothing', () => {
    expect(defaultNonMemberAccessFor('hidden')).toEqual({
      nonMemberRead: false,
      nonMemberContentRead: false,
      showMembers: false,
    })
  })

  it('grants nothing for a group type that has no template', () => {
    expect(defaultNonMemberAccessFor('experimental')).toEqual({
      nonMemberRead: false,
      nonMemberContentRead: false,
      showMembers: false,
    })
  })
})
