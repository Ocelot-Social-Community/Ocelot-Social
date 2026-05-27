// Client-only: opens a single GraphQL subscription on policyChanged so the
// Vuex policy store updates live across all connected clients/tabs.

export default ({ store }) => {
  store.dispatch('policy/subscribe')
}
