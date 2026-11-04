import { activeCallChatTab, callChatTarget } from './callChat'

const call = { groupId: 'g1', chatRoomId: 'room-1' }

describe('activeCallChatTab', () => {
  it('is the conference chat when its room is open', () => {
    expect(activeCallChatTab({ showChat: true, groupId: null, roomId: 'room-1' }, call)).toBe(
      'call',
    )
  })

  it('is the chat of the group when that is open', () => {
    expect(activeCallChatTab({ showChat: true, groupId: 'g1', roomId: null }, call)).toBe('group')
  })

  it('is none for another chat, a closed one, or no chat state at all', () => {
    expect(activeCallChatTab({ showChat: true, groupId: 'g2', roomId: null }, call)).toBeNull()
    expect(activeCallChatTab({ showChat: true, groupId: null, roomId: 'room-2' }, call)).toBeNull()
    expect(activeCallChatTab({ showChat: false, groupId: 'g1', roomId: null }, call)).toBeNull()
    expect(activeCallChatTab(null, call)).toBeNull()
  })

  it('does not take "no room" for the conference chat of a call that has none', () => {
    expect(
      activeCallChatTab(
        { showChat: true, groupId: null, roomId: null },
        { groupId: 'g1', chatRoomId: null },
      ),
    ).toBeNull()
  })
})

describe('callChatTarget', () => {
  it('opens the conference chat by its room', () => {
    expect(callChatTarget('call', call)).toEqual({
      showChat: true,
      chatUserId: null,
      groupId: null,
      roomId: 'room-1',
    })
  })

  it('opens the chat of the group by the group', () => {
    expect(callChatTarget('group', call)).toEqual({
      showChat: true,
      chatUserId: null,
      groupId: 'g1',
    })
  })

  it('falls back to the chat of the group while the call has no conference chat', () => {
    expect(callChatTarget('call', { groupId: 'g1', chatRoomId: null })).toEqual({
      showChat: true,
      chatUserId: null,
      groupId: 'g1',
    })
  })
})
