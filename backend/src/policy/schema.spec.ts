// Unit tests for the visibility primitive — the single mechanism shared by the
// `policy` query resolver and the policyChanged subscription filter.

import {
  allKeys,
  audiencesFor,
  audiencesOf,
  canView,
  categoryFor,
  requiresPolicyFor,
  typeFor,
  visibleKeys,
} from './schema'

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

    it('ignores permissions on an unauthenticated viewer (no leak without auth)', () => {
      // Defensive: an inconsistent context carrying permissions but authenticated:false
      // must not yield perm:<key> audiences — anonymous viewers hold none.
      expect(audiencesOf({ authenticated: false, permissions: ['policy.manage'] })).toEqual(
        new Set(['public']),
      )
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
        'activeBranding',
        'askForRealName',
        'badgesEnabled',
        'categoriesActive',
        'groupsEnabled',
        'inviteRegistration',
        'publicRegistration',
        'requireLocation',
        'showContentFilterHeaderMenu',
        'showContentFilterMasonryGrid',
        'showGroupButtonInHeader',
        'socialMediaEnabled',
      ])
    })

    it('returns all keys for a logged-in viewer', () => {
      expect(visibleKeys({ authenticated: true }).sort()).toEqual([
        'activeBranding',
        'apiKeysEnabled',
        'apiKeysMaxPerUser',
        'askForRealName',
        'badgesEnabled',
        'categoriesActive',
        'groupsEnabled',
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
        'socialMediaEnabled',
      ])
    })
  })
})

describe('categoryFor', () => {
  it('returns each key’s declared admin-config category', () => {
    expect(categoryFor('publicRegistration')).toBe('registration')
    expect(categoryFor('inviteLinkLimit')).toBe('registration')
    expect(categoryFor('apiKeysEnabled')).toBe('features')
    expect(categoryFor('maxGroupPinnedPosts')).toBe('features')
    expect(categoryFor('videoConference')).toBe('video')
  })

  it('has a category for every policy key (schema is the single source, no silent gaps)', () => {
    // A missing category throws at module load; this also guards that the accessor never
    // returns undefined for a known key.
    for (const key of allKeys()) {
      expect(categoryFor(key)).toEqual(expect.any(String))
    }
  })
})

describe('requiresPolicyFor', () => {
  it('returns the declared policy→policy dependencies (empty for most keys)', () => {
    expect(requiresPolicyFor('showGroupButtonInHeader')).toEqual(['groupsEnabled'])
    expect(requiresPolicyFor('groupsEnabled')).toEqual([])
    expect(requiresPolicyFor('badgesEnabled')).toEqual([])
  })

  it('returns a fresh copy — a caller mutating it cannot alter the shared schema', () => {
    const deps = requiresPolicyFor('showGroupButtonInHeader')
    deps.push('groupsEnabled')
    expect(requiresPolicyFor('showGroupButtonInHeader')).toEqual(['groupsEnabled'])
  })

  // The graph invariants (dep exists, both boolean, visibility superset, acyclic) are
  // asserted at module load — reaching this test at all means they held for the shipped
  // schema. Re-check the properties here so a future schema edit that violates one fails
  // loudly with a specific message instead of a mystery boot error.
  it('every dependency is a known boolean key visible wherever the dependent is', () => {
    for (const key of allKeys()) {
      const keyAudiences = new Set(audiencesFor(key))
      for (const dep of requiresPolicyFor(key)) {
        expect(allKeys()).toContain(dep)
        expect(typeFor(key)).toBe('boolean')
        expect(typeFor(dep)).toBe('boolean')
        // Every audience that can see the dependent must also see the dependency.
        for (const audience of keyAudiences) {
          expect(audiencesFor(dep)).toContain(audience)
        }
      }
    }
  })

  // The shipped schema is valid, so assertRequiresPolicyGraph()'s throw branches never fire
  // against it — the invariant test above proves the properties hold, but not that a
  // VIOLATION is actually rejected. Inject deliberately broken schemas and assert the module
  // refuses to load, so a future refactor of the detection code (e.g. the DFS cycle check)
  // that stops throwing is caught. Each case isolates one branch.
  describe('assertRequiresPolicyGraph rejects a mis-authored schema at module load', () => {
    // Returns a thunk that reloads ./schema against a mocked JSON; assertRequiresPolicyGraph
    // runs during require, so a violation surfaces as a throw when the thunk is called.
    const loadWith = (properties: Record<string, unknown>) => (): void => {
      jest.isolateModules(() => {
        jest.doMock('./policy.schema.json', () => ({ type: 'object', properties }))
        // eslint-disable-next-line @typescript-eslint/no-require-imports, n/global-require, import-x/no-unassigned-import
        require('./schema')
      })
    }

    it('throws on a requiresPolicy cycle', () => {
      expect(
        loadWith({
          a: { type: 'boolean', default: false, requiresPolicy: ['b'] },
          b: { type: 'boolean', default: false, requiresPolicy: ['a'] },
        }),
      ).toThrow(/requiresPolicy cycle/)
    })

    it('throws when a dependency names an unknown key', () => {
      expect(
        loadWith({
          a: { type: 'boolean', default: false, requiresPolicy: ['missing'] },
        }),
      ).toThrow(/requiresPolicy unknown key "missing"/)
    })

    it('throws when the dependent key is not boolean', () => {
      expect(
        loadWith({
          a: { type: 'number', default: 0, requiresPolicy: ['b'] },
          b: { type: 'boolean', default: false },
        }),
      ).toThrow(/"a" has requiresPolicy but is not boolean/)
    })

    it('throws when a dependency is not boolean', () => {
      expect(
        loadWith({
          a: { type: 'boolean', default: false, requiresPolicy: ['b'] },
          b: { type: 'number', default: 0 },
        }),
      ).toThrow(/requiresPolicy non-boolean key "b"/)
    })

    it('throws when a dependency is not visible everywhere the dependent is', () => {
      expect(
        loadWith({
          a: { type: 'boolean', default: false, visibility: ['public'], requiresPolicy: ['b'] },
          b: { type: 'boolean', default: false, visibility: ['authenticated'] },
        }),
      ).toThrow(/visible to "public" but its requiresPolicy dependency "b" is not/)
    })
  })
})
