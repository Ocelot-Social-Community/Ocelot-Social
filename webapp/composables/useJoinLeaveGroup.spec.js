import { useJoinLeaveGroup } from './useJoinLeaveGroup'

describe('useJoinLeaveGroup', () => {
  let apollo, toast, joinLeaveGroup

  beforeEach(() => {
    apollo = {
      mutate: jest.fn().mockResolvedValue({
        data: { JoinGroup: { user: { id: 'u1' }, membership: { role: 'usual' } } },
      }),
    }
    toast = { error: jest.fn() }
    ;({ joinLeaveGroup } = useJoinLeaveGroup({ apollo, toast }))
  })

  it('calls JoinGroup mutation when not a member', async () => {
    await joinLeaveGroup({ groupId: 'g1', userId: 'u1', isMember: false })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { groupId: 'g1', userId: 'u1' } }),
    )
  })

  it('returns success and data on join', async () => {
    const result = await joinLeaveGroup({ groupId: 'g1', userId: 'u1', isMember: false })
    expect(result).toEqual({
      success: true,
      data: { user: { id: 'u1' }, membership: { role: 'usual' } },
    })
  })

  it('calls LeaveGroup mutation when a member', async () => {
    apollo.mutate.mockResolvedValue({
      data: { LeaveGroup: { user: { id: 'u1' }, membership: { role: 'none' } } },
    })
    await joinLeaveGroup({ groupId: 'g1', userId: 'u1', isMember: true })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { groupId: 'g1', userId: 'u1' } }),
    )
  })

  it('shows toast error on failure', async () => {
    apollo.mutate.mockRejectedValue(new Error('Ouch'))
    await joinLeaveGroup({ groupId: 'g1', userId: 'u1', isMember: false })
    expect(toast.error).toHaveBeenCalledWith('Ouch')
  })

  it('returns success false on error', async () => {
    apollo.mutate.mockRejectedValue(new Error('Ouch'))
    const result = await joinLeaveGroup({ groupId: 'g1', userId: 'u1', isMember: false })
    expect(result).toEqual({ success: false })
  })
})
