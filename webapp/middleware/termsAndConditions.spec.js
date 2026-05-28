import termsAndConditions from './termsAndConditions.js'

const makeCtx = ({ agreed = false, routeName = 'home', routePath = '/home' } = {}) => {
  const redirect = jest.fn()
  return {
    store: { getters: { 'auth/termsAndConditionsAgreed': agreed } },
    env: { publicPages: ['login', 'register'] },
    route: { name: routeName, path: routePath },
    redirect,
  }
}

describe('termsAndConditions middleware', () => {
  it('lets public pages through without checking agreement', async () => {
    const ctx = makeCtx({ routeName: 'login', routePath: '/login' })
    const result = await termsAndConditions(ctx)
    expect(result).toBe(true)
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('lets the confirm page through to avoid a redirect loop', async () => {
    const ctx = makeCtx({ routeName: 'terms-and-conditions-confirm', routePath: '/foo' })
    const result = await termsAndConditions(ctx)
    expect(result).toBe(true)
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('lets agreed users through', async () => {
    const ctx = makeCtx({ agreed: true })
    const result = await termsAndConditions(ctx)
    expect(result).toBe(true)
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('redirects unagreed users to confirm with their target path', async () => {
    const ctx = makeCtx()
    await termsAndConditions(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith('/terms-and-conditions-confirm', { path: '/home' })
  })

  it('redirects without `path` param when route.path is empty or root', async () => {
    const rootCtx = makeCtx({ routePath: '/' })
    await termsAndConditions(rootCtx)
    expect(rootCtx.redirect).toHaveBeenCalledWith('/terms-and-conditions-confirm', {})

    const emptyCtx = makeCtx({ routePath: '' })
    await termsAndConditions(emptyCtx)
    expect(emptyCtx.redirect).toHaveBeenCalledWith('/terms-and-conditions-confirm', {})
  })
})
