import { useShout } from './useShout'
import { shoutMutation, unshoutMutation } from '~/graphql/Shout'

describe('useShout', () => {
  let apollo, toggleShout

  beforeEach(() => {
    apollo = { mutate: jest.fn().mockResolvedValue({ data: { shout: true } }) }
    ;({ toggleShout } = useShout({ apollo }))
  })

  it('calls shout mutation when not currently shouted', async () => {
    await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(apollo.mutate).toHaveBeenCalledWith({
      mutation: shoutMutation,
      variables: { id: '1', type: 'Post' },
    })
  })

  it('calls unshout mutation when currently shouted', async () => {
    apollo.mutate.mockResolvedValue({ data: { unshout: true } })
    await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: true })
    expect(apollo.mutate).toHaveBeenCalledWith({
      mutation: unshoutMutation,
      variables: { id: '1', type: 'Post' },
    })
  })

  it('returns success true when shout succeeds', async () => {
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(result).toEqual({ success: true })
  })

  it('returns success true when unshout succeeds', async () => {
    apollo.mutate.mockResolvedValue({ data: { unshout: true } })
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: true })
    expect(result).toEqual({ success: true })
  })

  it('returns success false when backend returns false', async () => {
    apollo.mutate.mockResolvedValue({ data: { shout: false } })
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(result).toEqual({ success: false })
  })

  it('returns success false on error', async () => {
    apollo.mutate.mockRejectedValue(new Error('Ouch'))
    const result = await toggleShout({ id: '1', type: 'Post', isCurrentlyShouted: false })
    expect(result).toEqual({ success: false })
  })
})
