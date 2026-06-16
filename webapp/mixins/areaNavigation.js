// Shared sidebar/redirect logic for the permission-gated areas (admin, moderation).
//
// The host component provides `allRoutes` — [{ name, path, permissions: [keys],
// policy?: key }] — where a route is accessible if it requires no permission, the
// viewer holds ANY of its permissions, and (if set) its policy flag is on.
//
// On entering the area (and on every route change) we redirect away from an
// inaccessible route to the FIRST accessible one, so a viewer never lands on a page
// they can't use (e.g. the admin dashboard without network.statistics.read). If NO
// route is accessible (possible in moderation), `areaHasNoAccessibleRoute` is true and
// the layout shows an error state instead.
export default {
  computed: {
    // The routes the current viewer may actually open — drives the sidebar.
    accessibleRoutes() {
      return this.allRoutes.filter((route) => this.canAccessRoute(route))
    },
    areaHasNoAccessibleRoute() {
      return this.accessibleRoutes.length === 0
    },
  },
  created() {
    this.ensureAccessibleRoute()
  },
  watch: {
    '$route.path'() {
      this.ensureAccessibleRoute()
    },
  },
  methods: {
    canAccessRoute(route) {
      if (route.policy && !this.$policy.get(route.policy)) return false
      return (
        !route.permissions ||
        route.permissions.length === 0 ||
        route.permissions.some((permission) => this.$can(permission))
      )
    },
    // Redirect to the first accessible route when the current one is a known but
    // inaccessible area page. Client-only: a server-side replace mid-render is fragile,
    // and the area is reached by in-app navigation anyway. Unknown sub-routes (e.g.
    // detail pages) are left untouched; with no accessible route we render the error.
    ensureAccessibleRoute() {
      if (process.server) return
      const accessible = this.accessibleRoutes
      if (!accessible.length) return
      const current = this.allRoutes.find((route) => route.path === this.$route?.path)
      if (current && !this.canAccessRoute(current) && this.$route.path !== accessible[0].path) {
        this.$router.replace(accessible[0].path).catch(() => {})
      }
    },
  },
}
