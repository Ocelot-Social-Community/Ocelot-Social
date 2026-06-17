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

  // Deny-by-default: a missing getter (e.g. an auth-store refactor that drops/renames
  // the key) resolves to undefined and must fail closed, not silently grant access.
  it('calls error with a 403 when the getter is missing (undefined)', () => {
    const ctx = makeCtx(undefined)
    isAdmin(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
