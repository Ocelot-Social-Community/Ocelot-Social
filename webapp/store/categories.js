import CategoryQuery from '~/graphql/CategoryQuery'

export const state = () => {
  return {
    categories: [],
    isInitialized: false,
  }
}

export const mutations = {
  SET_CATEGORIES(state, categories) {
    state.categories = categories || []
  },
  SET_INIZIALIZED(state) {
    state.isInitialized = true
  },
}

export const getters = {
  categories(state) {
    return state.categories
  },
  // Whether the categories feature is enabled. The network policy is the single
  // source of truth (admins toggle it at runtime); the actual category list
  // (loaded via init) is orthogonal and still guarded with `.length` at the
  // usage sites that render chips.
  categoriesActive(state, _getters, _rootState, rootGetters) {
    return !!rootGetters['policy/get']('categoriesActive')
  },
  isInitialized(state) {
    return state.isInitialized
  },
}

export const actions = {
  async init({ commit }) {
    try {
      const client = this.app.apolloProvider.defaultClient
      const {
        data: { Category: categories },
      } = await client.query({ query: CategoryQuery() })
      commit('SET_CATEGORIES', categories)
      commit('SET_INIZIALIZED')
    } catch (err) {
      throw new Error('Could not query categories')
    }
  },
}
