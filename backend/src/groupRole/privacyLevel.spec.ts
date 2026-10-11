import { describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import {
  createPermissionForLevel,
  isMorePrivate,
  PRIVACY_LEVELS,
  privacyLevelFrom,
  privacyLevelOfPermissions,
} from './privacyLevel'
import { NONE_ROLE } from './types'

import type { GroupPrivacyLevel } from './privacyLevel'

describe(privacyLevelFrom, () => {
  it('reads an unreadable profile as unlisted', () => {
    expect(
      privacyLevelFrom({
        nonMemberRead: false,
        nonMemberContentRead: false,
        showMembers: false,
        nonMemberJoin: false,
      }),
    ).toBe('hidden')
  })

  it('reads a readable profile with private content as closed', () => {
    expect(
      privacyLevelFrom({
        nonMemberRead: true,
        nonMemberContentRead: false,
        showMembers: false,
        nonMemberJoin: false,
      }),
    ).toBe('closed')
  })

  it('reads both as public', () => {
    expect(
      privacyLevelFrom({
        nonMemberRead: true,
        nonMemberContentRead: true,
        showMembers: true,
        nonMemberJoin: false,
      }),
    ).toBe('public')
  })

  it('ignores the member list, which is a separate right', () => {
    // "Public, but the member list stays private" is a combination the presets do not have and
    // the rights allow. It changes nothing about how FINDABLE the group is.
    expect(
      privacyLevelFrom({
        nonMemberRead: true,
        nonMemberContentRead: true,
        showMembers: false,
        nonMemberJoin: false,
      }),
    ).toBe('public')
  })

  it('reads content-without-profile as unlisted, not as public', () => {
    // A combination nobody would pick on purpose. The profile is what makes a group findable,
    // so without it the group is unlisted whatever else is granted — rounding towards the more
    // private answer is what keeps the caps conservative.
    expect(
      privacyLevelFrom({
        nonMemberRead: false,
        nonMemberContentRead: true,
        showMembers: true,
        nonMemberJoin: false,
      }),
    ).toBe('hidden')
  })
})

describe('the seeded templates', () => {
  // The drift guard that makes the derivation trustworthy. It used to say "each preset derives
  // to its own name", which held while every template was named after a visibility — `channel`
  // is public too, and what makes it a different template sits in the member role. What has to
  // stay true is weaker but still the thing that matters: every preset derives to a level the
  // code knows, so a group created from it is never listed as something that does not exist.
  it.each(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))(
    '%s derives to a level the code knows',
    (_template, roles) => {
      const none = roles.find((role) => role.name === NONE_ROLE)

      expect(PRIVACY_LEVELS).toContain(privacyLevelOfPermissions(none?.permissions))
    },
  )

  it('has a preset that derives to every level, so none of them is unreachable', () => {
    const derived = Object.values(DEFAULT_GROUP_ROLE_TEMPLATES).map((roles) =>
      privacyLevelOfPermissions(roles.find((role) => role.name === NONE_ROLE)?.permissions),
    )

    for (const level of PRIVACY_LEVELS) {
      expect(derived).toContain(level)
    }
  })

  it('still has one preset named after each level, which is what the tabs read', () => {
    for (const level of PRIVACY_LEVELS) {
      expect(Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES)).toContain(level)
    }
  })
})

describe(privacyLevelOfPermissions, () => {
  it('reads a role with no permissions at all as unlisted', () => {
    expect(privacyLevelOfPermissions([])).toBe('hidden')
    expect(privacyLevelOfPermissions(null)).toBe('hidden')
  })
})

describe(isMorePrivate, () => {
  it('orders the three levels', () => {
    expect(isMorePrivate('closed', 'public')).toBe(true)
    expect(isMorePrivate('hidden', 'closed')).toBe(true)
    expect(isMorePrivate('hidden', 'public')).toBe(true)
  })

  it('is false for the other direction and for an unchanged level', () => {
    // Opening a group up takes nothing away from anybody outside it, and a role rewrite that
    // leaves the level alone must not ask for a right at all.
    expect(isMorePrivate('public', 'closed')).toBe(false)
    expect(isMorePrivate('closed', 'hidden')).toBe(false)

    for (const level of PRIVACY_LEVELS) {
      expect(isMorePrivate(level, level)).toBe(false)
    }
  })
})

describe(createPermissionForLevel, () => {
  it('names the catalog key for each level', () => {
    // If a level ever had no `group.create_*` sibling, the cap would silently pass. The null
    // below is what keeps that from happening quietly.
    for (const level of PRIVACY_LEVELS) {
      expect(createPermissionForLevel(level)).toBe(`group.create_${level}`)
    }
  })

  it('answers null for a level the catalog does not know', () => {
    expect(createPermissionForLevel('experimental' as GroupPrivacyLevel)).toBeNull()
  })
})
