<template>
  <div>
    <div class="ds-mb-large">
      <os-card>
        <h2 class="title">{{ $t('settings.blocked-users.name') }}</h2>
        <p class="ds-text">
          {{ $t('settings.blocked-users.explanation.intro') }}
        </p>
        <ul class="ds-list">
          <li class="ds-list-item">
            {{ $t('settings.blocked-users.explanation.your-perspective') }}
          </li>
          <li class="ds-list-item">
            {{ $t('settings.blocked-users.explanation.their-perspective') }}
          </li>
          <li class="ds-list-item">
            {{ $t('settings.blocked-users.explanation.notifications') }}
          </li>
        </ul>
      </os-card>
    </div>
    <os-card v-if="blockedUsers && blockedUsers.length">
      <div class="ds-table-wrap">
        <table
          class="ds-table ds-table-condensed ds-table-bordered"
          cellpadding="0"
          cellspacing="0"
        >
          <thead>
            <tr>
              <th class="ds-table-head-col"></th>
              <th class="ds-table-head-col">{{ $t('settings.blocked-users.columns.name') }}</th>
              <th class="ds-table-head-col">{{ $t('settings.blocked-users.columns.slug') }}</th>
              <th class="ds-table-head-col">{{ $t('settings.blocked-users.columns.unblock') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in blockedUsers" :key="user.id">
              <td class="ds-table-col">
                <nuxt-link
                  :to="{
                    name: 'profile-id-slug',
                    params: { id: user.id, slug: user.slug },
                  }"
                >
                  <profile-avatar :profile="user" size="small" />
                </nuxt-link>
              </td>
              <td class="ds-table-col">
                <nuxt-link
                  :to="{
                    name: 'profile-id-slug',
                    params: { id: user.id, slug: user.slug },
                  }"
                >
                  <b>{{ user.name | truncate(20) }}</b>
                </nuxt-link>
              </td>
              <td class="ds-table-col">
                <nuxt-link
                  :to="{
                    name: 'profile-id-slug',
                    params: { id: user.id, slug: user.slug },
                  }"
                >
                  <b>{{ user.slug | truncate(20) }}</b>
                </nuxt-link>
              </td>
              <td class="ds-table-col">
                <os-button
                  data-test="unblock-btn"
                  variant="primary"
                  appearance="outline"
                  circle
                  size="sm"
                  :loading="unblockingUserId === user.id"
                  :aria-label="$t('settings.blocked-users.columns.unblock')"
                  @click="unblockUser(user)"
                >
                  <template #icon><os-icon :icon="icons.userPlus" /></template>
                </os-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </os-card>
    <os-card v-else>
      <div class="ds-mb-large">
        <div class="ds-placeholder">
          {{ $t('settings.blocked-users.empty') }}
        </div>
      </div>
      <p class="ds-text ds-text-center">
        {{ $t('settings.blocked-users.how-to') }}
      </p>
    </os-card>
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { blockedUsers, unblockUser } from '~/graphql/settings/BlockedUsers'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsButton,
    OsCard,
    OsIcon,
    ProfileAvatar,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      blockedUsers: [],
      unblockingUserId: null,
    }
  },
  apollo: {
    blockedUsers: { query: blockedUsers, fetchPolicy: 'cache-and-network' },
  },
  methods: {
    async unblockUser(user) {
      this.unblockingUserId = user.id
      try {
        await this.$apollo.mutate({
          mutation: unblockUser(),
          variables: { id: user.id },
        })
        this.$apollo.queries.blockedUsers.refetch()
        const { name } = user
        this.$toast.success(this.$t('settings.blocked-users.unblocked', { name }))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.unblockingUserId = null
      }
    },
  },
}
</script>

<style lang="scss">
.ds-table-col {
  vertical-align: middle;
}
</style>
