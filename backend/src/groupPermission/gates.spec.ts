import { describe, it, expect } from 'vitest'

import {
  areGroupsEnabled,
  blockingGroupGateFor,
  isGroupGateOpen,
  isGroupPermissionAvailable,
  isGroupPermissionGatePolicyKey,
  GROUP_PERMISSION_GATE_POLICY_KEYS,
} from './gates'

import type { GroupGateContext } from './gates'

// A context whose policy answers `true` for exactly the listed keys.
const ctxWith = (...open: string[]): GroupGateContext => ({
  policy: { getEffective: (key: string) => open.includes(key) },
})

describe('group permission gates', () => {
  describe(areGroupsEnabled, () => {
    it('follows the groupsEnabled policy', () => {
      expect(areGroupsEnabled(ctxWith('groupsEnabled'))).toBe(true)
      expect(areGroupsEnabled(ctxWith())).toBe(false)
    })

    it('fails closed without a policy service', () => {
      // A context that carries no policy is a programming error, not a network with
      // groups on — treat it as off rather than handing out rights.
      expect(areGroupsEnabled({})).toBe(false)
    })
  })

  describe(isGroupPermissionAvailable, () => {
    it('makes an ungated right available while groups are on', () => {
      expect(isGroupPermissionAvailable('group.post.create', ctxWith('groupsEnabled'))).toBe(true)
    })

    it('makes nothing available while groups are off', () => {
      // Not even a right whose own gate is open: the feature toggle wins.
      const ctx = ctxWith('videoConference', 'inviteRegistration')

      expect(isGroupPermissionAvailable('group.post.create', ctx)).toBe(false)
      expect(isGroupPermissionAvailable('group.videoCall.create', ctx)).toBe(false)
    })

    it('requires the declared gate on top of groupsEnabled', () => {
      expect(isGroupPermissionAvailable('group.videoCall.create', ctxWith('groupsEnabled'))).toBe(
        false,
      )
      expect(
        isGroupPermissionAvailable(
          'group.videoCall.create',
          ctxWith('groupsEnabled', 'videoConference'),
        ),
      ).toBe(true)
      expect(isGroupPermissionAvailable('group.invite.external', ctxWith('groupsEnabled'))).toBe(
        false,
      )
      expect(
        isGroupPermissionAvailable(
          'group.invite.external',
          ctxWith('groupsEnabled', 'inviteRegistration'),
        ),
      ).toBe(true)
    })

    it('keeps the plain group invite independent of the registration policy', () => {
      expect(isGroupPermissionAvailable('group.invite', ctxWith('groupsEnabled'))).toBe(true)
    })
  })

  describe(blockingGroupGateFor, () => {
    it('reports groupsEnabled first, because opening anything else would not help', () => {
      expect(blockingGroupGateFor('group.videoCall.create', ctxWith('videoConference'))).toBe(
        'groupsEnabled',
      )
    })

    it('reports the declared gate once groups are on', () => {
      expect(blockingGroupGateFor('group.videoCall.create', ctxWith('groupsEnabled'))).toBe(
        'videoConference',
      )
    })

    it('reports nothing for an effective right', () => {
      expect(
        blockingGroupGateFor('group.videoCall.join', ctxWith('groupsEnabled', 'videoConference')),
      ).toBeNull()
      expect(blockingGroupGateFor('group.read', ctxWith('groupsEnabled'))).toBeNull()
    })
  })

  describe(isGroupGateOpen, () => {
    it('reads a single gate off the policy', () => {
      expect(isGroupGateOpen('videoConference', ctxWith('videoConference'))).toBe(true)
      expect(isGroupGateOpen('videoConference', ctxWith())).toBe(false)
      expect(isGroupGateOpen('videoConference', {})).toBe(false)
    })
  })

  describe('gate policy keys', () => {
    it('lists groupsEnabled plus every gate the catalog declares', () => {
      expect(GROUP_PERMISSION_GATE_POLICY_KEYS).toEqual([
        'groupsEnabled',
        'inviteRegistration',
        'videoConference',
      ])
    })

    it('recognises exactly those keys', () => {
      // A policy change to one of these flips group rights network-wide, so the
      // caches have to be re-broadcast for them and for nothing else.
      expect(isGroupPermissionGatePolicyKey('groupsEnabled')).toBe(true)
      expect(isGroupPermissionGatePolicyKey('videoConference')).toBe(true)
      expect(isGroupPermissionGatePolicyKey('publicRegistration')).toBe(false)
    })
  })
})
