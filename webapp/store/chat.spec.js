import { state as createState, mutations, getters } from './chat.js'

describe('chat store', () => {
  let state

  beforeEach(() => {
    state = createState()
  })

  describe('state defaults', () => {
    it('starts with chat closed and counters at zero', () => {
      expect(state).toEqual({
        showChat: false,
        chatUserId: null,
        groupId: null,
        unreadRoomCount: 0,
      })
    })
  })

  describe('SET_OPEN_CHAT', () => {
    it('stores the open flag and target ids', () => {
      mutations.SET_OPEN_CHAT(state, { showChat: true, chatUserId: 'u1', groupId: 'g1' })
      expect(state).toMatchObject({ showChat: true, chatUserId: 'u1', groupId: 'g1' })
    })

    it('falls back to safe defaults for missing values', () => {
      state.showChat = true
      state.chatUserId = 'u1'
      state.groupId = 'g1'
      mutations.SET_OPEN_CHAT(state, {})
      expect(state).toMatchObject({ showChat: false, chatUserId: null, groupId: null })
    })
  })

  describe('UPDATE_ROOM_COUNT', () => {
    it('writes the unread counter through', () => {
      mutations.UPDATE_ROOM_COUNT(state, 7)
      expect(state.unreadRoomCount).toBe(7)
    })
  })

  describe('getters', () => {
    it('showChat returns the whole state object (legacy contract)', () => {
      state.showChat = true
      expect(getters.showChat(state)).toBe(state)
    })

    it('unreadRoomCount returns the counter', () => {
      state.unreadRoomCount = 5
      expect(getters.unreadRoomCount(state)).toBe(5)
    })
  })
})
