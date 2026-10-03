import { Kind } from 'graphql'
import { describe, it, expect } from 'vitest'

import GroupVisibilityEnum from '@graphql/types/enum/GroupVisibility.gql'
import { isKnownGroupPermission } from '@src/groupPermission'

import {
  DEFAULT_GROUP_ROLE_TEMPLATES,
  MANDATORY_GROUP_ROLE_NAMES,
  defaultTemplateFor,
} from './defaults'
import { permissionsForGroupRole } from './effective'
import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, PENDING_ROLE, USUAL_ROLE } from './types'

import type { EnumTypeDefinitionNode } from 'graphql'

// Off the LIVE schema, so a fourth visibility cannot be added without a template: a group
// created from a missing template would get no roles at all, i.e. nobody could do anything
// in it.
const visibilities = GroupVisibilityEnum.definitions
  .filter(
    (definition): definition is EnumTypeDefinitionNode =>
      definition.kind === Kind.ENUM_TYPE_DEFINITION && definition.name.value === 'GroupVisibility',
  )
  .flatMap((definition) => definition.values ?? [])
  .map((value) => value.name.value)

const templates = new Map(Object.entries(DEFAULT_GROUP_ROLE_TEMPLATES))
// Every template, not only the ones named after a visibility: since `channel` there are more
// templates than visibilities, and an unguarded template is one that can seed a group with
// rights nobody checked.
const templateNames = [...templates.keys()]
const rolesOf = (template: string) => templates.get(template) ?? []

const roleIn = (template: string, name: string) => {
  const role = rolesOf(template).find((entry) => entry.name === name)
  if (!role) {
    throw new Error(`no ${name} role in the ${template} template`)
  }
  return role
}

describe('default group role templates', () => {
  it('reads more than one visibility off the schema', () => {
    expect(visibilities.length).toBeGreaterThan(1)
  })

  it.each(visibilities)('has a template for %s', (visibility) => {
    expect(templates.get(visibility)).toBeDefined()
  })

  it('covers every visibility, and may offer more than one template per visibility', () => {
    // The direction that matters is "no visibility without a template": a group created from a
    // missing one would get no roles at all. The reverse used to be asserted as well, back when
    // the three templates were named after the three visibilities — `channel` is public too,
    // and what makes it a different template sits in the member role.
    for (const visibility of visibilities) {
      expect(templates.get(visibility)).toBeDefined()
    }

    expect(templateNames.length).toBeGreaterThanOrEqual(visibilities.length)
  })

  it.each(templateNames)('seeds the five known roles for %s', (visibility) => {
    expect(rolesOf(visibility).map((role) => role.name)).toEqual([
      NONE_ROLE,
      PENDING_ROLE,
      USUAL_ROLE,
      ADMIN_ROLE,
      OWNER_ROLE,
    ])
  })

  it.each(templateNames)('grants only catalog keys in the %s template', (visibility) => {
    for (const role of rolesOf(visibility)) {
      expect(role.permissions.filter((key) => !isKnownGroupPermission(key))).toEqual([])
      expect(new Set(role.permissions).size).toBe(role.permissions.length)
    }
  })

  it.each(templateNames)('marks the system roles and only those in %s', (visibility) => {
    const system = rolesOf(visibility)
      .filter((role) => role.system)
      .map((role) => role.name)

    expect(system.sort()).toEqual([...MANDATORY_GROUP_ROLE_NAMES].sort())
  })

  it.each(templateNames)('keeps owner protected and list-free in %s', (visibility) => {
    const owner = roleIn(visibility, OWNER_ROLE)

    // Storing no list is what makes a newly added catalog key automatically owned.
    expect(owner.permissions).toEqual([])
    expect(owner.protected).toBe(true)
    expect(owner.system).toBe(true)
  })

  it.each(templateNames)('leaves every role without a label in %s', (visibility) => {
    for (const role of rolesOf(visibility)) {
      // No label means "use the i18n default"; a template must not ship English names.
      expect(role.label).toBeNull()
    }
  })

  describe('the non-member role encodes the visibility', () => {
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

  describe('inviting follows the visibility', () => {
    it('lets members invite into a public group', () => {
      expect(roleIn('public', USUAL_ROLE).permissions).toContain('group.invite')
    })

    it.each(['closed', 'hidden'])('reserves inviting for admins in a %s group', (visibility) => {
      expect(roleIn(visibility, USUAL_ROLE).permissions).not.toContain('group.invite')
      expect(roleIn(visibility, ADMIN_ROLE).permissions).toContain('group.invite')
    })

    it.each(visibilities)(
      'reserves the registration-capable invite for admins in %s',
      (visibility) => {
        expect(roleIn(visibility, USUAL_ROLE).permissions).not.toContain('group.invite.external')
        expect(roleIn(visibility, ADMIN_ROLE).permissions).toContain('group.invite.external')
      },
    )
  })

  // The act-on rules are set dominance, so the intuitive ladder only holds while each
  // seeded role is a strict superset of the one below it. If it ever stops holding, an
  // admin silently loses the ability to remove a member.
  it.each(visibilities)(
    'keeps the ladder none ⊂ pending? ⊂ usual ⊂ admin ⊂ owner in %s',
    (visibility) => {
      const usual = permissionsForGroupRole(roleIn(visibility, USUAL_ROLE))
      const admin = permissionsForGroupRole(roleIn(visibility, ADMIN_ROLE))
      const owner = permissionsForGroupRole(roleIn(visibility, OWNER_ROLE))

      expect([...usual].filter((key) => !admin.has(key))).toEqual([])
      expect(admin.size).toBeGreaterThan(usual.size)
      expect([...admin].filter((key) => !owner.has(key))).toEqual([])
      expect(owner.size).toBeGreaterThan(admin.size)
    },
  )

  it.each(visibilities)('keeps pending below usual in %s', (visibility) => {
    const pending = permissionsForGroupRole(roleIn(visibility, PENDING_ROLE))
    const usual = permissionsForGroupRole(roleIn(visibility, USUAL_ROLE))

    expect([...pending].filter((key) => !usual.has(key))).toEqual([])
    expect(usual.size).toBeGreaterThan(pending.size)
  })

  describe(defaultTemplateFor, () => {
    it.each(visibilities)('returns the template for %s', (visibility) => {
      expect(defaultTemplateFor(visibility)?.map((role) => role.name)).toEqual([
        NONE_ROLE,
        PENDING_ROLE,
        USUAL_ROLE,
        ADMIN_ROLE,
        OWNER_ROLE,
      ])
    })

    it('returns undefined for an unknown visibility', () => {
      expect(defaultTemplateFor('ephemeral')).toBeUndefined()
    })

    it('returns copies, so seeding one group cannot change the template', () => {
      const copy = defaultTemplateFor('public')
      copy?.[0].permissions.push('group.role.manage')

      expect(roleIn('public', NONE_ROLE).permissions).not.toContain('group.role.manage')
    })
  })
})
