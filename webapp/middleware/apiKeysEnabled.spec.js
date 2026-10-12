import apiKeysEnabled from './apiKeysEnabled.js'

const makeCtx = (effectiveValue) => {
  const redirect = jest.fn()
  return {
    store: { getters: { 'policy/getEffective': () => effectiveValue } },
    redirect,
  }
}

describe('apiKeysEnabled middleware', () => {
  it('does not redirect when API keys are effectively on', () => {
    const ctx = makeCtx(true)
    expect(apiKeysEnabled(ctx)).toBeUndefined()
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('redirects to the settings when API keys are off', () => {
    const ctx = makeCtx(false)
    apiKeysEnabled(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/settings')
  })

  it('redirects when the policy value is not yet known (undefined)', () => {
    const ctx = makeCtx(undefined)
    apiKeysEnabled(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/settings')
  })
})
