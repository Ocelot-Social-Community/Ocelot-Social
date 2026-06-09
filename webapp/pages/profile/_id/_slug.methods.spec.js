// Unit tests for the methods/computed properties of pages/profile/_id/_slug.vue
// — we don't mount the component, we call the option object's functions
// directly with a stub `this` context. This is dramatically faster than
// rendering and lets us hit the branches that the existing snapshot-style
// spec leaves untouched.
//
// The SFC pulls in heavy dependencies (Editor, graphql files, the
// useFollowUser composable). We don't import the .vue file here; instead the
// methods/computed objects are reconstructed against a thin ctx surface that
// matches what the component actually touches. That keeps this spec
// independent of Vue mount lifecycle pitfalls (Apollo, mixins, watchers).
//
// The actual production code is exercised by importing `_slug.vue`'s
// methods/computed objects from the SFC module, which is supported in Jest
// because the file's <script> exports a default options bag.
import ProfileSlug from './_slug.vue'
import { profilePagePosts } from '~/graphql/PostQuery.js'

const { methods, computed } = ProfileSlug

describe('pages/profile/_id/_slug.vue — methods', () => {
  describe('handleRoomUpdated', () => {
    it('is a no-op when room or room.id is missing', () => {
      const ctx = {
        chatRoom: null,
        $apollo: { queries: { chatRoom: { refetch: jest.fn() } } },
      }
      methods.handleRoomUpdated.call(ctx, null)
      methods.handleRoomUpdated.call(ctx, {})
      expect(ctx.$apollo.queries.chatRoom.refetch).not.toHaveBeenCalled()
    })

    it('merges into the current chatRoom when ids match', () => {
      const ctx = {
        chatRoom: { id: 'r1', unreadCount: 0 },
        $apollo: { queries: { chatRoom: { refetch: jest.fn() } } },
      }
      methods.handleRoomUpdated.call(ctx, { id: 'r1', unreadCount: 5, extra: 'x' })
      expect(ctx.chatRoom).toEqual({ id: 'r1', unreadCount: 5, extra: 'x' })
      expect(ctx.$apollo.queries.chatRoom.refetch).not.toHaveBeenCalled()
    })

    it('refetches when chatRoom is null and a room update arrives', () => {
      const refetch = jest.fn()
      const ctx = { chatRoom: null, $apollo: { queries: { chatRoom: { refetch } } } }
      methods.handleRoomUpdated.call(ctx, { id: 'r1' })
      expect(refetch).toHaveBeenCalled()
    })

    it('does nothing when an unrelated room id arrives mid-flight', () => {
      const refetch = jest.fn()
      const ctx = { chatRoom: { id: 'r1' }, $apollo: { queries: { chatRoom: { refetch } } } }
      methods.handleRoomUpdated.call(ctx, { id: 'r-other' })
      expect(refetch).not.toHaveBeenCalled()
      // unchanged ref
      expect(ctx.chatRoom).toEqual({ id: 'r1' })
    })
  })

  describe('handleTab', () => {
    it('does nothing when the tab is unchanged', () => {
      const ctx = {
        tabActive: 'post',
        filter: { existing: true },
        $route: { params: { id: 'u1' } },
        resetPostList: jest.fn(),
      }
      methods.handleTab.call(ctx, 'post')
      expect(ctx.resetPostList).not.toHaveBeenCalled()
      expect(ctx.filter).toEqual({ existing: true })
    })

    it('switches the active tab and rebuilds the filter from the route id', () => {
      const ctx = {
        tabActive: 'post',
        filter: {},
        $route: { params: { id: 'u1' } },
        resetPostList: jest.fn(),
      }
      methods.handleTab.call(ctx, 'comment')
      expect(ctx.tabActive).toBe('comment')
      expect(ctx.filter).toEqual({ comments_some: { author: { id: 'u1' } } })
      expect(ctx.resetPostList).toHaveBeenCalled()
    })

    it('also handles the shout tab', () => {
      const ctx = {
        tabActive: 'post',
        filter: {},
        $route: { params: { id: 'u1' } },
        resetPostList: jest.fn(),
      }
      methods.handleTab.call(ctx, 'shout')
      expect(ctx.filter).toEqual({ shoutedBy_some: { id: 'u1' } })
    })
  })

  describe('uniq', () => {
    it('deduplicates by id by default', () => {
      const ctx = {}
      const result = methods.uniq.call(ctx, [{ id: 1 }, { id: 1 }, { id: 2 }])
      expect(result).toEqual([{ id: 1 }, { id: 2 }])
    })

    it('deduplicates by an arbitrary field', () => {
      const ctx = {}
      const result = methods.uniq.call(ctx, [{ x: 'a' }, { x: 'a' }, { x: 'b' }], 'x')
      expect(result).toEqual([{ x: 'a' }, { x: 'b' }])
    })
  })

  describe('showMoreContributions', () => {
    it('returns early when the profilePagePosts query is undefined', () => {
      const ctx = { $apollo: { queries: {} }, offset: 0, pageSize: 6, filter: {} }
      // Should not throw on missing query (e.g. subpage scenario).
      expect(() => methods.showMoreContributions.call(ctx, {})).not.toThrow()
      expect(ctx.offset).toBe(0)
    })

    it('advances offset and triggers fetchMore on the profilePagePosts query', () => {
      const fetchMore = jest.fn()
      const ctx = {
        $apollo: { queries: { profilePagePosts: { fetchMore } } },
        offset: 0,
        pageSize: 6,
        filter: { author: { id: 'u1' } },
      }
      methods.showMoreContributions.call(ctx, { state: 'loaded' })
      expect(ctx.offset).toBe(6)
      expect(fetchMore).toHaveBeenCalled()
      const variables = fetchMore.mock.calls[0][0].variables
      expect(variables).toMatchObject({
        offset: 6,
        first: 6,
        orderBy: 'sortDate_desc',
        filter: { author: { id: 'u1' } },
      })
    })
  })

  describe('resetPostList', () => {
    it('clears offset / posts / hasMore', () => {
      const ctx = { offset: 42, posts: [{ id: 'p1' }], hasMore: false }
      methods.resetPostList.call(ctx)
      expect(ctx.offset).toBe(0)
      expect(ctx.posts).toEqual([])
      expect(ctx.hasMore).toBe(true)
    })
  })

  describe('refetchPostList', () => {
    it('resets the list and refetches the profilePagePosts query', () => {
      const refetch = jest.fn()
      const ctx = {
        offset: 12,
        posts: [{ id: 'p1' }],
        hasMore: false,
        $apollo: { queries: { profilePagePosts: { refetch } } },
        resetPostList: methods.resetPostList,
      }
      methods.refetchPostList.call(ctx)
      expect(ctx.offset).toBe(0)
      expect(ctx.posts).toEqual([])
      expect(refetch).toHaveBeenCalled()
    })
  })

  describe('muteUser / unmuteUser', () => {
    const buildMuteCtx = (mutate) => ({
      $apollo: {
        mutate,
        queries: {
          User: { refetch: jest.fn() },
          profilePagePosts: { refetch: jest.fn() },
        },
      },
      $toast: { error: jest.fn() },
      offset: 5,
      posts: [{ id: 'p1' }],
      hasMore: false,
      resetPostList: methods.resetPostList,
    })

    it.each([
      ['muteUser', 'mute mutation'],
      ['unmuteUser', 'unmute mutation'],
    ])('%s — happy path triggers mutate then refetches user + post list', async (method) => {
      const mutate = jest.fn().mockResolvedValue()
      const ctx = buildMuteCtx(mutate)
      await methods[method].call(ctx, { id: 'u9' })
      expect(mutate).toHaveBeenCalled()
      expect(ctx.$apollo.queries.User.refetch).toHaveBeenCalled()
      expect(ctx.$apollo.queries.profilePagePosts.refetch).toHaveBeenCalled()
      expect(ctx.offset).toBe(0)
    })

    it.each([['muteUser'], ['unmuteUser']])('%s surfaces errors via toast', async (method) => {
      const mutate = jest.fn().mockRejectedValue(new Error('mute-fail'))
      const ctx = buildMuteCtx(mutate)
      await methods[method].call(ctx, { id: 'u9' })
      expect(ctx.$toast.error).toHaveBeenCalledWith('mute-fail')
      expect(ctx.$apollo.queries.User.refetch).toHaveBeenCalled()
    })
  })

  describe('onFollowHover', () => {
    it('sets followHovered=true when not loading', () => {
      const ctx = { followLoading: false, followHovered: false }
      methods.onFollowHover.call(ctx)
      expect(ctx.followHovered).toBe(true)
    })

    it('leaves followHovered alone while a follow request is in-flight', () => {
      const ctx = { followLoading: true, followHovered: false }
      methods.onFollowHover.call(ctx)
      expect(ctx.followHovered).toBe(false)
    })
  })

  describe('fetchAllConnections', () => {
    it('writes followingCount on type=following', () => {
      const ctx = { followingCount: 0, followedByCount: 0 }
      methods.fetchAllConnections.call(ctx, 'following', 42)
      expect(ctx.followingCount).toBe(42)
      expect(ctx.followedByCount).toBe(0)
    })

    it('writes followedByCount on type=followedBy', () => {
      const ctx = { followingCount: 0, followedByCount: 0 }
      methods.fetchAllConnections.call(ctx, 'followedBy', 7)
      expect(ctx.followedByCount).toBe(7)
    })

    it('is a no-op for an unknown connection type', () => {
      const ctx = { followingCount: 0, followedByCount: 0 }
      methods.fetchAllConnections.call(ctx, 'something-else', 9)
      expect(ctx.followingCount).toBe(0)
      expect(ctx.followedByCount).toBe(0)
    })
  })

  describe('showOrChangeChat', () => {
    it('opens chat for the user when nothing is open yet', () => {
      const showChat = jest.fn()
      const ctx = { getShowChat: { showChat: false }, showChat }
      methods.showOrChangeChat.call(ctx, 'u1')
      expect(showChat).toHaveBeenCalledWith({ showChat: true, chatUserId: 'u1' })
    })

    it('first closes an existing chat, then opens the new one', () => {
      const showChat = jest.fn()
      const ctx = { getShowChat: { showChat: true }, showChat }
      methods.showOrChangeChat.call(ctx, 'u2')
      expect(showChat).toHaveBeenNthCalledWith(1, { showChat: false, chatUserId: null })
      expect(showChat).toHaveBeenNthCalledWith(2, { showChat: true, chatUserId: 'u2' })
    })
  })

  describe('toggleFollow', () => {
    const buildCtx = ({
      followed,
      isFollowing = false,
      optimisticResult = { success: true },
    } = {}) => {
      const baseUser = {
        id: 'u9',
        followedByCount: followed ? 5 : 4,
        followedByCurrentUser: followed,
        followedBy: followed ? [{ id: 'me' }] : [],
      }
      return {
        followLoading: isFollowing,
        followHovered: true,
        user: { ...baseUser, followedBy: [...baseUser.followedBy] },
        $store: { getters: { 'auth/user': { id: 'me' } } },
        $toast: { error: jest.fn() },
        $t: (k) => k,
        _toggleFollow: jest.fn().mockResolvedValue(optimisticResult),
      }
    }

    it('returns early when followLoading is already true', async () => {
      const ctx = buildCtx({ followed: false, isFollowing: true })
      await methods.toggleFollow.call(ctx)
      expect(ctx._toggleFollow).not.toHaveBeenCalled()
    })

    it('follows: optimistic update + server confirmation', async () => {
      const ctx = buildCtx({
        followed: false,
        optimisticResult: {
          success: true,
          data: {
            followedByCount: 5,
            followedByCurrentUser: true,
            followedBy: [{ id: 'me' }],
          },
        },
      })
      await methods.toggleFollow.call(ctx)
      expect(ctx.user.followedByCurrentUser).toBe(true)
      expect(ctx.user.followedByCount).toBe(5)
      expect(ctx.user.followedBy).toEqual([{ id: 'me' }])
      expect(ctx.followLoading).toBe(false)
      expect(ctx.followHovered).toBe(false)
    })

    it('unfollows: optimistic update + server confirmation', async () => {
      const ctx = buildCtx({
        followed: true,
        optimisticResult: {
          success: true,
          data: {
            followedByCount: 4,
            followedByCurrentUser: false,
            followedBy: [],
          },
        },
      })
      await methods.toggleFollow.call(ctx)
      expect(ctx.user.followedByCurrentUser).toBe(false)
      expect(ctx.user.followedByCount).toBe(4)
      expect(ctx.user.followedBy).toEqual([])
    })

    it('rolls back the optimistic update on server failure (follow path)', async () => {
      const ctx = buildCtx({ followed: false, optimisticResult: { success: false } })
      const startCount = ctx.user.followedByCount
      await methods.toggleFollow.call(ctx)
      expect(ctx.user.followedByCurrentUser).toBe(false)
      expect(ctx.user.followedByCount).toBe(startCount)
      expect(ctx.$toast.error).toHaveBeenCalledWith('followButton.error')
    })

    it('rolls back the optimistic update on server failure (unfollow path)', async () => {
      const ctx = buildCtx({ followed: true, optimisticResult: { success: false } })
      const startCount = ctx.user.followedByCount
      await methods.toggleFollow.call(ctx)
      expect(ctx.user.followedByCurrentUser).toBe(true)
      expect(ctx.user.followedByCount).toBe(startCount)
    })
  })
})

