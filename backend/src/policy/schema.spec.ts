// Unit tests for the visibility primitive — the single mechanism shared by the
// `policy` query resolver and the policyChanged subscription filter.

import { audiencesFor, audiencesOf, canView, visibleKeys } from './schema'

// The subset of ./schema the perm-gating tests re-import against a mocked JSON
// schema. Built from the already-imported functions to avoid a namespace import.
interface SchemaModule {
  audiencesFor: typeof audiencesFor
  canView: typeof canView
  visibleKeys: typeof visibleKeys
}

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
  })

  // No shipped policy key is permission-gated today (every key is public or
  // authenticated), so the perm:<key> matching in canView/visibleKeys — the whole
  // point of the dynamic-config visibility feature — is never exercised by the real
  // schema. Inject a schema that DOES gate keys on permissions, so a regression in
  // that matching (e.g. a broken prefix or a flipped .some) is caught.
  describe('permission-gated keys (exercises the perm: matching end-to-end)', () => {
    // Reimport schema against an injected JSON that gates keys on permissions.
    // The fresh module is passed as an object (not destructured) so its functions
    // don't shadow the outer imports.
    const withMockedSchema = (run: (schema: SchemaModule) => void) => {
      jest.isolateModules(() => {
        jest.doMock('./policy.schema.json', () => ({
          type: 'object',
          properties: {
            // public ⇒ everyone
            publicKey: { type: 'boolean', default: false, visibility: ['public'] },
            // empty/missing visibility ⇒ admin-only fallback (perm:policy.manage)
            adminOnlyKey: { type: 'boolean', default: false },
            // explicit permission audience ⇒ gated on exactly that permission
            badgeGatedKey: { type: 'boolean', default: false, visibility: ['perm:badge.manage'] },
          },
        }))
        // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require
        run(require('./schema') as SchemaModule)
      })
    }

    it('treats an empty-visibility key as admin-only (perm:policy.manage)', () => {
      withMockedSchema((schema) => {
        expect(schema.audiencesFor('adminOnlyKey' as never)).toEqual(['perm:policy.manage'])
        expect(schema.canView('adminOnlyKey' as never, { authenticated: true })).toBe(false)
        expect(
          schema.canView('adminOnlyKey' as never, {
            authenticated: true,
            permissions: ['policy.manage'],
          }),
        ).toBe(true)
      })
    })

    it('gates an explicit perm:<key> on exactly that permission', () => {
      withMockedSchema((schema) => {
        const viewer = (permissions: string[]) => ({ authenticated: true, permissions })
        expect(schema.canView('badgeGatedKey' as never, viewer(['badge.manage']))).toBe(true)
        // a different held permission must NOT unlock it
        expect(schema.canView('badgeGatedKey' as never, viewer(['policy.manage']))).toBe(false)
        expect(schema.canView('badgeGatedKey' as never, { authenticated: true })).toBe(false)
      })
    })

    it('scopes visibleKeys() by the viewer’s held permissions', () => {
      withMockedSchema((schema) => {
        expect(schema.visibleKeys(null)).toEqual(['publicKey'])
        // authenticated alone unlocks neither permission-gated key
        expect(schema.visibleKeys({ authenticated: true })).toEqual(['publicKey'])
        expect(
          schema
            .visibleKeys({
              authenticated: true,
              permissions: ['policy.manage', 'badge.manage'],
            })
            .sort(),
        ).toEqual(['adminOnlyKey', 'badgeGatedKey', 'publicKey'])
      })
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
