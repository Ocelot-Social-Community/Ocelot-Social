<template>
  <div>
    <h1 class="ds-heading ds-heading-h1">{{ $t('admin.name') }}</h1>
    <div class="ds-flex ds-flex-gap-small admin-layout">
      <div class="admin-layout__sidebar">
        <ds-menu :routes="routes" :is-exact="() => true" />
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
export default {
  middleware: ['isAdmin'],
  computed: {
    routes() {
      return [
        {
          name: this.$t('admin.dashboard.name'),
          path: `/admin`,
        },
        {
          name: this.$t('admin.users.name'),
          path: `/admin/users`,
        },
        // TODO implement
        /* {
          name: this.$t('admin.organizations.name'),
          path: `/admin/organizations`
        }, */
        // TODO implement
        /* {
          name: this.$t('admin.pages.name'),
          path: `/admin/pages`
        }, */
        // TODO implement
        /* {
          name: this.$t('admin.notifications.name'),
          path: `/admin/notifications`
        }, */
        {
          name: this.$t('admin.categories.name'),
          path: `/admin/categories`,
        },
        {
          name: this.$t('admin.hashtags.name'),
          path: `/admin/hashtags`,
        },
        {
          name: this.$t('admin.invites.name'),
          path: `/admin/invite`,
        },
        {
          name: this.$t('admin.donations.name'),
          path: '/admin/donations',
        },
        // TODO implement
        /* {
          name: this.$t('admin.settings.name'),
          path: `/admin/settings`
        } */
      ]
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
