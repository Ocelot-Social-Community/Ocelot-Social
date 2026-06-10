// Unit tests for the methods of pages/groups/_id/_slug.vue
// — we call the option object's functions directly with a stub `this` context.
// See pages/profile/_id/_slug.methods.spec.js for the same pattern.
import GroupsSlug from './_slug.vue'

const { methods } = GroupsSlug

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
})
