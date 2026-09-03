
import { effectiveRoleName, resolveRoleName } from './effectiveRoleNames'
import { USER_ROLE } from './types'

// Restore any spy (e.g. the console.warn spy below) even if an assertion throws
// mid-test, so a leaked mock can't corrupt later tests.
afterEach(() => {
  vi.restoreAllMocks()
})

describe('resolveRoleName (collapse HAS_ROLE edges → one role)', () => {
  it('returns the single edge (incl. custom roles)', () => {
    expect(resolveRoleName(['badge-setter'])).toBe('badge-setter')
    expect(resolveRoleName(['admin'])).toBe('admin')
  })

  it('defaults to the user baseline when there is no edge', () => {
    expect(resolveRoleName([])).toBe(USER_ROLE)
    expect(resolveRoleName(null)).toBe(USER_ROLE)
    expect(resolveRoleName(undefined)).toBe(USER_ROLE)
  })

  it('fails closed to the baseline (and warns) when more than one edge is present', () => {
    // Multiple HAS_ROLE edges violate the single-role model. Picking the "highest"
    // would be a privilege-escalation oracle on corrupt data, so we drop to USER_ROLE.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveRoleName(['admin', 'user'])).toBe(USER_ROLE)
    expect(resolveRoleName(['owner', 'admin'])).toBe(USER_ROLE)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('single-role model violated'))
  })
})

describe('effectiveRoleName (resolved roleName accessor)', () => {
  it('returns the user roleName', () => {
    expect(effectiveRoleName({ roleName: 'admin' })).toBe('admin')
    expect(effectiveRoleName({ roleName: 'badge-setter' })).toBe('badge-setter')
  })

  it('defaults to the user baseline when roleName is absent', () => {
    expect(effectiveRoleName({})).toBe(USER_ROLE)
    expect(effectiveRoleName({ roleName: null })).toBe(USER_ROLE)
  })
})
