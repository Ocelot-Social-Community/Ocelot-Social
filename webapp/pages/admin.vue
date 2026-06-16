<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">{{ $t('admin.name') }}</h1>
    <os-card v-if="areaHasNoAccessibleRoute">
      <div class="ds-mb-large ds-space-centered">
        <div class="ds-mb-large">
          <img :src="errorIconPath" width="40" />
        </div>
        <p class="ds-text">{{ $t('site.error-occurred') }}</p>
      </div>
    </os-card>
    <div v-else class="ds-flex ds-flex-gap-small admin-layout">
      <div class="admin-layout__sidebar">
        <os-menu
          :routes="accessibleRoutes"
          :matcher="matcher"
          :is-exact="() => true"
          link-tag="router-link"
        />
      </div>
      <div class="admin-layout__main">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsCard, OsMenu } from '@ocelot-social/ui'
import areaNavigation from '~/mixins/areaNavigation'

export default {
  components: {
    OsCard,
    OsMenu,
  },
  mixins: [areaNavigation],
  middleware: ['isAdmin'],
  data() {
    return {
      errorIconPath: '/img/svg/emoji/cry.svg',
    }
  },
  computed: {
    // Every admin tab with the permission(s) that make its page usable. The
    // areaNavigation mixin filters this to accessibleRoutes (sidebar) and redirects
    // away from a tab the viewer can't use. Categories/hashtags are open read pages
    // (no dedicated permission); invite maps to role.manage (admin-initiated signup).
    allRoutes() {
      return [
        {
          name: this.$t('admin.dashboard.name'),
          path: '/admin',
          permissions: ['network.statistics.read'],
        },
        {
          name: this.$t('admin.users.name'),
          path: '/admin/users',
          permissions: ['user.email.readAny', 'role.manage', 'badge.manage', 'user.delete.any'],
        },
        {
          name: this.$t('admin.categories.name'),
          path: '/admin/categories',
          permissions: [],
        },
        {
          name: this.$t('admin.hashtags.name'),
          path: '/admin/hashtags',
          permissions: [],
        },
        {
          name: this.$t('admin.invites.name'),
          path: '/admin/invite',
          permissions: ['role.manage'],
        },
        {
          name: this.$t('admin.donations.name'),
          path: '/admin/donations',
          permissions: ['donation.manage'],
        },
        {
          name: this.$t('admin.policy.name'),
          path: '/admin/policy',
          permissions: ['policy.manage'],
        },
        {
          name: this.$t('admin.roles.name'),
          path: '/admin/roles',
          permissions: ['role.manage'],
        },
        {
          name: this.$t('admin.api-keys.name'),
          path: '/admin/api-keys',
          permissions: ['apiKey.administer'],
          policy: 'apiKeysEnabled',
        },
      ]
    },
  },
  methods: {
    // Highlight the active item by path only, so query params (e.g. the user-list
    // ?q=… search string) don't drop the highlight.
    matcher(url) {
      return !!this.$route && this.$route.path === url
    },
  },
}
</script>

<style lang="scss">
.admin-layout__sidebar,
.admin-layout__main {
  flex: 0 0 100%;
  width: 100%;
}
@media #{$media-query-medium} {
  .admin-layout__sidebar {
    flex: 0 0 200px;
    width: 200px;
  }
  .admin-layout__main {
    flex: 1 0 0;
  }
}
</style>
