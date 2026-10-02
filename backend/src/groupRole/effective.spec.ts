import { describe, it, expect } from 'vitest'

import { allGroupPermissionKeys } from '@src/groupPermission'

import { defaultTemplateFor } from './defaults'
import { authoritySourceFor, effectiveGroupPermissions, permissionsForGroupRole } from './effective'
import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, USUAL_ROLE } from './types'

import type { GroupRoleDefinition } from './types'
import type { GroupGateContext, GroupPermissionKey } from '@src/groupPermission'
import type { PermissionKey } from '@src/permission'

const template = (visibility: string, name: string): GroupRoleDefinition => {
  const role = defaultTemplateFor(visibility)?.find((entry) => entry.name === name)
  if (!role) {
    throw new Error(`no ${name} role in the ${visibility} template`)
  }
  return role
}

// Everything on: groups, calls and invite registration.
const ALL_GATES_OPEN: GroupGateContext = { policy: { getEffective: () => true } }
const gatesExcept = (...closed: string[]): GroupGateContext => ({
  policy: { getEffective: (key: string) => !closed.includes(key) },
})

// The network rights the caps refer to. A user who holds everything network-side, so the
// cap only shows up where it is deliberately removed below.
const NETWORK_ALL = new Set<PermissionKey>([
  'post.create',
  'comment.create',
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'videoCall.create_open',
  'videoCall.create_restricted',
])

describe(permissionsForGroupRole, () => {
  it('resolves owner to the whole catalog', () => {
    // Not to a stored list: a key added to the catalog tomorrow is owned today.
    expect(permissionsForGroupRole(template('public', OWNER_ROLE))).toEqual(
      new Set(allGroupPermissionKeys()),
    )
  })

  it('resolves an ordinary role to its stored list', () => {
    expect(permissionsForGroupRole(template('closed', USUAL_ROLE))).toEqual(
      new Set(template('closed', USUAL_ROLE).permissions),
    )
  })

  it.each([null, undefined])('fails closed to nothing for %s', (role) => {
    // The state a half-applied migration leaves behind. Empty means "nothing", never "all".
    expect(permissionsForGroupRole(role)).toEqual(new Set())
  })
})

describe(effectiveGroupPermissions, () => {
  it('grants a member their role, capped by nothing else', () => {
    const effective = effectiveGroupPermissions({
      role: template('public', USUAL_ROLE),
      networkEffective: NETWORK_ALL,
      gateContext: ALL_GATES_OPEN,
    })

    expect(effective).toEqual(new Set(template('public', USUAL_ROLE).permissions))
  })

  it('unions the two authority sources', () => {
    // The case a pure intersection would get wrong: a network admin is role `none` in a
    // group they never joined, so their rights can only come from the network side.
    const effective = effectiveGroupPermissions({
      role: template('hidden', NONE_ROLE),
      networkAuthority: new Set<GroupPermissionKey>(['group.read', 'group.content.read']),
      networkEffective: NETWORK_ALL,
      gateContext: ALL_GATES_OPEN,
    })

    expect(effective).toEqual(new Set(['group.read', 'group.content.read']))
  })

  it('adds network authority on top of a membership role', () => {
    const effective = effectiveGroupPermissions({
      role: template('closed', USUAL_ROLE),
      networkAuthority: new Set<GroupPermissionKey>(['group.settings.manage']),
      networkEffective: NETWORK_ALL,
      gateContext: ALL_GATES_OPEN,
    })

    // Being a plain member does not take the network right away (concept E18: it applies
    // implicitly, it is only marked).
    expect(effective.has('group.settings.manage')).toBe(true)
    expect(effective.has('group.post.create')).toBe(true)
  })

  it('caps a right whose network counterpart is missing', () => {
    // The whole point of the hard cap: posting revoked network-wide cannot be granted back
    // to oneself inside one's own group.
    const effective = effectiveGroupPermissions({
      role: template('public', USUAL_ROLE),
      networkEffective: new Set<PermissionKey>(['comment.create']),
      gateContext: ALL_GATES_OPEN,
    })

    expect(effective.has('group.post.create')).toBe(false)
    expect(effective.has('group.comment.create')).toBe(true)
    // Uncapped rights are untouched by the network side.
    expect(effective.has('group.read')).toBe(true)
  })

  it('caps the call right against the door the group has', () => {
    const owner = {
      role: template('closed', OWNER_ROLE),
      networkEffective: new Set<PermissionKey>([
        'post.create',
        'comment.create',
        'videoCall.create_open',
      ]),
      gateContext: ALL_GATES_OPEN,
    }

    // Holding the OPEN-DOOR call right does not open calls in a group one cannot walk into.
    const behindADoor = effectiveGroupPermissions({ ...owner, callDoor: 'restricted' })

    expect(behindADoor.has('group.videoCall.create')).toBe(false)
    // Joining a running call has no network counterpart, so it stays.
    expect(behindADoor.has('group.videoCall.join')).toBe(true)

    const walkIn = effectiveGroupPermissions({ ...owner, callDoor: 'open' })

    expect(walkIn.has('group.videoCall.create')).toBe(true)
  })

  it('drops everything while groups are disabled', () => {
    const effective = effectiveGroupPermissions({
      role: template('public', OWNER_ROLE),
      networkAuthority: new Set<GroupPermissionKey>(['group.read']),
      networkEffective: NETWORK_ALL,
      gateContext: gatesExcept('groupsEnabled'),
    })

    expect(effective).toEqual(new Set())
  })

  it('drops the call rights while video conferencing is off', () => {
    const effective = effectiveGroupPermissions({
      role: template('public', OWNER_ROLE),
      networkEffective: NETWORK_ALL,
      gateContext: gatesExcept('videoConference'),
    })

    expect(effective.has('group.videoCall.create')).toBe(false)
    expect(effective.has('group.videoCall.join')).toBe(false)
    expect(effective.has('group.chat.participate')).toBe(true)
  })

  it('drops the registration-capable invite while invite registration is off', () => {
    const effective = effectiveGroupPermissions({
      role: template('public', ADMIN_ROLE),
      networkEffective: NETWORK_ALL,
      gateContext: gatesExcept('inviteRegistration'),
    })

    expect(effective.has('group.invite.external')).toBe(false)
    // The plain group invite is independent of it — that is why the key was split.
    expect(effective.has('group.invite')).toBe(true)
  })

  it('grants nothing to a non-member of a hidden group', () => {
    expect(
      effectiveGroupPermissions({
        role: template('hidden', NONE_ROLE),
        networkEffective: NETWORK_ALL,
        gateContext: ALL_GATES_OPEN,
      }),
    ).toEqual(new Set())
  })
})

