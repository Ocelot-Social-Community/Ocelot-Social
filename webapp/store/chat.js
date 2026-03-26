export const state = () => {
  return {
    showChat: false,
    chatUserId: null,
    groupId: null,
    unreadRoomCount: 0,
  }
}

export const mutations = {
  SET_OPEN_CHAT(state, ctx) {
    state.showChat = ctx.showChat || false
    state.chatUserId = ctx.chatUserId || null
    state.groupId = ctx.groupId || null
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
