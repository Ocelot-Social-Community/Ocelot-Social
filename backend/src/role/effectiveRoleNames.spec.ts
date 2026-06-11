import { effectiveRoleNames } from './effectiveRoleNames'
import { ADMIN_ROLE, MODERATOR_ROLE, OWNER_ROLE, USER_ROLE } from './types'

describe('effectiveRoleNames', () => {
  describe('dynamic HAS_ROLE set takes precedence', () => {
    it('uses the dynamic roles on top of the implicit baseline', () => {
      expect(effectiveRoleNames({ role: 'admin', roles: ['badge-setter'] })).toEqual([
        USER_ROLE,
        'badge-setter',
      ])
    })

    it('ignores the legacy role when roles are present', () => {
      // legacy says admin, but the dynamic set is authoritative (plus baseline)
      expect(effectiveRoleNames({ role: 'admin', roles: ['moderator'] })).toEqual([
        USER_ROLE,
        MODERATOR_ROLE,
      ])
    })

    it('always includes the user baseline, even when the dynamic set omits it', () => {
      // Variante A: baseline is implicit — a moderator-only edge still gets it
      expect(effectiveRoleNames({ roles: [MODERATOR_ROLE] })).toEqual([USER_ROLE, MODERATOR_ROLE])
    })

    it('does not duplicate the baseline when the dynamic set already lists it', () => {
      expect(effectiveRoleNames({ roles: [USER_ROLE, 'badge-setter'] })).toEqual([
        USER_ROLE,
        'badge-setter',
      ])
    })
  })

  describe('legacy bridge (no dynamic roles yet)', () => {
    it.each([
      [ADMIN_ROLE, [USER_ROLE, ADMIN_ROLE]],
      [MODERATOR_ROLE, [USER_ROLE, MODERATOR_ROLE]],
      [OWNER_ROLE, [USER_ROLE, OWNER_ROLE]],
      [USER_ROLE, [USER_ROLE]],
    ])('maps legacy role %s additively on top of the baseline', (role, expected) => {
      expect(effectiveRoleNames({ role })).toEqual(expected)
      // empty roles array also falls back to the legacy bridge
      expect(effectiveRoleNames({ role, roles: [] })).toEqual(expected)
    })

    it('defaults unknown / missing legacy roles to the user baseline', () => {
      expect(effectiveRoleNames({ role: 'something-else' })).toEqual([USER_ROLE])
      expect(effectiveRoleNames({})).toEqual([USER_ROLE])
      expect(effectiveRoleNames({ role: null, roles: null })).toEqual([USER_ROLE])
    })
  })
})
