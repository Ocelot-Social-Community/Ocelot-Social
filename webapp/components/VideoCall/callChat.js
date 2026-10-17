// The two chats of a running video call, and how the chat store names them. One place for
// it, because three surfaces ask: the call itself, its tab row, and the layout that decides
// where the chat is drawn.

// Which of the call's chats the chat store has open: 'call' for the conference chat only the
// participants share, 'group' for the group's own, null for any other chat or none.
export const activeCallChatTab = (chat, { groupId, chatRoomId }) => {
  if (!chat || !chat.showChat) return null
  if (chatRoomId && chat.roomId === chatRoomId) return 'call'
  if (groupId && chat.groupId === groupId) return 'group'
  return null
}

// What to hand the chat store to open that chat. Without a conference chat — the server has
// not confirmed the participation — 'call' falls back to the group's chat.
export const callChatTarget = (tab, { groupId, chatRoomId }) =>
  tab === 'call' && chatRoomId
    ? { showChat: true, chatUserId: null, groupId: null, roomId: chatRoomId }
    : { showChat: true, chatUserId: null, groupId }
