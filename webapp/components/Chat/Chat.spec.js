import { mount } from '@vue/test-utils'
import Vuex from 'vuex'
import Chat from './Chat.vue'

const localVue = global.localVue

// Stub the web component to avoid shadow DOM issues in tests
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
    ],
  },
  'nuxt-link': { template: '<a><slot /></a>', props: ['to'] },
  'os-button': { template: '<button><slot /><slot name="icon" /></button>' },
  'os-icon': { template: '<span />' },
  'profile-avatar': { template: '<div />' },
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
    { _id: 'current-user', id: 'current-user', username: 'Me', avatar: null },
    { _id: 'other-user', id: 'other-user', username: 'Other', avatar: null },
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

    mocks = {
      $t: jest.fn((key) => key),
      $i18n: { locale: () => 'en' },
      $toast: { success: jest.fn(), error: jest.fn() },
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
          state: { unreadRoomCount: 0 },
          mutations: {
            UPDATE_ROOM_COUNT: jest.fn(),
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

    it('normalizes avatar', () => {
      const msg = mockMessage({ avatar: { w320: 'http://img.jpg' } })
      const prepared = wrapper.vm.prepareMessage(msg)
      expect(prepared.avatar).toBe('http://img.jpg')
      expect(prepared._originalAvatar).toBe('http://img.jpg')
    })

    it('handles null avatar', () => {
      const msg = mockMessage({ avatar: null })
      const prepared = wrapper.vm.prepareMessage(msg)
      expect(prepared.avatar).toBeNull()
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

    it('increments unreadCount for non-current rooms', async () => {
      wrapper.vm.selectedRoom = mockRoom({ id: 'other-room' })
      await wrapper.vm.chatMessageAdded({
        data: {
          chatMessageAdded: mockMessage({
            senderId: 'other-user',
            room: { id: 'room-1' },
          }),
        },
      })
      expect(wrapper.vm.rooms[0].unreadCount).toBe(1)
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
      expect(messageCall[0].variables.first).toBe(wrapper.vm.messagePageSize)
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

    it('shows toast on error', async () => {
      mocks.$apollo.mutate.mockRejectedValue(new Error('Send failed'))
      await wrapper.vm.sendMessage({ roomId: 'room-1', content: 'Hello' })
      expect(mocks.$toast.error).toHaveBeenCalledWith('Send failed')
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
      expect(mocks.$apollo.mutate).toHaveBeenCalled()
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
    it('navigates to user profile', () => {
      wrapper = Wrapper()
      wrapper.vm.redirectToUserProfile({ user: { id: 'u1', name: 'John Doe' } })
      expect(mocks.$router.push).toHaveBeenCalledWith({
        path: '/profile/u1/john-doe',
      })
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
})
