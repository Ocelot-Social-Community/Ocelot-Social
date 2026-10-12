import Vuex from 'vuex'
import { shallowMount } from '@vue/test-utils'
import Default from './default.vue'

const localVue = global.localVue
localVue.directive('scrollTo', jest.fn())

const stubs = {
  nuxt: {
    template: '<span><slot /></span>',
  },
  'client-only': {
    template: '<span><slot /></span>',
  },
  'nuxt-link': {
    template: '<span><slot /></span>',
  },
}

describe('default.vue', () => {
  let wrapper
  let mocks
  let store

  beforeEach(() => {
    mocks = {
      $route: {
        matched: [{ name: 'index' }],
      },
      $scrollTo: jest.fn(),
      $t: jest.fn(),
      $policy: {
        get: (key) => key === 'inviteRegistration',
      },
    }
    store = new Vuex.Store({
      getters: {
        'auth/isLoggedIn': () => true,
        'chat/showChat': () => {
          return { showChat: false, chatUserId: null, groupId: null }
        },
        'videoCall/showVideoCall': () => false,
        'videoCall/minimized': () => false,
        'videoCall/groupId': () => null,
        'videoCall/phase': () => 'idle',
        'videoCall/chatRoomId': () => null,
      },
      mutations: {
        'chat/SET_OPEN_CHAT': jest.fn(),
        'videoCall/SET_ENABLED': jest.fn(),
      },
    })
  })

  describe('shallow mount', () => {
    const Wrapper = () => {
      return shallowMount(Default, {
        store,
        mocks,
        localVue,
        stubs,
      })
    }

    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('renders', () => {
      expect(wrapper.classes('layout-default')).toBe(true)
    })
  })

  describe('chat of the running video call', () => {
    const lives = (overrides = {}) =>
      Default.computed.chatLivesInVideoSidebar.call({
        showVideoCall: true,
        videoCallMinimized: false,
        videoCallPhase: 'in-call',
        videoCallGroupId: 'g1',
        videoCallChatRoomId: 'room-1',
        isMobile: false,
        getShowChat: { showChat: true, chatUserId: null, groupId: null, roomId: null },
        ...overrides,
      })

    it('is shown by the call for the chat of its group', () => {
      expect(lives({ getShowChat: { showChat: true, groupId: 'g1', roomId: null } })).toBe(true)
    })

    it('is shown by the call for its conference chat', () => {
      expect(lives({ getShowChat: { showChat: true, groupId: null, roomId: 'room-1' } })).toBe(true)
    })

    it('is not shown by the call for any other chat', () => {
      expect(lives({ getShowChat: { showChat: true, groupId: 'g2', roomId: null } })).toBe(false)
      expect(lives({ getShowChat: { showChat: true, groupId: null, roomId: 'room-2' } })).toBe(
        false,
      )
    })

    it('moves to the floating window while the call is parked', () => {
      expect(
        lives({
          videoCallMinimized: true,
          getShowChat: { showChat: true, groupId: null, roomId: 'room-1' },
        }),
      ).toBe(false)
    })

    it('stays with the call on a phone, which has no parked window', () => {
      expect(
        lives({
          videoCallMinimized: true,
          isMobile: true,
          getShowChat: { showChat: true, groupId: null, roomId: 'room-1' },
        }),
      ).toBe(true)
    })

    describe('tabs in the floating chat window', () => {
      const shows = (overrides = {}) =>
        Default.computed.showCallChatTabs.call({
          showVideoCall: true,
          videoCallPhase: 'in-call',
          videoCallGroupId: 'g1',
          videoCallChatRoomId: 'room-1',
          getShowChat: { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
          ...overrides,
        })

      it('are offered for the conference chat and for the chat of the group', () => {
        expect(shows()).toBe(true)
        expect(shows({ getShowChat: { showChat: true, groupId: 'g1', roomId: null } })).toBe(true)
      })

      it('are not offered for a chat that is not one of the call', () => {
        expect(shows({ getShowChat: { showChat: true, groupId: 'g2', roomId: null } })).toBe(false)
        expect(shows({ getShowChat: { showChat: true, chatUserId: 'u1' } })).toBe(false)
      })

      it('are not offered while the call has no conference chat, or there is no call', () => {
        expect(
          shows({
            videoCallChatRoomId: null,
            getShowChat: { showChat: true, groupId: 'g1', roomId: null },
          }),
        ).toBe(false)
        expect(shows({ showVideoCall: false })).toBe(false)
        expect(shows({ videoCallPhase: 'prejoin' })).toBe(false)
      })
    })

    describe('opening a chat on a phone', () => {
      const open = (chatLivesInVideoSidebar) => {
        const ctx = {
          isMobile: true,
          chatLivesInVideoSidebar,
          getShowChat: { showChat: true, chatUserId: null, groupId: 'g1', roomId: null },
          showChat: jest.fn(),
          $route: { path: '/groups/g1/yoga' },
          $router: { push: jest.fn(), replace: jest.fn() },
        }
        Default.watch['getShowChat.showChat'].call(ctx, true)
        return ctx
      }

      it('leaves the chats of the call to the call', () => {
        const ctx = open(true)
        expect(ctx.$router.push).not.toHaveBeenCalled()
        expect(ctx.showChat).not.toHaveBeenCalled()
      })

      it('takes every other chat to the chat page', () => {
        const ctx = open(false)
        expect(ctx.$router.push).toHaveBeenCalledWith({ path: '/chat', query: { groupId: 'g1' } })
      })
    })
  })
})
