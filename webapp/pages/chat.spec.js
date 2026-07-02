import Vuex from 'vuex'
import { mount } from '@vue/test-utils'
import chat from './chat.vue'

const localVue = global.localVue

// Render client-only's default slot so the template path stays realistic; give the
// chat stub the methods the page delegates to, so the mounted hook doesn't throw.
const stubs = {
  'client-only': {
    render(h) {
      return h('div', this.$slots.default)
    },
  },
  chat: {
    render: (h) => h('div'),
    methods: {
      newRoom() {},
      newGroupRoom() {},
    },
  },
  'add-chat-room-by-user-search': true,
}

describe('chat.vue', () => {
  let store
  let mocks
  let committed
  let showChatState

  const Wrapper = () => {
    committed = []
    store = new Vuex.Store({
      modules: {
        chat: {
          namespaced: true,
          getters: { showChat: () => showChatState },
          mutations: {
            SET_OPEN_CHAT: (_state, payload) => committed.push(payload),
          },
        },
      },
    })
    return mount(chat, { store, mocks, localVue, stubs })
  }

  beforeEach(() => {
    showChatState = { showChat: false, chatUserId: null }
    mocks = {
      $route: { query: {} },
      $router: { replace: jest.fn(), push: jest.fn() },
    }
  })

  describe('mounted: adopting the URL room context into Vuex', () => {
    it('opens the group chat when the URL carries a groupId', () => {
      mocks.$route = { query: { groupId: 'g1' } }
      Wrapper()
      expect(committed).toContainEqual({ showChat: true, chatUserId: null, groupId: 'g1' })
    })

    it('opens the user chat when the URL carries a userId', () => {
      mocks.$route = { query: { userId: 'u1' } }
      Wrapper()
      expect(committed).toContainEqual({ showChat: true, chatUserId: 'u1', groupId: null })
    })

    it('prefers the groupId when the URL carries both a groupId and a userId', () => {
      mocks.$route = { query: { groupId: 'g1', userId: 'u1' } }
      Wrapper()
      expect(committed).toContainEqual({ showChat: true, chatUserId: null, groupId: 'g1' })
    })

    it('closes the chat when the URL carries neither', () => {
      Wrapper()
      expect(committed).toContainEqual({ showChat: false, chatUserId: null, groupId: null })
    })
  })

  describe('openFromQuery', () => {
    it('returns early without touching the router when there is no userId/groupId', () => {
      const wrapper = Wrapper()
      wrapper.vm.$refs.chat = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$router.replace.mockClear()
      wrapper.vm.openFromQuery()
      expect(wrapper.vm.$router.replace).not.toHaveBeenCalled()
    })

    it('opens a group room and cleans the query when a groupId is present', () => {
      mocks.$route = { query: { groupId: 'g1' } }
      const wrapper = Wrapper()
      const chatRef = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$refs.chat = chatRef
      wrapper.vm.openFromQuery()
      expect(chatRef.newGroupRoom).toHaveBeenCalledWith('g1')
      expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({ path: '/chat', query: {} })
    })

    it('opens a user room and cleans the query when a userId is present', () => {
      mocks.$route = { query: { userId: 'u1' } }
      const wrapper = Wrapper()
      const chatRef = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$refs.chat = chatRef
      wrapper.vm.openFromQuery()
      expect(chatRef.newRoom).toHaveBeenCalledWith('u1')
      expect(wrapper.vm.$router.replace).toHaveBeenCalledWith({ path: '/chat', query: {} })
    })

    it('retries via setTimeout until the chat ref is available', () => {
      jest.useFakeTimers()
      mocks.$route = { query: { userId: 'u1' } }
      const wrapper = Wrapper()
      const chatRef = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$refs.chat = null
      wrapper.vm.openFromQuery()
      expect(chatRef.newRoom).not.toHaveBeenCalled()
      wrapper.vm.$refs.chat = chatRef
      jest.advanceTimersByTime(100)
      expect(chatRef.newRoom).toHaveBeenCalledWith('u1')
      jest.useRealTimers()
    })
  })

  describe('toggleSearch', () => {
    it('opens the search panel and scrolls it into view', async () => {
      const scrollIntoView = jest.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const wrapper = Wrapper()
      wrapper.vm.toggleSearch()
      expect(wrapper.vm.showSearch).toBe(true)
      await wrapper.vm.$nextTick()
      await wrapper.vm.$nextTick()
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    })

    it('closes the search panel again on a second toggle', () => {
      const wrapper = Wrapper()
      wrapper.vm.showSearch = true
      wrapper.vm.toggleSearch()
      expect(wrapper.vm.showSearch).toBe(false)
    })
  })

  describe('room helpers', () => {
    it('addChatRoom delegates to the chat ref', () => {
      const wrapper = Wrapper()
      const chatRef = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$refs.chat = chatRef
      wrapper.vm.addChatRoom('user-1')
      expect(chatRef.newRoom).toHaveBeenCalledWith('user-1')
    })

    it('addGroupChatRoom delegates to the chat ref', () => {
      const wrapper = Wrapper()
      const chatRef = { newRoom: jest.fn(), newGroupRoom: jest.fn() }
      wrapper.vm.$refs.chat = chatRef
      wrapper.vm.addGroupChatRoom('group-1')
      expect(chatRef.newGroupRoom).toHaveBeenCalledWith('group-1')
    })

    it('showRoom opens the chat for the given room', () => {
      const wrapper = Wrapper()
      committed = []
      wrapper.vm.showRoom('room-1')
      expect(committed).toContainEqual({ showChat: true, chatUserId: 'room-1' })
    })
  })
})
