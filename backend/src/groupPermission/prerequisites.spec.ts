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

// The one fact about a group the placeholder is resolved against. `open` is the weaker door,
// so the default here is the one a test has to opt out of to say something about it.
const inGroup = (callDoor = 'open') => ({ callDoor })

describe(networkPrerequisiteFor, () => {
  it('reads more than one group type off the schema', () => {
    // Guards the guards below, which quantify over the types.
    expect(groupTypes.length).toBeGreaterThan(1)
  })

  it('resolves the call prerequisite by the DOOR', () => {
    // What caps opening a call is whether a stranger could walk into the group — a question
    // about its rights, not about its name. It is the only per-group family left: the type is
    // derived now, so changing it is editing a role and is capped where that edit happens.
    expect(networkPrerequisiteFor('group.videoCall.create', inGroup('open'))).toBe(
      'videoCall.create_open',
    )
    expect(networkPrerequisiteFor('group.videoCall.create', inGroup('restricted'))).toBe(
      'videoCall.create_restricted',
    )
  })

  it('returns the plain prerequisite where the catalog names one key', () => {
    expect(networkPrerequisiteFor('group.post.create', inGroup())).toBe('post.create')
    expect(networkPrerequisiteFor('group.comment.create', inGroup())).toBe('comment.create')
  })

  it('returns null for a purely group-scoped capability', () => {
    expect(networkPrerequisiteFor('group.members.read', inGroup())).toBeNull()
    expect(networkPrerequisiteFor('group.role.manage', inGroup())).toBeNull()
  })

  it('fails closed for a door the network catalog knows nothing about', () => {
    // A door added without its `videoCall.create_*` sibling must name a right nobody can hold
    // rather than quietly dropping the cap.
    const resolved = networkPrerequisiteFor('group.videoCall.create', inGroup('ajar'))

    expect(resolved).toBe('unknown.videoCall.create_ajar')
    expect(isKnownPermission(resolved as string)).toBe(false)
  })
})

describe(networkPrerequisiteSatisfied, () => {
  it('is satisfied when the network right is held', () => {
    expect(networkPrerequisiteSatisfied('group.post.create', inGroup(), setOf('post.create'))).toBe(
      true,
    )
  })

  it('is not satisfied when the network right is missing', () => {
    // The whole point of the hard cap: a right revoked network-wide cannot be granted back to
    // oneself through one's own group.
    expect(networkPrerequisiteSatisfied('group.post.create', inGroup(), setOf())).toBe(false)
  })

  it('is satisfied for capabilities without a network counterpart', () => {
    expect(networkPrerequisiteSatisfied('group.members.read', inGroup(), setOf())).toBe(true)
  })

  it('checks the right for the door the group actually has', () => {
    // Holding the open-door right in a group one cannot walk into is the case the split exists
    // for: the stronger call is the one nobody can look in on.
    const openOnly = setOf('videoCall.create_open')

    expect(networkPrerequisiteSatisfied('group.videoCall.create', inGroup('open'), openOnly)).toBe(
      true,
    )
    expect(
      networkPrerequisiteSatisfied('group.videoCall.create', inGroup('restricted'), openOnly),
    ).toBe(false)
  })

  it('can never be satisfied for a door nobody has a key for', () => {
    expect(
      networkPrerequisiteSatisfied(
        'group.videoCall.create',
        inGroup('ajar'),
        setOf('videoCall.create_open', 'videoCall.create_restricted'),
      ),
    ).toBe(false)
  })
})
