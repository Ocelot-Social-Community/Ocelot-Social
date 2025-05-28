import { postsPinnedCountsQuery } from '~/graphql/PostQuery'

export const state = () => {
  return {
    maxPinnedPosts: 0,
    currentlyPinnedPosts: 0,
  }
}

export const mutations = {
  pinPost(state) {
    state.currentlyPinnedPosts++
  },
  unpinPost(state) {
    state.currentlyPinnedPosts--
  },
  setMaxPinnedPosts(state, value) {
    state.maxPinnedPosts = value
  },
  setCurrentlyPinnedPosts(state, value) {
    state.currentlyPinnedPosts = value
  },
}

export const getters = {
  maxPinnedPosts(state) {
    return state.maxPinnedPosts
  },
  currentlyPinnedPosts(state) {
    return state.currentlyPinnedPosts
  },
}

export const actions = {
  async fetch({ commit }) {
    const client = this.app.apolloProvider.defaultClient
    const {
      data: { PostsPinnedCounts },
    } = await client.query({ query: postsPinnedCountsQuery() })
    commit('setMaxPinnedPosts', PostsPinnedCounts.maxPinnedPosts)
    commit('setCurrentlyPinnedPosts', PostsPinnedCounts.currentlyPinnedPosts)
  },
}
