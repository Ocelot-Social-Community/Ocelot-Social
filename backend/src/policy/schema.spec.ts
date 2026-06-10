// Unit tests for the visibility primitive — the single mechanism shared by the
// `policy` query resolver and the policyChanged subscription filter.

import { audiencesFor, audiencesOf, canView, visibleKeys } from './schema'

describe('policy visibility', () => {
  describe('audiencesFor()', () => {
    it('reads the x-visibility list from the schema', () => {
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

    it('adds "authenticated" and the role for a logged-in viewer', () => {
      expect(audiencesOf({ role: 'user' })).toEqual(new Set(['public', 'authenticated', 'user']))
    })

    it('includes the admin role name for admins', () => {
      expect(audiencesOf({ role: 'admin' })).toEqual(new Set(['public', 'authenticated', 'admin']))
    })
  })

  describe('canView()', () => {
    it('lets everyone (incl. anonymous) see public keys', () => {
      expect(canView('publicRegistration', null)).toBe(true)
      expect(canView('categoriesActive', { role: 'user' })).toBe(true)
    })

    it('hides authenticated keys from anonymous viewers', () => {
      expect(canView('apiKeysEnabled', null)).toBe(false)
    })

    it('shows authenticated keys to any logged-in viewer', () => {
      expect(canView('apiKeysEnabled', { role: 'user' })).toBe(true)
    })

    it('admin is a superuser: sees every key via the short-circuit', () => {
      expect(canView('apiKeysEnabled', { role: 'admin' })).toBe(true)
      expect(canView('publicRegistration', { role: 'admin' })).toBe(true)
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
      ])
    })

    it('returns all keys for a logged-in viewer', () => {
      expect(visibleKeys({ role: 'user' }).sort()).toEqual([
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
      ])
    })
  })
})
