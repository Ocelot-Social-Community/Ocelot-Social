import { Kind } from 'graphql'
import { describe, it, expect } from 'vitest'

import GroupTypeEnum from '@graphql/types/enum/GroupType.gql'
import { isKnownGroupPermission } from '@src/groupPermission'

import {
  DEFAULT_GROUP_ROLE_TEMPLATES,
  MANDATORY_GROUP_ROLE_NAMES,
  defaultTemplateFor,
} from './defaults'
import { permissionsForGroupRole } from './effective'
import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, PENDING_ROLE, USUAL_ROLE } from './types'

import type { EnumTypeDefinitionNode } from 'graphql'

// Off the LIVE schema, so a fourth group type cannot be added without a template: a group
// created from a missing template would get no roles at all, i.e. nobody could do anything
// in it.
const groupTypes = GroupTypeEnum.definitions
  .filter(
    (definition): definition is EnumTypeDefinitionNode =>
      definition.kind === Kind.ENUM_TYPE_DEFINITION && definition.name.value === 'GroupType',
  )
  .flatMap((definition) => definition.values ?? [])
  .map((value) => value.name.value)

const templates = new Map(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))
const rolesOf = (groupType: string) => templates.get(groupType) ?? []

const roleIn = (groupType: string, name: string) => {
  const role = rolesOf(groupType).find((entry) => entry.name === name)
  if (!role) {
    throw new Error(`no ${name} role in the ${groupType} template`)
  }
  return role
}

describe('default group role templates', () => {
  it('reads more than one group type off the schema', () => {
    expect(groupTypes.length).toBeGreaterThan(1)
  })

  it.each(groupTypes)('has a template for %s', (groupType) => {
    expect(templates.get(groupType)).toBeDefined()
  })

  it('has a template for no other type', () => {
    expect(Object.keys(DEFAULT_GROUP_ROLE_TEMPLATES).sort()).toEqual([...groupTypes].sort())
  })

  it.each(groupTypes)('seeds the five known roles for %s', (groupType) => {
    expect(rolesOf(groupType).map((role) => role.name)).toEqual([
      NONE_ROLE,
      PENDING_ROLE,
      USUAL_ROLE,
      ADMIN_ROLE,
      OWNER_ROLE,
    ])
  })

  it.each(groupTypes)('grants only catalog keys in the %s template', (groupType) => {
    for (const role of rolesOf(groupType)) {
      expect(role.permissions.filter((key) => !isKnownGroupPermission(key))).toEqual([])
      expect(new Set(role.permissions).size).toBe(role.permissions.length)
    }
  })

  it.each(groupTypes)('marks the system roles and only those in %s', (groupType) => {
    const system = rolesOf(groupType)
      .filter((role) => role.system)
      .map((role) => role.name)

    expect(system.sort()).toEqual([...MANDATORY_GROUP_ROLE_NAMES].sort())
  })

  it.each(groupTypes)('keeps owner protected and list-free in %s', (groupType) => {
    const owner = roleIn(groupType, OWNER_ROLE)

    // Storing no list is what makes a newly added catalog key automatically owned.
    expect(owner.permissions).toEqual([])
    expect(owner.protected).toBe(true)
    expect(owner.system).toBe(true)
  })

  it.each(groupTypes)('leaves every role without a label in %s', (groupType) => {
    for (const role of rolesOf(groupType)) {
      // No label means "use the i18n default"; a template must not ship English names.
      expect(role.label).toBeNull()
    }
  })

  describe('the non-member role encodes the group type', () => {
    it('lets anyone read and join a public group', () => {
      expect(roleIn('public', NONE_ROLE).permissions).toEqual([
        'group.read',
        'group.content.read',
        'group.members.read',
        'group.join',
      ])
    })

    it('lets anyone find a closed group and ask to join, but not read it', () => {
      // Seeing the member list is what the showMembers setting decides; the migration
      // writes group.members.read in for groups that had it on.
      expect(roleIn('closed', NONE_ROLE).permissions).toEqual(['group.read', 'group.join.request'])
    })

    it('grants nothing at all in a hidden group', () => {
      // This is what makes joining a hidden group structurally impossible (#8398) rather
      // than a special case in the join guard.
      expect(roleIn('hidden', NONE_ROLE).permissions).toEqual([])
    })
  })

  describe('inviting follows the group type', () => {
    it('lets members invite into a public group', () => {
      expect(roleIn('public', USUAL_ROLE).permissions).toContain('group.invite')
    })

    it.each(['closed', 'hidden'])('reserves inviting for admins in a %s group', (groupType) => {
      expect(roleIn(groupType, USUAL_ROLE).permissions).not.toContain('group.invite')
      expect(roleIn(groupType, ADMIN_ROLE).permissions).toContain('group.invite')
    })

    it.each(groupTypes)(
      'reserves the registration-capable invite for admins in %s',
      (groupType) => {
        expect(roleIn(groupType, USUAL_ROLE).permissions).not.toContain('group.invite.external')
        expect(roleIn(groupType, ADMIN_ROLE).permissions).toContain('group.invite.external')
      },
    )
  })

  // The act-on rules are set dominance, so the intuitive ladder only holds while each
  // seeded role is a strict superset of the one below it. If it ever stops holding, an
  // admin silently loses the ability to remove a member.
  it.each(groupTypes)(
    'keeps the ladder none ⊂ pending? ⊂ usual ⊂ admin ⊂ owner in %s',
    (groupType) => {
      const usual = permissionsForGroupRole(roleIn(groupType, USUAL_ROLE))
      const admin = permissionsForGroupRole(roleIn(groupType, ADMIN_ROLE))
      const owner = permissionsForGroupRole(roleIn(groupType, OWNER_ROLE))

      expect([...usual].filter((key) => !admin.has(key))).toEqual([])
      expect(admin.size).toBeGreaterThan(usual.size)
      expect([...admin].filter((key) => !owner.has(key))).toEqual([])
      expect(owner.size).toBeGreaterThan(admin.size)
    },
  )

  it.each(groupTypes)('keeps pending below usual in %s', (groupType) => {
    const pending = permissionsForGroupRole(roleIn(groupType, PENDING_ROLE))
    const usual = permissionsForGroupRole(roleIn(groupType, USUAL_ROLE))

    expect([...pending].filter((key) => !usual.has(key))).toEqual([])
    expect(usual.size).toBeGreaterThan(pending.size)
  })

  describe(defaultTemplateFor, () => {
    it.each(groupTypes)('returns the template for %s', (groupType) => {
      expect(defaultTemplateFor(groupType)?.map((role) => role.name)).toEqual([
        NONE_ROLE,
        PENDING_ROLE,
        USUAL_ROLE,
        ADMIN_ROLE,
        OWNER_ROLE,
      ])
    })

    it('returns undefined for an unknown group type', () => {
      expect(defaultTemplateFor('ephemeral')).toBeUndefined()
    })

    it('returns copies, so seeding one group cannot change the template', () => {
      const copy = defaultTemplateFor('public')
      copy?.[0].permissions.push('group.role.manage')

      expect(roleIn('public', NONE_ROLE).permissions).not.toContain('group.role.manage')
    })
  })
})
