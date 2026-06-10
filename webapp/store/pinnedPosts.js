import { postsPinnedCountsQuery } from '~/graphql/PostQuery'

// Only the live network-wide pinned count lives here. The limit (maxPinnedPosts)
// is a network-policy key, read via $policy.get('maxPinnedPosts') — see
// mixins/pinnedPosts.js. `loaded` guards the one-off fetch (the count is only
// needed, and only fetched, when the policy allows more than one pin).
export const state = () => {
  return {
    currentlyPinnedPosts: 0,
    loaded: false,
  }
}

export const mutations = {
  pinPost(state) {
    state.currentlyPinnedPosts++
  },
  unpinPost(state) {
    state.currentlyPinnedPosts--
  },
  setCurrentlyPinnedPosts(state, value) {
    state.currentlyPinnedPosts = value
  },
  setLoaded(state, value = true) {
    state.loaded = value
  },
}

export const getters = {
  currentlyPinnedPosts(state) {
    return state.currentlyPinnedPosts
  },
  loaded(state) {
    return state.loaded
  },
}

export const actions = {
  async fetch({ commit }) {
    const client = this.app.apolloProvider.defaultClient
    const {
      data: { PostsPinnedCounts },
    } = await client.query({ query: postsPinnedCountsQuery() })
    commit('setCurrentlyPinnedPosts', PostsPinnedCounts.currentlyPinnedPosts)
    commit('setLoaded')
  },
}
