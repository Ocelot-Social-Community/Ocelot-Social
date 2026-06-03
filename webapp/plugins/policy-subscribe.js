// Client-only: opens a single GraphQL subscription on policyChanged so the
// Vuex policy store updates live across all connected clients/tabs.

export default ({ store, app }) => {
  store.dispatch('policy/subscribe')

  // On websocket reconnect, refetch the snapshot once: any policyChanged events
  // that fired while the socket was down were missed, so re-pull the current
  // policy to close that staleness gap. Cheap (one query), and only on reconnect.
  const wsClient = app.apolloProvider?.defaultClient?.wsClient
  if (wsClient) {
    wsClient.on('reconnected', () => store.dispatch('policy/init'))
  }
}
