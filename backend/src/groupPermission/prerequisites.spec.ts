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

describe(networkPrerequisiteFor, () => {
  it('reads more than one group type off the schema', () => {
    // Guards the guards: an empty list would make every it.each below vacuously pass.
    expect(groupTypes.length).toBeGreaterThan(1)
  })

  it.each(groupTypes)(
    'resolves the per-type prerequisites for %s to known network keys',
    (groupType) => {
      const typeChange = networkPrerequisiteFor('group.type.change', groupType)
      const callCreate = networkPrerequisiteFor('group.videoCall.create', groupType)

      expect(typeChange).toBe(`group.create_${groupType}`)
      expect(callCreate).toBe(`videoCall.create_${groupType}`)
      // The cap is only a cap while it names a right somebody can actually hold.
      expect(isKnownPermission(typeChange as string)).toBe(true)
      expect(isKnownPermission(callCreate as string)).toBe(true)
    },
  )

  it.each(groupTypes)(
    'returns the plain prerequisite regardless of the group type (%s)',
    (groupType) => {
      expect(networkPrerequisiteFor('group.post.create', groupType)).toBe('post.create')
      expect(networkPrerequisiteFor('group.comment.create', groupType)).toBe('comment.create')
    },
  )

  it('returns null for a purely group-scoped capability', () => {
    expect(networkPrerequisiteFor('group.members.read', 'public')).toBeNull()
    expect(networkPrerequisiteFor('group.role.manage', 'closed')).toBeNull()
  })

  it('fails closed for a group type the network catalog knows nothing about', () => {
    // The situation this exists for: a group type added to the schema without its
    // group.create_* sibling. The cap must then name a right nobody can hold rather
    // than quietly disappearing.
    const resolved = networkPrerequisiteFor('group.type.change', 'ephemeral')

    expect(resolved).toBe('unknown.group.create_ephemeral')
    expect(isKnownPermission(resolved as string)).toBe(false)
  })
})

describe(networkPrerequisiteSatisfied, () => {
  it('is satisfied when the network right is held', () => {
    expect(networkPrerequisiteSatisfied('group.post.create', 'public', setOf('post.create'))).toBe(
      true,
    )
  })

  it('is not satisfied when the network right is missing', () => {
    // The whole point of the hard cap: a right revoked network-wide cannot be granted
    // back to oneself through one's own group.
    expect(networkPrerequisiteSatisfied('group.post.create', 'public', setOf())).toBe(false)
  })

  it('is satisfied for capabilities without a network counterpart', () => {
    expect(networkPrerequisiteSatisfied('group.members.read', 'hidden', setOf())).toBe(true)
  })

  it.each(groupTypes)('checks the per-type right for %s, not a sibling type', (groupType) => {
    const own = setOf(`videoCall.create_${groupType}`)

    expect(networkPrerequisiteSatisfied('group.videoCall.create', groupType, own)).toBe(true)

    for (const otherType of groupTypes.filter((type) => type !== groupType)) {
      expect(networkPrerequisiteSatisfied('group.videoCall.create', otherType, own)).toBe(false)
    }
  })

  it('can never be satisfied for an unknown group type', () => {
    expect(
      networkPrerequisiteSatisfied('group.type.change', 'ephemeral', setOf('group.create_public')),
    ).toBe(false)
  })
})
