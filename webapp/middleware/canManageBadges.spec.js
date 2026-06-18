import canManageBadges from './canManageBadges.js'

const makeCtx = (canFlag) => {
  const error = jest.fn()
  return {
    store: { getters: { 'auth/can': () => canFlag } },
    error,
  }
}

describe('canManageBadges middleware', () => {
  it('returns no error when the user holds badge.manage', () => {
    const ctx = makeCtx(true)
    expect(canManageBadges(ctx)).toBeUndefined()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('calls error with a 403 when the user lacks badge.manage', () => {
    const ctx = makeCtx(false)
    canManageBadges(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
