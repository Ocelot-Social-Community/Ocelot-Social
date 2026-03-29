import { useShout } from './useShout'

describe('useShout', () => {
  let apollo, toggleShout

  beforeEach(() => {
    apollo = { mutate: jest.fn().mockResolvedValue({ data: { shout: true } }) }
    ;({ toggleShout } = useShout({ apollo }))
  })

  it('calls shout mutation when not currently shouted', async () => {
    await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { id: '1', type: 'Post' },
      }),
    )
  })

  it('calls unshout mutation when currently shouted', async () => {
    await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: true })
    expect(apollo.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { id: '1', type: 'Post' },
      }),
    )
  })

  it('returns success true on success', async () => {
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(result).toEqual({ success: true })
  })

  it('returns success false on error', async () => {
    apollo.mutate.mockRejectedValue(new Error('Ouch'))
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(result).toEqual({ success: false })
  })
})
