<template>
  <div class="settings-page">
    <div class="settings-header">
      <h1 class="ds-heading ds-heading-h1">{{ $t('settings.name') }}</h1>
    </div>
    <div class="settings-layout">
      <div class="settings-menu-desktop">
        <os-menu :routes="routes" :is-exact="() => true" link-tag="router-link" />
      </div>
      <div class="settings-menu-mobile">
        <select
          class="settings-select"
          :value="$route.path"
          :aria-label="$t('settings.name')"
          @change="$router.push($event.target.value)"
        >
          <option v-for="route in routes" :key="route.path" :value="route.path">
            {{ route.name }}
          </option>
        </select>
      </div>
      <div class="settings-content" id="settings-content">
        <transition name="slide-up" appear>
          <nuxt-child />
        </transition>
      </div>
    </div>
  </div>
</template>

<script>
import { OsMenu } from '@ocelot-social/ui'

export default {
  components: {
    OsMenu,
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
        {
          name: this.$t('settings.social-media.name'),
          path: `/settings/my-social-media`,
        },
        ...(this.$env.INVITE_REGISTRATION === true
          ? [{ name: this.$t('settings.invites.name'), path: `/settings/invites` }]
          : []),
        ...(this.$env.API_KEYS_ENABLED === true
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

      if (this.$env.BADGES_ENABLED) {
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

<style scoped lang="scss">
.settings-header {
  margin-top: $space-base;
  margin-bottom: $space-x-small;
}

.settings-layout {
  display: flex;
  flex-direction: column;
  gap: $space-xx-small;
}

.settings-menu-desktop {
  display: none;
  width: 200px;
  flex-shrink: 0;
}

.settings-menu-mobile {
  display: block;
  margin-bottom: $space-small;
}

.settings-select {
  width: 100%;
  padding: $space-x-small $space-large $space-x-small $space-small;
  font-size: $font-size-base;
  border: 1px solid $color-neutral-80;
  border-radius: $border-radius-base;
  background-color: white;
  color: $text-color-base;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234b4554' d='M1.41 0L6 4.58 10.59 0 12 1.41l-6 6-6-6z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right $space-small center;
  cursor: pointer;

  &:focus {
    outline: 1px dashed $color-primary;
    outline-offset: -1px;
  }
}

.settings-content {
  flex: 1;
  min-width: 0;
}

@media screen and (min-width: 600px) {
  .settings-header {
    margin-bottom: $space-small;
  }

  .settings-layout {
    flex-direction: row;
    gap: $space-small;
  }

  .settings-menu-desktop {
    display: block;
  }

  .settings-menu-mobile {
    display: none;
  }

  .settings-content {
    padding: 0 $space-base;
  }
}
</style>
