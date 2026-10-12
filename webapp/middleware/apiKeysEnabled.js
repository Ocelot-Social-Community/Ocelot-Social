// Route guard for API keys. When the apiKeysEnabled network policy is off, the backend refuses
// myApiKeys — and during server-side rendering that refusal failed the whole page with "Server
// error" for anybody who still had /settings/api-keys bookmarked. The settings menu already
// drops the entry; this closes the direct URL the same way groupsEnabled does for groups, by
// sending the viewer back to the settings they came for rather than showing a 403: the feature
// is off for the network, nothing is forbidden to this user.
export default ({ store, redirect }) => {
  if (store.getters['policy/getEffective']('apiKeysEnabled') !== true) {
    return redirect('/settings')
  }
}
