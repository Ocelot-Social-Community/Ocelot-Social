<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="ds-heading ds-heading-h1">{{ $t('settings.name') }}</h1>
    </div>
    <div class="settings-layout">
      <area-menu :routes="routes" :is-exact="() => true" :aria-label="$t('settings.name')" />
      <div class="settings-content" id="settings-content">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import AreaMenu from '~/components/_new/generic/AreaMenu/AreaMenu'

export default {
  components: {
    AreaMenu,
  },
  computed: {
    routes() {
      const routes = [
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
        ...(this.$policy.get('socialMediaEnabled')
          ? [{ name: this.$t('settings.social-media.name'), path: `/settings/my-social-media` }]
          : []),
        ...(this.$policy.get('inviteRegistration') === true
          ? [{ name: this.$t('settings.invites.name'), path: `/settings/invites` }]
          : []),
        ...(this.$policy.get('apiKeysEnabled')
          ? [{ name: this.$t('settings.api-keys.name'), path: `/settings/api-keys` }]
          : []),
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

      if (this.$policy.get('badgesEnabled')) {
        routes.splice(2, 0, {
          name: this.$t('settings.badges.name'),
          path: `/settings/badges`,
        })
      }

      return routes
    },
  },
}
</script>

<style scoped>
.settings-header {
  margin-top: var(--space-base);
  margin-bottom: var(--space-x-small);
}

.settings-layout {
  display: flex;
  flex-direction: column;
  gap: var(--space-xx-small);
}

.settings-content {
  flex: 1;
  min-width: 0;
}

@media (--vp-small-up) {
  .settings-header {
    margin-bottom: var(--space-small);
  }

  .settings-layout {
    flex-direction: row;
    gap: var(--space-small);
  }

  .settings-content {
    padding: 0 var(--space-base);
  }
}
</style>
