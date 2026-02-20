<template>
  <div>
    <div class="ds-mb-large">
      <os-card>
        <h2 class="title">{{ $t('settings.muted-users.name') }}</h2>
        <p class="ds-text">
          {{ $t('settings.muted-users.explanation.intro') }}
        </p>
        <ul class="ds-list">
          <li class="ds-list-item">
            {{ $t('settings.muted-users.explanation.your-perspective') }}
          </li>
          <li class="ds-list-item">
            {{ $t('settings.muted-users.explanation.search') }}
          </li>
        </ul>
      </os-card>
    </div>
    <os-card v-if="mutedUsers && mutedUsers.length">
      <div class="ds-table-wrap">
        <table
          class="ds-table ds-table-condensed ds-table-bordered"
          cellpadding="0"
          cellspacing="0"
        >
          <thead>
            <tr>
              <th class="ds-table-head-col"></th>
              <th class="ds-table-head-col">{{ $t('settings.muted-users.columns.name') }}</th>
              <th class="ds-table-head-col">{{ $t('settings.muted-users.columns.slug') }}</th>
              <th class="ds-table-head-col">{{ $t('settings.muted-users.columns.unmute') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in mutedUsers" :key="user.id">
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
                  data-test="unmute-btn"
                  variant="primary"
                  appearance="outline"
                  circle
                  size="sm"
                  :loading="unmutingUserId === user.id"
                  :aria-label="$t('settings.muted-users.columns.unmute')"
                  @click="unmuteUser(user)"
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
          {{ $t('settings.muted-users.empty') }}
        </div>
      </div>
      <div class="ds-mb-large">
        <p class="ds-text ds-text-center">
          {{ $t('settings.muted-users.how-to') }}
        </p>
      </div>
    </os-card>
  </div>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mutedUsers, unmuteUser } from '~/graphql/settings/MutedUsers'
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
      mutedUsers: [],
      unmutingUserId: null,
    }
  },
  apollo: {
    mutedUsers: { query: mutedUsers, fetchPolicy: 'cache-and-network' },
  },
  methods: {
    async unmuteUser(user) {
      this.unmutingUserId = user.id
      try {
        await this.$apollo.mutate({
          mutation: unmuteUser(),
          variables: { id: user.id },
        })
        this.$apollo.queries.mutedUsers.refetch()
        const { name } = user
        this.$toast.success(this.$t('settings.muted-users.unmuted', { name }))
      } catch (error) {
        this.$toast.error(error.message)
      } finally {
        this.unmutingUserId = null
      }
    },
  },
}
</script>

<style lang="scss">
</style>
