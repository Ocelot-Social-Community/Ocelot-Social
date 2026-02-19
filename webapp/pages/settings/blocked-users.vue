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
      <ds-table :data="blockedUsers" :fields="fields" condensed>
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

        <template #unblockUser="scope">
          <os-button
            data-test="unblock-btn"
            variant="primary"
            appearance="outline"
            circle
            size="sm"
            :loading="unblockingUserId === scope.row.id"
            :aria-label="$t('settings.blocked-users.columns.unblock')"
            @click="unblockUser(scope)"
          >
            <template #icon><os-icon :icon="icons.userPlus" /></template>
          </os-button>
        </template>
      </ds-table>
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
  computed: {
    fields() {
      return {
        avatar: '',
        name: this.$t('settings.blocked-users.columns.name'),
        slug: this.$t('settings.blocked-users.columns.slug'),
        unblockUser: this.$t('settings.blocked-users.columns.unblock'),
      }
    },
  },
  apollo: {
    blockedUsers: { query: blockedUsers, fetchPolicy: 'cache-and-network' },
  },
  methods: {
    async unblockUser(user) {
      this.unblockingUserId = user.row.id
      try {
        await this.$apollo.mutate({
          mutation: unblockUser(),
          variables: { id: user.row.id },
        })
        this.$apollo.queries.blockedUsers.refetch()
        const { name } = user.row
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
