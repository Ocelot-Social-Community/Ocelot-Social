import BrandingPage from './branding.vue'

// Both fetch-driven suites below install their own URL fixture on the global. Restoring it after every
// test keeps a later one from silently answering out of an earlier one's fixture — the failure mode is
// a test that passes for the wrong reason, which is worse than one that fails. File-scoped on purpose:
// it covers every suite here, including ones added later that forget to clean up after themselves.
const realFetch = global.fetch
afterEach(() => {
  global.fetch = realFetch
})

// Method-level test (no full mount): confirm() → saveComposition() must NOT commit the optimistic
// composition when the mutation fails, so the change stays pending for retry/cancel instead of being
// shown as applied. The success path reloads the page, so only the failure path is unit-tested here.
describe('admin/branding saveComposition failure handling', () => {
  const makeCtx = (overrides = {}) => ({
    composition: { theme: 'acme' },
    pending: { theme: 'other-brand' },
    bucketNames: ['theme', 'identity'],
    savingComposition: false,
    $toast: { error: jest.fn() },
    $t: (key) => key,
    clearPending: jest.fn(),
    ...overrides,
  })

  it('does not commit composition or clear pending when the mutation rejects', async () => {
    const ctx = makeCtx({
      $apollo: { mutate: jest.fn().mockRejectedValue(new Error('nope')) },
    })
    ctx.saveComposition = BrandingPage.methods.saveComposition

    await BrandingPage.methods.confirm.call(ctx, 'theme')

    expect(ctx.$apollo.mutate).toHaveBeenCalledTimes(1)
    expect(ctx.$toast.error).toHaveBeenCalled()
    expect(ctx.savingComposition).toBe(false) // unlocked again
    // The optimistic change is NOT applied and stays pending → admin can retry or cancel.
    expect(ctx.composition).toEqual({ theme: 'acme' })
    expect(ctx.pending).toEqual({ theme: 'other-brand' })
    expect(ctx.clearPending).not.toHaveBeenCalled()
  })

  it('sends only non-empty slot overrides as the serialized composition', async () => {
    const mutate = jest.fn().mockRejectedValue(new Error('stop-before-reload'))
    const ctx = makeCtx({
      composition: { theme: 'acme', identity: 'brandB' },
      pending: {},
      $apollo: { mutate },
    })
    ctx.saveComposition = BrandingPage.methods.saveComposition

    // confirm with no pending value for 'identity' → next drops it; theme stays.
    await BrandingPage.methods.confirm.call(ctx, 'identity')

    const sent = JSON.parse(mutate.mock.calls[0][0].variables.composition)
    expect(sent).toEqual({ theme: 'acme' }) // identity removed, theme kept
  })
})

