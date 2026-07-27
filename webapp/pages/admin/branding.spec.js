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

  it('marks the brand currently used as base', () => {
    // activeId comes from the live policy, so the badge follows a switch without a refetch.
    const activeId = BrandingPage.computed.activeId.call({
      $policy: { get: (key) => (key === 'activeBranding' ? 'other' : '') },
    })

    expect(activeId).toBe('other')
  })
})
