import BrandingPage from './branding.vue'

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
