export const state = () => {
  return {
    showChat: false,
    chatUserId: null,
    groupId: null,
    // A room opened by its id: the conference chat of a video call, which belongs to
    // neither one user nor the group as a whole.
    roomId: null,
    unreadRoomCount: 0,
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
}

export const getters = {
  showChat(state) {
    return state
  },
  unreadRoomCount(state) {
    return state.unreadRoomCount
  },
}
