import { describe, it, expect } from 'vitest'

import { allPermissionKeys } from '@src/permission'
import { allKeys as allPolicyKeys, typeFor as policyTypeFor } from '@src/policy'

import {
  allGroupPermissionGates,
  allGroupPermissionKeys,
  descriptionFor,
  gatesFor,
  groupFor,
  groupPermissionCatalog,
  isKnownGroupPermission,
  networkPrerequisiteTemplateFor,
  sanitizeGroupPermissions,
} from './schema'
import { GROUPS_ENABLED_GATE } from './types'

import type { GroupPermissionKey } from './types'
import type { PolicyKey } from '@src/policy'

// Drift guard: the canonical set of group keys. If groupPermission.catalog.json changes,
// this list AND the GroupPermissionKey union in types.ts must be updated in lockstep —
// the assertion below fails loudly until they match (same discipline as the network
// catalog in ../permission/schema.spec.ts).
const EXPECTED_KEYS: GroupPermissionKey[] = [
  'group.read',
  'group.content.read',
  'group.members.read',
  'group.post.create',
  'group.comment.create',
  'group.post.pin',
  'group.post.moderate',
  'group.join',
  'group.join.request',
  'group.leave',
  'group.member.remove',
  'group.member.role.assign',
  'group.invite',
  'group.invite.external',
  'group.settings.manage',
  'group.role.manage',
  'group.chat.participate',
  'group.videoCall.create',
  'group.videoCall.join',
]

