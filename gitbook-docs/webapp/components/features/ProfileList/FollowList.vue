<template>
  <profile-list
    :uniqueName="`${type}Filter`"
    :title="$filters.truncate(userName, 15) + ' ' + $t(`profile.network.${type}`)"
    :titleNobody="$filters.truncate(userName, 15) + ' ' + $t(`profile.network.${type}Nobody`)"
    :allProfilesCount="allConnectionsCount"
    :profiles="connections"
    :loading="loading"
    @fetchAllProfiles="$emit('fetchAllConnections', type, allConnectionsCount)"
  />
</template>

<script>
import ProfileList, { profileListVisibleCount } from '~/components/features/ProfileList/ProfileList'

export const followListVisibleCount = profileListVisibleCount

export default {
  name: 'FollowerList',
  components: {
    ProfileList,
  },
  props: {
    user: { type: Object, default: null },
    type: { type: String, default: 'following' },
    loading: { type: Boolean, default: false },
  },
  computed: {
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
    allConnectionsCount() {
      return this.user[`${this.type}Count`]
    },
    connections() {
      return this.user[this.type]
    },
  },
}
</script>
