import { describe, expect, it } from 'vitest'

import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { isMandatoryFor, MANDATORY_MEMBERSHIP_RIGHTS, withMandatoryRights } from './mandatoryRights'
import { NONE_ROLE } from './types'

describe(withMandatoryRights, () => {
  it('adds the right to leave to a membership role that was written without it', () => {
    expect(withMandatoryRights('usual', ['group.read'])).toEqual(['group.read', 'group.leave'])
  })

  it('leaves a list that already holds it exactly as it is', () => {
    expect(withMandatoryRights('usual', ['group.leave', 'group.read'])).toEqual([
      'group.leave',
      'group.read',
    ])
  })

  it('adds nothing to the non-member role, which is not a membership', () => {
    // There is nothing to leave without a membership, and `none` granting it would read as
    // "strangers may leave this group".
    expect(withMandatoryRights(NONE_ROLE, ['group.read'])).toEqual(['group.read'])
  })

  it('applies to a role a group invented as much as to the seeded ones', () => {
    expect(withMandatoryRights('steward', [])).toEqual(['group.leave'])
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
