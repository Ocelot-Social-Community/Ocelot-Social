<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">
      {{ $t('moderation.name') }}
    </h1>
    <div class="ds-flex ds-flex-gap-small moderation-layout">
      <div class="moderation-layout__sidebar">
        <os-menu :routes="routes" link-tag="router-link" />
      </div>
      <div class="moderation-layout__main">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsMenu } from '@ocelot-social/ui'
import { mapGetters } from 'vuex'

export default {
  components: {
    OsMenu,
  },
  // Area access is group-driven (any moderation-group permission); each entry below
  // gates on its own permission.
  middleware: ['canAccessModeration'],
  computed: {
    ...mapGetters({
      isModerator: 'auth/isModerator',
      canManageUsers: 'auth/canManageUsers',
    }),
    routes() {
      const routes = []
      if (this.isModerator) {
        routes.push({
          name: this.$t('moderation.reports.name'),
          path: `/moderation`,
        })
      }
      if (this.canManageUsers) {
        routes.push({
          name: this.$t('moderation.users.name'),
          path: `/moderation/users`,
        })
      }
      return routes
    },
  },
}
</script>

<style lang="scss">
.moderation-layout__sidebar,
.moderation-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .moderation-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .moderation-layout__main {
    flex: 1 0 0;
  }
}
</style>
