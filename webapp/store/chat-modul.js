export const state = () => {
  return {
    showChatModul: false,
  }
}

export const mutations = {
  SET_OPEN_CHAT_MODUL(state, ctx) {
    console.log(ctx)
    state.showChatModul = ctx || false
  },
}

export const getters = {
    showChatModul(state) {
        console.log('getter', state)
    return state
  },
}
