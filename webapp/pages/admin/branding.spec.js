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
