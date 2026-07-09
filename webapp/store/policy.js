import PolicyQuery from '~/graphql/PolicyQuery'
import PolicyDefaultsQuery from '~/graphql/PolicyDefaultsQuery'
import PolicySubscription from '~/graphql/PolicySubscription'
import {
  setPolicyMutation,
  resetPolicyMutation,
  resetPoliciesMutation,
} from '~/graphql/PolicyMutations'

// Extract { actor, timestamp } from a mutation result / policyDefaults.lastChange.
const toLastChange = (event) => (event ? { actor: event.actor, timestamp: event.timestamp } : null)

// Build a key→value map from a backend policy response. The backend returns a
// key/value list ({ key, value }) covering every recognised policy key, so the map
// always reflects the full backend key set — no hand-maintained field list to drift.
// The value is JSON-encoded (heterogeneous types: boolean / integer), matching the
// live subscription payload; we parse it here. A key the viewer may not see comes
// back with a null value and is passed through as null — boolean consumers treat
// null as falsy ("off"), integer consumers fall back defensively (e.g.
// `value || default`). The frontend keeps NO config defaults of its own (single
// source of truth is the backend); we never inject a frontend default value here.
const normalize = (entries) => {
  const out = {}
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || entry.key === '__typename') continue
    if (entry.value == null) {
      out[entry.key] = null
      continue
    }
    try {
      out[entry.key] = JSON.parse(entry.value)
    } catch (err) {
      // Guard each value like setKey/resetKeys do: a single unparseable value must not throw
      // and take the whole snapshot down — init()'s catch would then discard even the public
      // keys. Fall back to null (the same safe default a not-visible key gets), keeping the
      // rest of the snapshot intact.
      out[entry.key] = null
    }
  }
  return out
}

// The policy→policy dependency map (key → other keys that gate it). Static schema metadata
// carried on each policy entry, so $policy.get can re-fold the effective value client-side
// (a layout toggle respects its feature gate). Deps never change at runtime, so only the
// full snapshot fetch sets them; the value-only live subscription leaves them untouched.
const normalizeDeps = (entries) => {
  const out = {}
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || entry.key === '__typename') continue
    out[entry.key] = Array.isArray(entry.requiresPolicy) ? entry.requiresPolicy : []
  }
  return out
}

export const state = () => ({
  snapshot: {},
  deps: {},
  defaults: {},
  lastChange: null,
  isInitialized: false,
  subscriptionActive: false,
})

