import { mount, RouterLinkStub } from '@vue/test-utils'
import Vuex from 'vuex'
import ChatNotificationMenu from './ChatNotificationMenu'

const localVue = global.localVue

const stubs = {
  NuxtLink: RouterLinkStub,
  'client-only': true,
}

const makeMocks = (overrides = {}) => ({
  $t: jest.fn((key) => key),
  $apollo: {
    subscribe: jest.fn().mockReturnValue({
      subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    }),
    provider: {
      defaultClient: {
        cache: {
          readFragment: jest.fn(),
          writeFragment: jest.fn(),
        },
      },
    },
    ...(overrides.$apollo || {}),
  },
  ...overrides,
})

const makeStore = (initialCount = 0, commitSpy = jest.fn()) =>
  new Vuex.Store({
    modules: {
      auth: {
        namespaced: true,
        getters: { user: () => ({ id: 'me', name: 'Me' }) },
      },
      chat: {
        namespaced: true,
        state: { unreadRoomCount: initialCount },
        getters: { unreadRoomCount: (state) => state.unreadRoomCount },
        mutations: {
          UPDATE_ROOM_COUNT: (state, count) => {
            commitSpy(count)
            state.unreadRoomCount = count
          },
        },
      },
    },
  })

describe('ChatNotificationMenu.vue', () => {
  let wrapper, mocks, store, commitSpy

  const Wrapper = () =>
    mount(ChatNotificationMenu, { localVue, store, mocks, stubs })

  beforeEach(() => {
    commitSpy = jest.fn()
    mocks = makeMocks()
    store = makeStore(0, commitSpy)
  })

  describe('mount', () => {
    it('renders the chat notification menu', () => {
      wrapper = Wrapper()
      expect(wrapper.find('.chat-notification-menu').exists()).toBe(true)
    })

    it('subscribes to roomUpdated', () => {
      wrapper = Wrapper()
      expect(mocks.$apollo.subscribe).toHaveBeenCalledTimes(1)
      expect(mocks.$apollo.subscribe.mock.calls[0][0]).toMatchObject({
        fetchPolicy: 'no-cache',
      })
    })

    it('unsubscribes on destroy', () => {
      const unsubscribe = jest.fn()
      mocks.$apollo.subscribe.mockReturnValue({
        subscribe: jest.fn().mockReturnValue({ unsubscribe }),
      })
      wrapper = Wrapper()
      wrapper.destroy()
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('tolerates destroy when no subscriptions were recorded', () => {
      wrapper = Wrapper()
      wrapper.vm._subscriptions = null
      expect(() => wrapper.destroy()).not.toThrow()
    })
  })

  describe('subscription handler', () => {
    let subscriptionHandlers
    beforeEach(() => {
      subscriptionHandlers = {}
      mocks.$apollo.subscribe.mockReturnValue({
        subscribe: jest.fn((handlers) => {
          subscriptionHandlers = handlers
          return { unsubscribe: jest.fn() }
        }),
      })
    })

    it('dispatches room updates to applyRoomUpdate', () => {
      wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'applyRoomUpdate')
      subscriptionHandlers.next({ data: { roomUpdated: { id: 'r1', unreadCount: 1 } } })
      expect(spy).toHaveBeenCalledWith({ id: 'r1', unreadCount: 1 })
    })

    it('ignores next payloads without data', () => {
      wrapper = Wrapper()
      const spy = jest.spyOn(wrapper.vm, 'applyRoomUpdate')
      subscriptionHandlers.next({})
      expect(spy).toHaveBeenCalledWith(undefined)
    })

    it('logs subscription errors via console.error', () => {
      wrapper = Wrapper()
      const consoleError = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined)
      subscriptionHandlers.error(new Error('boom'))
      expect(consoleError).toHaveBeenCalledWith(
        'roomUpdated subscription error:',
        expect.any(Error),
      )
      consoleError.mockRestore()
    })
  })

  describe('applyRoomUpdate', () => {
    it('returns early when room is missing', () => {
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate(null)
      wrapper.vm.applyRoomUpdate({})
      expect(mocks.$apollo.provider.defaultClient.cache.writeFragment).not.toHaveBeenCalled()
      expect(commitSpy).not.toHaveBeenCalled()
    })

    it('increments counter when room transitions from 0 to positive unread', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue({
        id: 'r1',
        unreadCount: 0,
      })
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 3 })
      expect(mocks.$apollo.provider.defaultClient.cache.writeFragment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'Room:r1',
          data: { __typename: 'Room', id: 'r1', unreadCount: 3 },
        }),
      )
      expect(commitSpy).toHaveBeenLastCalledWith(1)
    })

    it('decrements counter when room transitions from positive unread to 0', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue({
        id: 'r1',
        unreadCount: 5,
      })
      store = makeStore(3, commitSpy)
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 0 })
      expect(commitSpy).toHaveBeenLastCalledWith(2)
    })

    it('does not commit when unread stays positive', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue({
        id: 'r1',
        unreadCount: 2,
      })
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 5 })
      expect(commitSpy).not.toHaveBeenCalled()
    })

    it('treats readFragment throwing as no previous value', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockImplementation(() => {
        throw new Error('not in cache')
      })
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 2 })
      expect(commitSpy).toHaveBeenLastCalledWith(1)
    })

    it('swallows writeFragment errors when the entity is missing from cache', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue({
        id: 'r1',
        unreadCount: 0,
      })
      mocks.$apollo.provider.defaultClient.cache.writeFragment.mockImplementation(() => {
        throw new Error('not normalized')
      })
      wrapper = Wrapper()
      expect(() => wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 2 })).not.toThrow()
      expect(commitSpy).toHaveBeenLastCalledWith(1)
    })

    it('clamps the counter at zero when the delta would take it negative', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue({
        id: 'r1',
        unreadCount: 1,
      })
      store = makeStore(0, commitSpy)
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1', unreadCount: 0 })
      expect(commitSpy).toHaveBeenLastCalledWith(0)
    })

    it('treats missing unreadCount values on payloads as zero', () => {
      mocks.$apollo.provider.defaultClient.cache.readFragment.mockReturnValue(null)
      wrapper = Wrapper()
      wrapper.vm.applyRoomUpdate({ id: 'r1' })
      expect(commitSpy).not.toHaveBeenCalled()
    })
  })

  describe('UnreadRooms apollo query', () => {
    it('commits the unread room count via the update handler', () => {
      wrapper = Wrapper()
      const handler = wrapper.vm.$options.apollo.UnreadRooms
      expect(handler.fetchPolicy).toBe('network-only')
      expect(handler.query.call(wrapper.vm)).toBeDefined()
      handler.update.call(wrapper.vm, { UnreadRooms: 7 })
      expect(commitSpy).toHaveBeenLastCalledWith(7)
    })
  })
})
