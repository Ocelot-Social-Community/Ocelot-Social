export const state = () => {
  return {
    showChat: false,
    chatUserId: null,
    groupId: null,
    // A room opened by its id: the conference chat of a video call, which belongs to
    // neither one user nor the group as a whole.
    roomId: null,
    unreadRoomCount: 0,
    // Keys of the chat hints dismissed with their X. Kept in the store only, so a reload
    // brings them back: many users are not at home with settings, and a hint that is gone
    // for good would be gone for them without a way back.
    dismissedHints: [],
  }
}

export const mutations = {
  SET_OPEN_CHAT(state, ctx) {
    state.showChat = ctx.showChat || false
    state.chatUserId = ctx.chatUserId || null
    state.groupId = ctx.groupId || null
    state.roomId = ctx.roomId || null
  },
  UPDATE_ROOM_COUNT(state, count) {
    state.unreadRoomCount = count
  },
  DISMISS_HINT(state, key) {
    if (key && !state.dismissedHints.includes(key)) {
      state.dismissedHints = [...state.dismissedHints, key]
    }
  },
}

export const getters = {
  showChat(state) {
    return state
  },
  unreadRoomCount(state) {
    return state.unreadRoomCount
  },
  dismissedHints(state) {
    return state.dismissedHints
  },
}
