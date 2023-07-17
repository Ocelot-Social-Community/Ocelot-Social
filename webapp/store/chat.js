export const state = () => {
  return {
    showChat: false,
    roomID: null,
  }
}

export const mutations = {
  SET_OPEN_CHAT(state, ctx) {
    state.showChat = ctx.showChat || false
    state.roomID = ctx.roomID || null
  },
}

export const getters = {
  showChat(state) {
    return state
  },
  roomID(state) {
    return state
  },
}
