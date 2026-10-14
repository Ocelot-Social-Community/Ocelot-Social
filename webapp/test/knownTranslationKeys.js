import Vue from 'vue'
import english from '~/locales/en.json'

// Specs mock `$t`, mostly as an echo (`(key) => key`), so a key no locale defines renders and
// asserts exactly like one that exists — CI stayed green while the roles page showed raw keys
// (#10386). This mixin puts a check in front of whatever `$t` a spec mocks: a key that en.json
// does not define fails the test. The mock's own behaviour and its call record stay as they were.
//
// Unlike the lint (`no-missing-keys`), this sees keys built at runtime, as far as a test renders
// them. en.json is the reference; the lint holds the other locales to its keys.

const isKnownKey = (key) => {
  let node = english
  for (const segment of key.split('.')) {
    if (node === null || typeof node !== 'object' || !Object.hasOwn(node, segment)) return false
    node = node[segment]
  }
  return typeof node === 'string'
}

Vue.mixin({
  beforeCreate() {
    const translate = this.$t
    // No `$t` (a spec that renders no text) or one this mixin already wrapped (an ancestor's).
    if (typeof translate !== 'function' || translate.checksKnownKeys) return
    const checked = function (key, ...rest) {
      if (typeof key === 'string' && !isKnownKey(key)) {
        throw new Error(`Translation key '${key}' is not defined in locales/en.json`)
      }
      return translate.call(this, key, ...rest)
    }
    checked.checksKnownKeys = true
    this.$t = checked
  },
})
