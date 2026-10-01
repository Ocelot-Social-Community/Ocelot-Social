import { describe, expect, it } from 'vitest'

import {
  CALL_DOORS,
  callDoorFrom,
  callDoorOfPermissions,
  videoCallCreatePermissionFor,
} from './callDoor'
import { DEFAULT_GROUP_ROLE_TEMPLATES } from './defaults'
import { NONE_ROLE } from './types'

import type { CallDoor } from './callDoor'

describe(callDoorFrom, () => {
  it('needs both halves: findable AND enterable', () => {
    expect(callDoorFrom({ nonMemberRead: true, nonMemberJoin: true })).toBe('open')
    // A door nobody can see is not a door one can walk through.
    expect(callDoorFrom({ nonMemberRead: false, nonMemberJoin: true })).toBe('restricted')
    // Findable but admission is asked for: the call is behind a decision.
    expect(callDoorFrom({ nonMemberRead: true, nonMemberJoin: false })).toBe('restricted')
    expect(callDoorFrom({ nonMemberRead: false, nonMemberJoin: false })).toBe('restricted')
  })
})

describe(callDoorOfPermissions, () => {
  it('reads the two rights off a non-member role', () => {
    expect(callDoorOfPermissions(['group.read', 'group.join'])).toBe('open')
    expect(callDoorOfPermissions(['group.read', 'group.join.request'])).toBe('restricted')
    expect(callDoorOfPermissions([])).toBe('restricted')
    expect(callDoorOfPermissions(null)).toBe('restricted')
  })
})

describe('the seeded templates', () => {
  // The parity statement that makes this change safe to ship: on the three presets the door
  // says exactly what the old per-type cap said. `public` was the only type whose calls the
  // default network role could open, and `public` is the only preset with an open door.
  const expected = new Map<string, CallDoor>([
    ['public', 'open'],
    ['closed', 'restricted'],
    ['hidden', 'restricted'],
  ])

  it('states a door for every preset there is', () => {
    // Without this, a fourth preset would make the per-template check below pass vacuously.
    expect([...expected.keys()].sort()).toEqual(Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES).sort())
  })

  it.each(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))(
    '%s keeps its old cap',
    (groupType, roles) => {
      const none = roles.find((role) => role.name === NONE_ROLE)

      expect(callDoorOfPermissions(none?.permissions)).toBe(expected.get(groupType))
    },
  )
})

describe(videoCallCreatePermissionFor, () => {
  it('names a catalog key for every door the code knows', () => {
    // The drift guard: a door without its `videoCall.create_*` sibling would make the cap
    // resolve to a key nobody can hold, which fails closed but silently.
    for (const door of CALL_DOORS) {
      expect(videoCallCreatePermissionFor(door)).toBe(`videoCall.create_${door}`)
    }
  })

  it('answers null for a door the catalog does not know', () => {
    expect(videoCallCreatePermissionFor('ajar' as CallDoor)).toBeNull()
  })
})
