import { state as createState, mutations, getters } from './videoCall.js'

describe('videoCall store', () => {
  let state

  beforeEach(() => {
    state = createState()
  })

  describe('state', () => {
    it('initializes with sane defaults', () => {
      expect(state).toEqual({
        enabled: false,
        showVideoCall: false,
        minimized: false,
        groupId: null,
        groupName: null,
        groupSlug: null,
        groupAvatar: null,
        participantCount: 0,
        chatRoomId: null,
        conferenceUnread: 0,
        phase: 'idle',
      })
    })
  })

  describe('mutations', () => {
    describe('SET_ENABLED', () => {
      it('coerces truthy values to true', () => {
        mutations.SET_ENABLED(state, 1)
        expect(state.enabled).toBe(true)
      })

      it('coerces falsy values to false', () => {
        state.enabled = true
        mutations.SET_ENABLED(state, null)
        expect(state.enabled).toBe(false)
      })
    })

    describe('OPEN', () => {
      it('sets group info and resets stale participant count', () => {
        state.participantCount = 5
        mutations.OPEN(state, {
          groupId: 'g1',
          groupName: 'Yoga',
          groupSlug: 'yoga',
          groupAvatar: { url: 'a' },
        })
        expect(state.showVideoCall).toBe(true)
        expect(state.minimized).toBe(false)
        expect(state.groupId).toBe('g1')
        expect(state.groupName).toBe('Yoga')
        expect(state.groupSlug).toBe('yoga')
        expect(state.groupAvatar).toEqual({ url: 'a' })
        expect(state.participantCount).toBe(0)
      })

      it('falls back to null for missing optional info', () => {
        mutations.OPEN(state, { groupId: 'g1' })
        expect(state.groupName).toBeNull()
        expect(state.groupSlug).toBeNull()
        expect(state.groupAvatar).toBeNull()
      })
    })

    describe('SET_GROUP_INFO', () => {
      it('updates group info for the active group only', () => {
        state.groupId = 'g1'
        state.groupName = 'Old'
        mutations.SET_GROUP_INFO(state, {
          groupId: 'g1',
          groupName: 'New',
          groupSlug: 'new-slug',
          groupAvatar: { url: 'x' },
        })
        expect(state.groupName).toBe('New')
        expect(state.groupSlug).toBe('new-slug')
        expect(state.groupAvatar).toEqual({ url: 'x' })
      })

      it('ignores updates for a different groupId', () => {
        state.groupId = 'g1'
        state.groupName = 'Keep'
        mutations.SET_GROUP_INFO(state, { groupId: 'g2', groupName: 'Other' })
        expect(state.groupName).toBe('Keep')
      })

      it('ignores updates without a groupId', () => {
        state.groupId = 'g1'
        state.groupName = 'Keep'
        mutations.SET_GROUP_INFO(state, { groupName: 'Other' })
        expect(state.groupName).toBe('Keep')
      })

      it('leaves untouched fields alone when keys are omitted', () => {
        state.groupId = 'g1'
        state.groupName = 'Keep Name'
        state.groupSlug = 'keep-slug'
        mutations.SET_GROUP_INFO(state, { groupId: 'g1', groupAvatar: { url: 'a' } })
        expect(state.groupName).toBe('Keep Name')
        expect(state.groupSlug).toBe('keep-slug')
      })

      it('clears fields when explicitly set to falsy', () => {
        state.groupId = 'g1'
        state.groupName = 'Old'
        mutations.SET_GROUP_INFO(state, { groupId: 'g1', groupName: '' })
        expect(state.groupName).toBeNull()
      })
    })

    describe('CLOSE', () => {
      it('resets every group-scoped field and the phase', () => {
        state.showVideoCall = true
        state.minimized = true
        state.groupId = 'g1'
        state.groupName = 'Yoga'
        state.groupSlug = 'yoga'
        state.groupAvatar = { url: 'a' }
        state.participantCount = 4
        state.phase = 'in-call'
        mutations.CLOSE(state)
        expect(state).toMatchObject({
          showVideoCall: false,
          minimized: false,
          groupId: null,
          groupName: null,
          groupSlug: null,
          groupAvatar: null,
          participantCount: 0,
          phase: 'idle',
        })
      })
    })

    describe('SET_CHAT_ROOM_ID', () => {
      it('stores the conference chat room of the call', () => {
        mutations.SET_CHAT_ROOM_ID(state, 'room-1')
        expect(state.chatRoomId).toBe('room-1')
      })

      it('falls back to null when called without a value', () => {
        state.chatRoomId = 'room-1'
        mutations.SET_CHAT_ROOM_ID(state)
        expect(state.chatRoomId).toBeNull()
      })

      it('is forgotten when a call is opened or closed', () => {
        state.chatRoomId = 'room-1'
        mutations.OPEN(state, { groupId: 'g2' })
        expect(state.chatRoomId).toBeNull()

        state.chatRoomId = 'room-2'
        mutations.CLOSE(state)
        expect(state.chatRoomId).toBeNull()
      })
    })

    describe('SET_CONFERENCE_UNREAD', () => {
      it('stores the number of unread messages in the conference chat', () => {
        mutations.SET_CONFERENCE_UNREAD(state, 3)
        expect(state.conferenceUnread).toBe(3)
        expect(getters.conferenceUnread(state)).toBe(3)
      })

      it('coerces what is not a number to 0', () => {
        mutations.SET_CONFERENCE_UNREAD(state, undefined)
        expect(state.conferenceUnread).toBe(0)
      })

      it('is forgotten with the room it belongs to', () => {
        mutations.SET_CHAT_ROOM_ID(state, 'room-1')
        mutations.SET_CONFERENCE_UNREAD(state, 3)
        // The same room confirmed again: nothing has been read.
        mutations.SET_CHAT_ROOM_ID(state, 'room-1')
        expect(state.conferenceUnread).toBe(3)
        mutations.SET_CHAT_ROOM_ID(state, 'room-2')
        expect(state.conferenceUnread).toBe(0)
      })

      it('is forgotten when a call is opened or closed', () => {
        state.conferenceUnread = 3
        mutations.OPEN(state, { groupId: 'g2' })
        expect(state.conferenceUnread).toBe(0)

        state.conferenceUnread = 3
        mutations.CLOSE(state)
        expect(state.conferenceUnread).toBe(0)
      })
    })

    describe('SET_MINIMIZED', () => {
      it('coerces to a boolean', () => {
        mutations.SET_MINIMIZED(state, 'yes')
        expect(state.minimized).toBe(true)
        mutations.SET_MINIMIZED(state, 0)
        expect(state.minimized).toBe(false)
      })
    })

    describe('SET_PHASE', () => {
      it('stores the given phase', () => {
        mutations.SET_PHASE(state, 'connecting')
        expect(state.phase).toBe('connecting')
      })

      it('falls back to idle when called without a value', () => {
        state.phase = 'connecting'
        mutations.SET_PHASE(state, null)
        expect(state.phase).toBe('idle')
      })
    })

    describe('SET_PARTICIPANT_COUNT', () => {
      it('stores a numeric count', () => {
        mutations.SET_PARTICIPANT_COUNT(state, 3)
        expect(state.participantCount).toBe(3)
      })

      it('coerces non-numeric input to 0', () => {
        mutations.SET_PARTICIPANT_COUNT(state, 'foo')
        expect(state.participantCount).toBe(0)
      })
    })
  })

  describe('getters', () => {
    it('proxy the relevant state fields', () => {
      state = {
        enabled: true,
        showVideoCall: true,
        minimized: true,
        groupId: 'g1',
        groupName: 'Yoga',
        groupSlug: 'yoga',
        groupAvatar: { url: 'a' },
        participantCount: 7,
        chatRoomId: 'room-1',
        phase: 'in-call',
      }
      expect(getters.enabled(state)).toBe(true)
      expect(getters.showVideoCall(state)).toBe(true)
      expect(getters.minimized(state)).toBe(true)
      expect(getters.groupId(state)).toBe('g1')
      expect(getters.groupName(state)).toBe('Yoga')
      expect(getters.groupSlug(state)).toBe('yoga')
      expect(getters.groupAvatar(state)).toEqual({ url: 'a' })
      expect(getters.participantCount(state)).toBe(7)
      expect(getters.chatRoomId(state)).toBe('room-1')
      expect(getters.phase(state)).toBe('in-call')
    })
  })
})
