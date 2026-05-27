import PolicyQuery from '~/graphql/PolicyQuery'

// Mirrors backend NetworkPolicy schema (packages/config-schema/policy.schema.json).
// Defaults match schema defaults — used until the backend snapshot is loaded.
const DEFAULTS = Object.freeze({
  publicRegistration: false,
  inviteRegistration: true,
  categoriesActive: false,
  apiKeysEnabled: false,
})

export const state = () => ({
  snapshot: { ...DEFAULTS },
  isInitialized: false,
})

export const mutations = {
  SET_SNAPSHOT(state, snapshot) {
    state.snapshot = { ...DEFAULTS, ...snapshot }
  },
  SET_INITIALIZED(state, value = true) {
    state.isInitialized = value
  },
}

export const getters = {
  snapshot(state) {
    return state.snapshot
  },
  get: (state) => (key) => state.snapshot[key],
  isInitialized(state) {
    return state.isInitialized
  },
}

export const actions = {
  async init({ commit }) {
    try {
      const client = this.app.apolloProvider.defaultClient
      const {
        data: { publicPolicy },
      } = await client.query({ query: PolicyQuery(), fetchPolicy: 'network-only' })
      commit('SET_SNAPSHOT', publicPolicy)
      commit('SET_INITIALIZED')
    } catch (err) {
      // Fall back to defaults; non-fatal so SSR can still render
      // (login/register screens degrade gracefully).
      commit('SET_SNAPSHOT', DEFAULTS)
      commit('SET_INITIALIZED', false)
    }
  },
}
