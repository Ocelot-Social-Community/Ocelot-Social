import { networkRoleLabel } from '~/utils/networkRoles'

// `networkRoleLabel(name)` for the admin pages, which show a custom role's name as it was typed,
// and `networkRoleTitle(name)` for the menus, which have always title-cased it.
export default {
  methods: {
    networkRoleLabel(name) {
      return networkRoleLabel(name, (key) => this.$t(key))
    },
    networkRoleTitle(name) {
      return networkRoleLabel(name, (key) => this.$t(key), this.$options.filters.camelCase)
    },
  },
}
