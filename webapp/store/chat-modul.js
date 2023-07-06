export const state = () => {
  return {
    showChatModul: false,
    roomID: 'u0'
  }
}

export const mutations = {
  SET_OPEN_CHAT_MODUL(state, ctx) {
    console.log('SET_OPEN_CHAT_MODUL', ctx)
    state.showChatModul = ctx.showChatModul || false
    state.roomID = ctx.roomID || 'u0'
  },
}

export const getters = {
    showChatModul(state) {
        console.log('getter', state)
        return state
    },
    roomID(state) {
        console.log('getter', state)
        return state
    },
}