// The list is the admin's map of what is deployed: the baked default is the brand every unswitched
// visitor sees, so it leads the list, and the brand the page is currently composed from is marked.
describe('admin/branding available list', () => {
  const manifest = [
    { id: 'other', label: 'Other', version: '1.0.0', isDefault: false, config: '/c/other' },
    { id: 'stage', label: 'Stage', version: '2.0.0', isDefault: true, config: '/c/stage' },
    { id: 'third', label: 'Third', version: '3.0.0', isDefault: false, config: '/c/third' },
  ]

  const loadList = async () => {
    global.fetch = jest.fn((url) =>
      Promise.resolve(
        url === '/branding/manifest.json'
          ? { ok: true, json: () => Promise.resolve(manifest) }
          : { ok: false },
      ),
    )
    const ctx = {
      brandings: [],
      providedBuckets: {},
      details: {},
      schemaVersions: {},
      $t: (key) => key,
    }
    await BrandingPage.fetch.call(ctx)
    return ctx
  }

  it('puts the baked default first and keeps the manifest order otherwise', async () => {
    const ctx = await loadList()

    // The framework default leads; then the baked default; then the manifest's own order.
    expect(ctx.brandings.map((b) => b.id)).toEqual(['', 'stage', 'other', 'third'])
  })

  it('keeps every brand in the list, not just the default', async () => {
    const ctx = await loadList()

    expect(ctx.brandings).toHaveLength(manifest.length + 1)
  })

  // The framework default has no archive, so discovery can never report it — it would silently be
  // missing from the list although it is a real, selectable source.
  it('lists the framework default even though it has no archive', async () => {
    const ctx = await loadList()

    const [first] = ctx.brandings
    expect(first.isVanilla).toBe(true)
    expect(first.label).toBe('admin.branding.vanilla')
    // Its preview + bucket tags come from the framework defaults, not from a fetched manifest.
    expect(ctx.details['']).toBeDefined()
    expect(ctx.providedBuckets['']).not.toHaveLength(0)
  })

  // Both selects carry their own fixed vanilla option, so the reference entry must not be offered
  // again as a source — that produced two identical entries in "whole package".
  it('offers only archives as composition sources, not the framework-default entry', async () => {
    const ctx = await loadList()

    const options = BrandingPage.computed.sourceOptions.call(ctx)
    expect(options.map((o) => o.id)).toEqual(['stage', 'other', 'third'])
    expect(options.filter((o) => o.id === '')).toHaveLength(0)
  })

  // A brand's archive only carries the buckets it customises, so offering every brand for every slot
  // promised changes that could not happen: picking a themeless brand for `theme` composes to the
  // framework default, exactly like not picking it.
  describe('per-slot source filtering', () => {
    const ctx = (overrides = {}) => ({
      activeId: 'stage',
      composition: {},
      pending: {},
      providedBuckets: {
        '': [{ type: 'theme' }, { type: 'identity' }],
        stage: [{ type: 'identity' }], // no theme
        other: [{ type: 'theme' }, { type: 'identity' }],
      },
      sourceOptions: [
        { id: 'stage', label: 'Stage' },
        { id: 'other', label: 'Other' },
      ],
      providesBucket: BrandingPage.methods.providesBucket,
      effectiveSelect: BrandingPage.methods.effectiveSelect,
      ...overrides,
    })

    it('offers only brands that actually carry the bucket', () => {
      const c = ctx()

      const theme = BrandingPage.methods.sourceOptionsFor.call(c, 'theme')
      const identity = BrandingPage.methods.sourceOptionsFor.call(c, 'identity')

      expect(theme.map((o) => o.id)).toEqual(['other'])
      expect(identity.map((o) => o.id)).toEqual(['stage', 'other'])
    })

    // Otherwise the select would show a blank entry and the admin could not see — let alone undo —
    // what the slot is pinned to.
    it('keeps a stored source listed even when it no longer carries the bucket', () => {
      const c = ctx({ composition: { theme: 'stage' } })

      const theme = BrandingPage.methods.sourceOptionsFor.call(c, 'theme')

      expect(theme.map((o) => o.id)).toEqual(['stage', 'other'])
    })

    // Inheriting from a package without the bucket IS the framework default — the select says so,
    // while the stored '' keeps following a later base-package switch.
    it('shows the framework default where the base package has no such bucket', () => {
      const c = ctx()

      expect(BrandingPage.methods.effectiveSelect.call(c, 'theme')).toBe('@default')
      expect(BrandingPage.methods.effectiveSelect.call(c, 'identity')).toBe('')
      expect(c.composition.theme).toBeUndefined() // display only — nothing was pinned
    })

    it('leaves an explicit override untouched', () => {
      const c = ctx({ composition: { theme: 'other' } })

      expect(BrandingPage.methods.effectiveSelect.call(c, 'theme')).toBe('other')
    })
  })

  it('marks the brand currently used as base', () => {
    // activeSelect carries the RAW policy value; activeId is the effective brand id everything else
    // looks up by.
    const ctx = { $policy: { get: (key) => (key === 'activeBranding' ? 'other' : '') } }
    const activeSelect = BrandingPage.computed.activeSelect.call(ctx)

    expect(activeSelect).toBe('other')
    expect(BrandingPage.computed.activeId.call({ activeSelect, renderedId: '' })).toBe('other')
  })

  // An empty policy is NOT vanilla: the SSR loader resolves it through $OCELOT_ACTIVE_BRANDING and the
  // baked DEFAULT marker, neither of which the client can see. Reading it as vanilla put the "active
  // base" badge on the framework-default row while the deployment rendered its baked brand.
  describe('an unset policy on a deployment that bakes a default', () => {
    const unset = { activeSelect: '', renderedId: 'stage' }

    it('treats the brand the page was rendered with as the active base', () => {
      expect(BrandingPage.computed.activeId.call(unset)).toBe('stage')
    })

    it('shows that brand in the whole-package select rather than the framework default', () => {
      expect(BrandingPage.computed.baseSelect.call({ ...unset, activeId: 'stage' })).toBe('stage')
    })

    it('still shows the framework default when nothing is baked in either', () => {
      const vanilla = { activeSelect: '', renderedId: '' }
      expect(BrandingPage.computed.activeId.call(vanilla)).toBe('')
      expect(BrandingPage.computed.baseSelect.call({ ...vanilla, activeId: '' })).toBe('@default')
    })

    // An explicit choice must never be overridden by what happens to be rendered.
    it('keeps an explicit brand and the explicit-vanilla sentinel', () => {
      expect(
        BrandingPage.computed.activeId.call({ activeSelect: 'other', renderedId: 'stage' }),
      ).toBe('other')
      expect(
        BrandingPage.computed.activeId.call({ activeSelect: '@default', renderedId: 'stage' }),
      ).toBe('')
      expect(
        BrandingPage.computed.baseSelect.call({ activeSelect: '@default', activeId: '' }),
      ).toBe('@default')
    })
  })

  // "No branding" is stored as the '@default' sentinel so the server can tell it apart from "never
  // chosen". Everything that resolves a brand by id must still see it as vanilla.
  it('normalises the explicit-vanilla sentinel to the empty brand id', () => {
    const ctx = { $policy: { get: (key) => (key === 'activeBranding' ? '@default' : '') } }
    const activeSelect = BrandingPage.computed.activeSelect.call(ctx)

    // The select keeps the sentinel so its vanilla option stays selected...
    expect(activeSelect).toBe('@default')
    // ...while lookups by id see plain vanilla.
    expect(BrandingPage.computed.activeId.call({ activeSelect, renderedId: 'stage' })).toBe('')
  })
})

