import Vue from 'vue'

import PermissionDisable from '~/components/_new/generic/PermissionDisable/PermissionDisable.vue'
import PermissionGate from '~/components/_new/generic/PermissionGate/PermissionGate.vue'

// The "hide" primitive (<permission-gate>) and the "gray out" wrapper
// (<permission-disable>), available everywhere.
Vue.component('PermissionGate', PermissionGate)
Vue.component('PermissionDisable', PermissionDisable)

// Injects $can('permission.key') for synchronous template access (mirrors $policy)
// — the "gray out" primitive: :disabled="!$can('x')". The Vuex 'auth' module
// (myPermissions) is the authoritative store; this is sugar.
export default ({ store }, inject) => {
  inject('can', (permission) => store.getters['auth/can'](permission))
}
