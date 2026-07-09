// Injects $policy.get('key') for synchronous template access.
// The Vuex 'policy' module is the authoritative store; this is just a sugar layer.

export default ({ store }, inject) => {
  inject('policy', {
    // Effective value: folds the policy→policy gate (e.g. showGroupButtonInHeader is off
    // while groupsEnabled is off), so app consumers never have to combine keys by hand.
    // The admin policy tab reads the raw 'policy/get' / 'policy/snapshot' getters directly.
    get(key) {
      return store.getters['policy/getEffective'](key)
    },
    snapshot() {
      return store.getters['policy/snapshot']
    },
  })
}
