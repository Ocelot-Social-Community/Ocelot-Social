// Client-only: opens a single GraphQL subscription on permissionsChanged so the
// viewer's effective permissions (admin/moderation menus, $can gates) refresh live
// when an admin changes a role's permissions or a user's role assignment — no reload.

export default ({ store, app }) => {
  store.dispatch('auth/subscribePermissions')

  // On websocket reconnect, refetch permissions once: any permissionsChanged events
  // that fired while the socket was down were missed. Cheap (one query).
  const wsClient = app.apolloProvider?.defaultClient?.wsClient
  if (wsClient) {
    wsClient.on('reconnected', () => store.dispatch('auth/refreshPermissions'))
  }
}
