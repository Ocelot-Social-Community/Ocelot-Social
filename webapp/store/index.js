export const state = () => ({})

export const mutations = {}

export const actions = {
  async nuxtServerInit({ dispatch }) {
    await Promise.all([dispatch('auth/init'), dispatch('policy/init')])
  },
}
