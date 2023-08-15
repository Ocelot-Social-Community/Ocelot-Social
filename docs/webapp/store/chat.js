export const state = () => {
  return {
    showChat: false,
    roomID: null,
    unreadRoomCount: 0,
  }
}

export const mutations = {
  SET_OPEN_CHAT(state, ctx) {
    state.showChat = ctx.showChat || false
    state.roomID = ctx.roomID || null
  },
  UPDATE_ROOM_COUNT(state, count) {
    state.unreadRoomCount = count
  },
  UPDATE_ROOM_ID(state, roomid) {
    state.roomId = roomid || null
  },
}

export const getters = {
  showChat(state) {
    return state
  },
  roomID(state) {
    return state
  },
  unreadRoomCount(state) {
    return state.unreadRoomCount
  },
}
