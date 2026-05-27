import PolicyQuery from '~/graphql/PolicyQuery'
import AdminPolicyQuery from '~/graphql/AdminPolicyQuery'
import PolicySubscription from '~/graphql/PolicySubscription'
import { setPolicyMutation, resetPolicyMutation } from '~/graphql/PolicyMutations'

// Mirrors backend NetworkPolicy schema. Defaults match the schema's "default"
// fields — used until the backend snapshot is loaded.
const DEFAULTS = Object.freeze({
  publicRegistration: false,
  inviteRegistration: true,
  categoriesActive: false,
  apiKeysEnabled: false,
})

export const state = () => ({
  snapshot: { ...DEFAULTS },
  isInitialized: false,
  subscriptionActive: false,
})

export const mutations = {
  SET_SNAPSHOT(state, snapshot) {
    state.snapshot = { ...DEFAULTS, ...snapshot }
  },
  PATCH_KEY(state, { key, value }) {
    state.snapshot = { ...state.snapshot, [key]: value }
  },
  SET_INITIALIZED(state, value = true) {
    state.isInitialized = value
  },
  SET_SUBSCRIPTION_ACTIVE(state, value) {
    state.subscriptionActive = value
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

const apolloClient = (ctx) => ctx.app.apolloProvider.defaultClient

export const actions = {
  async init({ commit }) {
    try {
      const {
        data: { publicPolicy },
      } = await apolloClient(this).query({
        query: PolicyQuery(),
        fetchPolicy: 'network-only',
      })
      commit('SET_SNAPSHOT', publicPolicy)
      commit('SET_INITIALIZED')
    } catch (err) {
      // Fall back to defaults; non-fatal so SSR can still render
      // (login/register screens degrade gracefully).
      commit('SET_SNAPSHOT', DEFAULTS)
      commit('SET_INITIALIZED', false)
    }
  },

  async fetchAdmin({ commit }) {
    const {
      data: { adminPolicy },
    } = await apolloClient(this).query({
      query: AdminPolicyQuery(),
      fetchPolicy: 'network-only',
    })
    commit('SET_SNAPSHOT', adminPolicy)
    return adminPolicy
  },

  async setKey({ commit }, { key, value }) {
    const {
      data: { setPolicy },
    } = await apolloClient(this).mutate({
      mutation: setPolicyMutation(),
      variables: { key, value: JSON.stringify(value) },
    })
    // Local optimistic update — backend pubsub will broadcast to other tabs.
    commit('PATCH_KEY', { key: setPolicy.key, value: JSON.parse(setPolicy.value) })
    return setPolicy
  },

  async resetKey({ commit }, { key }) {
    const {
      data: { resetPolicy },
    } = await apolloClient(this).mutate({
      mutation: resetPolicyMutation(),
      variables: { key },
    })
    commit('PATCH_KEY', { key: resetPolicy.key, value: JSON.parse(resetPolicy.value) })
    return resetPolicy
  },

  // Subscribes once per client to policyChanged. Idempotent — repeated calls
  // are no-ops. Updates the local snapshot when any backend instance publishes
  // a change (including this client's own mutation).
  subscribe({ commit, state }) {
    if (state.subscriptionActive) {
      // eslint-disable-next-line no-console
      console.log('[policy] subscribe(): already active, skipping')
      return
    }
    // eslint-disable-next-line no-console
    console.log('[policy] subscribe(): opening GraphQL subscription')
    const observable = apolloClient(this).subscribe({ query: PolicySubscription() })
    observable.subscribe({
      next({ data }) {
        // eslint-disable-next-line no-console
        console.log('[policy] subscription next:', JSON.stringify(data))
        const event = data?.policyChanged
        if (!event) return
        try {
          commit('PATCH_KEY', { key: event.key, value: JSON.parse(event.value) })
          // eslint-disable-next-line no-console
          console.log('[policy] PATCH_KEY committed:', event.key, '=', event.value)
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[policy] PATCH_KEY failed:', err)
        }
      },
      error(err) {
        // eslint-disable-next-line no-console
        console.warn('[policy] subscription error:', err)
        commit('SET_SUBSCRIPTION_ACTIVE', false)
      },
    })
    commit('SET_SUBSCRIPTION_ACTIVE', true)
  },
}
