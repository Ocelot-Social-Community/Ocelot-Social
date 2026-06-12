import { effectiveRoleName } from './effectiveRoleNames'
import { ADMIN_ROLE, MODERATOR_ROLE, USER_ROLE } from './types'

describe('effectiveRoleName (single-role)', () => {
  it('uses the single HAS_ROLE edge when present (incl. custom roles)', () => {
    expect(effectiveRoleName({ role: 'admin', roles: ['badge-setter'] })).toBe('badge-setter')
  })

  it('falls back to the legacy role string when there is no edge', () => {
    expect(effectiveRoleName({ role: MODERATOR_ROLE })).toBe(MODERATOR_ROLE)
    expect(effectiveRoleName({ role: ADMIN_ROLE, roles: [] })).toBe(ADMIN_ROLE)
  })

  it('defaults to the user baseline when nothing is set', () => {
    expect(effectiveRoleName({})).toBe(USER_ROLE)
    expect(effectiveRoleName({ role: null, roles: null })).toBe(USER_ROLE)
  })
})
