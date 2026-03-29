import { useResetPassword } from './useResetPassword'

describe('useResetPassword', () => {
  let apollo, toast, resetPassword

  beforeEach(() => {
    apollo = { mutate: jest.fn().mockResolvedValue({ data: { resetPassword: true } }) }
    toast = { error: jest.fn() }
    ;({ resetPassword } = useResetPassword({ apollo, toast }))
  })

  it('calls apollo mutate with password, email and nonce', async () => {
    await resetPassword({ password: 'secret', email: 'a@b.c', nonce: '123' })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { password: 'secret', email: 'a@b.c', nonce: '123' },
      }),
    )
  })

  it('returns success and result on successful reset', async () => {
    const res = await resetPassword({ password: 'secret', email: 'a@b.c', nonce: '123' })
    expect(res).toEqual({ success: true, result: 'success' })
  })

  describe('when backend returns false', () => {
    beforeEach(() => {
      apollo.mutate.mockResolvedValue({ data: { resetPassword: false } })
    })

    it('returns error result', async () => {
      const res = await resetPassword({ password: 'secret', email: 'a@b.c', nonce: '123' })
      expect(res).toEqual({ success: false, result: 'error' })
    })
  })

  describe('on error', () => {
    beforeEach(() => {
      apollo.mutate.mockRejectedValue({ message: 'Ouch!' })
    })

    it('shows error toast', async () => {
      await resetPassword({ password: 'secret', email: 'a@b.c', nonce: '123' })
      expect(toast.error).toHaveBeenCalledWith('Ouch!')
    })

    it('returns failure', async () => {
      const res = await resetPassword({ password: 'secret', email: 'a@b.c', nonce: '123' })
      expect(res).toEqual({ success: false, result: null })
    })
  })
})
