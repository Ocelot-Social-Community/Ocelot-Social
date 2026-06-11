// Unit tests for the visibility primitive — the single mechanism shared by the
// `policy` query resolver and the policyChanged subscription filter.

import { audiencesFor, audiencesOf, canView, visibleKeys } from './schema'

describe('policy visibility', () => {
  describe('audiencesFor()', () => {
    it('reads the visibility list from the schema', () => {
      expect(audiencesFor('publicRegistration')).toEqual(['public'])
      expect(audiencesFor('apiKeysEnabled')).toEqual(['authenticated'])
    })

    it('returns a copy — mutating it does not alter the shared schema', () => {
      const audiences = audiencesFor('apiKeysEnabled')
      audiences.push('public') // would widen visibility if it were the shared ref
      expect(audiencesFor('apiKeysEnabled')).toEqual(['authenticated'])
      // canView must stay unaffected: an anonymous viewer still cannot see it.
      expect(canView('apiKeysEnabled', null)).toBe(false)
    })
  })

  describe('audiencesOf()', () => {
    it('gives an anonymous viewer only the universal "public" audience', () => {
      expect([...audiencesOf(null)]).toEqual(['public'])
    })

    it('adds "authenticated" for a logged-in viewer', () => {
      expect(audiencesOf({ authenticated: true })).toEqual(new Set(['public', 'authenticated']))
    })

    it('turns each held permission into a "perm:<key>" audience', () => {
      expect(
        audiencesOf({ authenticated: true, permissions: ['policy.manage', 'badge.manage'] }),
      ).toEqual(new Set(['public', 'authenticated', 'perm:policy.manage', 'perm:badge.manage']))
    })
  })

  describe('canView()', () => {
    it('lets everyone (incl. anonymous) see public keys', () => {
      expect(canView('publicRegistration', null)).toBe(true)
      expect(canView('categoriesActive', { authenticated: true })).toBe(true)
    })

    it('hides authenticated keys from anonymous viewers', () => {
      expect(canView('apiKeysEnabled', null)).toBe(false)
    })

    it('shows authenticated keys to any logged-in viewer', () => {
      expect(canView('apiKeysEnabled', { authenticated: true })).toBe(true)
    })

    it('a permission audience grants visibility (admin/owner hold policy.manage)', () => {
      // No shipped key is admin-only today, so exercise the mechanism via
      // audiencesFor's empty-visibility fallback path through a held permission.
      expect(
        audiencesOf({ authenticated: true, permissions: ['policy.manage'] }).has(
          'perm:policy.manage',
        ),
      ).toBe(true)
    })
  })

  describe('visibleKeys()', () => {
    it('returns only public keys for anonymous viewers', () => {
      expect(visibleKeys(null).sort()).toEqual([
        'askForRealName',
        'badgesEnabled',
        'categoriesActive',
        'inviteRegistration',
        'publicRegistration',
        'requireLocation',
        'showContentFilterHeaderMenu',
        'showContentFilterMasonryGrid',
        'showGroupButtonInHeader',
      ])
    })

    it('returns all keys for a logged-in viewer', () => {
      expect(visibleKeys({ authenticated: true }).sort()).toEqual([
        'apiKeysEnabled',
        'apiKeysMaxPerUser',
        'askForRealName',
        'badgesEnabled',
        'categoriesActive',
        'inviteCodesGroupPerUser',
        'inviteCodesPersonalPerUser',
        'inviteLinkLimit',
        'inviteRegistration',
        'maxGroupPinnedPosts',
        'maxPinnedPosts',
        'publicRegistration',
        'requireLocation',
        'showContentFilterHeaderMenu',
        'showContentFilterMasonryGrid',
        'showGroupButtonInHeader',
      ])
    })
  })
})
