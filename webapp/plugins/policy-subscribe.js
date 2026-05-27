// Client-only: opens a single GraphQL subscription on policyChanged so the
// Vuex policy store updates live across all connected clients/tabs.

export default ({ store }) => {
  // eslint-disable-next-line no-console
  console.log('[policy] policy-subscribe plugin running, dispatching policy/subscribe')
  store.dispatch('policy/subscribe')
}