export const mutations = {
  SET_SNAPSHOT(state, snapshot) {
    state.snapshot = normalize(snapshot)
    state.deps = normalizeDeps(snapshot)
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
  // The policy→policy dependency map (key → keys that gate it). Static schema metadata the
  // admin policy tab reads to fold availability live (grey a dependent key when its
  // dependency is off), so a toggle reacts without refetching the policyConfig metadata.
  deps(state) {
    return state.deps
  },
  // Raw stored value — the admin policy tab edits this (it must distinguish "toggled off"
  // from "gated off by a dependency"). App consumers use getEffective via $policy.get.
  get: (state) => (key) => state.snapshot[key],
  // Effective value with the policy→policy gate folded in (mirrors the backend
  // getEffective): a boolean key whose any required policy is not effectively on folds to
  // false. Non-boolean / non-true values pass through unchanged. Recurses over the dep
  // graph (validated acyclic on the backend, so it terminates).
  getEffective: (state, getters) => (key) => {
    const value = state.snapshot[key]
    if (value !== true) return value
    for (const dependency of state.deps[key] || []) {
      if (getters.getEffective(dependency) !== true) return false
    }
    return true
  },
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

// The live policyChanged subscription handle (one client per browser tab). Kept
// at module scope so a forced websocket restart can tear it down and re-open a
// fresh one: $apolloHelpers.onLogin/onLogout call restartWebsockets(), which
// closes the socket and *resends the operation without its handler* — so the old
// observable goes silent and live updates stop arriving until a full page
// reload. Only a brand-new apolloClient.subscribe() re-registers a live handler
// on the new connection. (A plain auto-reconnect keeps handlers, so this only
// bites the login/logout path.)
let policySubscription = null

const openPolicySubscription = (store, commit) => {
  const observable = apolloClient(store).subscribe({ query: PolicySubscription() })
  policySubscription = observable.subscribe({
    next({ data }) {
      const event = data?.policyChanged
      if (!event) return
      try {
        // Value-only notification: update the live snapshot. The last-change
        // line is not updated live (it refreshes from policyDefaults on the
        // next fetch) — the broadcast carries no actor/timestamp.
        commit('PATCH_KEY', { key: event.key, value: JSON.parse(event.value) })
      } catch (err) {
        // Ignore malformed event payloads.
      }
    },
    error() {
      commit('SET_SUBSCRIPTION_ACTIVE', false)
    },
  })
  commit('SET_SUBSCRIPTION_ACTIVE', true)
}

export const actions = {
  // Fetches the viewer-scoped snapshot. Re-dispatched whenever the auth state
  // changes (after login / logout) so authenticated keys appear / reset without
  // a full page reload — the single query returns exactly what the current
  // viewer may see.
  async init({ commit, state }) {
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
      // A failed refetch must NOT wipe a known-good snapshot. Around login the
      // websocket reconnect triggers a second init() whose in-flight query is
      // aborted by Apollo's resetStore ("Store reset while query was in flight");
      // wiping to {} here would drop public keys (e.g. inviteRegistration) the
      // first init already loaded, hiding the header invite button until the next
      // change event. Only fall back to "everything off" on the very first load
      // (nothing to preserve); otherwise keep the last snapshot and let the next
      // successful init / change event re-sync.
      if (!state.isInitialized) {
        commit('SET_SNAPSHOT', [])
      }
    }
  },

  // Admin-only: the configured defaults (ENV/schema) each key resets to, plus
  // the most recent change (who + when). One admin round-trip; the backend gates
  // access (isAdmin). Used by the admin policy UI.
  async fetchDefaults({ commit }) {
    const {
      data: { policyDefaults },
    } = await apolloClient(this).query({
      query: PolicyDefaultsQuery(),
      fetchPolicy: 'network-only',
    })
    commit('SET_DEFAULTS', policyDefaults.defaults)
    commit('SET_LAST_CHANGE', toLastChange(policyDefaults.lastChange))
    return policyDefaults
  },

  async setKey({ commit }, { key, value }) {
    const {
      data: { setPolicy },
    } = await apolloClient(this).mutate({
      mutation: setPolicyMutation(),
      variables: { key, value: JSON.stringify(value) },
    })
    // Local optimistic update — backend pubsub will broadcast to other tabs.
    // Guard the parse so a single unexpected value can't crash the action; the
    // subscription still delivers the authoritative value (same defensiveness as
    // the subscribe handler below).
    try {
      commit('PATCH_KEY', { key: setPolicy.key, value: JSON.parse(setPolicy.value) })
    } catch (err) {
      // Ignore an unparseable value.
    }
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
    try {
      commit('PATCH_KEY', { key: resetPolicy.key, value: JSON.parse(resetPolicy.value) })
    } catch (err) {
      // Ignore an unparseable value; the subscription delivers the authoritative one.
    }
    commit('SET_LAST_CHANGE', toLastChange(resetPolicy))
    return resetPolicy
  },

  // Reset several keys in one round-trip (the admin "reset all" button). The backend only
  // returns events for keys that actually diverged, so patch each of those locally; the
  // pubsub broadcast delivers the authoritative values to other tabs.
  async resetKeys({ commit }, { keys }) {
    const {
      data: { resetPolicies },
    } = await apolloClient(this).mutate({
      mutation: resetPoliciesMutation(),
      variables: { keys },
    })
    for (const event of resetPolicies) {
      try {
        commit('PATCH_KEY', { key: event.key, value: JSON.parse(event.value) })
      } catch (err) {
        // Ignore an unparseable value; the subscription delivers the authoritative one.
      }
    }
    if (resetPolicies.length) {
      commit('SET_LAST_CHANGE', toLastChange(resetPolicies[resetPolicies.length - 1]))
    }
    return resetPolicies
  },

  // Subscribes once per client to policyChanged. Idempotent — repeated calls
  // are no-ops. Updates the local snapshot when any backend instance publishes
  // a change (including this client's own mutation).
  subscribe({ commit, state }) {
    if (state.subscriptionActive) {
      return
    }
    openPolicySubscription(this, commit)
  },

  // Re-open the subscription after a forced websocket restart (login / logout).
  // restartWebsockets() drops the previous operation's handler, so the existing
  // observable receives nothing — tear it down and open a fresh subscription on
  // the new connection. Without this, live policy changes stop arriving after a
  // client-side login until the user does a full page reload.
  resubscribe({ commit }) {
    if (policySubscription) {
      policySubscription.unsubscribe?.()
      policySubscription = null
    }
    commit('SET_SUBSCRIPTION_ACTIVE', false)
    openPolicySubscription(this, commit)
  },
}
