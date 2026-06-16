import canAccessModeration from './canAccessModeration.js'

const makeCtx = (flag) => {
  const error = jest.fn()
  return {
    store: { getters: { 'auth/canAccessModeration': flag } },
    error,
  }
}

describe('canAccessModeration middleware', () => {
  it('returns no error when the user may access the moderation area', () => {
    const ctx = makeCtx(true)
    expect(canAccessModeration(ctx)).toBeUndefined()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('calls error with a 403 when the user may not', () => {
    const ctx = makeCtx(false)
    canAccessModeration(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
