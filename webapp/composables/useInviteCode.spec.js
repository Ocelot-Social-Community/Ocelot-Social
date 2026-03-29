import { useInviteCode } from './useInviteCode'

describe('useInviteCode', () => {
  let apollo, toast, t, store, generatePersonalInviteCode, invalidateInviteCode

  beforeEach(() => {
    apollo = { mutate: jest.fn().mockResolvedValue({}) }
    toast = { success: jest.fn(), error: jest.fn() }
    t = jest.fn((key) => key)
    store = {
      getters: { 'auth/user': { inviteCodes: [{ code: 'abc', isValid: true }] } },
      commit: jest.fn(),
    }
    ;({ generatePersonalInviteCode, invalidateInviteCode } = useInviteCode({
      apollo,
      toast,
      t,
      store,
    }))
  })

  describe('generatePersonalInviteCode', () => {
    it('calls mutation with comment', async () => {
      await generatePersonalInviteCode('Hello')
      expect(apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { comment: 'Hello' } }),
      )
    })

    it('shows success toast', async () => {
      await generatePersonalInviteCode('Hello')
      expect(toast.success).toHaveBeenCalledWith('invite-codes.create-success')
    })

    it('returns success true', async () => {
      const result = await generatePersonalInviteCode('Hello')
      expect(result).toEqual({ success: true })
    })

    it('shows error toast on failure', async () => {
      apollo.mutate.mockRejectedValue(new Error('Ouch'))
      await generatePersonalInviteCode('Hello')
      expect(toast.error).toHaveBeenCalled()
    })
  })

  describe('invalidateInviteCode', () => {
    it('calls mutation with code', async () => {
      await invalidateInviteCode('abc')
      expect(apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { code: 'abc' } }),
      )
    })

    it('shows success toast', async () => {
      await invalidateInviteCode('abc')
      expect(toast.success).toHaveBeenCalledWith('invite-codes.invalidate-success')
    })

    it('shows error toast on failure', async () => {
      apollo.mutate.mockRejectedValue(new Error('Ouch'))
      await invalidateInviteCode('abc')
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
