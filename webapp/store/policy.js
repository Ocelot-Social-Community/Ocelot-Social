import PolicyQuery from '~/graphql/PolicyQuery'
import PolicyDefaultsQuery from '~/graphql/PolicyDefaultsQuery'
import PolicyLastChangeQuery from '~/graphql/PolicyLastChangeQuery'
import PolicySubscription from '~/graphql/PolicySubscription'
import { setPolicyMutation, resetPolicyMutation } from '~/graphql/PolicyMutations'

// Extract { actor, timestamp } from a policy change event / mutation result.
const toLastChange = (event) =>
  event ? { actor: event.actor, timestamp: event.timestamp } : null

// Build a key→value map from a backend policy response. The frontend keeps NO
// config defaults of its own (single source of truth is the backend): we just
// strip Apollo's __typename and treat any key the viewer may not see (null) as
// "off" (false), so a stale authenticated value can never linger.
const normalize = (data) => {
  const out = {}
  for (const key of Object.keys(data || {})) {
    if (key === '__typename') continue
    const value = data[key]
    out[key] = value === null || value === undefined ? false : value
  }
  return out
}

export const state = () => ({
  snapshot: {},
  defaults: {},
  lastChange: null,
  isInitialized: false,
  subscriptionActive: false,
})

export const mutations = {
  SET_SNAPSHOT(state, snapshot) {
    state.snapshot = normalize(snapshot)
  },
  SET_DEFAULTS(state, defaults) {
    state.defaults = normalize(defaults)
  },
  SET_LAST_CHANGE(state, lastChange) {
    state.lastChange = lastChange || null
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
  defaults(state) {
    return state.defaults
  },
  getDefault: (state) => (key) => state.defaults[key],
  lastChange(state) {
    return state.lastChange
  },
  isInitialized(state) {
    return state.isInitialized
  },
}

const apolloClient = (ctx) => ctx.app.apolloProvider.defaultClient

export const actions = {
  // Fetches the viewer-scoped snapshot. Re-dispatched whenever the auth state
  // changes (after login / logout) so authenticated keys appear / reset without
  // a full page reload — the single query returns exactly what the current
  // viewer may see.
  async init({ commit }) {
    try {
      const {
        data: { policy },
      } = await apolloClient(this).query({
        query: PolicyQuery(),
        fetchPolicy: 'network-only',
      })
      commit('SET_SNAPSHOT', policy)
      commit('SET_INITIALIZED')
    } catch (err) {
      // Non-fatal: render with everything off until the backend answers
      // (login/register screens degrade gracefully).
      commit('SET_SNAPSHOT', {})
      commit('SET_INITIALIZED', false)
    }
  },

  // Admin-only: the configured defaults (ENV/schema) each key resets to. The
  // backend gates access (isAdmin); used by the admin policy UI.
  async fetchDefaults({ commit }) {
    const {
      data: { policyDefaults },
    } = await apolloClient(this).query({
      query: PolicyDefaultsQuery(),
      fetchPolicy: 'network-only',
    })
    commit('SET_DEFAULTS', policyDefaults)
    return policyDefaults
  },

  // Admin-only: who last changed a policy key, and when (shown in the admin UI).
  async fetchLastChange({ commit }) {
    const {
      data: { policyLastChange },
    } = await apolloClient(this).query({
      query: PolicyLastChangeQuery(),
      fetchPolicy: 'network-only',
    })
    commit('SET_LAST_CHANGE', policyLastChange)
    return policyLastChange
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
    commit('SET_LAST_CHANGE', toLastChange(setPolicy))
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
    commit('SET_LAST_CHANGE', toLastChange(resetPolicy))
    return resetPolicy
  },

  // Subscribes once per client to policyChanged. Idempotent — repeated calls
  // are no-ops. Updates the local snapshot when any backend instance publishes
  // a change (including this client's own mutation).
  subscribe({ commit, state }) {
    if (state.subscriptionActive) {
      return
    }
    const observable = apolloClient(this).subscribe({ query: PolicySubscription() })
    observable.subscribe({
      next({ data }) {
        const event = data?.policyChanged
        if (!event) return
        try {
          commit('PATCH_KEY', { key: event.key, value: JSON.parse(event.value) })
          commit('SET_LAST_CHANGE', toLastChange(event))
        } catch (err) {
          // Ignore malformed event payloads.
        }
      },
      error() {
        commit('SET_SUBSCRIPTION_ACTIVE', false)
      },
    })
    commit('SET_SUBSCRIPTION_ACTIVE', true)
  },
}
