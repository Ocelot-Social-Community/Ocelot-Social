import { describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import {
  isMandatoryFor,
  isMootFor,
  MANDATORY_MEMBERSHIP_RIGHTS,
  NON_MEMBER_ONLY_RIGHTS,
  storableRightsFor,
  withImpliedRights,
} from './mandatoryRights'
import { NONE_ROLE } from './types'

describe(storableRightsFor, () => {
  it('adds the right to leave to a membership role that was written without it', () => {
    expect(storableRightsFor('usual', ['group.read'])).toEqual(['group.read', 'group.leave'])
  })

  it('leaves a list that already holds it exactly as it is', () => {
    expect(storableRightsFor('usual', ['group.leave', 'group.read'])).toEqual([
      'group.leave',
      'group.read',
    ])
  })

  it('adds nothing to the non-member role, which is not a membership', () => {
    // There is nothing to leave without a membership, and `none` granting it would read as
    // "strangers may leave this group".
    expect(storableRightsFor(NONE_ROLE, ['group.read'])).toEqual(['group.read'])
  })

  it('applies to a role a group invented as much as to the seeded ones', () => {
    expect(storableRightsFor('steward', [])).toEqual(['group.leave'])
  })

  it('drops a join right from a role that IS a membership', () => {
    // Somebody holding a membership role has already joined; on `pending` it would read as
    // "an applicant may admit themselves", which is what approval exists to prevent.
    expect(storableRightsFor('usual', ['group.read', 'group.join'])).toEqual([
      'group.read',
      'group.leave',
    ])
    expect(storableRightsFor('pending', ['group.join.request'])).toEqual(['group.leave'])
  })

  it('keeps the join rights on the non-member role, where they are the whole point', () => {
    expect(storableRightsFor(NONE_ROLE, ['group.read', 'group.join'])).toEqual([
      'group.read',
      'group.join',
    ])
  })
})

describe(withImpliedRights, () => {
  it('adds the right to see the group to the right to read its content', () => {
    // Without this, every switch in the simple view could be ticked and the group still
    // reported as hidden: the visibility asks for `group.read` before anything else.
    expect(withImpliedRights(['group.content.read'])).toEqual(['group.content.read', 'group.read'])
  })

  it('adds it to the right to see the member list too', () => {
    expect(withImpliedRights(['group.members.read'])).toEqual(['group.members.read', 'group.read'])
  })

  it('leaves a list that already closes its own implications alone', () => {
    expect(withImpliedRights(['group.read', 'group.content.read'])).toEqual([
      'group.read',
      'group.content.read',
    ])
  })

  it('implies nothing from a right that stands on its own', () => {
    expect(withImpliedRights(['group.post.create'])).toEqual(['group.post.create'])
  })
})

describe(isMandatoryFor, () => {
  it('answers for the right and the role together', () => {
    expect(isMandatoryFor('usual', 'group.leave')).toBe(true)
    expect(isMandatoryFor('pending', 'group.leave')).toBe(true)
    expect(isMandatoryFor(NONE_ROLE, 'group.leave')).toBe(false)
    expect(isMandatoryFor('usual', 'group.read')).toBe(false)
  })
})

describe('the seeded templates', () => {
  // The defaults have to satisfy the rule they are the defaults for; otherwise a group created
  // from them would be corrected on its first edit.
  it.each(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))('%s holds what it must', (_type, roles) => {
    for (const role of roles) {
      if (role.name === NONE_ROLE || role.protected) {
        continue
      }
      for (const mandatory of MANDATORY_MEMBERSHIP_RIGHTS) {
        expect(role.permissions).toContain(mandatory)
      }
    }
  })
})

describe(isMootFor, () => {
  it('is true for the right the non-member role has nothing to apply it to', () => {
    // Greyed rather than offered: granting a non-member the right to leave would be neither
    // true nor false, and a checkbox that changes nothing is worse than one that is absent.
    expect(isMootFor(NONE_ROLE, 'group.leave')).toBe(true)
    expect(isMootFor('usual', 'group.leave')).toBe(false)
    expect(isMootFor(NONE_ROLE, 'group.read')).toBe(false)
  })

  it('is true for a join right on every role that IS a membership', () => {
    for (const permission of NON_MEMBER_ONLY_RIGHTS) {
      expect(isMootFor(NONE_ROLE, permission)).toBe(false)
      expect(isMootFor('pending', permission)).toBe(true)
      expect(isMootFor('usual', permission)).toBe(true)
      expect(isMootFor('admin', permission)).toBe(true)
      expect(isMootFor('steward', permission)).toBe(true)
    }
  })

  it('never overlaps with what is mandatory', () => {
    // The two answers are about the same right from opposite ends; a role that must hold it
    // cannot be one for which it is meaningless.
    for (const roleName of [NONE_ROLE, 'pending', 'usual', 'admin']) {
      for (const permission of MANDATORY_MEMBERSHIP_RIGHTS) {
        expect(isMootFor(roleName, permission) && isMandatoryFor(roleName, permission)).toBe(false)
      }
    }
  })
})
