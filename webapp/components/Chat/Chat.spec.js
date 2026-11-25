import { mount } from '@vue/test-utils'
import flushPromises from 'flush-promises'
import Vuex from 'vuex'
import Chat from './Chat.vue'
import { forgetUnsavedDrafts } from './unsavedDrafts'
import { createTooltip, destroyTooltip } from 'v-tooltip'

const localVue = global.localVue

// Stub the web component to avoid shadow DOM issues in tests
jest.mock('v-tooltip', () => {
  const actual = jest.requireActual('v-tooltip')
  return { ...actual, createTooltip: jest.fn(), destroyTooltip: jest.fn() }
})

const stubs = {
  'vue-advanced-chat': {
    template:
      '<div class="vac-stub"><slot /><slot name="room-options" /><slot name="room-header-avatar" /><slot name="room-header-info" /></div>',
    props: [
      'rooms',
      'messages',
      'messagesLoaded',
      'roomsLoaded',
      'currentUserId',
      'roomId',
      'height',
      'autoScroll',
      'roomMessage',
    ],
  },
  'nuxt-link': { template: '<a><slot /></a>', props: ['to'] },
  'os-button': { template: '<button><slot /><slot name="icon" /></button>' },
  'os-icon': { template: '<span />' },
  'avatar-image': { template: '<div />' },
}

const mockRoom = (overrides = {}) => ({
  id: 'room-1',
  roomId: 'room-1',
  roomName: 'Test Room',
  avatar: null,
  isGroupRoom: false,
  lastMessageAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  unreadCount: 0,
  messagesUntilOldestUnread: 0,
  groupProfile: null,
  index: '2026-01-01T00:00:00Z',
  lastMessage: { content: 'hello' },
  users: [
    { _id: 'current-user', id: 'current-user', slug: 'me', username: 'Me', avatar: null },
    { _id: 'other-user', id: 'other-user', slug: 'other', username: 'Other', avatar: null },
  ],
  ...overrides,
})

const mockMessage = (overrides = {}) => ({
  _id: 'msg-1',
  id: 'msg-1',
  indexId: 0,
  content: 'Hello',
  senderId: 'other-user',
  username: 'Other',
  avatar: null,
  date: '2026-01-01T00:00:00Z',
  saved: true,
  distributed: false,
  seen: false,
  files: [],
  room: { id: 'room-1' },
  ...overrides,
})

