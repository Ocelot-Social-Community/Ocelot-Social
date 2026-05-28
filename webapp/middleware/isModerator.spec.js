import isModerator from './isModerator.js'

const makeCtx = (isModeratorFlag) => {
  const error = jest.fn()
  return {
    store: { getters: { 'auth/isModerator': isModeratorFlag } },
    error,
  }
}

describe('isModerator middleware', () => {
  it('returns no error when the user is a moderator', () => {
    const ctx = makeCtx(true)
    expect(isModerator(ctx)).toBeUndefined()
    expect(ctx.error).not.toHaveBeenCalled()
  })

  it('calls error with a 403 when the user is not a moderator', () => {
    const ctx = makeCtx(false)
    isModerator(ctx)
    expect(ctx.error).toHaveBeenCalledWith({
      statusCode: 403,
      message: 'error-pages.not-authorized',
    })
  })
})
