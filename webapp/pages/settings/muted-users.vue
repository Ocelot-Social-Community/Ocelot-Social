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
      <ds-table :data="mutedUsers" :fields="fields" condensed>
        <template #avatar="scope">
          <nuxt-link
            :to="{
              name: 'profile-id-slug',
              params: { id: scope.row.id, slug: scope.row.slug },
            }"
          >
            <profile-avatar :profile="scope.row" size="small" />
          </nuxt-link>
        </template>
        <template #name="scope">
          <nuxt-link
            :to="{
              name: 'profile-id-slug',
              params: { id: scope.row.id, slug: scope.row.slug },
            }"
          >
            <b>{{ scope.row.name | truncate(20) }}</b>
          </nuxt-link>
        </template>
        <template #slug="scope">
          <nuxt-link
            :to="{
              name: 'profile-id-slug',
              params: { id: scope.row.id, slug: scope.row.slug },
            }"
          >
            <b>{{ scope.row.slug | truncate(20) }}</b>
          </nuxt-link>
        </template>

        <template #unmuteUser="scope">
          <os-button
            data-test="unmute-btn"
            variant="primary"
            appearance="outline"
            circle
            size="sm"
            :aria-label="$t('settings.muted-users.columns.unmute')"
            @click="unmuteUser(scope)"
          >
            <template #icon><os-icon :icon="icons.userPlus" /></template>
          </os-button>
        </template>
      </ds-table>
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
    }
  },
  computed: {
    fields() {
      return {
        avatar: '',
        name: this.$t('settings.muted-users.columns.name'),
        slug: this.$t('settings.muted-users.columns.slug'),
        unmuteUser: this.$t('settings.muted-users.columns.unmute'),
      }
    },
  },
  apollo: {
    mutedUsers: { query: mutedUsers, fetchPolicy: 'cache-and-network' },
  },
  methods: {
    async unmuteUser(user) {
      await this.$apollo.mutate({
        mutation: unmuteUser(),
        variables: { id: user.row.id },
      })
      this.$apollo.queries.mutedUsers.refetch()
      const { name } = user.row
      this.$toast.success(this.$t('settings.muted-users.unmuted', { name }))
    },
  },
}
</script>

<style lang="scss">
.ds-table-col {
  vertical-align: middle;
}
</style>
