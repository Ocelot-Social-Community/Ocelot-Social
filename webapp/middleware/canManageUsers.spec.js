import canManageUsers from './canManageUsers.js'

const makeCtx = (flag) => {
  const error = jest.fn()
  return {
    store: { getters: { 'auth/canManageUsers': flag } },
    error,
  }
}

describe('canManageUsers middleware', () => {
  it('returns no error when the user may manage users in moderation', () => {
    const ctx = makeCtx(true)
    expect(canManageUsers(ctx)).toBeUndefined()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('calls error with a 403 when the user may not', () => {
    const ctx = makeCtx(false)
    canManageUsers(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })

  // Deny-by-default: a missing getter (e.g. an auth-store refactor that drops/renames
  // the key) resolves to undefined and must fail closed, not silently grant access.
  it('calls error with a 403 when the getter is missing (undefined)', () => {
    const ctx = makeCtx(undefined)
    canManageUsers(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
