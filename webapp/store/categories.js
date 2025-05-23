import CategoryQuery from '~/graphql/CategoryQuery'

export const state = () => {
  return {
    categories: [],
    isInizialized: false,
  }
}

export const mutations = {
  SET_CATEGORIES(state, categories) {
    state.categories = categories || []
  },
  SET_INIZIALIZED(state) {
    state.isInizialized = true
  },
}

export const getters = {
  categories(state) {
    return state.categories
  },
  categoriesActive(state) {
    return !!state.categories.length
  },
  isInizialized(state) {
    return state.isInizialized
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
