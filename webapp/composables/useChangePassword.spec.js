import { useChangePassword } from './useChangePassword'

describe('useChangePassword', () => {
  let apollo, store, toast, t, changePassword

  beforeEach(() => {
    apollo = { mutate: jest.fn().mockResolvedValue({ data: { changePassword: 'NEWTOKEN' } }) }
    store = { commit: jest.fn() }
    toast = { success: jest.fn(), error: jest.fn() }
    t = jest.fn((key) => key)
    ;({ changePassword } = useChangePassword({ apollo, store, toast, t }))
  })

  it('calls apollo mutate with oldPassword and password', async () => {
    await changePassword({ oldPassword: 'old', password: 'new' })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { oldPassword: 'old', password: 'new' },
      }),
    )
  })

  it('commits new token to store on success', async () => {
    await changePassword({ oldPassword: 'old', password: 'new' })
    expect(store.commit).toHaveBeenCalledWith('auth/SET_TOKEN', 'NEWTOKEN')
  })

  it('shows success toast', async () => {
    await changePassword({ oldPassword: 'old', password: 'new' })
    expect(toast.success).toHaveBeenCalledWith('settings.security.change-password.success')
  })

  it('returns success true', async () => {
    const result = await changePassword({ oldPassword: 'old', password: 'new' })
    expect(result).toEqual({ success: true })
  })

  describe('on error', () => {
    beforeEach(() => {
      apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
    })

    it('shows error toast', async () => {
      await changePassword({ oldPassword: 'old', password: 'new' })
      expect(toast.error).toHaveBeenCalledWith('Ouch!')
    })

    it('returns success false', async () => {
      const result = await changePassword({ oldPassword: 'old', password: 'new' })
      expect(result).toEqual({ success: false })
    })

    it('does not commit to store', async () => {
      await changePassword({ oldPassword: 'old', password: 'new' })
      expect(store.commit).not.toHaveBeenCalled()
    })
  })
})
