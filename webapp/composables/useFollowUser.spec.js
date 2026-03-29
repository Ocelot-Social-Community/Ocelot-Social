import { useFollowUser } from './useFollowUser'

describe('useFollowUser', () => {
  let apollo, i18n, toggleFollow

  beforeEach(() => {
    apollo = {
      mutate: jest.fn().mockResolvedValue({
        data: { followUser: { id: 'u1', followedByCurrentUser: true } },
      }),
    }
    i18n = { locale: () => 'en' }
    ;({ toggleFollow } = useFollowUser({ apollo, i18n }))
  })

  it('calls followUser mutation when not followed', async () => {
    await toggleFollow({ id: 'u1', isCurrentlyFollowed: false })
    expect(apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'u1' } }))
  })

  it('returns success and data on follow', async () => {
    const result = await toggleFollow({ id: 'u1', isCurrentlyFollowed: false })
    expect(result).toEqual({
      success: true,
      data: { id: 'u1', followedByCurrentUser: true },
    })
  })

  it('calls unfollowUser mutation when followed', async () => {
    apollo.mutate.mockResolvedValue({
      data: { unfollowUser: { id: 'u1', followedByCurrentUser: false } },
    })
    await toggleFollow({ id: 'u1', isCurrentlyFollowed: true })
    expect(apollo.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'u1' } }))
  })

  it('returns success false on error', async () => {
    apollo.mutate.mockRejectedValue(new Error('Ouch'))
    const result = await toggleFollow({ id: 'u1', isCurrentlyFollowed: false })
    expect(result).toEqual({ success: false })
  })
})
