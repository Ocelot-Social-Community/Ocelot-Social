import { describe, it, expect } from 'vitest'

import { coversRole, dominatesInGroup, mayAssignGroupRole, mayRemoveGroupMember } from './authority'
import { defaultTemplateFor } from './defaults'
import { permissionsForGroupRole } from './effective'
import { ADMIN_ROLE, NONE_ROLE, OWNER_ROLE, PENDING_ROLE, USUAL_ROLE } from './types'

import type { GroupPermissionKey } from '@src/groupPermission'

const permissions = (name: string, groupType = 'closed') => {
  const role = defaultTemplateFor(groupType)?.find((entry) => entry.name === name)
  if (!role) {
    throw new Error(`no ${name} role in the ${groupType} template`)
  }
  return permissionsForGroupRole(role)
}

const none = () => permissions(NONE_ROLE)
const pending = () => permissions(PENDING_ROLE)
const usual = () => permissions(USUAL_ROLE)
const admin = () => permissions(ADMIN_ROLE)
const owner = () => permissions(OWNER_ROLE)

describe(dominatesInGroup, () => {
  it('lets each seeded role act on the ones below it', () => {
    expect(dominatesInGroup(owner(), admin())).toBe(true)
    expect(dominatesInGroup(owner(), usual())).toBe(true)
    expect(dominatesInGroup(admin(), usual())).toBe(true)
    expect(dominatesInGroup(admin(), pending())).toBe(true)
    expect(dominatesInGroup(usual(), pending())).toBe(true)
    expect(dominatesInGroup(usual(), none())).toBe(true)
  })

  it('refuses upwards', () => {
    expect(dominatesInGroup(admin(), owner())).toBe(false)
    expect(dominatesInGroup(usual(), admin())).toBe(false)
    expect(dominatesInGroup(pending(), usual())).toBe(false)
  })

  it('refuses between peers', () => {
    // Why two owners can never remove each other, and why a member cannot remove a member.
    expect(dominatesInGroup(owner(), owner())).toBe(false)
    expect(dominatesInGroup(admin(), admin())).toBe(false)
    expect(dominatesInGroup(usual(), usual())).toBe(false)
  })

  it('ignores the self-service rights, which are eligibility and not authority', () => {
    // A non-member holds group.join, which no member holds. Comparing it would invert the
    // ladder and stop an admin from adding anybody to the group.
    const publicNone = permissions(NONE_ROLE, 'public')

    expect(publicNone.has('group.join')).toBe(true)
    expect(dominatesInGroup(usual(), publicNone)).toBe(true)
    expect(dominatesInGroup(admin(), publicNone)).toBe(true)
  })

  it('refuses between incomparable custom roles', () => {
    // Disjoint extras: neither dominates, so for a destructive action both are blocked.
    const editor = new Set<GroupPermissionKey>(['group.read', 'group.post.pin'])
    const greeter = new Set<GroupPermissionKey>(['group.read', 'group.member.approve'])

    expect(dominatesInGroup(editor, greeter)).toBe(false)
    expect(dominatesInGroup(greeter, editor)).toBe(false)
  })
})

describe(mayRemoveGroupMember, () => {
  it('lets an admin remove a member and an applicant', () => {
    expect(mayRemoveGroupMember(admin(), usual())).toBe(true)
    expect(mayRemoveGroupMember(admin(), pending())).toBe(true)
  })

  it('refuses without the right, however far the actor outranks the target', () => {
    expect(dominatesInGroup(usual(), pending())).toBe(true)
    expect(mayRemoveGroupMember(usual(), pending())).toBe(false)
  })

  it('refuses to remove a peer or an owner', () => {
    expect(mayRemoveGroupMember(admin(), admin())).toBe(false)
    expect(mayRemoveGroupMember(admin(), owner())).toBe(false)
    expect(mayRemoveGroupMember(owner(), owner())).toBe(false)
  })
})

describe(coversRole, () => {
  it('lets an actor hand out what they hold', () => {
    expect(coversRole(owner(), admin())).toBe(true)
    expect(coversRole(admin(), usual())).toBe(true)
    expect(coversRole(admin(), admin())).toBe(true)
  })

  it('refuses to hand out more than the actor holds', () => {
    expect(coversRole(admin(), owner())).toBe(false)
    expect(coversRole(usual(), admin())).toBe(false)
  })
})

describe(mayAssignGroupRole, () => {
  it('lets an admin promote an applicant to member', () => {
    expect(mayAssignGroupRole(admin(), pending(), usual())).toBe(true)
  })

  it('lets an admin add a non-member as a member', () => {
    expect(mayAssignGroupRole(admin(), none(), usual())).toBe(true)
  })

  it('lets an owner appoint another owner', () => {
    expect(mayAssignGroupRole(owner(), usual(), owner())).toBe(true)
  })

  it('refuses to let an admin appoint an owner', () => {
    // #8537 in one assertion: "generally admins should be able to do many things only
    // owners can do. But not appoint owners." No dedicated right needed — the owner role
    // resolves to the full catalog, so covering it means already holding everything.
    expect(mayAssignGroupRole(admin(), usual(), owner())).toBe(false)
  })

  it('refuses to let an admin in an owner-less group make themselves owner', () => {
    // The scenario concept E8 creates and E16 has to survive: a group may end up without
    // an owner, and its admins keep working — but recovery stays with the network.
    expect(mayAssignGroupRole(admin(), admin(), owner())).toBe(false)
  })

  it('refuses to let an admin re-role another admin', () => {
    expect(mayAssignGroupRole(admin(), admin(), usual())).toBe(false)
  })

  it('refuses to let a member re-role anybody, for want of the right', () => {
    // Dominance alone would say yes here (a member outranks an applicant); the right is
    // what they lack, and the helper checks it so no call site can skip it.
    expect(dominatesInGroup(usual(), pending())).toBe(true)
    expect(mayAssignGroupRole(usual(), pending(), usual())).toBe(false)
  })
})
