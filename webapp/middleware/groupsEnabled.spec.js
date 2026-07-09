import groupsEnabled from './groupsEnabled.js'

const makeCtx = (effectiveValue) => {
  const redirect = jest.fn()
  return {
    store: { getters: { 'policy/getEffective': () => effectiveValue } },
    redirect,
  }
}

describe('groupsEnabled middleware', () => {
  it('does not redirect when the groups feature is effectively on', () => {
    const ctx = makeCtx(true)
    expect(groupsEnabled(ctx)).toBeUndefined()
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('redirects home when the groups feature is off', () => {
    const ctx = makeCtx(false)
    groupsEnabled(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/')
  })

  it('redirects home when the policy value is not yet known (undefined)', () => {
    const ctx = makeCtx(undefined)
    groupsEnabled(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/')
  })
})
