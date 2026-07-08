import {
  allPermissionGates,
  allPermissionKeys,
  descriptionFor,
  gatesFor,
  groupFor,
  isKnownPermission,
  permissionCatalog,
  sanitizePermissions,
} from './schema'

import type { PermissionKey } from './types'

// Drift guard: the canonical set of keys. If permission.catalog.json changes,
// this list AND the PermissionKey union in types.ts must be updated in lockstep
// — the assertion below fails loudly until they match (mirrors the policy
// schema/types discipline).
const EXPECTED_KEYS: PermissionKey[] = [
  'network.statistics.read',
  'role.manage',
  'policy.manage',
  'donation.manage',
  'apiKey.administer',
  'user.email.readAny',
  'user.delete.any',
  'badge.manage',
  'content.moderate',
  'user.disable',
  'post.pin',
  'post.push',
  'post.create',
  'comment.create',
  'socialMedia.create',
  'group.create_public',
  'group.create_closed',
  'group.create_hidden',
  'user.invite',
  'videoCall.create_public',
  'videoCall.create_closed',
  'videoCall.create_hidden',
  'apiKey.create',
]

describe('permission catalog', () => {
  describe('allPermissionKeys', () => {
    it('returns exactly the catalog keys, in declaration order', () => {
      expect(allPermissionKeys()).toEqual(EXPECTED_KEYS)
    })

    it('returns a fresh array (mutating it does not affect the catalog)', () => {
      const first = allPermissionKeys()
      first.pop()
      expect(allPermissionKeys()).toEqual(EXPECTED_KEYS)
    })
  })

  describe('metadata', () => {
    it.each(EXPECTED_KEYS)('exposes a non-empty group and description for %s', (key) => {
      expect(groupFor(key)).toEqual(expect.any(String))
      expect(groupFor(key).length).toBeGreaterThan(0)
      expect(descriptionFor(key)).toEqual(expect.any(String))
      expect(descriptionFor(key).length).toBeGreaterThan(0)
    })

    it('gates the feature-dependent rights, leaves the rest ungated', () => {
      // Group video calls need BOTH the video feature AND the groups feature on — multi-gate
      // (AND), normalised to a list. gatedBy is a list now; ungated rights get [].
      expect(gatesFor('videoCall.create_public')).toEqual(['videoConference', 'groupsEnabled'])
      expect(gatesFor('videoCall.create_closed')).toEqual(['videoConference', 'groupsEnabled'])
      expect(gatesFor('videoCall.create_hidden')).toEqual(['videoConference', 'groupsEnabled'])
      expect(gatesFor('apiKey.create')).toEqual(['apiKeysEnabled'])
      // Creating groups is gated by the groups feature; badge.manage is inert while badges
      // are disabled; user.invite while invite registration is off (codes couldn't be
      // redeemed). NB: apiKey.administer is deliberately NOT gated — admins must be able to
      // revoke still-valid keys after the feature is turned off.
      expect(gatesFor('group.create_public')).toEqual(['groupsEnabled'])
      expect(gatesFor('group.create_closed')).toEqual(['groupsEnabled'])
      expect(gatesFor('group.create_hidden')).toEqual(['groupsEnabled'])
      expect(gatesFor('badge.manage')).toEqual(['badgesEnabled'])
      expect(gatesFor('user.invite')).toEqual(['inviteRegistration'])
      expect(gatesFor('apiKey.administer')).toEqual([])
      // A representative ungated right.
      expect(gatesFor('post.create')).toEqual([])
      // The projection carries the (multi-)gate through.
      const publicCall = permissionCatalog().find((e) => e.key === 'videoCall.create_public')
      expect(publicCall?.gatedBy).toEqual(['videoConference', 'groupsEnabled'])
    })

    it('derives the distinct permission gates from the catalog, in declaration order', () => {
      // Feeds PERMISSION_GATE_POLICY_KEYS in gates.ts — de-duplicated (groupsEnabled and
      // videoConference are each declared by several rights) and ordered by first appearance
      // in the catalog: badge.manage, group.create_*, user.invite, the video-call rights,
      // then apiKey.create.
      expect(allPermissionGates()).toEqual([
        'badgesEnabled',
        'socialMediaEnabled',
        'groupsEnabled',
        'inviteRegistration',
        'videoConference',
        'apiKeysEnabled',
      ])
    })

    it('files the destructive per-user actions in the right groups', () => {
      // user.delete.any is irreversible/admin-grade → administration; user.disable is
      // reversible/moderator-grade → moderation. This drives isAdmin / canAccessModeration.
      expect(groupFor('user.delete.any')).toBe('administration')
      expect(groupFor('user.disable')).toBe('moderation')
    })

    it('only uses known groups', () => {
      const knownGroups = [
        'administration',
        'moderation',
        'content',
        'membership',
        'communication',
        'account',
      ]
      for (const key of allPermissionKeys()) {
        expect(knownGroups).toContain(groupFor(key))
      }
    })
  })

  describe('isKnownPermission', () => {
    it('is true for every catalog key', () => {
      for (const key of EXPECTED_KEYS) {
        expect(isKnownPermission(key)).toBe(true)
      }
    })

    it('is false for unknown keys', () => {
      expect(isKnownPermission('does.not.exist')).toBe(false)
      expect(isKnownPermission('')).toBe(false)
      expect(isKnownPermission('role.manage ')).toBe(false)
    })
  })

  describe('permissionCatalog', () => {
    it('projects every key with its group and description', () => {
      const catalog = permissionCatalog()
      expect(catalog).toHaveLength(EXPECTED_KEYS.length)
      expect(catalog.map((entry) => entry.key)).toEqual(EXPECTED_KEYS)
      for (const entry of catalog) {
        expect(entry.group).toBe(groupFor(entry.key))
        expect(entry.description).toBe(descriptionFor(entry.key))
      }
    })
  })

  describe('sanitizePermissions', () => {
    it('drops unknown keys (catalog drift grants nothing)', () => {
      expect(sanitizePermissions(['role.manage', 'ghost.permission', 'post.pin'])).toEqual([
        'role.manage',
        'post.pin',
      ])
    })

    it('de-duplicates and returns a stable catalog order', () => {
      // input order is scrambled + duplicated; output follows catalog order
      expect(sanitizePermissions(['post.pin', 'role.manage', 'post.pin', 'badge.manage'])).toEqual([
        'role.manage',
        'badge.manage',
        'post.pin',
      ])
    })

    it('returns an empty array for empty / all-unknown input', () => {
      expect(sanitizePermissions([])).toEqual([])
      expect(sanitizePermissions(['nope', 'also.nope'])).toEqual([])
    })
  })
})
