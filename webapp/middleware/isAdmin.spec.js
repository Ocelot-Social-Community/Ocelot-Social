import isAdmin from './isAdmin.js'

const makeCtx = (isAdminFlag) => {
  const error = jest.fn()
  return {
    store: { getters: { 'auth/isAdmin': isAdminFlag } },
    error,
  }
}

describe('isAdmin middleware', () => {
  it('returns no error when the user is an admin', () => {
    const ctx = makeCtx(true)
    expect(isAdmin(ctx)).toBeUndefined()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('calls error with a 403 when the user is not an admin', () => {
    const ctx = makeCtx(false)
    isAdmin(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