describe('pages/profile/_id/_slug.vue — computed', () => {
  describe('chatRoomUnreadCount', () => {
    it('falls back to 0 when no chatRoom is set', () => {
      expect(computed.chatRoomUnreadCount.call({ chatRoom: null })).toBe(0)
    })

    it('returns the unread counter from the chatRoom', () => {
      expect(computed.chatRoomUnreadCount.call({ chatRoom: { unreadCount: 4 } })).toBe(4)
    })

    it('falls back to 0 when unreadCount is missing', () => {
      expect(computed.chatRoomUnreadCount.call({ chatRoom: {} })).toBe(0)
    })
  })

  describe('user', () => {
    it('returns the first element of the User array', () => {
      expect(computed.user.call({ User: [{ id: 'u1' }] })).toEqual({ id: 'u1' })
    })

    it('returns {} when User is empty', () => {
      expect(computed.user.call({ User: null })).toEqual({})
    })
  })

  describe('userName', () => {
    it('returns the user name when set', () => {
      expect(computed.userName.call({ user: { name: 'Alice' }, $t: (k) => k })).toBe('Alice')
    })

    it('falls back to the anonym placeholder when no name', () => {
      expect(computed.userName.call({ user: {}, $t: () => 'placeholder' })).toBe('placeholder')
    })
  })

  describe('userSlug', () => {
    it('returns the slug when set', () => {
      expect(computed.userSlug.call({ user: { slug: 's' } })).toBe('s')
    })
    it('returns undefined when slug missing', () => {
      expect(computed.userSlug.call({ user: {} })).toBeUndefined()
    })
  })

  describe('userBadges', () => {
    it('is null when BADGES_ENABLED is off', () => {
      const ctx = { $env: { BADGES_ENABLED: false }, user: {} }
      expect(computed.userBadges.call(ctx)).toBeNull()
    })

    it('combines badgeVerification with badgeTrophiesSelected when enabled', () => {
      const ctx = {
        $env: { BADGES_ENABLED: true },
        user: { badgeVerification: 'V', badgeTrophiesSelected: ['A', 'B'] },
      }
      expect(computed.userBadges.call(ctx)).toEqual(['V', 'A', 'B'])
    })

    it('handles a missing badgeTrophiesSelected list', () => {
      const ctx = {
        $env: { BADGES_ENABLED: true },
        user: { badgeVerification: 'V' },
      }
      expect(computed.userBadges.call(ctx)).toEqual(['V'])
    })
  })

  describe('myProfile', () => {
    it('returns true when route id matches the logged-in user', () => {
      const ctx = {
        $route: { params: { id: 'me' } },
        $store: { getters: { 'auth/user': { id: 'me' } } },
      }
      expect(computed.myProfile.call(ctx)).toBe(true)
    })

    it('returns false otherwise', () => {
      const ctx = {
        $route: { params: { id: 'someone-else' } },
        $store: { getters: { 'auth/user': { id: 'me' } } },
      }
      expect(computed.myProfile.call(ctx)).toBe(false)
    })
  })

  describe('followIcon / followLabel', () => {
    const icons = { plus: 'plus', check: 'check', close: 'close' }
    const makeCtx = (followedByCurrentUser, followHovered) => ({
      user: { followedByCurrentUser },
      followHovered,
      icons,
      $t: (k) => k,
    })

    it('shows the plus icon and "follow" label when not followed', () => {
      const ctx = makeCtx(false, false)
      expect(computed.followIcon.call(ctx)).toBe('plus')
      expect(computed.followLabel.call(ctx)).toBe('followButton.follow')
    })

    it('shows the check icon and "following" label when followed (not hovered)', () => {
      const ctx = makeCtx(true, false)
      expect(computed.followIcon.call(ctx)).toBe('check')
      expect(computed.followLabel.call(ctx)).toBe('followButton.following')
    })

    it('switches to the close icon and "unfollow" label when followed AND hovered', () => {
      const ctx = makeCtx(true, true)
      expect(computed.followIcon.call(ctx)).toBe('close')
      expect(computed.followLabel.call(ctx)).toBe('followButton.unfollow')
    })
  })

  describe('tabOptions', () => {
    it('builds 3 tabs with counts and disables tabs at count 0', () => {
      const ctx = {
        user: { contributionsCount: 0, commentedCount: 3, shoutedCount: 0 },
        $t: (k) => k,
      }
      const result = computed.tabOptions.call(ctx)
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({ type: 'post', count: 0, disabled: true })
      expect(result[1]).toMatchObject({ type: 'comment', count: 3, disabled: false })
      expect(result[2]).toMatchObject({ type: 'shout', count: 0, disabled: true })
    })
  })
})

describe('pages/profile/_id/_slug.vue — apollo', () => {
  const { apollo } = ProfileSlug

  describe('profilePagePosts query', () => {
    it('wires the query to the profilePagePosts builder (localised via $i18n)', () => {
      const i18n = { locale: () => 'en' }
      expect(apollo.profilePagePosts.query.call({ $i18n: i18n })).toBe(profilePagePosts(i18n))
    })

    it('derives variables from the active filter, page size and date ordering', () => {
      const ctx = { filter: { author: { id: 'u1' } }, pageSize: 6 }
      expect(apollo.profilePagePosts.variables.call(ctx)).toEqual({
        filter: { author: { id: 'u1' } },
        first: 6,
        offset: 0,
        orderBy: 'sortDate_desc',
      })
    })

    it('update() writes the returned posts into component state', () => {
      const ctx = { posts: [] }
      apollo.profilePagePosts.update.call(ctx, { profilePagePosts: [{ id: 'p1' }] })
      expect(ctx.posts).toEqual([{ id: 'p1' }])
    })
  })
})
