import { Kind } from 'graphql'
import { describe, it, expect } from 'vitest'

import GroupTypeEnum from '@graphql/types/enum/GroupType.gql'
import { isKnownPermission } from '@src/permission'

import { networkPrerequisiteFor, networkPrerequisiteSatisfied } from './prerequisites'

import type { PermissionKey } from '@src/permission'
import type { EnumTypeDefinitionNode } from 'graphql'

// Read the group types off the LIVE schema document rather than hard-coding them: the
// point of the checks below is that a fourth group type cannot be added without its
// network siblings, and a hand-written list would be exactly what fails to notice.
const groupTypes = GroupTypeEnum.definitions
  .filter(
    (definition): definition is EnumTypeDefinitionNode =>
      definition.kind === Kind.ENUM_TYPE_DEFINITION && definition.name.value === 'GroupType',
  )
  .flatMap((definition) => definition.values ?? [])
  .map((value) => value.name.value)

const setOf = (...keys: string[]) => new Set(keys as PermissionKey[])

// The two facts about a group the placeholders are resolved against. `open` is the weaker
// door, so the default here is the one a test has to opt out of to say something about it.
const inGroup = (groupType: string, callDoor = 'open') => ({ groupType, callDoor })

describe(networkPrerequisiteFor, () => {
  it('reads more than one group type off the schema', () => {
    // Guards the guards: an empty list would make every it.each below vacuously pass.
    expect(groupTypes.length).toBeGreaterThan(1)
  })

  it.each(groupTypes)(
    'resolves the per-type prerequisite for %s to a known network key',
    (groupType) => {
      const typeChange = networkPrerequisiteFor('group.type.change', inGroup(groupType))

      expect(typeChange).toBe(`group.create_${groupType}`)
      // The cap is only a cap while it names a right somebody can actually hold.
      expect(isKnownPermission(typeChange as string)).toBe(true)
    },
  )

  it('resolves the call prerequisite by the DOOR, not by the type', () => {
    // The point of the second placeholder: what caps opening a call is whether a stranger
    // could walk into the group, which is a question about its rights and not about its name.
    for (const groupType of groupTypes) {
      expect(networkPrerequisiteFor('group.videoCall.create', inGroup(groupType, 'open'))).toBe(
        'videoCall.create_open',
      )
      expect(
        networkPrerequisiteFor('group.videoCall.create', inGroup(groupType, 'restricted')),
      ).toBe('videoCall.create_restricted')
    }
  })

  it.each(groupTypes)(
    'returns the plain prerequisite regardless of the group type (%s)',
    (groupType) => {
      expect(networkPrerequisiteFor('group.post.create', inGroup(groupType))).toBe('post.create')
      expect(networkPrerequisiteFor('group.comment.create', inGroup(groupType))).toBe(
        'comment.create',
      )
    },
  )

  it('returns null for a purely group-scoped capability', () => {
    expect(networkPrerequisiteFor('group.members.read', inGroup('public'))).toBeNull()
    expect(networkPrerequisiteFor('group.role.manage', inGroup('closed'))).toBeNull()
  })

  it('fails closed for a group type the network catalog knows nothing about', () => {
    // The situation this exists for: a group type added to the schema without its
    // group.create_* sibling. The cap must then name a right nobody can hold rather
    // than quietly disappearing.
    const resolved = networkPrerequisiteFor('group.type.change', inGroup('ephemeral'))

    expect(resolved).toBe('unknown.group.create_ephemeral')
    expect(isKnownPermission(resolved as string)).toBe(false)
  })

  it('fails closed for a door the network catalog knows nothing about', () => {
    const resolved = networkPrerequisiteFor('group.videoCall.create', inGroup('public', 'ajar'))

    expect(resolved).toBe('unknown.videoCall.create_ajar')
    expect(isKnownPermission(resolved as string)).toBe(false)
  })
})

describe(networkPrerequisiteSatisfied, () => {
  it('is satisfied when the network right is held', () => {
    expect(
      networkPrerequisiteSatisfied('group.post.create', inGroup('public'), setOf('post.create')),
    ).toBe(true)
  })

  it('is not satisfied when the network right is missing', () => {
    // The whole point of the hard cap: a right revoked network-wide cannot be granted
    // back to oneself through one's own group.
    expect(networkPrerequisiteSatisfied('group.post.create', inGroup('public'), setOf())).toBe(
      false,
    )
  })

  it('is satisfied for capabilities without a network counterpart', () => {
    expect(networkPrerequisiteSatisfied('group.members.read', inGroup('hidden'), setOf())).toBe(
      true,
    )
  })

  it.each(groupTypes)('checks the per-type right for %s, not a sibling type', (groupType) => {
    const own = setOf(`group.create_${groupType}`)

    expect(networkPrerequisiteSatisfied('group.type.change', inGroup(groupType), own)).toBe(true)

    for (const otherType of groupTypes.filter((type) => type !== groupType)) {
      expect(networkPrerequisiteSatisfied('group.type.change', inGroup(otherType), own)).toBe(false)
    }
  })

  it('checks the right for the door the group actually has', () => {
    // Holding the open-door right in a group one cannot walk into is the case the split
    // exists for: the stronger call is the one nobody can look in on.
    const openOnly = setOf('videoCall.create_open')

    expect(
      networkPrerequisiteSatisfied('group.videoCall.create', inGroup('closed', 'open'), openOnly),
    ).toBe(true)
    expect(
      networkPrerequisiteSatisfied(
        'group.videoCall.create',
        inGroup('public', 'restricted'),
        openOnly,
      ),
    ).toBe(false)
  })

  it('can never be satisfied for an unknown group type', () => {
    expect(
      networkPrerequisiteSatisfied(
        'group.type.change',
        inGroup('ephemeral'),
        setOf('group.create_public'),
      ),
    ).toBe(false)
  })
})