describe('group permission catalog', () => {
  describe(allGroupPermissionKeys, () => {
    it('returns exactly the catalog keys, in declaration order', () => {
      expect(allGroupPermissionKeys()).toEqual(EXPECTED_KEYS)
    })

    it('returns a fresh array (mutating it does not affect the catalog)', () => {
      const first = allGroupPermissionKeys()
      first.pop()

      expect(allGroupPermissionKeys()).toEqual(EXPECTED_KEYS)
    })
  })

  describe('metadata', () => {
    it.each(EXPECTED_KEYS)('exposes a non-empty group and description for %s', (key) => {
      expect(groupFor(key)).toEqual(expect.any(String))
      expect(groupFor(key).length).toBeGreaterThan(0)
      expect(descriptionFor(key)).toEqual(expect.any(String))
      expect(descriptionFor(key).length).toBeGreaterThan(0)
    })

    it('sorts every key into one of the known UI groups', () => {
      // Open string in the type, closed in practice: a typo would silently create a
      // section in the group rights UI that nobody styled or translated.
      const known = [
        'visibility',
        'content',
        // Acting on somebody else's post — pinning it or taking it out of the group — is a
        // different kind of right from writing one's own, and sat under `content` until the
        // sections were read side by side. `permissions.sections.moderation` already existed
        // for the network catalog, so the label came for free in all eleven languages.
        'moderation',
        'membership',
        'administration',
        'communication',
      ]

      expect([...new Set(EXPECTED_KEYS.map(groupFor))].sort()).toEqual([...known].sort())
    })
  })

  describe(gatesFor, () => {
    it('gates the feature-dependent rights and leaves the rest to groupsEnabled alone', () => {
      // groupsEnabled is NOT repeated per entry — it gates the whole catalog in ./gates.ts.
      // What shows up here are the additional feature dependencies.
      expect(gatesFor('group.videoCall.create')).toEqual(['videoConference'])
      expect(gatesFor('group.videoCall.join')).toEqual(['videoConference'])
      expect(gatesFor('group.invite.external')).toEqual(['inviteRegistration'])
      // An invite for someone who already has an account does not depend on the
      // registration policy — that is the whole point of splitting the two keys.
      expect(gatesFor('group.invite')).toEqual([])
      expect(gatesFor('group.post.create')).toEqual([])
    })

    it('derives the distinct gate list from the catalog, in declaration order', () => {
      expect(allGroupPermissionGates()).toEqual(['inviteRegistration', 'videoConference'])
    })

    it('names only boolean policy keys as gates', () => {
      // A gate is resolved through PolicyService.getEffective, so a gate that is not a
      // boolean policy key could never be open — it would silently disable the right.
      for (const gate of [GROUPS_ENABLED_GATE, ...allGroupPermissionGates()]) {
        expect(allPolicyKeys()).toContain(gate)
        expect(policyTypeFor(gate as PolicyKey)).toBe('boolean')
      }
    })
  })

  describe(isKnownGroupPermission, () => {
    it.each(EXPECTED_KEYS)('knows %s', (key) => {
      expect(isKnownGroupPermission(key)).toBe(true)
    })

    it.each([
      'group.delete', // deliberately not in the catalog: no resolver consumes it yet
      'group.owner.transfer', // covered by the assignment coverage rule instead
      'post.create', // a NETWORK key, not a group key
      '',
    ])('does not know %s', (key) => {
      expect(isKnownGroupPermission(key)).toBe(false)
    })
  })

  describe(networkPrerequisiteTemplateFor, () => {
    it('declares the hard cap where a capability exists network-wide too', () => {
      expect(networkPrerequisiteTemplateFor('group.post.create')).toBe('post.create')
      expect(networkPrerequisiteTemplateFor('group.comment.create')).toBe('comment.create')
      expect(networkPrerequisiteTemplateFor('group.videoCall.create')).toBe(
        'videoCall.create_<door>',
      )
    })

    it('leaves the purely group-scoped capabilities uncapped', () => {
      expect(networkPrerequisiteTemplateFor('group.members.read')).toBeNull()
      expect(networkPrerequisiteTemplateFor('group.role.manage')).toBeNull()
      expect(networkPrerequisiteTemplateFor('group.videoCall.join')).toBeNull()
    })
  })

  describe(groupPermissionCatalog, () => {
    it('projects key, group, gates, prerequisite and description', () => {
      const entry = groupPermissionCatalog().find((e) => e.key === 'group.videoCall.create')

      expect(groupPermissionCatalog()).toHaveLength(EXPECTED_KEYS.length)
      expect(entry).toMatchObject({
        key: 'group.videoCall.create',
        group: 'communication',
        gatedBy: ['videoConference'],
        requiresNetworkPermission: 'videoCall.create_<door>',
      })
      expect(entry?.description.length).toBeGreaterThan(0)
    })

    it('returns fresh objects (mutating one does not affect the catalog)', () => {
      const entry = groupPermissionCatalog()[0]
      entry.gatedBy.push('videoConference')

      expect(groupPermissionCatalog()[0].gatedBy).toEqual([])
    })
  })

  describe(sanitizeGroupPermissions, () => {
    it('drops unknown keys instead of throwing', () => {
      // Catalog drift: a key removed in a refactor grants nothing rather than breaking
      // every group whose stored role still mentions it.
      expect(sanitizeGroupPermissions(['group.read', 'group.gone', 'post.create'])).toEqual([
        'group.read',
      ])
    })

    it('de-duplicates and restores catalog order', () => {
      expect(
        sanitizeGroupPermissions(['group.leave', 'group.read', 'group.read', 'group.post.create']),
      ).toEqual(['group.read', 'group.post.create', 'group.leave'])
    })

    it('maps an empty list to an empty list', () => {
      expect(sanitizeGroupPermissions([])).toEqual([])
    })
  })

  // The two catalogs travel the API as plain strings and are resolved by different
  // services. A key present in both would be ambiguous at every call site, and the
  // group catalog's `group.*` prefix is what keeps them apart — including from the
  // network's own `group.create_*` family.
  it('shares no key with the network catalog', () => {
    const network = new Set<string>(allPermissionKeys())

    expect(allGroupPermissionKeys().filter((key) => network.has(key))).toEqual([])
  })
})
