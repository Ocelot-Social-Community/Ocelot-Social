<template>
  <div>
    <ds-space margin="small">
      <ds-heading tag="h1">{{ $t('settings.name') }}</ds-heading>
    </ds-space>
    <ds-space margin="large" />
    <ds-flex gutter="small">
      <div class="menu-container">
        <ds-menu :routes="routes" :is-exact="() => true" />
      </div>
      <div class="settings-content" id="settings-content">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </ds-flex>
  </div>
</template>

<script>
export default {
  computed: {
    routes() {
      return [
        {
          name: this.$t('settings.data.name'),
          path: `/settings`,
        },
        {
          name: this.$t('settings.email.name'),
          path: `/settings/my-email-address`,
        },
        {
          name: this.$t('settings.security.name'),
          path: `/settings/security`,
        },
        {
          name: this.$t('settings.privacy.name'),
          path: '/settings/privacy',
        },
        {
          name: this.$t('settings.social-media.name'),
          path: `/settings/my-social-media`,
        },
        {
          name: this.$t('settings.muted-users.name'),
          path: `/settings/muted-users`,
        },
        {
          name: this.$t('settings.blocked-users.name'),
          path: `/settings/blocked-users`,
        },
        {
          name: this.$t('settings.embeds.name'),
          path: `/settings/embeds`,
        },
        {
          name: this.$t('settings.notifications.name'),
          path: '/settings/notifications',
        },
        {
          name: this.$t('settings.download.name'),
          path: `/settings/data-download`,
        },
        {
          name: this.$t('settings.deleteUserAccount.name'),
          path: `/settings/delete-account`,
        },
        // TODO implement
        /* {
            name: this.$t('settings.invites.name'),
            path: `/settings/invites`
            }, */
        // TODO implement
        /* {
            name: this.$t('settings.organizations.name'),
            path: `/settings/my-organizations`
            }, */
        // TODO implement
        /* {
            name: this.$t('settings.languages.name'),
            path: `/settings/languages`
            },
            } */
      ]
    },
  },
}
</script>

<style scoped>
.menu-container {
  width: 100%
}
.settings-content {
  flex: 1;
  padding: 0 24px;
  margin-top: 32px;
}

@media screen and (min-width: 600px) {
  .settings-content {
    margin-top: 0;
  }

  .menu-container {
    width: 200px;
  }
}
</style>
