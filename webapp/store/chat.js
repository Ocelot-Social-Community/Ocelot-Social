export const state = () => {
  return {
    showChat: false,
    roomID: 'u0',
  }
}

export const mutations = {
  SET_OPEN_CHAT(state, ctx) {
    console.log('SET_OPEN_CHAT', ctx)
    state.showChat = ctx.showChat || false
    state.roomID = ctx.roomID || 'u0'
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