describe(authoritySourceFor, () => {
  const role = template('closed', USUAL_ROLE)
  const network = new Set<GroupPermissionKey>(['group.settings.manage', 'group.post.create'])

  it('reports membership for a right that only the role carries', () => {
    expect(authoritySourceFor('group.leave', role, network)).toBe('membership')
  })

  it('reports network for a right that only the network carries', () => {
    expect(authoritySourceFor('group.settings.manage', role, network)).toBe('network')
  })

  it('reports both when either would do', () => {
    expect(authoritySourceFor('group.post.create', role, network)).toBe('both')
  })

  it('reports nothing for a right that is not held', () => {
    expect(authoritySourceFor('group.role.manage', role, network)).toBeNull()
  })

  it('works without a network set at all', () => {
    expect(authoritySourceFor('group.leave', role)).toBe('membership')
    expect(authoritySourceFor('group.role.manage', role)).toBeNull()
  })
})

describe('the floor from the non-member role', () => {
  // The group's own rules reach everybody in it: whatever `none` grants, nobody inside holds
  // less. Without it an applicant to an open group was worse off for having asked.
  it('lifts an applicant to what a stranger already gets', () => {
    const effective = effectiveGroupPermissions({
      role: {
        name: 'pending',
        label: null,
        system: true,
        protected: false,
        permissions: ['group.read', 'group.leave'],
      },
      networkEffective: new Set(),
      nonMemberPermissions: ['group.read', 'group.content.read', 'group.members.read'],
      gateContext: ALL_GATES_OPEN,
    })

    expect([...effective].sort()).toEqual([
      'group.content.read',
      'group.leave',
      'group.members.read',
      'group.read',
    ])
  })

  it('leaves a member who already holds more exactly as they were', () => {
    const effective = effectiveGroupPermissions({
      role: {
        name: 'usual',
        label: null,
        system: true,
        protected: false,
        permissions: ['group.read', 'group.content.read', 'group.post.create'],
      },
      // `group.post.create` is capped by the network's `post.create`; with an empty network set
      // the right drops out and the test would be about the cap rather than about the floor.
      networkEffective: NETWORK_ALL,
      nonMemberPermissions: ['group.read'],
      gateContext: ALL_GATES_OPEN,
    })

    expect([...effective].sort()).toEqual(['group.content.read', 'group.post.create', 'group.read'])
  })

  it('does not lift anybody above what the group grants strangers', () => {
    const effective = effectiveGroupPermissions({
      role: {
        name: 'pending',
        label: null,
        system: true,
        protected: false,
        permissions: ['group.leave'],
      },
      networkEffective: new Set(),
      nonMemberPermissions: [],
      gateContext: ALL_GATES_OPEN,
    })

    expect([...effective]).toEqual(['group.leave'])
  })
})