// Every helper the TEMPLATE calls must exist on the component. The stylesheet-summary rows were
// shipped with their two label methods missing — eslint cannot see that (a template reference is not
// a scope reference) and the method-level tests above never render, so it only surfaced in the browser
// as "_vm.themeVarLabel is not a function". This closes that gap without a full mount.
describe('admin/branding template contract', () => {
  const template = BrandingPage.options ? BrandingPage.options.__file : null

  it('defines every method the template invokes', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, 'branding.vue'), 'utf8')
    // lastIndexOf: the SFC contains nested <template #slot> blocks, so the first closing tag
    // would cut the block short — which is exactly how the first version of this test passed
    // while the method it was meant to guard was missing.
    const tpl = src.slice(src.indexOf('<template>'), src.lastIndexOf('</template>'))
    const defined = new Set([
      ...Object.keys(BrandingPage.methods || {}),
      ...Object.keys(BrandingPage.computed || {}),
      ...Object.keys(BrandingPage.data ? BrandingPage.data.call({ $t: () => '' }) : {}),
    ])
    // `name(` inside a mustache or a binding — the shape that fails at runtime when undefined.
    const called = new Set(
      [...tpl.matchAll(/[{(\s|]([a-zA-Z_$][\w$]*)\(/g)]
        .map((m) => m[1])
        .filter(
          (n) => !['if', 'return', 'typeof', 'Object', 'Array', 'String', 'Number'].includes(n),
        ),
    )
    const missing = [...called].filter((n) => !defined.has(n) && !n.startsWith('$'))
    expect({ missing, template }).toEqual({ missing: [], template })
  })
})

// Regression: the theme rows are built from the brand's OWN stylesheets, and the slot they come from
// is a select value — not a brand id. Indexing the stylesheet map with it directly returned {} for an
// inheriting slot, so every token equalled the framework default and the whole bucket rendered as
// "unchanged" even for a brand that overrides half the palette.
describe('admin/branding theme rows resolve the select value', () => {
  const ctx = {
    activeId: 'yunite',
    stylesheets: {
      yunite: [{ customProperties: { 'color-primary': 'teal', 'color-secondary': 'lime' } }],
    },
    declaredTokensOf: BrandingPage.methods.declaredTokensOf,
  }

  // ctx carries the method, so a plain call already binds `this` to it.
  it('reads the base brand when the slot inherits (empty select)', () => {
    expect(ctx.declaredTokensOf('')).toEqual({
      'color-primary': 'teal',
      'color-secondary': 'lime',
    })
  })

  it('reads the named brand when the slot names one', () => {
    expect(ctx.declaredTokensOf('yunite')['color-primary']).toBe('teal')
  })

  it('yields nothing for the explicit-vanilla sentinel', () => {
    expect(ctx.declaredTokensOf('@default')).toEqual({})
  })

  it('yields nothing without a base and for an unknown brand', () => {
    const noBase = { ...ctx, activeId: '' }
    expect(BrandingPage.methods.declaredTokensOf.call(noBase, '')).toEqual({})
    expect(ctx.declaredTokensOf('other-brand')).toEqual({})
  })
})

