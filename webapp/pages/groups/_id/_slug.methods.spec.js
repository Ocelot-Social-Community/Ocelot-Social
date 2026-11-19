// Unit tests for the methods of pages/groups/_id/_slug.vue
// — we call the option object's functions directly with a stub `this` context.
// See pages/profile/_id/_slug.methods.spec.js for the same pattern.
import GroupsSlug from './_slug.vue'

const { methods, apollo } = GroupsSlug

describe('pages/groups/_id/_slug.vue — methods', () => {
  describe('showOrChangeGroupChat', () => {
    it('opens the group chat when nothing is open yet', () => {
      const showChat = jest.fn()
      const ctx = { getShowChat: { showChat: false, groupId: null }, showChat }
      methods.showOrChangeGroupChat.call(ctx, 'g1')
      expect(showChat).toHaveBeenCalledTimes(1)
      expect(showChat).toHaveBeenCalledWith({ showChat: true, chatUserId: null, groupId: 'g1' })
    })

    it('switches to a different group chat with a single call', () => {
      const showChat = jest.fn()
      const ctx = { getShowChat: { showChat: true, groupId: 'g1' }, showChat }
      methods.showOrChangeGroupChat.call(ctx, 'g2')
      expect(showChat).toHaveBeenCalledTimes(1)
      expect(showChat).toHaveBeenCalledWith({ showChat: true, chatUserId: null, groupId: 'g2' })
    })

    it('closes the group chat when clicking the same group again (toggle)', () => {
      const showChat = jest.fn()
      const ctx = { getShowChat: { showChat: true, groupId: 'g1' }, showChat }
      methods.showOrChangeGroupChat.call(ctx, 'g1')
      expect(showChat).toHaveBeenCalledTimes(1)
      expect(showChat).toHaveBeenCalledWith({ showChat: false, chatUserId: null, groupId: null })
    })
  })

  describe('onElevationChanged', () => {
    it('reloads the group and then its posts, which follow the elevation (#10506)', async () => {
      const order = []
      const ctx = {
        reloadGroup: jest.fn(async () => order.push('group')),
        refetchPostList: jest.fn(() => order.push('posts')),
      }
      await methods.onElevationChanged.call(ctx)
      expect(order).toEqual(['group', 'posts'])
    })
  })

  describe('whether the viewer was removed from the call running now', () => {
    it('is taken from the first answer', () => {
      const ctx = { videoCallRemoved: false }
      apollo.videoCallParticipantCount.result.call(ctx, { data: { videoCallRemoved: true } })
      expect(ctx.videoCallRemoved).toBe(true)
      apollo.videoCallParticipantCount.result.call(ctx, { data: null })
      expect(ctx.videoCallRemoved).toBe(false)
    })

    it('follows every count pushed, and is forgotten with the subscription', () => {
      let next
      const unsubscribe = jest.fn()
      const ctx = {
        $route: { params: { id: 'g1' } },
        $apollo: {
          subscribe: () => ({
            subscribe: (handlers) => {
              next = handlers.next
              return { unsubscribe }
            },
          }),
        },
        videoCallParticipantCount: 0,
        videoCallRemoved: false,
      }
      methods.setupVideoCallCountSubscription.call(ctx)
      next({
        data: { videoCallParticipantCountChanged: { groupId: 'g1', count: 2, removed: true } },
      })
      expect(ctx).toMatchObject({ videoCallParticipantCount: 2, videoCallRemoved: true })
      // The count of a call that is over frees them again.
      next({
        data: { videoCallParticipantCountChanged: { groupId: 'g1', count: 0, removed: false } },
      })
      expect(ctx).toMatchObject({ videoCallParticipantCount: 0, videoCallRemoved: false })
      next({
        data: { videoCallParticipantCountChanged: { groupId: 'g1', count: 1, removed: true } },
      })
      methods.teardownVideoCallCountSubscription.call(ctx)
      expect(unsubscribe).toHaveBeenCalled()
      expect(ctx).toMatchObject({ videoCallParticipantCount: 0, videoCallRemoved: false })
    })
  })

  describe('apollo.profilePagePosts.error', () => {
    it('ends the spinner of a list that never loaded with "no posts"', () => {
      const ctx = { posts: null }
      apollo.profilePagePosts.error.call(ctx, new Error('network'))
      expect(ctx.posts).toEqual([])
    })

    it('keeps posts that are already shown', () => {
      const ctx = { posts: [{ id: 'p1' }] }
      apollo.profilePagePosts.error.call(ctx, new Error('network'))
      expect(ctx.posts).toEqual([{ id: 'p1' }])
    })
  })
})
