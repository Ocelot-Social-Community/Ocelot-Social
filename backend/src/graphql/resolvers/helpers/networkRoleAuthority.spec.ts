import { describe, it, expect } from 'vitest'

import { Errors } from '@graphql/errorRegistry'
import { createInMemoryRoleService } from '@src/role'

import { assignmentError, changeError, roleOfferRefusal } from './networkRoleAuthority'

import type { Context } from '@src/context'
import type { NetworkRoleRefusal } from '@src/role'

// The request-level glue of #10485. The rules themselves are role/authority.spec.ts's, their
// effect through the API roles.authority.spec.ts's; here what only this layer decides.

const contextFor = (user: Context['user']): Context => {
  const role = createInMemoryRoleService()
  return {
    user,
    role,
    effectivePermissions: role.permissionsForRole(user?.roleName ?? 'user'),
  } as unknown as Context
}

describe(roleOfferRefusal, () => {
  // A request without a user resolves to the baseline role — never to an owner by default.
  it('never offers the owner role to a request without a user', () => {
    expect(roleOfferRefusal(contextFor(null), 'owner')).toBe('ownerOnly')
  })

  it('offers the owner role to an owner', () => {
    const owner = { id: 'o', roleName: 'owner' } as unknown as Context['user']

    expect(roleOfferRefusal(contextFor(owner), 'owner')).toBeNull()
  })
})

describe('the errors the shield answers with', () => {
  const codeOf = (error: { extensions: Record<string, unknown> }) => error.extensions.errorCode

  it.each<[NetworkRoleRefusal, string]>([
    ['notOutranked', Errors.ROLE_ASSIGNMENT_TARGET_NOT_OUTRANKED.code],
    ['notCovered', Errors.ROLE_ASSIGNMENT_NOT_COVERED.code],
    ['ownerOnly', Errors.ROLE_ASSIGNMENT_OWNER_ROLE_REQUIRES_OWNER.code],
    // Raising a role above others is a role change; should an assignment ever report it, it is
    // still a matter of rights the actor does not hold.
    ['wouldOutrank', Errors.ROLE_ASSIGNMENT_NOT_COVERED.code],
  ])('names an assignment refused as %s', (refusal, code) => {
    expect(codeOf(assignmentError(refusal))).toBe(code)
  })

  it.each<[NetworkRoleRefusal, string]>([
    ['notOutranked', Errors.ROLE_CHANGE_NOT_OUTRANKED.code],
    ['notCovered', Errors.ROLE_SAVE_NOT_COVERED.code],
    ['wouldOutrank', Errors.ROLE_SAVE_WOULD_OUTRANK.code],
    // The owner rule belongs to assignments; a role change it would refuse is one of a role
    // above the actor.
    ['ownerOnly', Errors.ROLE_CHANGE_NOT_OUTRANKED.code],
  ])('names a role change refused as %s', (refusal, code) => {
    expect(codeOf(changeError(refusal))).toBe(code)
  })
})
