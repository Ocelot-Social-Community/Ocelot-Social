import Vue from 'vue'

import PermissionGate from '~/components/_new/generic/PermissionGate/PermissionGate.vue'

// The "hide" primitive, available everywhere as <permission-gate permission="x">.
// (The "gray out" pattern is applied directly on the element: $can('x') drives a
// `.permission-denied` class + tooltip, which works for positioned/fixed buttons too.)
Vue.component('PermissionGate', PermissionGate)

// Injects $can('permission.key') for synchronous template access (mirrors $policy)
// — the "gray out" primitive: :disabled="!$can('x')". The Vuex 'auth' module
// (myPermissions) is the authoritative store; this is sugar.
export default ({ store }, inject) => {
  inject('can', (permission) => store.getters['auth/can'](permission))
}
