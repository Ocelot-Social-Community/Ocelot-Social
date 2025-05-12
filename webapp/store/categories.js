import CategoryQuery from '~/graphql/CategoryQuery'
import CONFIG from '~/config/index'

export const state = () => {
  return {
    categories: [],
  }
}

export const mutations = {
  SET_CATEGORIES(state, categories) {
    state.categories = categories || []
  },
}

export const getters = {
  categories(state) {
    return state.categories
  },
}

export const actions = {
  async init({ commit }) {
    if (CONFIG.CATEGORIES_ACTIVE) {
      try {
        const client = this.app.apolloProvider.defaultClient
        const {
          data: { Category: categories },
        } = await client.query({ query: CategoryQuery() })
        commit('SET_CATEGORIES', categories)
      } catch (err) {
        throw new Error('Could not query categories')
      }
    } else {
      commit('SET_CATEGORIES', [])
    }
  },
}