// The stylesheet list is rendered as the VALUE of the assets.css row, so it must resolve the same
// slot as that bucket's other rows — an inheriting slot means "the base package's sheets".
describe('admin/branding bucket stylesheets follow the slot', () => {
  const sheets = [
    { href: '/branding/yunite/assets/css/theme.css', customProperties: { a: '1', b: '2' } },
    { href: '/branding/yunite/assets/css/branding.css', customProperties: {} },
  ]
  const make = (select, over = {}) => {
    const ctx = {
      activeId: 'yunite',
      stylesheets: { yunite: sheets },
      effectiveSelect: () => select,
      bucketStylesheets: BrandingPage.methods.bucketStylesheets,
      sheetFor: BrandingPage.methods.sheetFor,
      asArray: BrandingPage.methods.asArray,
      ...over,
    }
    return ctx
  }

  it('uses the base package when the slot inherits', () => {
    expect(make('').bucketStylesheets('theme')).toEqual(sheets)
  })

  it('is empty for explicit vanilla and for an unknown brand', () => {
    expect(make('@default').bucketStylesheets('theme')).toEqual([])
    expect(make('other').bucketStylesheets('theme')).toEqual([])
  })

  it('matches a listed href to its summary, and tolerates one it has not read', () => {
    const ctx = make('yunite')
    expect(ctx.sheetFor('theme', '/branding/yunite/assets/css/theme.css').customProperties).toEqual(
      {
        a: '1',
        b: '2',
      },
    )
    expect(ctx.sheetFor('theme', '/branding/yunite/assets/css/missing.css')).toBeNull()
  })

  it('renders nothing for a non-array value', () => {
    expect(make('yunite').asArray('not-an-array')).toEqual([])
    expect(make('yunite').asArray(undefined)).toEqual([])
  })
})

// A stylesheet the browser cannot fetch (404, offline, CORS) is the state in which the admin most
// needs this page — so it must not be the state that breaks it. The summary row reads
// `customProperties` unconditionally, so an entry without that key is a render-time TypeError that
// blanks the whole page.
describe('admin/branding unreadable stylesheets', () => {
  const CONFIG = { assets: { css: ['/branding/acme/assets/css/theme.css'] } }

  const loadWith = async (sheetResponse) => {
    global.fetch = jest.fn((url) => {
      if (url === '/branding/manifest.json') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 'acme', label: 'Acme', version: '1.0.0', isDefault: true, config: '/c/acme' },
            ]),
        })
      }
      if (url === '/c/acme')
        return Promise.resolve({ ok: true, json: () => Promise.resolve(CONFIG) })
      if (url === '/branding/acme/assets/css/theme.css') return sheetResponse()
      return Promise.resolve({ ok: false })
    })
    const ctx = {
      brandings: [],
      providedBuckets: {},
      details: {},
      schemaVersions: {},
      stylesheets: {},
      $t: (key) => key,
    }
    await BrandingPage.fetch.call(ctx)
    return ctx
  }

  it.each([
    ['a non-ok response', () => Promise.resolve({ ok: false })],
    ['a rejected fetch', () => Promise.reject(new Error('offline'))],
  ])('reports %s as unreadable, still carrying customProperties', async (_name, sheetResponse) => {
    const ctx = await loadWith(sheetResponse)

    expect(ctx.stylesheets.acme).toEqual([
      { href: '/branding/acme/assets/css/theme.css', unreadable: true, customProperties: {} },
    ])
  })

  it('labels an unreadable sheet as such rather than as "0 theme properties"', () => {
    const t = jest.fn((key) => key)
    const unreadable = { href: '/x.css', unreadable: true, customProperties: {} }

    expect(() => BrandingPage.methods.sheetLabel.call({ $t: t }, unreadable)).not.toThrow()
    expect(BrandingPage.methods.sheetLabel.call({ $t: t }, unreadable)).toBe(
      'admin.branding.stylesheetUnreadable',
    )
    // An empty but READ stylesheet keeps the neutral count — the two states must stay distinguishable.
    expect(BrandingPage.methods.sheetLabel.call({ $t: t }, { customProperties: {} })).toBe(
      'admin.branding.stylesheetVars',
    )
  })
})
