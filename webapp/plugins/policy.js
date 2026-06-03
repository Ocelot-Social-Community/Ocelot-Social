// Injects $policy.get('key') for synchronous template access.
// The Vuex 'policy' module is the authoritative store; this is just a sugar layer.

export default ({ store }, inject) => {
  inject('policy', {
    get(key) {
      return store.getters['policy/get'](key)
    },
    snapshot() {
      return store.getters['policy/snapshot']
    },
  })
}
