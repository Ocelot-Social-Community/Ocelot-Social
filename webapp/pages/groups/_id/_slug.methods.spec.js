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
