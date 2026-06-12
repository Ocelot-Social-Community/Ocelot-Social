import { effectiveRoleName } from './effectiveRoleNames'
import { USER_ROLE } from './types'

describe('effectiveRoleName (single-role)', () => {
  it('uses the single HAS_ROLE edge (incl. custom roles)', () => {
    expect(effectiveRoleName({ roles: ['badge-setter'] })).toBe('badge-setter')
    expect(effectiveRoleName({ roles: ['admin'] })).toBe('admin')
  })

  it('defaults to the user baseline when there is no edge', () => {
    expect(effectiveRoleName({})).toBe(USER_ROLE)
    expect(effectiveRoleName({ roles: [] })).toBe(USER_ROLE)
    expect(effectiveRoleName({ roles: null })).toBe(USER_ROLE)
  })
})