describe('Chat.vue', () => {
  let wrapper, mocks, store, subscriptionHandlers

  beforeEach(() => {
    subscriptionHandlers = {}
    // Drafts whose save failed outlive a chat; none is to reach into the next test.
    forgetUnsavedDrafts()

    mocks = {
      $t: jest.fn((key) => key),
      $i18n: { locale: () => 'en' },
      $toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
      $router: { push: jest.fn() },
      $apollo: {
        query: jest.fn().mockResolvedValue({ data: { Room: [], Message: [] } }),
        mutate: jest.fn().mockResolvedValue({ data: {} }),
        subscribe: jest.fn().mockImplementation(() => ({
          subscribe: jest.fn((handlers) => {
            // Capture subscription handlers for testing
            const key =
              mocks.$apollo.subscribe.mock.calls.length <= 1
                ? 'chatMessageAdded'
                : 'chatMessageStatusUpdated'
            subscriptionHandlers[key] = handlers
            return { unsubscribe: jest.fn() }
          }),
        })),
      },
    }

    store = new Vuex.Store({
      modules: {
        auth: {
          namespaced: true,
          getters: {
            user: () => ({ id: 'current-user', name: 'Me', avatar: null }),
          },
        },
        chat: {
          namespaced: true,
          state: { unreadRoomCount: 0, dismissedHints: [] },
          getters: {
            dismissedHints: (state) => state.dismissedHints,
          },
          mutations: {
            UPDATE_ROOM_COUNT: jest.fn(),
            DISMISS_HINT(state, key) {
              state.dismissedHints = [...state.dismissedHints, key]
            },
          },
        },
        videoCall: {
          namespaced: true,
          getters: {
            showVideoCall: () => false,
            minimized: () => false,
          },
        },
      },
    })
  })

  const Wrapper = (propsData = {}) => {
    return mount(Chat, {
      propsData,
      localVue,
      store,
      mocks,
      stubs,
    })
  }

  describe('displayedRooms', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('passes through unreadCount <= 99 unchanged', () => {
      wrapper.vm.rooms = [mockRoom({ unreadCount: 0 }), mockRoom({ id: 'r2', unreadCount: 99 })]
      expect(wrapper.vm.displayedRooms[0].unreadCount).toBe(0)
      expect(wrapper.vm.displayedRooms[1].unreadCount).toBe(99)
    })

    it('caps unreadCount > 99 to "99+"', () => {
      wrapper.vm.rooms = [mockRoom({ unreadCount: 100 }), mockRoom({ id: 'r2', unreadCount: 9999 })]
      expect(wrapper.vm.displayedRooms[0].unreadCount).toBe('99+')
      expect(wrapper.vm.displayedRooms[1].unreadCount).toBe('99+')
    })

    it('leaves the underlying rooms array unmodified', () => {
      wrapper.vm.rooms = [mockRoom({ unreadCount: 150 })]
      // Trigger the computed getter to ensure it doesn't mutate `rooms`
      expect(wrapper.vm.displayedRooms).toBeDefined()
      expect(wrapper.vm.rooms[0].unreadCount).toBe(150)
    })
  })

  describe('mount', () => {
    it('renders without errors', () => {
      wrapper = Wrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('fetches rooms on mount', () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      wrapper = Wrapper()
      expect(mocks.$apollo.query).toHaveBeenCalled()
    })

    it('subscribes to chatMessageAdded and chatMessageStatusUpdated', () => {
      wrapper = Wrapper()
      expect(mocks.$apollo.subscribe).toHaveBeenCalledTimes(2)
    })
  })

  describe('mergeMessages', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('adds new messages sorted by indexId', () => {
      const messages = [
        mockMessage({ _id: 'msg-2', id: 'msg-2', indexId: 2, content: 'Second' }),
        mockMessage({ _id: 'msg-1', id: 'msg-1', indexId: 0, content: 'First' }),
        mockMessage({ _id: 'msg-3', id: 'msg-3', indexId: 1, content: 'Middle' }),
      ]
      wrapper.vm.mergeMessages(messages)
      expect(wrapper.vm.messages.map((m) => m.indexId)).toEqual([0, 1, 2])
    })

    it('tracks unseen incoming messages', () => {
      const messages = [
        mockMessage({ id: 'unseen-1', indexId: 0, seen: false, senderId: 'other-user' }),
        mockMessage({ id: 'seen-1', indexId: 1, seen: true, senderId: 'other-user' }),
        mockMessage({ id: 'own-1', indexId: 2, seen: false, senderId: 'current-user' }),
      ]
      wrapper.vm.mergeMessages(messages)
      expect(wrapper.vm.unseenMessageIds.has('unseen-1')).toBe(true)
      expect(wrapper.vm.unseenMessageIds.has('seen-1')).toBe(false)
      expect(wrapper.vm.unseenMessageIds.has('own-1')).toBe(false)
    })

    it('deduplicates by indexId', () => {
      wrapper.vm.mergeMessages([mockMessage({ indexId: 0, content: 'original' })])
      wrapper.vm.mergeMessages([mockMessage({ indexId: 0, content: 'duplicate' })])
      expect(wrapper.vm.messages).toHaveLength(1)
    })
  })

  describe('prepareMessage', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('formats date and timestamp', () => {
      const msg = mockMessage({ date: '2026-03-30T14:30:00Z' })
      const prepared = wrapper.vm.prepareMessage(msg)
      expect(prepared._rawDate).toBe('2026-03-30T14:30:00Z')
      expect(prepared.timestamp).toBeDefined()
      expect(prepared.date).toBeDefined()
    })

    it('extracts w320 from avatar object', () => {
      const msg = mockMessage({ avatar: { w320: 'http://img.jpg' } })
      const prepared = wrapper.vm.prepareMessage(msg)
      expect(prepared.avatar).toBe('http://img.jpg')
      expect(prepared._originalAvatar).toBe('http://img.jpg')
    })

    it('generates initials avatar when avatar is null', () => {
      const msg = mockMessage({ avatar: null, username: 'Otto Normal' })
      const prepared = wrapper.vm.prepareMessage(msg)
      expect(prepared.avatar).toContain('data:image/svg+xml')
      expect(prepared.avatar).toContain('ON')
    })
  })

  describe('initialsAvatarUrl', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })
    afterEach(() => {
      document.documentElement.style.removeProperty('--color-primary-dark')
      document.documentElement.style.removeProperty('--text-color-primary-inverse')
    })

    it('draws the initials in the theme colours read from the document', () => {
      document.documentElement.style.setProperty('--color-primary-dark', 'rgb(1, 2, 3)')
      document.documentElement.style.setProperty('--text-color-primary-inverse', 'rgb(4, 5, 6)')
      const url = wrapper.vm.initialsAvatarUrl('Peter Lustig')
      expect(url).toContain('>PL</text>')
      expect(url).toContain(`fill="${encodeURIComponent('rgb(1, 2, 3)')}"`)
      expect(url).toContain(`fill="${encodeURIComponent('rgb(4, 5, 6)')}"`)
    })

    it('keeps the light colours when the tokens cannot be read', () => {
      const url = wrapper.vm.initialsAvatarUrl('Peter Lustig')
      expect(url).toContain(`fill="${encodeURIComponent('rgb(25,122,49)')}"`)
      expect(url).toContain('fill="white"')
    })
  })

  describe('applyAvatarsOnList', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('shows avatar only on last message of each sender chain', () => {
      const messages = [
        { senderId: 'a', _originalAvatar: 'a.jpg', avatar: null },
        { senderId: 'a', _originalAvatar: 'a.jpg', avatar: null },
        { senderId: 'b', _originalAvatar: 'b.jpg', avatar: null },
        { senderId: 'a', _originalAvatar: 'a.jpg', avatar: null },
      ]
      wrapper.vm.applyAvatarsOnList(messages)
      expect(messages.map((m) => m.avatar)).toEqual([null, 'a.jpg', 'b.jpg', 'a.jpg'])
    })

    it('handles single message', () => {
      const messages = [{ senderId: 'a', _originalAvatar: 'a.jpg', avatar: null }]
      wrapper.vm.applyAvatarsOnList(messages)
      expect(messages[0].avatar).toBe('a.jpg')
    })
  })

  describe('replaceLocalMessage', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.messages = [
        {
          _id: 'local-1',
          id: undefined,
          isUploading: true,
          files: [],
          distributed: false,
          seen: false,
        },
      ]
    })

    it('stores id mapping', () => {
      wrapper.vm.replaceLocalMessage('local-1', { id: 'server-1', _id: 'server-1' })
      expect(wrapper.vm._localToServerIds['server-1']).toBe('local-1')
    })

    it('clears upload state and updates files', () => {
      const serverFiles = [{ url: 'http://cdn/file.jpg', name: 'file', type: 'image/jpeg' }]
      wrapper.vm.replaceLocalMessage('local-1', { id: 'server-1', files: serverFiles })
      expect(wrapper.vm.messages[0].isUploading).toBe(false)
      expect(wrapper.vm.messages[0].files).toEqual(serverFiles)
    })

    it('applies pending status updates', () => {
      wrapper.vm.pendingStatusUpdates['server-1'] = { distributed: true }
      wrapper.vm.replaceLocalMessage('local-1', { id: 'server-1' })
      expect(wrapper.vm.messages[0].distributed).toBe(true)
      expect(wrapper.vm.pendingStatusUpdates['server-1']).toBeUndefined()
    })
  })

  describe('handleMessageStatusUpdated', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom()
      wrapper.vm.messages = [
        { _id: 'msg-1', id: 'msg-1', distributed: false, seen: false },
        { _id: 'msg-2', id: 'msg-2', distributed: false, seen: false },
      ]
      wrapper.vm.rooms = [mockRoom()]
    })

    it('updates distributed status on messages', () => {
      subscriptionHandlers.chatMessageStatusUpdated?.next?.({
        data: {
          chatMessageStatusUpdated: {
            roomId: 'room-1',
            messageIds: ['msg-1'],
            status: 'distributed',
          },
        },
      })
      expect(wrapper.vm.messages[0].distributed).toBe(true)
      expect(wrapper.vm.messages[1].distributed).toBe(false)
    })

    it('updates seen status on messages', () => {
      subscriptionHandlers.chatMessageStatusUpdated?.next?.({
        data: {
          chatMessageStatusUpdated: {
            roomId: 'room-1',
            messageIds: ['msg-1', 'msg-2'],
            status: 'seen',
          },
        },
      })
      expect(wrapper.vm.messages[0].seen).toBe(true)
      expect(wrapper.vm.messages[1].seen).toBe(true)
    })

    it('queues updates for messages not yet known', () => {
      subscriptionHandlers.chatMessageStatusUpdated?.next?.({
        data: {
          chatMessageStatusUpdated: {
            roomId: 'room-1',
            messageIds: ['unknown-id'],
            status: 'distributed',
          },
        },
      })
      expect(wrapper.vm.pendingStatusUpdates['unknown-id']).toEqual({ distributed: true })
    })

    it('resolves messages via local-to-server id mapping', () => {
      wrapper.vm._localToServerIds = { 'server-1': 'msg-1' }
      subscriptionHandlers.chatMessageStatusUpdated?.next?.({
        data: {
          chatMessageStatusUpdated: {
            roomId: 'room-1',
            messageIds: ['server-1'],
            status: 'distributed',
          },
        },
      })
      expect(wrapper.vm.messages[0].distributed).toBe(true)
    })

    it('updates room lastMessage status', () => {
      wrapper.vm.rooms = [
        mockRoom({ lastMessage: { id: 'msg-1', content: 'hi', seen: false, distributed: false } }),
      ]
      subscriptionHandlers.chatMessageStatusUpdated?.next?.({
        data: {
          chatMessageStatusUpdated: {
            roomId: 'room-1',
            messageIds: ['msg-1'],
            status: 'seen',
          },
        },
      })
      expect(wrapper.vm.rooms[0].lastMessage.seen).toBe(true)
    })
  })

  describe('markAsSeen', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom({ unreadCount: 3 })
      wrapper.vm.rooms = [mockRoom({ unreadCount: 3 })]
      wrapper.vm.messages = [
        { _id: 'msg-1', id: 'msg-1', seen: false },
        { _id: 'msg-2', id: 'msg-2', seen: false },
      ]
      mocks.$apollo.mutate.mockResolvedValue({ data: { MarkMessagesAsSeen: true } })
      mocks.$apollo.query.mockResolvedValue({ data: { UnreadRooms: 1 } })
    })

    it('updates messages locally to seen', () => {
      wrapper.vm.markAsSeen(['msg-1'])
      expect(wrapper.vm.messages[0].seen).toBe(true)
      expect(wrapper.vm.messages[1].seen).toBe(false)
    })

    it('decrements room unread count', () => {
      wrapper.vm.markAsSeen(['msg-1', 'msg-2'])
      expect(wrapper.vm.rooms[0].unreadCount).toBe(1)
    })

    it('does not go below zero', () => {
      wrapper.vm.rooms = [mockRoom({ unreadCount: 1 })]
      wrapper.vm.markAsSeen(['msg-1', 'msg-2'])
      expect(wrapper.vm.rooms[0].unreadCount).toBe(0)
    })

    it('calls MarkMessagesAsSeen mutation', () => {
      wrapper.vm.markAsSeen(['msg-1'])
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: { messageIds: ['msg-1'] },
        }),
      )
    })

    it('skips if no messageIds', () => {
      wrapper.vm.markAsSeen([])
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
    })
  })

  describe('addSocketMessage', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.messages = []
    })

    it('adds a new message', () => {
      wrapper.vm.addSocketMessage(mockMessage({ _id: 'new-1', id: 'new-1', indexId: 0 }))
      expect(wrapper.vm.messages).toHaveLength(1)
    })

    it('deduplicates by _id', () => {
      wrapper.vm.addSocketMessage(mockMessage({ _id: 'dup', id: 'dup', indexId: 0 }))
      wrapper.vm.addSocketMessage(mockMessage({ _id: 'dup', id: 'dup', indexId: 0 }))
      expect(wrapper.vm.messages).toHaveLength(1)
    })

    it('deduplicates by id', () => {
      wrapper.vm.messages = [{ _id: 'local', id: 'server-1', indexId: 0 }]
      wrapper.vm.addSocketMessage(mockMessage({ _id: 'server-1', id: 'server-1', indexId: 0 }))
      expect(wrapper.vm.messages).toHaveLength(1)
    })

    it('tracks unseen messages from other users', () => {
      wrapper.vm.addSocketMessage(
        mockMessage({ id: 'unseen', senderId: 'other-user', seen: false }),
      )
      expect(wrapper.vm.unseenMessageIds.has('unseen')).toBe(true)
    })

    it('does not track own messages as unseen', () => {
      wrapper.vm.addSocketMessage(mockMessage({ id: 'own', senderId: 'current-user', seen: false }))
      expect(wrapper.vm.unseenMessageIds.has('own')).toBe(false)
    })
  })

  describe('bringRoomToTopAndSelect', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = [
        mockRoom({ id: 'room-1', roomId: 'room-1' }),
        mockRoom({ id: 'room-2', roomId: 'room-2' }),
        mockRoom({ id: 'room-3', roomId: 'room-3' }),
      ]
    })

    it('moves room to first position', () => {
      const room = wrapper.vm.rooms[2]
      wrapper.vm.bringRoomToTopAndSelect(room)
      expect(wrapper.vm.rooms[0].id).toBe('room-3')
    })

    it('sets index to current timestamp', () => {
      const before = new Date().toISOString()
      const room = wrapper.vm.rooms[1]
      wrapper.vm.bringRoomToTopAndSelect(room)
      expect(wrapper.vm.rooms[0].index >= before).toBe(true)
    })

    it('removes duplicate from original position', () => {
      const room = wrapper.vm.rooms[1]
      wrapper.vm.bringRoomToTopAndSelect(room)
      expect(wrapper.vm.rooms).toHaveLength(3)
    })
  })

  describe('fixRoomObject', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('normalizes a basic DM room', () => {
      const raw = {
        id: 'r1',
        roomId: 'r1',
        roomName: 'User',
        isGroupRoom: false,
        createdAt: '2026-01-01',
        lastMessage: null,
        users: [
          { id: 'current-user', name: 'Me', avatar: null },
          { id: 'other', name: 'Other', avatar: { w320: 'img.jpg' } },
        ],
      }
      const fixed = wrapper.vm.fixRoomObject(raw)
      expect(fixed.isGroupRoom).toBe(false)
      expect(fixed.groupProfile).toBeNull()
      expect(fixed.users[1].avatar).toBe('img.jpg')
      expect(fixed.avatar).toBe('img.jpg')
    })

    it('normalizes a group room', () => {
      const raw = {
        id: 'r2',
        roomId: 'r2',
        roomName: 'Group',
        isGroupRoom: true,
        createdAt: '2026-01-01',
        lastMessage: null,
        group: { id: 'g1', slug: 'test-group', name: 'Test Group', avatar: { w320: 'group.jpg' } },
        users: [{ id: 'current-user', name: 'Me', avatar: null }],
      }
      const fixed = wrapper.vm.fixRoomObject(raw)
      expect(fixed.isGroupRoom).toBe(true)
      expect(fixed.groupProfile).toEqual({
        id: 'g1',
        slug: 'test-group',
        name: 'Test Group',
        avatar: { w320: 'group.jpg' },
      })
      expect(fixed.avatar).toBe('group.jpg')
    })

    it('truncates lastMessage content to 30 chars', () => {
      const raw = {
        id: 'r3',
        roomId: 'r3',
        roomName: 'Room',
        isGroupRoom: false,
        createdAt: '2026-01-01',
        lastMessage: { content: 'A'.repeat(100), date: '2026-01-01' },
        users: [{ id: 'current-user', name: 'Me', avatar: null }],
      }
      const fixed = wrapper.vm.fixRoomObject(raw)
      expect(fixed.lastMessage.content).toHaveLength(30)
    })
  })

  describe('chatMessageAdded', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = [mockRoom()]
      wrapper.vm.selectedRoom = mockRoom()
      wrapper.vm.messages = []
    })

    it('updates room lastMessage and moves to top', async () => {
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'other-user',
            content: 'New message',
            room: { id: 'room-1' },
          }),
        },
      })
      expect(wrapper.vm.rooms[0].lastMessage.content).toBe('New message')
    })

    it('adds message to current room if from other user', async () => {
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            _id: 'new-msg',
            id: 'new-msg',
            indexId: 5,
            senderId: 'other-user',
            room: { id: 'room-1' },
          }),
        },
      })
      expect(wrapper.vm.messages).toHaveLength(1)
    })

    it('does not add own messages to chat (handled via mutation response)', async () => {
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'current-user',
            room: { id: 'room-1' },
          }),
        },
      })
      expect(wrapper.vm.messages).toHaveLength(0)
    })

    it('takes the unread count of a room that is not open from the server', async () => {
      wrapper.vm.selectedRoom = mockRoom({ id: 'other-room' })
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'other-user',
            room: { id: 'room-1', unreadCount: 4 },
          }),
        },
      })
      expect(wrapper.vm.rooms[0].unreadCount).toBe(4)
    })

    it('does not count a message the server leaves out, as from a sender the viewer mutes', async () => {
      // A group room delivers a muted or blocked member's message live; the server's count,
      // resolved for this viewer, does not include it.
      wrapper.vm.rooms = [mockRoom({ unreadCount: 2 })]
      wrapper.vm.selectedRoom = mockRoom({ id: 'other-room' })
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'muted-user',
            content: 'From a muted member',
            room: { id: 'room-1', unreadCount: 2 },
          }),
        },
      })
      expect(wrapper.vm.rooms[0].unreadCount).toBe(2)
      // The room is updated all the same: the message is there, only not counted.
      expect(wrapper.vm.rooms[0].lastMessage.content).toBe('From a muted member')
    })

    it('leaves the unread count of a room alone for a message the viewer wrote', async () => {
      wrapper.vm.rooms = [mockRoom({ unreadCount: 2 })]
      wrapper.vm.selectedRoom = mockRoom({ id: 'other-room' })
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'current-user',
            room: { id: 'room-1', unreadCount: 7 },
          }),
        },
      })
      expect(wrapper.vm.rooms[0].unreadCount).toBe(2)
    })
  })

  describe('fetchMessages', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
      wrapper.vm.messages = []
    })

    it('loads one page by default', async () => {
      const room = mockRoom({ id: 'r-default', roomId: 'r-default' })
      mocks.$apollo.query.mockResolvedValue({ data: { Message: [] } })
      await wrapper.vm.fetchMessages({ room })
      const messageCall = mocks.$apollo.query.mock.calls.find(
        ([arg]) => arg.variables?.roomId === 'r-default',
      )
      expect(messageCall[0].variables.first).toBe(20)
    })

    it('uses beforeIndex cursor for subsequent loads', async () => {
      const room = mockRoom({ id: 'r-cursor', roomId: 'r-cursor' })
      const messages = Array.from({ length: 20 }, (_, i) =>
        mockMessage({ indexId: i, id: `m${i}`, _id: `m${i}` }),
      )
      mocks.$apollo.query.mockResolvedValue({ data: { Message: messages } })
      await wrapper.vm.fetchMessages({ room })
      // Second fetch should use cursor
      mocks.$apollo.query.mockResolvedValue({ data: { Message: [] } })
      await wrapper.vm.fetchMessages({ room })
      const calls = mocks.$apollo.query.mock.calls.filter(
        ([arg]) => arg.variables?.roomId === 'r-cursor',
      )
      expect(calls[1][0].variables.beforeIndex).toBe(0)
    })

    it('keeps what is loaded when an older page fails, and tells', async () => {
      const room = mockRoom({ id: 'r-older', roomId: 'r-older' })
      const messages = Array.from({ length: 20 }, (_, i) =>
        mockMessage({ indexId: i + 20, id: `m${i}`, _id: `m${i}` }),
      )
      mocks.$apollo.query.mockResolvedValue({ data: { Message: messages } })
      await expect(wrapper.vm.fetchMessages({ room })).resolves.toBe(true)
      mocks.$apollo.query.mockRejectedValue(new Error('Offline'))

      const libraryRoom = { loadingMoreMessages: true }
      wrapper.vm.$el._instance = {
        subTree: {
          component: { type: { name: 'ChatRoom' }, isUnmounted: false, proxy: libraryRoom },
        },
      }

      await expect(wrapper.vm.fetchMessages({ room })).resolves.toBe(false)

      expect(wrapper.vm.messages).toHaveLength(20)
      expect(mocks.$toast.error).toHaveBeenCalledWith('Offline')
      // The library may ask for the older page again.
      expect(libraryRoom.loadingMoreMessages).toBe(false)
    })

    it('shows no messages when the first page fails', async () => {
      const room = mockRoom({ id: 'r-first', roomId: 'r-first' })
      mocks.$apollo.query.mockRejectedValue(new Error('Offline'))

      await expect(wrapper.vm.fetchMessages({ room })).resolves.toBe(false)

      expect(wrapper.vm.messages).toEqual([])
    })

    it('sets messagesLoaded when server returns fewer than pageSize', async () => {
      const room = mockRoom({ id: 'r-loaded', roomId: 'r-loaded' })
      mocks.$apollo.query.mockResolvedValue({
        data: { Message: [mockMessage({ indexId: 0 })] },
      })
      await wrapper.vm.fetchMessages({ room })
      expect(wrapper.vm.messagesLoaded).toBe(true)
    })

    it('tracks unseen messages from server response', async () => {
      const room = mockRoom({ id: 'r-unseen', roomId: 'r-unseen' })
      mocks.$apollo.query.mockResolvedValue({
        data: {
          Message: [
            mockMessage({ id: 'unseen-1', indexId: 0, seen: false, senderId: 'other-user' }),
          ],
        },
      })
      await wrapper.vm.fetchMessages({ room })
      expect(wrapper.vm.unseenMessageIds.has('unseen-1')).toBe(true)
    })

    it('drops the messages of a room that was left while they were asked for', async () => {
      const first = mockRoom({ id: 'r-first', roomId: 'r-first' })
      const second = mockRoom({ id: 'r-second', roomId: 'r-second' })
      let answerFirst
      mocks.$apollo.query
        .mockReturnValueOnce(
          new Promise((resolve) => {
            answerFirst = () =>
              resolve({ data: { Message: [mockMessage({ id: 'from-first', indexId: 0 })] } })
          }),
        )
        .mockResolvedValueOnce({
          data: { Message: [mockMessage({ id: 'from-second', indexId: 0 })] },
        })
      const loadingFirst = wrapper.vm.fetchMessages({ room: first })
      await wrapper.vm.fetchMessages({ room: second })
      answerFirst()
      await loadingFirst
      expect(wrapper.vm.selectedRoom.id).toBe('r-second')
      expect(wrapper.vm.messages).toHaveLength(1)
      expect(wrapper.vm.messages[0].id).toBe('from-second')
    })

    it('leaves the room opened since alone when the request for a left one fails', async () => {
      const first = mockRoom({ id: 'r-first', roomId: 'r-first' })
      const second = mockRoom({ id: 'r-second', roomId: 'r-second' })
      let failFirst
      mocks.$apollo.query
        .mockReturnValueOnce(
          new Promise((_resolve, reject) => {
            failFirst = () => reject(new Error('offline'))
          }),
        )
        .mockResolvedValueOnce({
          data: { Message: [mockMessage({ id: 'from-second', indexId: 0 })] },
        })
      const loadingFirst = wrapper.vm.fetchMessages({ room: first })
      await wrapper.vm.fetchMessages({ room: second })
      failFirst()
      await loadingFirst
      expect(wrapper.vm.messages).toHaveLength(1)
    })

    it('leaves a room opened again alone when the earlier request for it fails', async () => {
      const first = mockRoom({ id: 'r-first', roomId: 'r-first' })
      const second = mockRoom({ id: 'r-second', roomId: 'r-second' })
      let failFirst
      mocks.$apollo.query
        .mockReturnValueOnce(
          new Promise((_resolve, reject) => {
            failFirst = () => reject(new Error('offline'))
          }),
        )
        .mockResolvedValueOnce({ data: { Message: [] } })
        .mockResolvedValueOnce({
          data: { Message: [mockMessage({ id: 'from-first', indexId: 0 })] },
        })
      const loadingFirst = wrapper.vm.fetchMessages({ room: first })
      await wrapper.vm.fetchMessages({ room: second })
      await wrapper.vm.fetchMessages({ room: first })
      failFirst()
      await loadingFirst
      expect(wrapper.vm.selectedRoom.id).toBe('r-first')
      expect(wrapper.vm.messages).toHaveLength(1)
    })
  })

  describe('sendMessage', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom()
      wrapper.vm.rooms = [mockRoom()]
      wrapper.vm.messages = []
      mocks.$apollo.mutate.mockResolvedValue({
        data: {
          CreateMessage: {
            id: 'server-msg-1',
            _id: 'server-msg-1',
            indexId: 0,
            content: 'Hello',
            senderId: 'current-user',
            saved: true,
            distributed: false,
            seen: false,
            files: [],
            room: { id: 'room-1' },
          },
        },
      })
    })

    it('adds local message immediately', async () => {
      const promise = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(wrapper.vm.messages).toHaveLength(1)
      expect(wrapper.vm.messages[0].content).toBe('Hello')
      expect(wrapper.vm.messages[0].isUploading).toBe(true)
      await promise
    })

    it('local message has saved=true and seen=false', async () => {
      const promise = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hi' })
      expect(wrapper.vm.messages[0].saved).toBe(true)
      expect(wrapper.vm.messages[0].seen).toBe(false)
      await promise
    })

    it('calls CreateMessage mutation', async () => {
      await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ content: 'Hello', roomId: 'room-1' }),
        }),
      )
    })

    it('replaces local message with server response', async () => {
      await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(wrapper.vm._localToServerIds['server-msg-1']).toBeDefined()
    })

    it('uses userId for virtual rooms', async () => {
      wrapper.vm.rooms = [
        mockRoom({ id: 'temp-user1', roomId: 'temp-user1', _virtualUserId: 'user1' }),
      ]
      mocks.$apollo.mutate.mockResolvedValue({
        data: { CreateMessage: { id: 's1', room: { id: 'real-room' } } },
      })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.sendMessage({ roomId: 'temp-user1', content: 'Hi' })
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({ userId: 'user1' }),
        }),
      )
    })

    it('handles files', async () => {
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test')
      const blob = new Blob(['test'], { type: 'text/plain' })
      await wrapper.vm.sendMessage({
        roomId: 'room-1',
        content: 'with file',
        files: [{ blob, name: 'test', type: 'text/plain', extension: 'txt' }],
      })
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            files: expect.arrayContaining([
              expect.objectContaining({ name: 'test', extension: 'txt', type: 'text/plain' }),
            ]),
          }),
        }),
      )
      delete global.URL.createObjectURL
    })

    it('shows toast on error, and how to send the message again', async () => {
      mocks.$apollo.mutate.mockRejectedValue(new Error('Send failed'))
      await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(mocks.$toast.error).toHaveBeenCalledWith('Send failed')
      expect(mocks.$toast.info).toHaveBeenCalledWith('chat.notSent')
    })

    it('moves room to top and scrolls', async () => {
      const promise = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(wrapper.vm.rooms[0].id).toBe('room-1')
      await promise
    })
  })

  describe('newRoom', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
    })

    it('selects existing local room', async () => {
      wrapper.vm.rooms = [mockRoom({ users: [{ id: 'current-user' }, { id: 'target-user' }] })]
      await wrapper.vm.newRoom('target-user')
      expect(wrapper.vm.activeRoomId).toBe('room-1')
    })

    it('fetches room from server if not local', async () => {
      const serverRoom = mockRoom({
        id: 'server-room',
        roomId: 'server-room',
        users: [
          { id: 'current-user', name: 'Me' },
          { id: 'target', name: 'Target' },
        ],
      })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [serverRoom] } })
      await wrapper.vm.newRoom('target')
      expect(wrapper.vm.rooms[0].id).toBe('server-room')
    })

    it('creates virtual room when server has none', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.newRoom({ id: 'new-user', name: 'New User' })
      expect(wrapper.vm.rooms[0].id).toBe('temp-new-user')
      expect(wrapper.vm.rooms[0]._virtualUserId).toBe('new-user')
    })

    it('accepts user object with avatar', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.newRoom({ id: 'u1', name: 'User', avatar: { w320: 'img.jpg' } })
      expect(wrapper.vm.rooms[0].avatar).toBe('img.jpg')
    })

    it('handles server error gracefully', async () => {
      mocks.$apollo.query.mockRejectedValue(new Error('network'))
      await wrapper.vm.newRoom({ id: 'u1', name: 'User' })
      expect(wrapper.vm.rooms[0].id).toBe('temp-u1')
    })
  })

  describe('newGroupRoom', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
    })

    it('selects existing local group room', async () => {
      wrapper.vm.rooms = [
        mockRoom({
          id: 'gr-1',
          roomId: 'gr-1',
          isGroupRoom: true,
          groupProfile: { id: 'group-1' },
        }),
      ]
      await wrapper.vm.newGroupRoom('group-1')
      expect(wrapper.vm.activeRoomId).toBe('gr-1')
    })

    it('fetches group room from server', async () => {
      const serverRoom = mockRoom({
        id: 'gr-server',
        roomId: 'gr-server',
        isGroupRoom: true,
        group: { id: 'g1', name: 'G', slug: 'g' },
        users: [{ id: 'current-user', name: 'Me' }],
      })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [serverRoom] } })
      await wrapper.vm.newGroupRoom('g1')
      expect(wrapper.vm.rooms[0].id).toBe('gr-server')
    })

    it('creates group room via mutation when not found', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      mocks.$apollo.mutate.mockResolvedValue({
        data: {
          CreateGroupRoom: mockRoom({
            id: 'new-gr',
            roomId: 'new-gr',
            isGroupRoom: true,
            group: { id: 'g1', name: 'G', slug: 'g' },
            users: [{ id: 'current-user', name: 'Me' }],
          }),
        },
      })
      await wrapper.vm.newGroupRoom('g1')
      expect(wrapper.vm.rooms[0].id).toBe('new-gr')
    })

    it('shows toast on creation error', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      mocks.$apollo.mutate.mockRejectedValue(new Error('Create failed'))
      await wrapper.vm.newGroupRoom('g1')
      expect(mocks.$toast.error).toHaveBeenCalledWith('Create failed')
    })
  })

  describe('an answer for an opening replaced meanwhile', () => {
    // A server answer held back until the test lets it through.
    const held = () => {
      let resolve
      const promise = new Promise((r) => {
        resolve = r
      })
      return { promise, resolve }
    }
    const roomAnswer = (room) => ({ data: { Room: room ? [room] : [] } })
    const groupRoom = (id, groupId) =>
      mockRoom({
        id,
        roomId: id,
        isGroupRoom: true,
        group: { id: groupId, name: groupId, slug: groupId },
        groupProfile: { id: groupId },
        users: [{ id: 'current-user', name: 'Me' }],
      })
    const directRoom = (id, userId) =>
      mockRoom({
        id,
        roomId: id,
        users: [
          { id: 'current-user', name: 'Me' },
          { id: userId, name: userId },
        ],
      })

    it('selects nothing for a roomId replaced meanwhile', async () => {
      const first = held()
      mocks.$apollo.query
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(roomAnswer(mockRoom({ id: 'room-b', roomId: 'room-b' })))
      wrapper = Wrapper({ singleRoom: true, roomId: 'room-a' })
      await wrapper.setProps({ roomId: 'room-b' })
      await flushPromises()
      first.resolve(roomAnswer(mockRoom({ id: 'room-a', roomId: 'room-a' })))
      await flushPromises()
      expect(wrapper.vm.activeRoomId).toBe('room-b')
      expect(wrapper.vm.rooms.map((r) => r.id)).toEqual(['room-b'])
    })

    it('selects nothing for a groupId replaced meanwhile', async () => {
      const first = held()
      mocks.$apollo.query
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(roomAnswer(groupRoom('gr-b', 'g-b')))
      wrapper = Wrapper({ singleRoom: true, groupId: 'g-a' })
      await wrapper.setProps({ groupId: 'g-b' })
      await flushPromises()
      first.resolve(roomAnswer(groupRoom('gr-a', 'g-a')))
      await flushPromises()
      expect(wrapper.vm.activeRoomId).toBe('gr-b')
      expect(wrapper.vm.rooms.map((r) => r.id)).toEqual(['gr-b'])
    })

    it('creates no group room for a groupId replaced meanwhile', async () => {
      const first = held()
      mocks.$apollo.query
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(roomAnswer(groupRoom('gr-b', 'g-b')))
      wrapper = Wrapper({ singleRoom: true, groupId: 'g-a' })
      await wrapper.setProps({ groupId: 'g-b' })
      await flushPromises()
      first.resolve(roomAnswer(null))
      await flushPromises()
      expect(mocks.$apollo.mutate).not.toHaveBeenCalled()
      expect(wrapper.vm.activeRoomId).toBe('gr-b')
    })

    it('selects nothing for a userId replaced meanwhile, not even a room of its own', async () => {
      wrapper = Wrapper()
      await flushPromises()
      mocks.$apollo.query.mockClear()
      wrapper.vm.rooms = []
      const first = held()
      mocks.$apollo.query
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(roomAnswer(directRoom('dm-b', 'u-b')))
      const opening = wrapper.vm.newRoom({ id: 'u-a', name: 'A' })
      await wrapper.vm.newRoom({ id: 'u-b', name: 'B' })
      first.resolve(roomAnswer(null))
      await opening
      await flushPromises()
      expect(wrapper.vm.activeRoomId).toBe('dm-b')
      expect(wrapper.vm.rooms.map((r) => r.id)).toEqual(['dm-b'])
    })

    it('selects nothing for a userId whose profile came in after it was replaced', async () => {
      wrapper = Wrapper()
      await flushPromises()
      mocks.$apollo.query.mockClear()
      wrapper.vm.rooms = [directRoom('dm-a', 'u-a')]
      const profile = held()
      mocks.$apollo.query
        .mockReturnValueOnce(profile.promise)
        .mockResolvedValueOnce(roomAnswer(directRoom('dm-b', 'u-b')))
      const opening = wrapper.vm.newRoom('u-a')
      await wrapper.vm.newRoom({ id: 'u-b', name: 'B' })
      profile.resolve({ data: { User: [{ id: 'u-a', name: 'A', slug: 'a' }] } })
      await opening
      await flushPromises()
      expect(wrapper.vm.activeRoomId).toBe('dm-b')
    })

    it('selects not the group room created for a groupId replaced meanwhile', async () => {
      wrapper = Wrapper()
      await flushPromises()
      mocks.$apollo.query.mockClear()
      wrapper.vm.rooms = [groupRoom('gr-b', 'g-b')]
      const created = held()
      mocks.$apollo.query.mockResolvedValueOnce(roomAnswer(null))
      mocks.$apollo.mutate.mockReturnValueOnce(created.promise)
      const opening = wrapper.vm.newGroupRoom('g-a')
      await flushPromises()
      expect(mocks.$apollo.mutate).toHaveBeenCalled()
      await wrapper.vm.newGroupRoom('g-b')
      created.resolve({ data: { CreateGroupRoom: groupRoom('gr-a', 'g-a') } })
      await opening
      await flushPromises()
      expect(wrapper.vm.activeRoomId).toBe('gr-b')
      expect(wrapper.vm.rooms.map((r) => r.id)).toEqual(['gr-b'])
    })

    it('says nothing of a failed creation for a groupId replaced meanwhile', async () => {
      wrapper = Wrapper()
      await flushPromises()
      mocks.$apollo.query.mockClear()
      wrapper.vm.rooms = [groupRoom('gr-b', 'g-b')]
      const created = held()
      mocks.$apollo.query.mockResolvedValueOnce(roomAnswer(null))
      mocks.$apollo.mutate.mockReturnValueOnce(
        created.promise.then(() => Promise.reject(new Error('Create failed'))),
      )
      const opening = wrapper.vm.newGroupRoom('g-a')
      await flushPromises()
      await wrapper.vm.newGroupRoom('g-b')
      created.resolve()
      await opening
      await flushPromises()
      expect(mocks.$toast.error).not.toHaveBeenCalled()
    })
  })

  describe('singleRoom mode', () => {
    it('mounts with groupId and calls newGroupRoom', () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      mocks.$apollo.mutate.mockResolvedValue({
        data: {
          CreateGroupRoom: mockRoom({
            id: 'gr',
            roomId: 'gr',
            isGroupRoom: true,
            group: { id: 'g1', name: 'G' },
            users: [{ id: 'current-user', name: 'Me' }],
          }),
        },
      })
      wrapper = Wrapper({ singleRoom: true, groupId: 'g1' })
      // newGroupRoom first queries the server for existing room
      expect(mocks.$apollo.query).toHaveBeenCalled()
    })

    it('mounts with userId and calls newRoom', () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      wrapper = Wrapper({ singleRoom: true, userId: 'u1' })
      expect(mocks.$apollo.query).toHaveBeenCalled()
    })
  })

  describe('watchers', () => {
    it('calls newGroupRoom when groupId changes in singleRoom mode', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      mocks.$apollo.mutate.mockResolvedValue({
        data: {
          CreateGroupRoom: mockRoom({
            id: 'gr',
            roomId: 'gr',
            isGroupRoom: true,
            group: { id: 'g2', name: 'G2' },
            users: [{ id: 'current-user', name: 'Me' }],
          }),
        },
      })
      wrapper = Wrapper({ singleRoom: true, groupId: 'g1' })
      await wrapper.setProps({ groupId: 'g2' })
      await flushPromises()
      // Created for g2 only: g1's answer comes in after g2 has replaced it.
      expect(mocks.$apollo.mutate).toHaveBeenCalledTimes(1)
      expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
        expect.objectContaining({ variables: { groupId: 'g2' } }),
      )
    })

    it('calls newRoom when userId changes in singleRoom mode', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      wrapper = Wrapper({ singleRoom: true, userId: 'u1' })
      await wrapper.setProps({ userId: 'u2' })
      // newRoom is called, which queries the server
      expect(mocks.$apollo.query).toHaveBeenCalled()
    })
  })

  describe('openFile', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      global.fetch = jest.fn().mockResolvedValue({
        blob: jest.fn().mockResolvedValue(new Blob(['test'])),
      })
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:test')
    })

    afterEach(() => {
      delete global.fetch
    })

    it('skips null file', async () => {
      await wrapper.vm.openFile(null)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('skips file without url', async () => {
      await wrapper.vm.openFile({ type: 'image/png' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('skips video files', async () => {
      await wrapper.vm.openFile({ url: 'http://test.mp4', type: 'video/mp4' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('downloads non-video files', async () => {
      const clickMock = jest.fn()
      jest.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        style: {},
        click: clickMock,
      })
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => {})
      jest.spyOn(document.body, 'removeChild').mockImplementation(() => {})
      await wrapper.vm.openFile({ url: 'http://test.jpg', name: 'img', type: 'image/jpeg' })
      expect(global.fetch).toHaveBeenCalledWith('http://test.jpg', expect.any(Object))
      expect(clickMock).toHaveBeenCalled()
      document.createElement.mockRestore()
      document.body.appendChild.mockRestore()
      document.body.removeChild.mockRestore()
    })
  })

  describe('redirectToUserProfile', () => {
    it('navigates to user profile using the DB slug', () => {
      wrapper = Wrapper()
      wrapper.vm.redirectToUserProfile({ user: { id: 'u1', slug: 'john-doe', name: 'John Doe' } })
      expect(mocks.$router.push).toHaveBeenCalledWith({
        name: 'profile-id-slug',
        params: { id: 'u1', slug: 'john-doe' },
      })
    })

    it('does not navigate when slug is missing', () => {
      wrapper = Wrapper()
      wrapper.vm.redirectToUserProfile({ user: { id: 'u1', name: 'John Doe' } })
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })
  })

  describe('roomHeaderLink computed', () => {
    beforeEach(() => {
      wrapper = Wrapper()
    })

    it('returns null when no room selected', () => {
      wrapper.vm.selectedRoom = null
      expect(wrapper.vm.roomHeaderLink).toBeNull()
    })

    it('returns group link for group rooms', () => {
      wrapper.vm.selectedRoom = mockRoom({
        isGroupRoom: true,
        groupProfile: { id: 'g1', slug: 'test-group' },
      })
      expect(wrapper.vm.roomHeaderLink).toBe('/groups/g1/test-group')
    })

    it('returns profile link for DM rooms', () => {
      wrapper.vm.selectedRoom = mockRoom({
        isGroupRoom: false,
        users: [
          { id: 'current-user', name: 'Me' },
          { id: 'other', name: 'Other User' },
        ],
      })
      expect(wrapper.vm.roomHeaderLink).toBe('/profile/other/other-user')
    })
  })

  describe('fetchRooms', () => {
    beforeEach(() => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
    })

    it('deduplicates rooms', async () => {
      const room = mockRoom({ lastMessageAt: '2026-01-01' })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [room] } })
      await wrapper.vm.fetchRooms({})
      await wrapper.vm.fetchRooms({})
      // Same room loaded twice but only appears once
      expect(wrapper.vm.rooms.filter((r) => r.id === 'room-1')).toHaveLength(1)
    })

    it('sets roomsLoaded when fewer than pageSize', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [mockRoom()] } })
      await wrapper.vm.fetchRooms({})
      expect(wrapper.vm.roomsLoaded).toBe(true)
    })

    it('handles error', async () => {
      mocks.$apollo.query.mockRejectedValue(new Error('Fetch failed'))
      await wrapper.vm.fetchRooms({})
      expect(mocks.$toast.error).toHaveBeenCalledWith('Fetch failed')
    })
  })

  describe('beforeDestroy', () => {
    it('unsubscribes from subscriptions', () => {
      wrapper = Wrapper()
      const subs = wrapper.vm._subscriptions
      expect(subs).toHaveLength(2)
      wrapper.destroy()
      subs.forEach((s) => {
        expect(s.unsubscribe).toHaveBeenCalled()
      })
    })
  })

  describe('currentLocaleIso watcher', () => {
    it('reformats message dates when locale changes', async () => {
      wrapper = Wrapper()
      wrapper.vm.messages = [mockMessage({ _rawDate: '2026-06-15T14:30:00Z' })]
      mocks.$i18n.locale = () => 'de'
      wrapper.vm.$options.watch.currentLocaleIso.call(wrapper.vm)
      expect(wrapper.vm.messages[0].timestamp).toBeDefined()
    })
  })

  describe('expandChatLink', () => {
    it('returns chat route with no query when no room selected', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.expandChatLink).toEqual({ name: 'chat' })
    })

    it('returns groupId query for group rooms', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom({
        isGroupRoom: true,
        groupProfile: { id: 'g1' },
        users: [{ id: 'current-user' }],
      })
      expect(wrapper.vm.expandChatLink).toEqual({ name: 'chat', query: { groupId: 'g1' } })
    })

    it('returns userId query for DM rooms', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom()
      expect(wrapper.vm.expandChatLink).toEqual({ name: 'chat', query: { userId: 'other-user' } })
    })
  })

  describe('roomHeaderLink', () => {
    it('returns null when no other user found in DM', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom({ users: [{ id: 'current-user', name: 'Me' }] })
      expect(wrapper.vm.roomHeaderLink).toBeNull()
    })
  })

  describe('buildLastMessage', () => {
    it('returns file name for non-audio files', () => {
      wrapper = Wrapper()
      const result = wrapper.vm.buildLastMessage({
        content: '',
        files: [{ name: 'photo', type: 'image/jpeg' }],
      })
      expect(result.content).toBe('\uD83D\uDCCE photo')
    })

    it('returns empty for audio files', () => {
      wrapper = Wrapper()
      const result = wrapper.vm.buildLastMessage({
        content: '',
        files: [{ name: 'audio', type: 'audio/mpeg' }],
      })
      expect(result.content).toBe('')
    })
  })

  describe('searchRooms', () => {
    it('fetches rooms with search term', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.searchRooms({ value: 'test' })
      expect(wrapper.vm.roomSearch).toBe('test')
    })

    it('clears search and resets cursor', async () => {
      wrapper = Wrapper()
      wrapper.vm.roomSearch = 'old'
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [mockRoom()] } })
      await wrapper.vm.searchRooms({ value: '' })
      expect(wrapper.vm.roomSearch).toBe('')
      expect(wrapper.vm.roomCursor).toBeDefined()
    })

    it('increments generation to handle concurrent searches', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.searchRooms({ value: 'a' })
      expect(wrapper.vm.roomSearchGeneration).toBe(1)
      await wrapper.vm.searchRooms({ value: 'ab' })
      expect(wrapper.vm.roomSearchGeneration).toBe(2)
    })

    it('sets roomObserverDirty when roomsLoaded was true', async () => {
      wrapper = Wrapper()
      wrapper.vm.roomsLoaded = true
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.searchRooms({ value: 'x' })
      // roomObserverDirty was set, roomsLoaded is true (< pageSize), so no reinit
      expect(wrapper.vm.roomObserverDirty).toBe(true)
    })
  })

  describe('fetchMoreRooms', () => {
    it('delegates to fetchRooms with current search', () => {
      wrapper = Wrapper()
      wrapper.vm.fetchRooms = jest.fn()
      wrapper.vm.roomSearch = 'test'
      wrapper.vm.fetchMoreRooms()
      expect(wrapper.vm.fetchRooms).toHaveBeenCalledWith({ search: 'test' })
    })
  })

  describe('fetchRooms replace mode', () => {
    it('replaces rooms instead of appending', async () => {
      wrapper = Wrapper()
      wrapper.vm.rooms = [mockRoom({ id: 'old', roomId: 'old' })]
      mocks.$apollo.query.mockResolvedValue({
        data: { Room: [mockRoom({ id: 'new', roomId: 'new' })] },
      })
      await wrapper.vm.fetchRooms({ replace: true })
      expect(wrapper.vm.rooms).toHaveLength(1)
      expect(wrapper.vm.rooms[0].id).toBe('new')
    })

    it('selects first room in singleRoom mode', async () => {
      wrapper = Wrapper({ singleRoom: true })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [mockRoom()] } })
      await wrapper.vm.fetchRooms({})
      expect(wrapper.vm.activeRoomId).toBe('room-1')
    })

    it('fetches by room id', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [mockRoom()] } })
      await wrapper.vm.fetchRooms({ room: { id: 'room-1' } })
      expect(mocks.$apollo.query).toHaveBeenCalledWith(
        expect.objectContaining({ variables: expect.objectContaining({ id: 'room-1' }) }),
      )
    })
  })

  describe('fetchMessages edge cases', () => {
    it('skips when room has no roomId', async () => {
      wrapper = Wrapper()
      await wrapper.vm.fetchMessages({ room: {} })
      expect(wrapper.vm.activeRoomId).toBeNull()
    })

    it('blocks external room auto-select', async () => {
      wrapper = Wrapper()
      const currentRoom = mockRoom({ id: 'current', roomId: 'current' })
      wrapper.vm.selectedRoom = currentRoom
      wrapper.vm.activeRoomId = 'current'
      wrapper.vm.messages = [{ id: 'msg1', content: 'existing' }]
      wrapper.vm._externalRoomIds = new Set(['ext-room'])
      await wrapper.vm.fetchMessages({ room: { id: 'ext', roomId: 'ext-room' } })
      expect(wrapper.vm.activeRoomId).toBe('current')
      expect(wrapper.vm.selectedRoom).toBe(currentRoom)
      expect(wrapper.vm.messages).toEqual([{ id: 'msg1', content: 'existing' }])
    })

    it('handles virtual rooms with early return', async () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = null
      await wrapper.vm.fetchMessages({ room: { id: 'temp-123', roomId: 'temp-123' } })
      // Virtual rooms toggle messagesLoaded and return early
      expect(wrapper.vm.selectedRoom).toEqual({ id: 'temp-123', roomId: 'temp-123' })
    })

    it('handles fetch error', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query.mockRejectedValue(new Error('Network error'))
      await wrapper.vm.fetchMessages({ room: mockRoom(), options: {} })
      expect(mocks.$toast.error).toHaveBeenCalledWith('Network error')
      expect(wrapper.vm.messages).toEqual([])
    })
  })

  describe('chatMessageAdded with new room', () => {
    it('returns early when server returns empty rooms', async () => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await subscriptionHandlers.chatMessageAdded.next({
        data: { chatMessageAdded: mockMessage({ room: { id: 'unknown' } }) },
      })
      expect(wrapper.vm.rooms).toHaveLength(0)
    })

    it('returns early when room fetch fails', async () => {
      wrapper = Wrapper()
      wrapper.vm.rooms = []
      mocks.$apollo.query.mockRejectedValue(new Error('fail'))
      await subscriptionHandlers.chatMessageAdded.next({
        data: { chatMessageAdded: mockMessage({ room: { id: 'unknown' } }) },
      })
      expect(wrapper.vm.rooms).toHaveLength(0)
    })

    it('fetches and inserts new room without auto-select', async () => {
      wrapper = Wrapper()
      wrapper.vm.rooms = [mockRoom()]
      wrapper.vm.selectedRoom = mockRoom()
      wrapper.vm.activeRoomId = 'room-1'
      const newRoomData = mockRoom({
        id: 'new-room',
        roomId: 'new-room',
        users: [
          { _id: 'current-user', id: 'current-user', name: 'Me', avatar: null },
          { _id: 'sender', id: 'sender', name: 'Sender', avatar: null },
        ],
      })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [newRoomData] } })
      await subscriptionHandlers.chatMessageAdded.next({
        data: {
          chatMessageAdded: mockMessage({
            room: { id: 'new-room' },
            senderId: 'sender',
          }),
        },
      })
      expect(wrapper.vm.rooms[0].id).toBe('new-room')
      expect(wrapper.vm._externalRoomIds.has('new-room')).toBe(true)
    })
  })

  describe('toggleUserSearch', () => {
    it('emits toggle-user-search', () => {
      wrapper = Wrapper()
      wrapper.vm.toggleUserSearch()
      expect(wrapper.emitted('toggle-user-search')).toHaveLength(1)
    })
  })

  describe('navigateToUserProfile', () => {
    it('navigates using messageUserProfile and the DB slug', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom()
      wrapper.vm.rooms = [mockRoom()]
      wrapper.vm.navigateToUserProfile('other-user')
      expect(mocks.$router.push).toHaveBeenCalledWith({
        name: 'profile-id-slug',
        params: { id: 'other-user', slug: 'other' },
      })
    })

    it('does not navigate when the profile has no slug', () => {
      wrapper = Wrapper()
      const room = mockRoom({
        users: [{ _id: 'unknown', id: 'unknown', username: 'No Slug', avatar: null }],
      })
      wrapper.vm.selectedRoom = room
      wrapper.vm.rooms = [room]
      wrapper.vm.navigateToUserProfile('unknown')
      expect(mocks.$router.push).not.toHaveBeenCalled()
    })
  })

  describe('newRoom with string userId', () => {
    it('fetches user profile and creates virtual room', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query
        .mockResolvedValueOnce({ data: { User: [{ id: 'u1', name: 'Test User', avatar: null }] } })
        .mockResolvedValueOnce({ data: { Room: [] } })
      await wrapper.vm.newRoom('u1')
      expect(wrapper.vm.rooms[0].roomName).toBe('Test User')
      expect(wrapper.vm.rooms[0].id).toBe('temp-u1')
    })

    it('falls back to userId as name on profile fetch error', async () => {
      wrapper = Wrapper()
      mocks.$apollo.query
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ data: { Room: [] } })
      await wrapper.vm.newRoom('u1')
      expect(wrapper.vm.rooms[0].roomName).toBe('u1')
    })
  })

  describe('sendMessage virtual room replacement', () => {
    it('replaces virtual room with real room after send', async () => {
      wrapper = Wrapper()
      const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
      wrapper.vm.rooms = [virtualRoom]
      wrapper.vm.selectedRoom = virtualRoom
      wrapper.vm.activeRoomId = 'temp-u1'
      const realRoom = mockRoom({ id: 'real-1', roomId: 'real-1' })
      mocks.$apollo.mutate.mockResolvedValue({
        data: { CreateMessage: { id: 'm1', room: { id: 'real-1' } } },
      })
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [realRoom] } })
      await wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'hi', files: [] })
      expect(wrapper.vm.rooms.some((r) => r.id === 'real-1')).toBe(true)
    })

    it('takes a message sent for sent, though fetching the room fails', async () => {
      wrapper = Wrapper()
      const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
      wrapper.vm.rooms = [virtualRoom]
      wrapper.vm.selectedRoom = virtualRoom
      mocks.$apollo.mutate.mockResolvedValue({
        data: { CreateMessage: { id: 'm1', room: { id: 'real-1' } } },
      })
      mocks.$apollo.query.mockRejectedValue(new Error('Offline'))

      await wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'hi', files: [] })

      expect(wrapper.vm.messages.filter((m) => m.failure)).toEqual([])
      expect(mocks.$toast.error).toHaveBeenCalledWith('Offline')
      expect(mocks.$toast.info).not.toHaveBeenCalled()
    })
  })

  describe('shadow-DOM observers', () => {
    let intersectionInstances, mutationInstances, OriginalIO, OriginalMO

    const fakeEl = () => ({ dataset: {}, style: {} })
    const setShadowRoot = (shadowRoot) => {
      Object.defineProperty(wrapper.vm.$el, 'shadowRoot', {
        configurable: true,
        get: () => shadowRoot,
      })
    }

    beforeEach(() => {
      intersectionInstances = []
      mutationInstances = []
      OriginalIO = global.IntersectionObserver
      OriginalMO = global.MutationObserver
      global.IntersectionObserver = jest.fn(function (callback, options) {
        this.callback = callback
        this.options = options
        this.observe = jest.fn()
        this.unobserve = jest.fn()
        this.disconnect = jest.fn()
        intersectionInstances.push(this)
      })
      global.MutationObserver = jest.fn(function (callback) {
        this.callback = callback
        this.observe = jest.fn()
        this.disconnect = jest.fn()
        mutationInstances.push(this)
      })
    })

    afterEach(() => {
      global.IntersectionObserver = OriginalIO
      global.MutationObserver = OriginalMO
    })

    describe('setupMessageVisibilityTracking', () => {
      it('is a no-op when no shadowRoot is attached', () => {
        wrapper = Wrapper()
        setShadowRoot(null)
        wrapper.vm.setupMessageVisibilityTracking()
        expect(intersectionInstances).toHaveLength(0)
        expect(mutationInstances).toHaveLength(0)
      })

      it('is a no-op when observers are already wired up', () => {
        wrapper = Wrapper()
        setShadowRoot({ querySelector: jest.fn() })
        wrapper.vm._mutationObserver = { existing: true }
        wrapper.vm.setupMessageVisibilityTracking()
        expect(intersectionInstances).toHaveLength(0)
      })

      it('is a no-op when the scroll container is missing', () => {
        wrapper = Wrapper()
        setShadowRoot({ querySelector: jest.fn().mockReturnValue(null) })
        wrapper.vm.setupMessageVisibilityTracking()
        expect(intersectionInstances).toHaveLength(0)
        expect(mutationInstances).toHaveLength(0)
      })

      it('wires up IntersectionObserver and MutationObserver when the scroll container exists', () => {
        wrapper = Wrapper()
        const scrollContainer = { foo: 'bar' }
        setShadowRoot({ querySelector: jest.fn().mockReturnValue(scrollContainer) })
        wrapper.vm.setupMessageVisibilityTracking()
        expect(intersectionInstances).toHaveLength(1)
        expect(intersectionInstances[0].options).toMatchObject({ root: scrollContainer })
        expect(mutationInstances).toHaveLength(1)
        expect(mutationInstances[0].observe).toHaveBeenCalledWith(scrollContainer, {
          childList: true,
          subtree: true,
        })
      })

      it('batches intersecting unseen messages and flushes them via markAsSeen', () => {
        jest.useFakeTimers()
        try {
          wrapper = Wrapper()
          wrapper.vm.selectedRoom = mockRoom()
          wrapper.vm.messages = [{ _id: 'a', id: 'a', seen: false }]
          wrapper.vm.rooms = [mockRoom()]
          wrapper.vm.unseenMessageIds.add('a')
          setShadowRoot({ querySelector: jest.fn().mockReturnValue({}) })
          mocks.$apollo.mutate.mockResolvedValue({ data: { MarkMessagesAsSeen: true } })
          mocks.$apollo.query.mockResolvedValue({ data: { UnreadRooms: 0 } })
          wrapper.vm.setupMessageVisibilityTracking()
          const io = intersectionInstances[0]
          const target = { dataset: { unseenId: 'a' } }
          io.callback([
            { isIntersecting: true, target },
            { isIntersecting: false, target: { dataset: { unseenId: 'skip' } } },
          ])
          expect(io.unobserve).toHaveBeenCalledWith(target)
          expect(wrapper.vm.unseenMessageIds.has('a')).toBe(false)
          jest.advanceTimersByTime(500)
          expect(mocks.$apollo.mutate).toHaveBeenCalledWith(
            expect.objectContaining({ variables: { messageIds: ['a'] } }),
          )
        } finally {
          jest.useRealTimers()
        }
      })

      it('relays MutationObserver fires to observeNewUnseenElements', () => {
        wrapper = Wrapper()
        setShadowRoot({ querySelector: jest.fn().mockReturnValue({}) })
        wrapper.vm.setupMessageVisibilityTracking()
        const spy = jest.spyOn(wrapper.vm, 'observeNewUnseenElements').mockImplementation()
        mutationInstances[0].callback()
        expect(spy).toHaveBeenCalled()
      })
    })

    describe('observeNewUnseenElements', () => {
      it('is a no-op when there are no unseen messages', () => {
        wrapper = Wrapper()
        wrapper.vm._intersectionObserver = { observe: jest.fn() }
        wrapper.vm.observeNewUnseenElements()
        expect(wrapper.vm._intersectionObserver.observe).not.toHaveBeenCalled()
      })

      it('is a no-op when no IntersectionObserver is attached', () => {
        wrapper = Wrapper()
        wrapper.vm.unseenMessageIds.add('x')
        setShadowRoot({ querySelector: jest.fn() })
        expect(() => wrapper.vm.observeNewUnseenElements()).not.toThrow()
      })

      it('is a no-op when shadowRoot is missing', () => {
        wrapper = Wrapper()
        wrapper.vm._intersectionObserver = { observe: jest.fn() }
        wrapper.vm.unseenMessageIds.add('x')
        setShadowRoot(null)
        wrapper.vm.observeNewUnseenElements()
        expect(wrapper.vm._intersectionObserver.observe).not.toHaveBeenCalled()
      })

      it('tags and observes DOM elements for known unseen messages', () => {
        wrapper = Wrapper()
        const observe = jest.fn()
        wrapper.vm._intersectionObserver = { observe }
        wrapper.vm.messages = [{ _id: 'dom-1', id: 'srv-1' }]
        wrapper.vm.unseenMessageIds.add('srv-1')
        wrapper.vm.unseenMessageIds.add('srv-missing')
        const el = fakeEl()
        setShadowRoot({
          querySelector: jest.fn((sel) => (sel === '[id="dom-1"]' ? el : null)),
        })
        wrapper.vm.observeNewUnseenElements()
        expect(el.dataset.unseenId).toBe('srv-1')
        expect(observe).toHaveBeenCalledWith(el)
      })

      it('skips elements that are already tagged', () => {
        wrapper = Wrapper()
        const observe = jest.fn()
        wrapper.vm._intersectionObserver = { observe }
        wrapper.vm.messages = [{ _id: 'dom-1', id: 'srv-1' }]
        wrapper.vm.unseenMessageIds.add('srv-1')
        const el = { dataset: { unseenId: 'already' } }
        setShadowRoot({ querySelector: jest.fn().mockReturnValue(el) })
        wrapper.vm.observeNewUnseenElements()
        expect(observe).not.toHaveBeenCalled()
      })
    })

    describe('searchRooms', () => {
      it('reinitializes the room loader after a search clears a previously exhausted list', async () => {
        wrapper = Wrapper()
        await wrapper.vm.$nextTick()
        // Search result must be a full page so fetchRooms keeps roomsLoaded=false,
        // which is the precondition for the reinit branch in searchRooms.
        const fullPage = Array.from({ length: 10 }, (_, i) =>
          mockRoom({ id: `r-${i}`, roomId: `r-${i}` }),
        )
        mocks.$apollo.query.mockResolvedValue({ data: { Room: fullPage } })
        wrapper.vm.roomsLoaded = true
        const reinit = jest.fn()
        wrapper.vm.reinitRoomLoader = reinit
        await wrapper.vm.searchRooms({ value: 'hello' })
        await wrapper.vm.$nextTick()
        expect(reinit).toHaveBeenCalled()
        expect(wrapper.vm.roomObserverDirty).toBe(false)
      })
    })

    describe('reinitRoomLoader', () => {
      it('is a no-op when no shadowRoot is attached', () => {
        wrapper = Wrapper()
        setShadowRoot(null)
        wrapper.vm.reinitRoomLoader()
        expect(intersectionInstances).toHaveLength(0)
      })

      it('is a no-op when loader or rooms list are missing', () => {
        wrapper = Wrapper()
        setShadowRoot({ querySelector: jest.fn().mockReturnValue(null) })
        wrapper.vm.reinitRoomLoader()
        expect(intersectionInstances).toHaveLength(0)
      })

      it('disconnects the previous observer and wires a fresh one that paginates on intersect', () => {
        wrapper = Wrapper()
        const loader = fakeEl()
        const roomsList = {}
        setShadowRoot({
          querySelector: jest.fn((sel) =>
            sel === '#infinite-loader-rooms' ? loader : sel === '#rooms-list' ? roomsList : null,
          ),
        })
        const previous = { disconnect: jest.fn() }
        wrapper.vm._roomLoaderObserver = previous
        const fetchMoreSpy = jest.spyOn(wrapper.vm, 'fetchMoreRooms').mockImplementation()

        wrapper.vm.reinitRoomLoader()

        expect(previous.disconnect).toHaveBeenCalled()
        expect(loader.style.display).toBe('')
        expect(intersectionInstances).toHaveLength(1)
        expect(intersectionInstances[0].observe).toHaveBeenCalledWith(loader)
        expect(intersectionInstances[0].options).toMatchObject({ root: roomsList })

        wrapper.vm.roomsLoaded = false
        intersectionInstances[0].callback([{ isIntersecting: true }])
        expect(fetchMoreSpy).toHaveBeenCalled()

        fetchMoreSpy.mockClear()
        wrapper.vm.roomsLoaded = true
        intersectionInstances[0].callback([{ isIntersecting: true }])
        expect(fetchMoreSpy).not.toHaveBeenCalled()

        fetchMoreSpy.mockClear()
        intersectionInstances[0].callback([{ isIntersecting: false }])
        expect(fetchMoreSpy).not.toHaveBeenCalled()
      })
    })
  })

  describe('conference chat of a video call', () => {
    const callRoom = (overrides = {}) => ({
      id: 'call-room',
      roomId: 'call-room',
      roomName: 'Yoga',
      avatar: null,
      isGroupRoom: false,
      isCallRoom: true,
      isWritable: true,
      createdAt: '2026-01-01T00:00:00Z',
      lastMessageAt: null,
      unreadCount: 0,
      group: { id: 'g1', slug: 'yoga', name: 'Yoga', avatar: null },
      lastMessage: null,
      users: [{ _id: 'current-user', id: 'current-user', slug: 'me', name: 'Me', avatar: null }],
      ...overrides,
    })

    it('opens the room given by its id', async () => {
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [callRoom()], Message: [] } })
      wrapper = Wrapper({ singleRoom: true, roomId: 'call-room' })
      await flushPromises()
      expect(mocks.$apollo.query.mock.calls[0][0].variables).toEqual({ id: 'call-room' })
      expect(wrapper.vm.rooms.map((r) => r.id)).toEqual(['call-room'])
      expect(wrapper.vm.rooms[0].isCallRoom).toBe(true)
    })

    it('does not take it for the chat of the group it carries', async () => {
      wrapper = Wrapper()
      await flushPromises()
      wrapper.vm.rooms = [wrapper.vm.fixRoomObject(callRoom())]
      mocks.$apollo.query.mockClear()
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [] } })
      await wrapper.vm.newGroupRoom('g1')
      // Not found locally, so the server is asked for the group's own room.
      expect(mocks.$apollo.query.mock.calls[0][0].variables).toEqual({ groupId: 'g1' })
    })

    it('ignores a message for a conference chat that is not open here', async () => {
      wrapper = Wrapper()
      await flushPromises()
      wrapper.vm.rooms = []
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [callRoom()] } })
      await wrapper.vm.chatMessageAdded({
        data: { chatMessageAdded: mockMessage({ room: { id: 'call-room' } }) },
      })
      expect(wrapper.vm.rooms).toEqual([])
    })

    it('asks for such a conference chat only once, not on every message', async () => {
      wrapper = Wrapper()
      await flushPromises()
      wrapper.vm.rooms = []
      mocks.$apollo.query.mockClear()
      mocks.$apollo.query.mockResolvedValue({ data: { Room: [callRoom()] } })
      const message = { data: { chatMessageAdded: mockMessage({ room: { id: 'call-room' } }) } }
      await wrapper.vm.chatMessageAdded(message)
      await wrapper.vm.chatMessageAdded(message)
      expect(mocks.$apollo.query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.rooms).toEqual([])
    })

    describe('"no messages" text of a room opened on its own', () => {
      // The library holds the text back while the rooms are loading.
      it('is not held back for the chat of a group', async () => {
        mocks.$apollo.query.mockResolvedValue({
          data: { Room: [callRoom({ isCallRoom: false, isGroupRoom: true })], Message: [] },
        })
        wrapper = Wrapper({ singleRoom: true, groupId: 'g1' })
        expect(wrapper.vm.loadingRooms).toBe(true)
        await flushPromises()
        expect(wrapper.vm.loadingRooms).toBe(false)
      })

      it('is not held back for a room opened by its id', async () => {
        mocks.$apollo.query.mockResolvedValue({ data: { Room: [callRoom()], Message: [] } })
        wrapper = Wrapper({ singleRoom: true, roomId: 'call-room' })
        await flushPromises()
        expect(wrapper.vm.loadingRooms).toBe(false)
      })
    })

    describe('height in the floating chat window', () => {
      it('gives up the room something above it takes', () => {
        expect(Wrapper({ singleRoom: true }).vm.chatHeight).toBe('calc(100dvh - 190px)')
        expect(Wrapper({ singleRoom: true, reservedHeight: 52 }).vm.chatHeight).toBe(
          'calc(100dvh - 242px)',
        )
      })
    })

    describe('telling whether it holds no message', () => {
      const emitted = () => (wrapper.emitted('empty-change') || []).map(([value]) => value)

      it('says so once every message is loaded and there is none', async () => {
        wrapper = Wrapper()
        wrapper.vm.selectedRoom = mockRoom({ id: 'room-1' })
        wrapper.vm.messages = []
        wrapper.vm.messagesLoaded = true
        await wrapper.vm.$nextTick()
        expect(emitted()).toEqual([true])
      })

      it('does not take "nothing loaded yet" for empty', async () => {
        wrapper = Wrapper()
        wrapper.vm.selectedRoom = mockRoom({ id: 'room-1' })
        wrapper.vm.messages = []
        wrapper.vm.messagesLoaded = false
        await wrapper.vm.$nextTick()
        expect(emitted()).toEqual([])
      })

      it('takes it back when the first message arrives', async () => {
        wrapper = Wrapper()
        wrapper.vm.selectedRoom = mockRoom({ id: 'room-1' })
        wrapper.vm.messagesLoaded = true
        await wrapper.vm.$nextTick()
        wrapper.vm.messages = [mockMessage()]
        await wrapper.vm.$nextTick()
        expect(emitted()).toEqual([true, false])
      })
    })

    const injectedStyles = (propsData) => {
      wrapper = Wrapper(propsData)
      const appended = []
      Object.defineProperty(wrapper.vm.$el, 'shadowRoot', {
        configurable: true,
        value: { appendChild: (style) => appended.push(style.textContent) },
      })
      wrapper.vm._shadowStylesInjected = false
      wrapper.vm.injectShadowStyles()
      return appended.join('')
    }

    describe('input row', () => {
      it("keeps the library's space around the input in the chat page", () => {
        expect(injectedStyles({})).not.toContain('.vac-box-footer')
      })

      it('has less space above and below the input in a chat on its own', () => {
        expect(injectedStyles({ singleRoom: true })).toContain(
          '.vac-box-footer { padding-top: 4px !important; padding-bottom: 4px !important; }',
        )
      })

      it("has an input as high as the call's buttons in a chat on its own", () => {
        expect(injectedStyles({ singleRoom: true })).toContain(
          '.vac-textarea { padding-top: 7px !important; padding-bottom: 7px !important; line-height: 20px !important; }',
        )
        expect(injectedStyles({})).not.toContain('.vac-textarea')
      })
    })

    describe('room header', () => {
      it('is shown by default', () => {
        expect(injectedStyles({})).not.toContain('display: none')
      })

      it('is left out, with the room it reserves, for a host that brings its own', () => {
        const styles = injectedStyles({ hideHeader: true })
        expect(styles).toContain('.vac-room-header { display: none !important; }')
        expect(styles).toContain('.vac-container-scroll { margin-top: 0 !important; }')
      })

      it('follows a host that starts bringing its own while the chat stays', async () => {
        wrapper = Wrapper()
        const live = []
        Object.defineProperty(wrapper.vm.$el, 'shadowRoot', {
          configurable: true,
          value: {
            appendChild: (style) => {
              style.remove = () => live.splice(live.indexOf(style), 1)
              live.push(style)
            },
          },
        })
        // The marks of the drafts in the room list have a stylesheet of their own.
        const main = () => live.filter((style) => style !== wrapper.vm._draftLabelStyle)
        wrapper.vm._shadowStylesInjected = false
        wrapper.vm.injectShadowStyles()
        expect(main()).toHaveLength(1)
        expect(main()[0].textContent).not.toContain('display: none')

        await wrapper.setProps({ hideHeader: true })

        // The earlier styles are replaced, not added to.
        expect(main()).toHaveLength(1)
        expect(main()[0].textContent).toContain('.vac-room-header { display: none !important; }')
      })
    })

    describe('hint above the messages', () => {
      // A real shadow root with the library's message column in it, as the browser has it.
      const withMessageColumn = (propsData) => {
        wrapper = Wrapper(propsData)
        const shadow = wrapper.vm.$el.attachShadow({ mode: 'open' })
        const column = document.createElement('div')
        column.className = 'vac-col-messages'
        shadow.appendChild(column)
        wrapper.vm.renderHint()
        return { shadow, column }
      }
      const hint = 'Visible only to the participants\n(without notifications)'

      it('floats above the messages, with its line breaks kept', () => {
        const { column } = withMessageColumn({ hint, hintKey: 'call' })
        const bubble = column.querySelector('[data-test="chat-hint"]')
        expect(bubble).not.toBeNull()
        expect(bubble.getAttribute('role')).toBe('note')
        expect(bubble.querySelector('.chat-hint__text').textContent).toBe(hint)
      })

      it('takes its text as text, never as markup', () => {
        const { column } = withMessageColumn({ hint: '<b>bold</b>', hintKey: 'x' })
        expect(column.querySelector('b')).toBeNull()
        expect(column.querySelector('.chat-hint__text').textContent).toBe('<b>bold</b>')
      })

      it('goes away with its X, and stays away for that key', async () => {
        const { column } = withMessageColumn({ hint, hintKey: 'call' })
        const close = column.querySelector('[data-test="chat-hint-close"]')
        expect(close.getAttribute('aria-label')).toBe('actions.close')

        close.click()
        await wrapper.vm.$nextTick()

        expect(column.querySelector('[data-test="chat-hint"]')).toBeNull()
        expect(store.state.chat.dismissedHints).toEqual(['call'])

        // Another chat with the same hint: still dismissed.
        const second = withMessageColumn({ hint, hintKey: 'call' })
        expect(second.column.querySelector('[data-test="chat-hint"]')).toBeNull()
      })

      it('is shown in a chat whose hint has another key', () => {
        store.state.chat.dismissedHints = ['call']
        const { column } = withMessageColumn({ hint, hintKey: 'group' })
        expect(column.querySelector('[data-test="chat-hint"]')).not.toBeNull()
      })

      it('is not there in a chat without a hint', () => {
        const { column } = withMessageColumn({})
        expect(column.querySelector('[data-test="chat-hint"]')).toBeNull()
      })

      it('is put back into a message column drawn anew, once only', () => {
        const { shadow, column } = withMessageColumn({ hint, hintKey: 'call' })
        column.remove()
        const redrawn = document.createElement('div')
        redrawn.className = 'vac-col-messages'
        shadow.appendChild(redrawn)

        wrapper.vm.renderHint()
        wrapper.vm.renderHint()

        expect(redrawn.querySelectorAll('[data-test="chat-hint"]')).toHaveLength(1)
      })

      it('sits at the top where the host brings its own header, below the built-in one otherwise', () => {
        const styles = (propsData) => {
          wrapper = Wrapper(propsData)
          const appended = []
          Object.defineProperty(wrapper.vm.$el, 'shadowRoot', {
            configurable: true,
            value: { appendChild: (style) => appended.push(style.textContent) },
          })
          wrapper.vm._shadowStylesInjected = false
          wrapper.vm.injectShadowStyles()
          return appended.join('')
        }
        expect(styles({ hideHeader: true })).toMatch(/\.chat-hint \{[^}]*top: 8px/)
        expect(styles({})).toMatch(/\.chat-hint \{[^}]*top: 68px/)
      })
    })

    describe('cursor in the message field on opening a room', () => {
      const openRoomWith = async (propsData) => {
        wrapper = Wrapper(propsData)
        await flushPromises()
        const focus = jest.fn()
        Object.defineProperty(wrapper.vm.$el, 'shadowRoot', {
          configurable: true,
          value: {
            activeElement: null,
            querySelector: (selector) => (selector === 'textarea#roomTextarea' ? { focus } : null),
            appendChild: jest.fn(),
          },
        })
        await wrapper.vm.fetchMessages({ room: mockRoom() })
        await flushPromises()
        return focus
      }

      it('is set by default', async () => {
        const focus = await openRoomWith({})
        expect(focus).toHaveBeenCalled()
      })

      it('is left alone where the keyboard would be in the way', async () => {
        const focus = await openRoomWith({ autoFocus: false })
        expect(focus).not.toHaveBeenCalled()
      })
    })

    it('says in the title which of the two chats it is', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = wrapper.vm.fixRoomObject(callRoom())
      expect(wrapper.vm.selectedRoomTitle).toBe('chat.callRoomName')
      expect(mocks.$t).toHaveBeenCalledWith('chat.callRoomName', { name: 'Yoga' })
    })

    it('keeps the plain name for every other room', () => {
      wrapper = Wrapper()
      wrapper.vm.selectedRoom = mockRoom()
      expect(wrapper.vm.selectedRoomTitle).toBe('Test Room')
    })

    it('is read-only once the call is over', () => {
      wrapper = Wrapper()
      expect(wrapper.vm.selectedRoomWritable).toBe(true)
      wrapper.vm.selectedRoom = wrapper.vm.fixRoomObject(callRoom())
      expect(wrapper.vm.selectedRoomWritable).toBe(true)
      wrapper.vm.selectedRoom = wrapper.vm.fixRoomObject(callRoom({ isWritable: false }))
      expect(wrapper.vm.selectedRoomWritable).toBe(false)
    })

    describe('export', () => {
      it('fetches every message, page by page, oldest first', async () => {
        wrapper = Wrapper()
        await flushPromises()
        const page = (from, count) =>
          Array.from({ length: count }, (_, i) =>
            mockMessage({ id: `m${from + i}`, _id: `m${from + i}`, indexId: from + i }),
          )
        mocks.$apollo.query.mockReset()
        mocks.$apollo.query
          .mockResolvedValueOnce({ data: { Message: page(30, 100) } })
          .mockResolvedValueOnce({ data: { Message: page(0, 30) } })
        const all = await wrapper.vm.fetchAllMessages('call-room')
        expect(mocks.$apollo.query.mock.calls.map(([arg]) => arg.variables)).toEqual([
          { roomId: 'call-room', first: 100 },
          { roomId: 'call-room', first: 100, beforeIndex: 30 },
        ])
        expect(all.map((m) => m.indexId)).toEqual(Array.from({ length: 130 }, (_, i) => i))
      })

      it('writes one line per message, and one per attachment', () => {
        wrapper = Wrapper()
        const text = wrapper.vm.buildExportText({ roomName: 'Yoga' }, [
          mockMessage({ username: 'Anna', content: ' Hello ' }),
          mockMessage({
            username: 'Ben',
            content: '',
            files: [{ name: 'plan', extension: 'pdf' }, { name: 'notes' }],
          }),
        ])
        const lines = text.split('\n')
        expect(lines[0]).toBe('chat.export.title')
        expect(lines[1]).toBe('chat.export.savedAt')
        expect(lines[2]).toBe('')
        expect(lines[3]).toMatch(/^\[.+\] Anna: Hello$/)
        expect(lines[4]).toMatch(/^\[.+\] Ben:$/)
        expect(lines[5]).toBe('    chat.export.attachment: plan.pdf')
        expect(lines[6]).toBe('    chat.export.attachment: notes')
        expect(mocks.$t).toHaveBeenCalledWith('chat.export.title', { name: 'Yoga' })
      })

      it('writes mentions as names, of those who left the room too', () => {
        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom()]
        const text = wrapper.vm.buildExportText({ id: 'room-1', roomName: 'Yoga' }, [
          mockMessage({ senderId: 'anna', username: 'Anna', content: 'Hi' }),
          mockMessage({
            username: 'Ben',
            content:
              'To <usertag>other-user</usertag>, <usertag>anna</usertag> and <usertag>ghost</usertag>',
          }),
        ])

        expect(text.split('\n')[4]).toMatch(
          /^\[.+\] Ben: To @Other, @Anna and <usertag>ghost<\/usertag>$/,
        )
      })

      it('heads the file with the start of the call and the moment it is saved', () => {
        wrapper = Wrapper()
        const text = wrapper.vm.buildExportText(
          { roomName: 'Yoga', createdAt: '2026-10-14T12:03:00Z' },
          [mockMessage({ username: 'Anna', content: 'Hello' })],
        )
        const lines = text.split('\n')
        expect(lines.slice(0, 4)).toEqual([
          'chat.export.title',
          'chat.export.callStarted',
          'chat.export.savedAt',
          '',
        ])
        expect(mocks.$t).toHaveBeenCalledWith('chat.export.callStarted', {
          date: new Date('2026-10-14T12:03:00Z').toLocaleString('en-US'),
        })
      })

      it('says so in the file when the chat has no message', () => {
        wrapper = Wrapper()
        const text = wrapper.vm.buildExportText(
          { roomName: 'Yoga', createdAt: '2026-10-14T12:03:00Z' },
          [],
        )
        expect(text.split('\n').slice(4)).toEqual(['chat.messagesEmpty', ''])
      })

      it('indents the further lines of a message written over several', () => {
        wrapper = Wrapper()
        const text = wrapper.vm.buildExportText({ roomName: 'Yoga' }, [
          mockMessage({ username: 'Anna', content: 'First line\nsecond line\r\nthird line' }),
          mockMessage({ username: 'Ben', content: 'Next message' }),
        ])
        const lines = text.split('\n')
        expect(lines[3]).toMatch(/^\[.+\] Anna: First line$/)
        expect(lines[4]).toBe('    second line')
        expect(lines[5]).toBe('    third line')
        // Only a new message starts at the beginning of a line.
        expect(lines[6]).toMatch(/^\[.+\] Ben: Next message$/)
      })

      it('hands the text to the browser as a file', async () => {
        wrapper = Wrapper()
        await flushPromises()
        wrapper.vm.selectedRoom = wrapper.vm.fixRoomObject(callRoom())
        mocks.$apollo.query.mockResolvedValue({ data: { Message: [mockMessage()] } })
        const createObjectURL = jest.fn(() => 'blob:export')
        const revokeObjectURL = jest.fn()
        const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }
        URL.createObjectURL = createObjectURL
        URL.revokeObjectURL = revokeObjectURL
        const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
        jest.useFakeTimers()
        try {
          await wrapper.vm.exportRoom()
          expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
          expect(click).toHaveBeenCalledTimes(1)
          // The blob is kept until the browser has had time to start the download …
          expect(revokeObjectURL).not.toHaveBeenCalled()
          jest.runOnlyPendingTimers()
          // … and released then.
          expect(click.mock.instances[0].download).toMatch(/^chat_Yoga_\d{4}-\d\d-\d\d_.+\.txt$/)
          expect(revokeObjectURL).toHaveBeenCalledWith('blob:export')
          expect(wrapper.vm.exporting).toBe(false)
        } finally {
          jest.useRealTimers()
          click.mockRestore()
          URL.createObjectURL = original.create
          URL.revokeObjectURL = original.revoke
        }
      })

      describe('file name', () => {
        // Local time, so the expectation holds in whatever zone the tests run.
        const at = (day, hours, minutes) => new Date(2026, 9, day, hours, minutes)

        it('names the group and the span from the start of the chat to the saving', () => {
          wrapper = Wrapper()
          const name = wrapper.vm.exportFileName(
            { roomName: 'Yoga', createdAt: at(12, 14, 3).toISOString() },
            at(12, 15, 10),
          )
          expect(name).toBe('chat_Yoga_2026-10-12_14-03--15-10.txt')
        })

        it('repeats the day when the chat ran past midnight', () => {
          wrapper = Wrapper()
          const name = wrapper.vm.exportFileName(
            { roomName: 'Yoga', createdAt: at(12, 23, 50).toISOString() },
            at(13, 0, 20),
          )
          expect(name).toBe('chat_Yoga_2026-10-12_23-50--2026-10-13_00-20.txt')
        })

        it('keeps the group name to characters a file name takes', () => {
          wrapper = Wrapper()
          const name = wrapper.vm.exportFileName(
            { roomName: ' Yoga / Köln: "Anfänger"? ', createdAt: at(12, 14, 3).toISOString() },
            at(12, 15, 10),
          )
          expect(name).toBe('chat_Yoga-Köln-Anfänger_2026-10-12_14-03--15-10.txt')
        })

        it('does without a name the room does not have', () => {
          wrapper = Wrapper()
          const name = wrapper.vm.exportFileName(
            { roomName: '', createdAt: at(12, 14, 3).toISOString() },
            at(12, 15, 10),
          )
          expect(name).toBe('chat_2026-10-12_14-03--15-10.txt')
        })
      })

      it('reports a failure and is ready for another try', async () => {
        wrapper = Wrapper()
        await flushPromises()
        wrapper.vm.selectedRoom = wrapper.vm.fixRoomObject(callRoom())
        mocks.$apollo.query.mockRejectedValue(new Error('offline'))
        await wrapper.vm.exportRoom()
        expect(mocks.$toast.error).toHaveBeenCalled()
        expect(wrapper.vm.exporting).toBe(false)
      })
    })
  })

  describe('draft of a message not sent yet', () => {
    const draftSaves = () =>
      mocks.$apollo.mutate.mock.calls
        .map(([options]) => options.variables)
        .filter((variables) => 'text' in variables)

    beforeEach(() => {
      jest.useFakeTimers()
      wrapper = Wrapper()
      wrapper.vm.rooms = [
        mockRoom(),
        mockRoom({ id: 'room-2', roomId: 'room-2', draft: 'Kept before' }),
      ]
      wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('is kept once typing rests', () => {
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Hal' })
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Half a thought' })
      expect(draftSaves()).toEqual([])

      jest.advanceTimersByTime(1000)

      expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Half a thought' }])
    })

    it('is not saved again when it is what the room holds already', () => {
      wrapper.vm.draftTyped({ roomId: 'room-2', message: 'Kept before' })

      jest.advanceTimersByTime(1000)

      expect(draftSaves()).toEqual([])
    })

    it('is taken away when the field is emptied', () => {
      wrapper.vm.selectedRoom = wrapper.vm.rooms[1]
      wrapper.vm.draftTyped({ roomId: 'room-2', message: null })

      jest.advanceTimersByTime(1000)

      expect(draftSaves()).toEqual([{ roomId: 'room-2', text: '' }])
    })

    it('is not kept in a chat that takes no more messages', () => {
      wrapper.vm.selectedRoom = mockRoom({ isWritable: false })
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Too late' })

      jest.advanceTimersByTime(1000)

      expect(draftSaves()).toEqual([])
    })

    it('opens the room of a direct conversation begun here, by its user', () => {
      const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
      wrapper.vm.rooms = [virtualRoom]
      wrapper.vm.selectedRoom = virtualRoom

      wrapper.vm.draftTyped({ roomId: 'temp-u1', message: 'Dear you' })
      jest.advanceTimersByTime(1000)

      expect(draftSaves()).toEqual([{ userId: 'u1', text: 'Dear you' }])
    })

    describe('on opening another room', () => {
      it('keeps what was typed in the room left at once', async () => {
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Left behind' })

        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[1] })

        expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Left behind' }])
      })

      it("puts the room's own draft into the message field", async () => {
        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[1] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.roomMessage).toBe('Kept before')
      })

      it('takes the draft kept here over the one the room came with', async () => {
        wrapper.vm.selectedRoom = wrapper.vm.rooms[1]
        wrapper.vm.draftTyped({ roomId: 'room-2', message: 'Newer' })
        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[0] })

        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[1] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.roomMessage).toBe('Newer')
      })

      it("does not hand the room's draft on to the rooms opened later", async () => {
        wrapper.vm._field = fakeField('room-2')
        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[1] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.roomMessage).toBe('Kept before')

        // Once the field shows the room, it holds the draft: the library would put a
        // `room-message` left over into the field of the next room, and report it typed there.
        jest.advanceTimersByTime(0)

        expect(wrapper.vm._fieldRoom).toBe('room-2')
        expect(wrapper.vm.roomMessage).toBeNull()
      })

      it('empties the message field for a room without a draft', async () => {
        wrapper.vm.selectedRoom = wrapper.vm.rooms[1]
        wrapper.vm.roomMessage = 'Kept before'

        await wrapper.vm.fetchMessages({ room: wrapper.vm.rooms[0] })
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.roomMessage).toBeNull()
      })
    })

    it('is kept when the chat is taken down', () => {
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Before the list opened' })

      wrapper.destroy()

      expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Before the list opened' }])
    })

    it('is kept when the page is left', () => {
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Before reloading' })

      window.dispatchEvent(new Event('pagehide'))

      expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Before reloading' }])
      // Finished by the browser after the page is gone.
      expect(mocks.$apollo.mutate.mock.calls[0][0].context).toEqual({
        fetchOptions: { keepalive: true },
      })
    })

    it('goes out as an ordinary request while the page stays', () => {
      wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Staying' })

      jest.advanceTimersByTime(1000)

      expect(mocks.$apollo.mutate.mock.calls[0][0].context).toBeUndefined()
    })

    describe('when saving it fails', () => {
      const flush = async () => {
        for (let i = 0; i < 10; i++) await Promise.resolve()
      }

      it('is saved again on leaving, until it is kept', async () => {
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Not lost' })
        jest.advanceTimersByTime(1000)
        await flush()

        wrapper.vm.keepAllDrafts()
        await flush()
        wrapper.vm.keepAllDrafts()

        expect(draftSaves()).toEqual([
          { roomId: 'room-1', text: 'Not lost' },
          { roomId: 'room-1', text: 'Not lost' },
        ])
      })

      it('is not saved again once a newer text was asked for', async () => {
        let fail
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve, reject) => (fail = () => reject(new Error('Offline')))),
        )
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Older' })
        jest.advanceTimersByTime(1000)
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Newer' })
        jest.advanceTimersByTime(1000)
        fail()
        await flush()

        wrapper.vm.keepAllDrafts()

        expect(draftSaves()).toEqual([
          { roomId: 'room-1', text: 'Older' },
          { roomId: 'room-1', text: 'Newer' },
        ])
      })

      it('outlives the chat closed meanwhile, shown and saved again when it opens anew', async () => {
        let fail
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve, reject) => (fail = () => reject(new Error('Offline')))),
        )
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Still there' })
        jest.advanceTimersByTime(1000)
        wrapper.destroy()
        fail()
        await flush()
        mocks.$apollo.mutate.mockClear()

        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom()]

        expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Still there' }])
        expect(wrapper.vm.draftOf('room-1')).toBe('Still there')
      })

      it('does not take the place of what a chat opened anew saved since', async () => {
        let fail
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve, reject) => (fail = () => reject(new Error('Offline')))),
        )
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Old' })
        jest.advanceTimersByTime(1000)
        wrapper.destroy()

        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom()]
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'New' })
        jest.advanceTimersByTime(1000)
        await flush()
        fail()
        await flush()
        mocks.$apollo.mutate.mockClear()

        wrapper.vm.keepAllDrafts()

        expect(draftSaves()).toEqual([])
        expect(wrapper.vm.draftOf('room-1')).toBe('New')
      })

      it('is not saved again once the message was sent', async () => {
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Sent after all' })
        jest.advanceTimersByTime(1000)
        await flush()
        global.URL.createObjectURL = jest.fn(() => 'blob:local')
        mocks.$apollo.mutate.mockResolvedValue({
          data: { CreateMessage: { id: 'sent-1', content: 'Sent after all' } },
        })
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Sent after all' })
        delete global.URL.createObjectURL
        mocks.$apollo.mutate.mockClear()

        wrapper.vm.keepAllDrafts()

        expect(draftSaves()).toEqual([])
        // Acknowledged: the message shown is the one the server created.
        const last = wrapper.vm.messages[wrapper.vm.messages.length - 1]
        expect(last).toMatchObject({ content: 'Sent after all', isUploading: false })
        expect(last.failure).toBeFalsy()
        expect(wrapper.vm._localToServerIds['sent-1']).toBe(last._id)
      })

      it("waits for a save of a chat replaced meanwhile, like a call's chat", async () => {
        let saved
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve) => (saved = () => resolve({ data: {} }))),
        )
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Old' })
        jest.advanceTimersByTime(1000)
        wrapper.destroy()
        mocks.$apollo.mutate.mockClear()

        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom()]
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'New' })
        jest.advanceTimersByTime(1000)
        await flush()

        expect(draftSaves()).toEqual([])

        saved()
        await flush()

        expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'New' }])
      })
    })

    describe('when the page is left with a save under way', () => {
      let saved

      beforeEach(() => {
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve) => (saved = () => resolve({ data: {} }))),
        )
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Under way' })
        jest.advanceTimersByTime(1000)
      })

      const keepalives = () =>
        mocks.$apollo.mutate.mock.calls
          .filter(([options]) => options.context?.fetchOptions?.keepalive)
          .map(([options]) => options.variables.text)

      it('sends a newer text at once, not behind it', () => {
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Newer' })

        window.dispatchEvent(new Event('pagehide'))

        expect(keepalives()).toEqual(['Newer'])
        saved()
      })

      it('sends the text under way again, as its request may be cut off', () => {
        window.dispatchEvent(new Event('pagehide'))

        expect(keepalives()).toEqual(['Under way'])
        saved()
      })

      it('sends nothing again once that save is through', async () => {
        saved()
        for (let i = 0; i < 10; i++) await Promise.resolve()

        window.dispatchEvent(new Event('pagehide'))

        expect(keepalives()).toEqual([])
      })

      it('sends the latest text again, though an earlier save of the same text is through', async () => {
        mocks.$apollo.mutate.mockImplementationOnce(() => new Promise(() => {}))
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Between' })
        jest.advanceTimersByTime(1000)
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Under way' })
        jest.advanceTimersByTime(1000)
        saved()
        for (let i = 0; i < 10; i++) await Promise.resolve()

        window.dispatchEvent(new Event('pagehide'))

        expect(keepalives()).toEqual(['Under way'])
      })
    })

    describe('on sending', () => {
      it('waits for a save still under way, and saves no draft afterwards', async () => {
        let saved
        const order = []
        mocks.$apollo.mutate.mockImplementation(({ variables }) => {
          if ('text' in variables) {
            return new Promise((resolve) => {
              saved = () => {
                order.push('draft')
                resolve({ data: {} })
              }
            })
          }
          order.push('message')
          return Promise.resolve({ data: { CreateMessage: null } })
        })
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Hello' })
        jest.advanceTimersByTime(1000)

        const sending = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
        // The library reports the field emptied right after sending.
        wrapper.vm.draftTyped({ roomId: 'room-1', message: null })
        await Promise.resolve()
        expect(order).toEqual([])
        saved()
        await sending
        jest.advanceTimersByTime(1000)

        expect(order).toEqual(['draft', 'message'])
        expect(draftSaves()).toEqual([{ roomId: 'room-1', text: 'Hello' }])
      })

      it('lets a draft typed meanwhile wait for it, as ending the draft would take it away', async () => {
        let created
        const order = []
        mocks.$apollo.mutate.mockImplementation(({ variables }) => {
          if ('content' in variables) {
            return new Promise((resolve) => {
              created = () => {
                order.push('message')
                resolve({ data: { CreateMessage: null } })
              }
            })
          }
          order.push(`draft ${variables.text}`)
          return Promise.resolve({ data: {} })
        })
        const settle = async () => {
          for (let i = 0; i < 10; i++) await Promise.resolve()
        }
        await settle()

        const sending = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Sent' })
        await settle()
        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Typed meanwhile' })
        jest.advanceTimersByTime(1000)
        await settle()

        expect(order).toEqual([])

        created()
        await sending
        await settle()

        expect(order).toEqual(['message', 'draft Typed meanwhile'])
      })
    })

    describe('when sending fails', () => {
      const sent = () =>
        mocks.$apollo.mutate.mock.calls
          .map(([options]) => options.variables)
          .filter((variables) => 'content' in variables)

      beforeEach(() => {
        global.URL.createObjectURL = jest.fn(() => 'blob:local')
        mocks.$apollo.mutate.mockImplementation(({ variables }) =>
          'content' in variables
            ? Promise.reject(new Error('Offline'))
            : Promise.resolve({ data: {} }),
        )
      })

      afterEach(() => {
        delete global.URL.createObjectURL
      })

      it('stays in the list, marked as failed', async () => {
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })

        expect(wrapper.vm.messages[wrapper.vm.messages.length - 1]).toMatchObject({
          content: 'Hello',
          failure: true,
          isUploading: false,
        })
        expect(mocks.$toast.error).toHaveBeenCalledWith('Offline')
        expect(mocks.$toast.info).toHaveBeenCalledWith('chat.notSent')
      })

      it('stays last when more messages come in', async () => {
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })

        wrapper.vm.mergeMessages([mockMessage({ id: 'msg-5', indexId: 5 })])

        expect(wrapper.vm.messages.map((m) => m.failure || m.id)).toEqual(['msg-5', true])
      })

      it('goes with a direct conversation begun here to the room it gets', async () => {
        const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
        wrapper.vm.rooms = [mockRoom(), virtualRoom]
        wrapper.vm.selectedRoom = virtualRoom
        await wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'Failed' })
        mocks.$apollo.mutate.mockResolvedValue({
          data: { CreateMessage: { id: 'm1', room: { id: 'real-1' } } },
        })
        mocks.$apollo.query.mockResolvedValue({
          data: { Room: [mockRoom({ id: 'real-1', roomId: 'real-1' })], Message: [] },
        })

        await wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'Sent' })

        const [unsent] = Object.values(wrapper.vm._unsent)
        expect(unsent.roomId).toBe('real-1')
        expect(unsent.details.roomId).toBe('real-1')
        expect(unsent.message.content).toBe('Failed')
      })

      it('goes to the room a direct conversation got, when it fails only after that', async () => {
        const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
        wrapper.vm.rooms = [mockRoom(), virtualRoom]
        wrapper.vm.selectedRoom = virtualRoom
        let fail
        mocks.$apollo.mutate.mockImplementation(({ variables }) =>
          variables.content === 'Failed later'
            ? new Promise((resolve, reject) => (fail = () => reject(new Error('Offline'))))
            : Promise.resolve({ data: { CreateMessage: { id: 'm1', room: { id: 'real-1' } } } }),
        )
        mocks.$apollo.query.mockResolvedValue({
          data: { Room: [mockRoom({ id: 'real-1', roomId: 'real-1' })], Message: [] },
        })
        // Sent one after the other: the second is under way when the first got the room.
        const sending = wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'Sent' })
        const failing = wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'Failed later' })
        await sending
        for (let i = 0; i < 10; i++) await Promise.resolve()

        fail()
        await failing

        const [unsent] = Object.values(wrapper.vm._unsent)
        expect(unsent.roomId).toBe('real-1')
        expect(unsent.details.roomId).toBe('real-1')
        expect(unsent.message.roomId).toBe('real-1')
      })

      it('is there again in a direct conversation begun here, left and opened again', async () => {
        const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
        wrapper.vm.rooms = [mockRoom(), virtualRoom]
        wrapper.vm.selectedRoom = virtualRoom
        await wrapper.vm.sendMessage({ roomId: 'temp-u1', content: 'Hello' })
        mocks.$apollo.query.mockResolvedValue({ data: { Message: [] } })

        // Sending moved the conversation to the top of the list.
        const other = wrapper.vm.rooms.find((room) => room.id === 'room-1')
        await wrapper.vm.fetchMessages({ room: other })

        expect(wrapper.vm.messages).toEqual([])

        await wrapper.vm.fetchMessages({ room: virtualRoom })

        expect(wrapper.vm.messages).toEqual([
          expect.objectContaining({ content: 'Hello', failure: true }),
        ])
      })

      it('is sent again by a click on its mark, leaving the draft written since', async () => {
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
        const failed = wrapper.vm.messages[wrapper.vm.messages.length - 1]
        wrapper.vm.drafts = { 'room-1': 'Written since' }
        mocks.$apollo.mutate.mockResolvedValue({ data: { CreateMessage: null } })

        await wrapper.vm.sendAgain({ message: failed })

        expect(sent()[1]).toEqual({ roomId: 'room-1', content: 'Hello', endsDraft: false })
        expect(wrapper.vm.messages.filter((m) => m.failure)).toEqual([])
        expect(wrapper.vm.draftOf('room-1')).toBe('Written since')
      })

      it('is sent again once only', async () => {
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
        const failed = wrapper.vm.messages[wrapper.vm.messages.length - 1]
        mocks.$apollo.mutate.mockResolvedValue({ data: { CreateMessage: null } })

        await wrapper.vm.sendAgain({ message: failed })
        await wrapper.vm.sendAgain({ message: failed })
        wrapper.vm.sendAgain()

        expect(sent()).toHaveLength(2)
      })

      it('keeps its files, those of the draft too', async () => {
        const blob = new Blob(['x'], { type: 'text/plain' })
        const files = [
          { name: 'kept', extension: 'txt', type: 'text/plain', draftUrl: 'https://s3/kept.txt' },
          { name: 'fresh', extension: 'txt', type: 'text/plain', blob },
        ]
        await wrapper.vm.sendMessage({ roomId: 'room-1', content: '', files })
        const failed = wrapper.vm.messages[wrapper.vm.messages.length - 1]
        mocks.$apollo.mutate.mockResolvedValue({ data: { CreateMessage: null } })

        await wrapper.vm.sendAgain({ message: failed })

        expect(failed.files.map((file) => file.url)).toEqual(['https://s3/kept.txt', 'blob:local'])
        expect(sent()[1]).toMatchObject({
          draftFiles: ['https://s3/kept.txt'],
          files: [{ name: 'fresh', extension: 'txt', type: 'text/plain' }],
        })
      })
    })

    // vue-advanced-chat keeps the mentions picked and the files attached inside its field;
    // `field` stands in for that inside (messageField.js).
    const fakeField = (roomId, { files = [], mentioned = [] } = {}) => ({
      isUnmounted: false,
      roomId,
      files,
      mentioned,
      watch: jest.fn(),
    })
    const other = { _id: 'other-user', id: 'other-user', username: 'Other' }
    const settle = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve()
    }

    describe('with mentions', () => {
      it('keeps the people picked as the tags the library sends', () => {
        wrapper.vm._field = fakeField('room-1', { mentioned: [other] })

        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Hi @Other and @Other' })
        jest.advanceTimersByTime(1000)

        expect(draftSaves()).toEqual([
          { roomId: 'room-1', text: 'Hi <usertag>other-user</usertag> and @Other' },
        ])
      })

      it('puts them back into the field, picked again', async () => {
        wrapper.vm.rooms = [mockRoom({ draft: 'Hi <usertag>other-user</usertag>' })]
        const field = fakeField('room-1')
        wrapper.vm._field = field

        wrapper.vm.showDraftOf('room-1')
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.roomMessage).toBe('Hi @Other')

        jest.advanceTimersByTime(0)

        expect(field.mentioned).toEqual([expect.objectContaining({ _id: 'other-user' })])
      })

      it('keeps one picked from the list, with nothing typed after it', () => {
        const field = fakeField('room-1', { mentioned: [other] })
        field.message = '@Other '
        wrapper.vm._fieldRoom = 'room-1'

        wrapper.vm.draftTextChanged(field)
        jest.advanceTimersByTime(1000)

        expect(draftSaves()).toEqual([{ roomId: 'room-1', text: '<usertag>other-user</usertag> ' }])
      })

      it('take no notice of the field emptied for another room', () => {
        const field = fakeField('room-1')
        field.message = ''
        wrapper.vm._fieldRoom = 'room-2'

        wrapper.vm.draftTextChanged(field)
        jest.advanceTimersByTime(1000)

        expect(draftSaves()).toEqual([])
      })

      it('are not saved again when nothing changed', () => {
        wrapper.vm.rooms = [mockRoom({ draft: 'Hi <usertag>other-user</usertag>' })]
        wrapper.vm._field = fakeField('room-1', { mentioned: [other] })

        wrapper.vm.draftTyped({ roomId: 'room-1', message: 'Hi @Other' })
        jest.advanceTimersByTime(1000)

        expect(draftSaves()).toEqual([])
      })

      it('leave the tag of somebody not in the room as it is', () => {
        expect(wrapper.vm.untagged('room-1', 'Hi <usertag>ghost</usertag>')).toEqual({
          text: 'Hi <usertag>ghost</usertag>',
          mentioned: [],
        })
      })
    })

    describe('with files', () => {
      const added = (name) => ({
        url: `https://s3/${name}.txt`,
        name,
        extension: 'txt',
        type: 'text/plain',
      })
      const fileSaves = () =>
        mocks.$apollo.mutate.mock.calls
          .map(([options]) => options.variables)
          .filter((variables) => 'file' in variables || 'url' in variables)
      let field

      beforeEach(() => {
        field = fakeField('room-1')
        wrapper.vm._field = field
        wrapper.vm._fieldRoom = 'room-1'
        mocks.$apollo.mutate.mockImplementation(({ variables }) =>
          Promise.resolve({
            data: 'file' in variables ? { AddRoomDraftFile: added(variables.file.name) } : {},
          }),
        )
      })

      it('uploads a file attached, once it has loaded', async () => {
        const file = { name: 'notes', extension: 'txt', type: 'text/plain', loading: true }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)

        expect(fileSaves()).toEqual([])

        file.blob = new Blob(['x'], { type: 'text/plain' })
        delete file.loading
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(fileSaves()).toEqual([
          {
            roomId: 'room-1',
            file: {
              upload: expect.any(File),
              name: 'notes',
              extension: 'txt',
              type: 'text/plain',
            },
          },
        ])
        expect(fileSaves()[0].file.upload.name).toBe('notes.txt')
        expect(file.draftUrl).toBe('https://s3/notes.txt')
        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([added('notes')])
      })

      it('uploads it once, however often the field changes meanwhile', async () => {
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(fileSaves()).toHaveLength(1)
      })

      it('removes a file taken out of the field', () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]

        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)

        expect(fileSaves()).toEqual([{ roomId: 'room-1', url: 'https://s3/old.txt' }])
        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([])
      })

      it('removes a file again whose removal failed, not shown meanwhile', async () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([])

        wrapper.vm.keepAllDrafts()
        await settle()
        wrapper.vm.keepAllDrafts()
        await settle()

        expect(fileSaves()).toEqual([
          { roomId: 'room-1', url: 'https://s3/old.txt' },
          { roomId: 'room-1', url: 'https://s3/old.txt' },
        ])
      })

      it('removes a file again whose removal failed after the chat closed, in a chat opened anew', async () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        let fail
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve, reject) => (fail = () => reject(new Error('Offline')))),
        )
        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)
        wrapper.destroy()
        fail()
        await settle()
        mocks.$apollo.mutate.mockClear()

        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        await settle()

        expect(fileSaves()).toEqual([{ roomId: 'room-1', url: 'https://s3/old.txt' }])
        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([])
      })

      it('does not show a file whose removal is under way, nor ask for it twice', async () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old'), added('kept')] })]
        let removed
        mocks.$apollo.mutate.mockImplementationOnce(
          () => new Promise((resolve) => (removed = () => resolve({ data: {} }))),
        )
        wrapper.vm.draftFilesChanged(field, [{ ...added('kept'), draftUrl: 'https://s3/kept.txt' }])
        jest.advanceTimersByTime(1000)
        delete wrapper.vm.draftFiles['room-1']
        wrapper.vm.keepAllDrafts()

        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([added('kept')])
        expect(fileSaves()).toHaveLength(1)

        removed()
        await settle()

        wrapper.vm.keepAllDrafts()
        await settle()

        expect(fileSaves()).toHaveLength(1)
      })

      it('removes a file again whose removal failed with the next change of the field', async () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)
        await settle()

        const file = { name: 'new', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(fileSaves()).toEqual([
          { roomId: 'room-1', url: 'https://s3/old.txt' },
          { roomId: 'room-1', url: 'https://s3/old.txt' },
          expect.objectContaining({ file: expect.objectContaining({ name: 'new' }) }),
        ])
      })

      it('sent while uploaded for the draft are not taken out of it by the field emptied after', async () => {
        global.URL.createObjectURL = jest.fn(() => 'blob:local')
        let uploaded
        mocks.$apollo.mutate.mockImplementation(({ variables }) =>
          'file' in variables
            ? new Promise((resolve) => {
                uploaded = () => resolve({ data: { AddRoomDraftFile: added('notes') } })
              })
            : Promise.resolve({ data: {} }),
        )
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        const sending = wrapper.vm.sendMessage({ roomId: 'room-1', content: 'See', files: [file] })
        // The library empties the field after sending.
        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)
        uploaded()
        await sending
        await settle()

        const variables = mocks.$apollo.mutate.mock.calls.map(([options]) => options.variables)
        const message = variables.find((v) => 'content' in v)
        expect(message).toMatchObject({ draftFiles: ['https://s3/notes.txt'] })
        expect(message.files).toBeUndefined()
        expect(variables.filter((v) => 'url' in v)).toEqual([])
        delete global.URL.createObjectURL
      })

      it('removes a file taken out while it was uploaded', async () => {
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        wrapper.vm.draftFilesChanged(field, [])
        await settle()

        expect(fileSaves()).toEqual([
          expect.objectContaining({ file: expect.anything() }),
          { roomId: 'room-1', url: 'https://s3/notes.txt' },
        ])
      })

      it('lets an upload that failed try again', async () => {
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(fileSaves()).toHaveLength(2)
        expect(file.draftUrl).toBe('https://s3/notes.txt')
      })

      it('tries an upload that failed again when the chat closes, without another change', async () => {
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()

        wrapper.destroy()
        await settle()

        expect(fileSaves()).toHaveLength(2)
      })

      it('does not try again a file taken out of the field meanwhile', async () => {
        mocks.$apollo.mutate.mockRejectedValueOnce(new Error('Offline'))
        const file = { name: 'notes', type: 'text/plain', blob: new Blob(['x']) }
        wrapper.vm.draftFilesChanged(field, [file])
        jest.advanceTimersByTime(1000)
        await settle()
        wrapper.vm.draftFilesChanged(field, [])

        wrapper.destroy()
        await settle()

        expect(fileSaves()).toHaveLength(1)
      })

      it('takes no notice of the field emptied for another room', () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        wrapper.vm._fieldRoom = 'room-2'

        wrapper.vm.draftFilesChanged(field, [])
        jest.advanceTimersByTime(1000)

        expect(fileSaves()).toEqual([])
      })

      it('are put back with those still to be uploaded when the room is opened again', () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        const uploading = {
          name: 'new',
          type: 'text/plain',
          blob: new Blob(['x']),
          draftUpload: true,
        }
        wrapper.vm._fieldFiles['room-1'] = [
          { ...added('old'), draftUrl: 'https://s3/old.txt' },
          uploading,
        ]

        wrapper.vm.showDraftOf('room-1')
        jest.advanceTimersByTime(0)

        expect(field.files.map((file) => file.name)).toEqual(['old', 'new'])
        expect(field.files[1]).toBe(uploading)
      })

      it('are put back into the field when the room is opened', () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [{ ...added('old'), duration: 3 }] })]

        wrapper.vm.showDraftOf('room-1')
        jest.advanceTimersByTime(0)

        expect(field.files).toEqual([
          {
            name: 'old',
            extension: 'txt',
            type: 'text/plain',
            duration: 3,
            localUrl: 'https://s3/old.txt',
            draftUrl: 'https://s3/old.txt',
          },
        ])
        expect(wrapper.vm._fieldRoom).toBe('room-1')
      })

      it('wait for the field to show the room', () => {
        wrapper.vm.rooms = [
          ...wrapper.vm.rooms,
          mockRoom({ id: 'room-3', roomId: 'room-3', draftFiles: [added('old')] }),
        ]

        wrapper.vm.showDraftOf('room-3')
        jest.advanceTimersByTime(0)

        expect(field.files).toEqual([])
        expect(wrapper.vm._fieldRoom).toBeNull()

        field.roomId = 'room-3'
        jest.advanceTimersByTime(50)

        expect(field.files).toHaveLength(1)
        expect(wrapper.vm._fieldRoom).toBe('room-3')
      })

      it('wait no longer once another room is opened', () => {
        wrapper.vm.rooms = [mockRoom(), mockRoom({ id: 'room-2', draftFiles: [added('old')] })]
        wrapper.vm.showDraftOf('room-2')
        wrapper.vm.showDraftOf('room-1')
        field.roomId = 'room-2'
        jest.advanceTimersByTime(2000)

        expect(field.files).toEqual([])
        expect(wrapper.vm._fieldRoom).not.toBe('room-2')
      })

      it('are given up on without a field to be found, the text kept alone', () => {
        wrapper.vm._field = null

        wrapper.vm.showDraftOf('room-2')
        jest.advanceTimersByTime(2000)

        expect(wrapper.vm._fieldRoom).toBe('room-2')
      })

      it('are taken over by the message sent, without another upload', async () => {
        const blob = new Blob(['x'], { type: 'text/plain' })
        global.URL.createObjectURL = jest.fn(() => 'blob:local')
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('kept')] })]

        await wrapper.vm.sendMessage({
          roomId: 'room-1',
          content: 'See',
          files: [
            { name: 'kept', extension: 'txt', type: 'text/plain', draftUrl: 'https://s3/kept.txt' },
            { name: 'fresh', type: 'text/plain', blob },
          ],
        })

        const variables = mocks.$apollo.mutate.mock.calls
          .map(([options]) => options.variables)
          .find((v) => 'content' in v)
        expect(variables).toMatchObject({
          roomId: 'room-1',
          content: 'See',
          draftFiles: ['https://s3/kept.txt'],
          files: [{ name: 'fresh', type: 'text/plain' }],
        })
        expect(variables.endsDraft).toBeUndefined()
        expect(wrapper.vm.draftFilesOf('room-1')).toEqual([])
        delete global.URL.createObjectURL
      })

      it('of a direct conversation begun here go by its user', async () => {
        const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
        wrapper.vm.rooms = [virtualRoom]
        wrapper.vm.selectedRoom = virtualRoom
        field.roomId = 'temp-u1'
        wrapper.vm._fieldRoom = 'temp-u1'

        wrapper.vm.draftFilesChanged(field, [{ name: 'a', type: 'text/plain', blob: new Blob() }])
        jest.advanceTimersByTime(1000)
        await settle()

        expect(fileSaves()[0]).toMatchObject({ userId: 'u1' })
      })

      it('are kept when the chat is taken down', () => {
        wrapper.vm.rooms = [mockRoom({ draftFiles: [added('old')] })]
        wrapper.vm.draftFilesChanged(field, [])

        wrapper.destroy()

        expect(fileSaves()).toEqual([{ roomId: 'room-1', url: 'https://s3/old.txt' }])
      })
    })

    describe('in the room list', () => {
      beforeEach(() => {
        mocks.$t.mockImplementation((key, params) =>
          params ? `${key} ${JSON.stringify(params)}` : key,
        )
        // Anew, for the list to be drawn with the translation above.
        wrapper.vm.rooms = [...wrapper.vm.rooms]
      })

      it('stands in for the last message of a room left with one', () => {
        const room2 = wrapper.vm.displayedRooms.find((room) => room.id === 'room-2')

        expect(room2.lastMessage).toMatchObject({
          content: 'Kept before',
          senderId: null,
          username: null,
          files: [],
        })
      })

      it('is not shown for the room open, nor for a room without one', () => {
        wrapper.vm.selectedRoom = wrapper.vm.rooms[1]
        const shown = Object.fromEntries(
          wrapper.vm.displayedRooms.map((room) => [room.id, room.lastMessage.content]),
        )

        expect(shown).toEqual({ 'room-1': 'hello', 'room-2': 'hello' })
      })

      it('names the files of a draft without text', () => {
        wrapper.vm.rooms = [
          mockRoom({
            draftFiles: [
              { url: 'u1', name: 'plan', extension: 'pdf' },
              { url: 'u2', name: 'notes' },
            ],
          }),
        ]
        wrapper.vm.selectedRoom = null

        expect(wrapper.vm.displayedRooms[0].lastMessage.content).toBe('plan.pdf, notes')
      })

      it('shows the mentions of a draft as names', () => {
        wrapper.vm.rooms = [mockRoom({ draft: 'Hi <usertag>other-user</usertag>' })]
        wrapper.vm.selectedRoom = null

        expect(wrapper.vm.displayedRooms[0].lastMessage.content).toBe('Hi @Other')
      })

      it('shows the beginning of a long draft only', () => {
        wrapper.vm.rooms = [mockRoom({ draft: `  ${'x'.repeat(40)}` })]
        wrapper.vm.selectedRoom = null

        expect(wrapper.vm.displayedRooms[0].lastMessage.content).toBe('x'.repeat(30))
      })

      it('is marked "Draft:" in a colour of its own, for the rooms with one only', () => {
        expect(wrapper.vm.draftLabelCss).toBe(
          '.vac-room-item[id="room-2"] .vac-text-last::before { content: "chat.draft"; color: var(--chat-draft-label-color); margin-right: 0.25em; flex-shrink: 0; }',
        )
      })

      it('writes the marks into a stylesheet of the library, kept up to date', async () => {
        const shadowRoot = document.createElement('div')
        Object.defineProperty(wrapper.vm.$el, 'shadowRoot', { value: shadowRoot })

        wrapper.vm.renderDraftLabels()

        expect(shadowRoot.querySelector('style').textContent).toContain('[id="room-2"]')

        wrapper.vm.drafts = { 'room-2': '' }
        await wrapper.vm.$nextTick()

        expect(shadowRoot.querySelectorAll('style')).toHaveLength(1)
        expect(shadowRoot.querySelector('style').textContent).toBe('')
      })
    })

    it('lists no room a draft opened for a direct conversation begun here', async () => {
      const virtualRoom = mockRoom({ id: 'temp-u1', roomId: 'temp-u1', _virtualUserId: 'u1' })
      wrapper.vm.rooms = [virtualRoom]
      mocks.$apollo.query.mockResolvedValue({
        data: {
          Room: [
            mockRoom({
              id: 'real-1',
              roomId: 'real-1',
              users: [
                { id: 'current-user', name: 'Me' },
                { id: 'u1', name: 'You' },
              ],
            }),
            mockRoom({ id: 'room-3', roomId: 'room-3' }),
          ],
        },
      })

      await wrapper.vm.fetchRooms()

      expect(wrapper.vm.rooms.map((room) => room.id)).toEqual(['temp-u1', 'room-3'])
    })
  })

  describe('button to the unread messages above', () => {
    let shadow, column, container

    // A real shadow root with the library's message column and its scrolling part, the top of
    // which is at 100px; each message drawn there ends where `bottoms` says.
    const withMessageColumn = (propsData, bottoms = {}) => {
      wrapper = Wrapper(propsData)
      shadow = wrapper.vm.$el.attachShadow({ mode: 'open' })
      column = document.createElement('div')
      column.className = 'vac-col-messages'
      container = document.createElement('div')
      container.className = 'vac-container-scroll'
      container.getBoundingClientRect = () => ({ top: 100, bottom: 500 })
      Object.entries(bottoms).forEach(([id, bottom]) => {
        const element = document.createElement('div')
        element.id = id
        element.getBoundingClientRect = () => ({ top: bottom - 50, bottom })
        container.appendChild(element)
      })
      column.appendChild(container)
      shadow.appendChild(column)
    }
    const unread = (ids) => {
      wrapper.vm.unseenMessageIds = new Set(ids)
    }
    const button = () => column.querySelector('[data-test="chat-unread-above"]')
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))

    beforeEach(() => {
      createTooltip.mockClear()
      destroyTooltip.mockClear()
      // As v-tooltip does: the element carries its tooltip.
      createTooltip.mockImplementation((element) => {
        element._tooltip = {}
      })
      mocks.$t.mockImplementation((key, params) =>
        params ? `${key} ${JSON.stringify(params)}` : key,
      )
    })

    describe('counts', () => {
      it('the unread messages not loaded yet, and those loaded and scrolled past', () => {
        withMessageColumn({}, { 'local-1': 90, 'local-2': 150 })
        wrapper.vm.rooms = [mockRoom({ unreadCount: 5 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        wrapper.vm.messages = [
          mockMessage({ id: 'msg-1', _id: 'local-1', indexId: 1 }),
          mockMessage({ id: 'msg-2', _id: 'local-2', indexId: 2 }),
        ]
        unread(['msg-1', 'msg-2'])

        // 3 not loaded, msg-1 above the top, msg-2 in sight.
        expect(wrapper.vm.countUnreadAbove()).toBe(4)
      })

      it('not those seen just now, before the count of the room is told', () => {
        withMessageColumn()
        wrapper.vm.rooms = [mockRoom({ unreadCount: 3 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        wrapper.vm._seenBatch = ['msg-1']

        expect(wrapper.vm.countUnreadAbove()).toBe(2)
      })

      it('none without a room open', () => {
        withMessageColumn()
        wrapper.vm.rooms = [mockRoom({ unreadCount: 5 })]
        wrapper.vm.selectedRoom = null

        expect(wrapper.vm.countUnreadAbove()).toBe(0)
      })

      it('those not loaded alone without the library drawn yet', () => {
        wrapper = Wrapper()
        wrapper.vm.rooms = [mockRoom({ unreadCount: 2 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]

        expect(wrapper.vm.countUnreadAbove()).toBe(2)
      })

      it('anew once per frame, as messages come and go', async () => {
        withMessageColumn()
        wrapper.vm.rooms = [mockRoom({ unreadCount: 3 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        await frame()

        expect(wrapper.vm.unreadAbove).toBe(3)

        wrapper.vm.rooms = [mockRoom({ unreadCount: 0 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        await frame()

        expect(wrapper.vm.unreadAbove).toBe(0)
      })
    })

    describe('is shown', () => {
      it('with its count, a label and a tooltip, at the top of the column', () => {
        withMessageColumn()
        wrapper.vm.unreadAbove = 3

        wrapper.vm.renderUnreadAbove()

        expect(button().querySelector('.vac-messages-count').textContent).toBe('3')
        expect(button().classList.contains('vac-icon-scroll')).toBe(true)
        expect(button().getAttribute('aria-label')).toBe('chat.unreadAbove {"count":3}')
        expect(button().style.top).toBe('68px')
        expect(createTooltip).toHaveBeenCalledWith(button(), {
          content: 'chat.unreadAbove {"count":3}',
          placement: 'left',
        })
      })

      it('above 99 as 99+', () => {
        withMessageColumn()
        wrapper.vm.unreadAbove = 120

        wrapper.vm.renderUnreadAbove()

        expect(button().querySelector('.vac-messages-count').textContent).toBe('99+')
      })

      it('once, its count and tooltip kept up to date', () => {
        withMessageColumn()
        wrapper.vm.unreadAbove = 3
        wrapper.vm.renderUnreadAbove()
        wrapper.vm.renderUnreadAbove()

        expect(createTooltip).toHaveBeenCalledTimes(1)

        wrapper.vm.unreadAbove = 2
        wrapper.vm.renderUnreadAbove()

        expect(column.querySelectorAll('[data-test="chat-unread-above"]')).toHaveLength(1)
        expect(button().querySelector('.vac-messages-count').textContent).toBe('2')
        expect(destroyTooltip).toHaveBeenCalledTimes(1)
        expect(createTooltip).toHaveBeenCalledTimes(2)
      })

      it('below the hint, where there is one', () => {
        withMessageColumn({ hint: 'Visible only to the participants', hintKey: 'call' })
        wrapper.vm.renderHint()
        const bubble = column.querySelector('.chat-hint')
        Object.defineProperty(bubble, 'offsetTop', { value: 68 })
        Object.defineProperty(bubble, 'offsetHeight', { value: 40 })
        wrapper.vm.unreadAbove = 1

        wrapper.vm.renderUnreadAbove()

        expect(button().style.top).toBe('116px')
      })

      it('at the very top when the host brings its own header', () => {
        withMessageColumn({ hideHeader: true })
        wrapper.vm.unreadAbove = 1

        wrapper.vm.renderUnreadAbove()

        expect(button().style.top).toBe('8px')
      })

      it('not without unread messages above, and gone with the last of them', () => {
        withMessageColumn()
        wrapper.vm.renderUnreadAbove()

        expect(button()).toBeNull()

        wrapper.vm.unreadAbove = 1
        wrapper.vm.renderUnreadAbove()
        wrapper.vm.unreadAbove = 0
        wrapper.vm.renderUnreadAbove()

        expect(button()).toBeNull()
        expect(destroyTooltip).toHaveBeenCalledTimes(1)
      })

      it('not before the library has drawn its column', () => {
        wrapper = Wrapper()
        wrapper.vm.unreadAbove = 1

        expect(() => wrapper.vm.renderUnreadAbove()).not.toThrow()
      })

      it('gone with the chat', () => {
        withMessageColumn()
        wrapper.vm.unreadAbove = 1
        wrapper.vm.renderUnreadAbove()

        wrapper.destroy()

        expect(column.querySelector('[data-test="chat-unread-above"]')).toBeNull()
      })
    })

    describe('a click', () => {
      beforeEach(() => {
        withMessageColumn({}, { 'local-1': -400, 'local-2': -200 })
        wrapper.vm.rooms = [mockRoom({ unreadCount: 2 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        wrapper.vm.messagesLoaded = false
      })

      it('loads older messages until the oldest unread one is, and scrolls it to the top', async () => {
        const pages = [
          [mockMessage({ id: 'msg-2', _id: 'local-2', indexId: 2 })],
          [mockMessage({ id: 'msg-1', _id: 'local-1', indexId: 1 })],
        ]
        const fetchMessages = jest
          .spyOn(wrapper.vm, 'fetchMessages')
          .mockImplementation(async () => {
            const [page] = pages.splice(0, 1)
            wrapper.vm.messages = [...page, ...wrapper.vm.messages]
            wrapper.vm.unseenMessageIds.add(page[0].id)
            wrapper.vm.oldestLoadedIndexId = page[0].indexId
            return true
          })
        container.scrollTop = 1000
        wrapper.vm.unreadAbove = 2
        wrapper.vm.renderUnreadAbove()

        button().click()
        expect(wrapper.vm.jumpingToUnread).toBe(true)
        expect(button().getAttribute('aria-busy')).toBe('true')
        await flushPromises()
        await frame()
        await flushPromises()

        expect(fetchMessages).toHaveBeenCalledTimes(2)
        // msg-1 ends at -400, 50 high: its top at -450, 550 above the column's top, less the margin.
        expect(container.scrollTop).toBe(1000 - 550 - 48)
        expect(wrapper.vm.jumpingToUnread).toBe(false)
      })

      it('loads nothing when the oldest unread message is loaded already', async () => {
        wrapper.vm.messages = [
          mockMessage({ id: 'msg-1', _id: 'local-1', indexId: 1 }),
          mockMessage({ id: 'msg-2', _id: 'local-2', indexId: 2 }),
        ]
        unread(['msg-1', 'msg-2'])
        const fetchMessages = jest.spyOn(wrapper.vm, 'fetchMessages')
        container.scrollTop = 1000

        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).not.toHaveBeenCalled()
        expect(container.scrollTop).toBe(1000 - 550 - 48)
      })

      it('stops at the beginning of the room, or once nothing more comes', async () => {
        const fetchMessages = jest.spyOn(wrapper.vm, 'fetchMessages').mockResolvedValue()

        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).toHaveBeenCalledTimes(1)

        fetchMessages.mockClear()
        wrapper.vm.messagesLoaded = true
        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).not.toHaveBeenCalled()
      })

      it('scrolls nowhere once another room is opened meanwhile', async () => {
        jest.spyOn(wrapper.vm, 'fetchMessages').mockImplementation(async () => {
          wrapper.vm.selectedRoom = mockRoom({ id: 'room-2' })
        })
        const scroll = jest.spyOn(wrapper.vm, 'scrollToOldestUnread')

        await wrapper.vm.jumpToOldestUnread()

        expect(scroll).not.toHaveBeenCalled()
      })

      it('is taken once while on its way', async () => {
        let done
        const fetchMessages = jest
          .spyOn(wrapper.vm, 'fetchMessages')
          .mockImplementation(() => new Promise((resolve) => (done = resolve)))

        const first = wrapper.vm.jumpToOldestUnread()
        await wrapper.vm.jumpToOldestUnread()
        done()
        await first

        expect(fetchMessages).toHaveBeenCalledTimes(1)
      })

      it('stops at a page that failed', async () => {
        const fetchMessages = jest.spyOn(wrapper.vm, 'fetchMessages').mockResolvedValue(false)
        const scroll = jest.spyOn(wrapper.vm, 'scrollToOldestUnread')

        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).toHaveBeenCalledTimes(1)
        expect(scroll).toHaveBeenCalled()
      })

      it('stops at a page that brought nothing older', async () => {
        const fetchMessages = jest.spyOn(wrapper.vm, 'fetchMessages').mockResolvedValue(true)

        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).toHaveBeenCalledTimes(1)
      })

      it('loads nothing for unread messages seen just now and not yet reported', async () => {
        wrapper.vm.messages = [mockMessage({ id: 'msg-2', _id: 'local-2', indexId: 2 })]
        unread(['msg-2'])
        wrapper.vm._seenBatch = ['msg-1']
        const fetchMessages = jest.spyOn(wrapper.vm, 'fetchMessages')

        await wrapper.vm.jumpToOldestUnread()

        expect(fetchMessages).not.toHaveBeenCalled()
      })

      it('goes no further once the chat is closed', async () => {
        let done
        const fetchMessages = jest
          .spyOn(wrapper.vm, 'fetchMessages')
          .mockImplementation(() => new Promise((resolve) => (done = resolve)))
        const reobserve = jest.spyOn(wrapper.vm, 'reobserveUnseen')
        const scroll = jest.spyOn(wrapper.vm, 'scrollToOldestUnread')

        const jumping = wrapper.vm.jumpToOldestUnread()
        wrapper.destroy()
        done(true)
        await jumping

        expect(fetchMessages).toHaveBeenCalledTimes(1)
        expect(scroll).not.toHaveBeenCalled()
        expect(reobserve).not.toHaveBeenCalled()
      })
    })

    describe('unread messages come in while the room is open', () => {
      beforeEach(() => {
        withMessageColumn()
        wrapper.vm.rooms = [mockRoom({ unreadCount: 3 })]
        wrapper.vm.selectedRoom = wrapper.vm.rooms[0]
        wrapper.vm.messages = []
      })

      const arrive = (id) =>
        wrapper.vm.chatMessageAdded({
          data: {
            chatMessageAdded: mockMessage({ id, _id: id, room: { id: 'room-1' }, seen: false }),
          },
        })

      it('are not counted against the unread count of the room', async () => {
        await arrive('new-1')

        expect(wrapper.vm.rooms[0].unreadCount).toBe(3)
        expect(wrapper.vm.unreadNotLoaded(wrapper.vm.rooms[0])).toBe(3)
      })

      it('are not taken off it once seen', async () => {
        await arrive('new-1')
        unread(['msg-1', 'new-1'])

        wrapper.vm.markAsSeen(['msg-1', 'new-1'])

        expect(wrapper.vm.rooms[0].unreadCount).toBe(2)
      })
    })

    describe('below', () => {
      // The library's room, whose button to the newest message shows `scrollMessagesCount`.
      const withLibraryRoom = () => {
        const proxy = { scrollMessagesCount: 0, scrollIcon: false }
        wrapper.vm.$el._instance = {
          subTree: { component: { type: { name: 'ChatRoom' }, isUnmounted: false, proxy } },
        }
        return proxy
      }

      it('counts the unread messages loaded below what is shown', () => {
        withMessageColumn({}, { 'local-1': 300, 'local-2': 600, 'local-3': 700 })
        wrapper.vm.messages = [
          mockMessage({ id: 'msg-1', _id: 'local-1', indexId: 1 }),
          mockMessage({ id: 'msg-2', _id: 'local-2', indexId: 2 }),
          mockMessage({ id: 'msg-3', _id: 'local-3', indexId: 3 }),
        ]
        unread(['msg-1', 'msg-2'])

        // msg-1 in sight, msg-2 below (its top at 550), msg-3 below but read.
        expect(wrapper.vm.countUnreadBelow()).toBe(1)
      })

      it('counts none before the library has drawn its column', () => {
        wrapper = Wrapper()

        expect(wrapper.vm.countUnreadBelow()).toBe(0)
      })

      it("shows them on the library's button to the newest message", () => {
        withMessageColumn()
        const room = withLibraryRoom()

        wrapper.vm.showUnreadBelow(4)

        expect(room).toEqual({ scrollMessagesCount: 4, scrollIcon: true })

        wrapper.vm.showUnreadBelow(0)

        expect(room).toEqual({ scrollMessagesCount: 0, scrollIcon: true })
      })

      it('shows nothing without the library room', () => {
        withMessageColumn()

        expect(() => wrapper.vm.showUnreadBelow(4)).not.toThrow()
      })

      it('are counted with those above, once per frame', async () => {
        withMessageColumn()
        const room = withLibraryRoom()
        jest.spyOn(wrapper.vm, 'countUnreadBelow').mockReturnValue(2)

        wrapper.vm.scheduleUnreadAbove()
        await frame()

        expect(room.scrollMessagesCount).toBe(2)
      })
    })

    describe('on the way to the oldest unread message', () => {
      let observed, callback

      beforeEach(() => {
        withMessageColumn()
        observed = []
        global.IntersectionObserver = jest.fn((handler) => {
          callback = handler
          return {
            observe: jest.fn((element) => observed.push(['observe', element.id])),
            unobserve: jest.fn((element) => observed.push(['unobserve', element.id])),
            disconnect: jest.fn(),
          }
        })
        global.MutationObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
        wrapper.vm.setupMessageVisibilityTracking()
        unread(['msg-1'])
      })

      it('reads nothing that comes into sight', () => {
        wrapper.vm.jumpingToUnread = true
        const element = document.createElement('div')
        element.dataset.unseenId = 'msg-1'

        callback([{ isIntersecting: true, target: element }])

        expect(wrapper.vm.unseenMessageIds.has('msg-1')).toBe(true)
      })

      it('asks about the unread ones anew where it stopped', () => {
        const element = document.createElement('div')
        element.id = 'local-1'
        element.dataset.unseenId = 'msg-1'
        container.appendChild(element)

        wrapper.vm.reobserveUnseen()

        expect(observed).toEqual([
          ['unobserve', 'local-1'],
          ['observe', 'local-1'],
        ])
      })

      it('asks nothing before the messages are watched', () => {
        wrapper.vm._intersectionObserver = null

        expect(() => wrapper.vm.reobserveUnseen()).not.toThrow()
      })
    })

    it('counts anew on scrolling the messages', async () => {
      withMessageColumn()
      global.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
      global.MutationObserver = jest.fn(() => ({ observe: jest.fn(), disconnect: jest.fn() }))
      wrapper.vm.setupMessageVisibilityTracking()
      const count = jest.spyOn(wrapper.vm, 'countUnreadAbove').mockReturnValue(7)

      container.dispatchEvent(new Event('scroll'))
      await frame()

      expect(count).toHaveBeenCalled()
      expect(wrapper.vm.unreadAbove).toBe(7)

      wrapper.destroy()
      count.mockClear()
      container.dispatchEvent(new Event('scroll'))
      await frame()

      expect(count).not.toHaveBeenCalled()
    })
  })
})
