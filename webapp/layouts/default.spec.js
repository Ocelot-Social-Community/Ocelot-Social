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
      // What the call tells the page about its header and footer; set by the tests below.
      state: { pageBars: 'normal' },
      getters: {
        'auth/isLoggedIn': () => true,
        'chat/showChat': () => {
          return { showChat: false, chatUserId: null, groupId: null }
        },
        'videoCall/showVideoCall': () => false,
        'videoCall/minimized': () => false,
        'videoCall/groupId': () => null,
        'videoCall/groupName': () => null,
        'videoCall/groupSlug': () => null,
        'videoCall/groupAvatar': () => null,
        'videoCall/phase': () => 'idle',
        'videoCall/chatRoomId': () => null,
        'videoCall/pageBars': (state) => state.pageBars,
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

    describe('header and footer beside a maximized video call', () => {
      const classes = () =>
        ['movable', 'glass', 'away'].filter((name) =>
          wrapper.classes().includes(`layout-default--call-bars-${name}`),
        )
      const showing = async (pageBars) => {
        store.state.pageBars = pageBars
        await wrapper.vm.$nextTick()
        return classes()
      }

      it('stay as they are without one', () => {
        expect(classes()).toEqual([])
      })

      it('lie on the call, see-through, while it fills a phone', async () => {
        expect(await showing('overlay')).toEqual(['movable', 'glass'])
      })

      it('move out of the way with the bars of the call', async () => {
        expect(await showing('hidden')).toEqual(['movable', 'glass', 'away'])
      })

      it('stand solid around the maximized call on a desktop, and move away when asked', async () => {
        expect(await showing('manual')).toEqual(['movable'])
        expect(await showing('collapsed')).toEqual(['movable', 'away'])
      })
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
      const shows = (overrides = {}) => {
        const ctx = {
          showVideoCall: true,
          videoCallPhase: 'in-call',
          videoCallGroupId: 'g1',
          videoCallChatRoomId: 'room-1',
          getShowChat: { showChat: true, chatUserId: null, groupId: null, roomId: 'room-1' },
          ...overrides,
        }
        return Default.computed.showCallChatTabs.call({
          ...ctx,
          callChatTab: Default.computed.callChatTab.call(ctx),
        })
      }

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

    describe('hint above the floating chat', () => {
      const hintFor = (showCallChatTabs, callChatTab) =>
        Default.computed.callChatHint.call({ showCallChatTabs, callChatTab, $t: (key) => key })

      it('is the hint of the call chat on screen', () => {
        expect(hintFor(true, 'call')).toBe('videoCall.chatTabs.callHint')
        expect(hintFor(true, 'group')).toBe('videoCall.chatTabs.groupHint')
      })

      it('is not there for a chat outside a call', () => {
        expect(hintFor(false, null)).toBeNull()
      })
    })

    describe('header above the tabs', () => {
      const group = {
        videoCallGroupId: 'g1',
        videoCallGroupName: 'Yoga',
        videoCallGroupSlug: 'yoga',
        videoCallGroupAvatar: { url: 'yoga.png' },
      }

      it('names the group both chats belong to, and leads there', () => {
        expect(Default.computed.callGroupProfile.call(group)).toEqual({
          id: 'g1',
          name: 'Yoga',
          avatar: { url: 'yoga.png' },
        })
        expect(Default.computed.callGroupRoute.call(group)).toEqual({
          name: 'groups-id-slug',
          params: { id: 'g1', slug: 'yoga' },
        })
      })

      it('makes do with the slug for a name, and without a link while the slug is missing', () => {
        expect(
          Default.computed.callGroupProfile.call({ ...group, videoCallGroupName: null }).name,
        ).toBe('yoga')
        expect(
          Default.computed.callGroupRoute.call({ ...group, videoCallGroupSlug: null }),
        ).toBeNull()
      })

      describe('export button', () => {
        it('has the chat export its room, and shows it is busy meanwhile', async () => {
          let finish
          const exportRoom = jest.fn(() => new Promise((resolve) => (finish = resolve)))
          const ctx = { chatExporting: false, $refs: { chat: { exportRoom } } }
          const exporting = Default.methods.exportChat.call(ctx)
          expect(exportRoom).toHaveBeenCalledTimes(1)
          expect(ctx.chatExporting).toBe(true)
          finish()
          await exporting
          expect(ctx.chatExporting).toBe(false)
        })

        it('does nothing without a chat, or on top of a running export', async () => {
          const exportRoom = jest.fn()
          await Default.methods.exportChat.call({ chatExporting: false, $refs: {} })
          await Default.methods.exportChat.call({
            chatExporting: true,
            $refs: { chat: { exportRoom } },
          })
          expect(exportRoom).not.toHaveBeenCalled()
        })
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
