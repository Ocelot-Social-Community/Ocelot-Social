import authenticated from './authenticated.js'
import links from '~/constants/links.js'

const makeCtx = (overrides = {}) => {
  const dispatch = overrides.dispatch ?? jest.fn().mockResolvedValue(true)
  const redirect = overrides.redirect ?? jest.fn()
  return {
    store: { dispatch },
    env: { publicPages: ['login', 'register'] },
    route: { name: 'home', path: '/home' },
    redirect,
    dispatch,
  }
}

describe('authenticated middleware', () => {
  it('lets public pages through without auth check', async () => {
    const ctx = makeCtx({})
    ctx.route = { name: 'login', path: '/login' }
    const result = await authenticated(ctx)
    expect(result).toBe(true)
    expect(ctx.dispatch).not.toHaveBeenCalled()
  })

  it('returns true when auth/check resolves true', async () => {
    const ctx = makeCtx()
    const result = await authenticated(ctx)
    expect(result).toBe(true)
    expect(ctx.dispatch).toHaveBeenCalledWith('auth/check')
    expect(ctx.redirect).not.toHaveBeenCalled()
  })

  it('redirects to the landing page with the current path when unauthenticated', async () => {
    const ctx = makeCtx({ dispatch: jest.fn().mockResolvedValue(false) })
    await authenticated(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith(links.LANDING_PAGE, { path: '/home' })
  })

  it('redirects without `path` param when current route is the root', async () => {
    const ctx = makeCtx({ dispatch: jest.fn().mockResolvedValue(false) })
    ctx.route = { name: 'index', path: '/' }
    await authenticated(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith(links.LANDING_PAGE, {})
  })

  it('redirects without `path` param when route.path is empty', async () => {
    const ctx = makeCtx({ dispatch: jest.fn().mockResolvedValue(false) })
    ctx.route = { name: 'index', path: '' }
    await authenticated(ctx)
    expect(ctx.redirect).toHaveBeenCalledWith(links.LANDING_PAGE, {})
  })
})
