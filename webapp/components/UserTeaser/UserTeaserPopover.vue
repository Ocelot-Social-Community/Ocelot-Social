<template>
  <div class="user-teaser-popover">
    <badges
      v-if="$env.BADGES_ENABLED && user.badgeVerification"
      :badges="[user.badgeVerification, ...user.badgeTrophiesSelected]"
    />
    <location-info
      v-if="user.location"
      :location-data="user.location"
      :is-owner="isOwner"
      class="location-info"
    />
    <ul class="statistics">
      <li>
        <ds-number :count="user.followedByCount" :label="$t('profile.followers')" />
      </li>
      <li>
        <ds-number
          :count="user.contributionsCount"
          :label="$t('common.post', null, user.contributionsCount)"
        />
      </li>
      <li>
        <ds-number
          :count="user.commentedCount"
          :label="$t('common.comment', null, user.commentedCount)"
        />
      </li>
    </ul>
    <nuxt-link v-if="isTouchDevice && userLink" :to="userLink" class="link">
      <ds-button primary>{{ $t('user-teaser.popover.open-profile') }}</ds-button>
    </nuxt-link>
  </div>
</template>

<script>
import Badges from '~/components/Badges.vue'
import LocationInfo from '~/components/LocationInfo/LocationInfo.vue'
import { isTouchDevice } from '~/components/utils/isTouchDevice'
import { userTeaserQuery } from '~/graphql/User.js'

export default {
  name: 'UserTeaserPopover',
  components: {
    Badges,
    LocationInfo,
  },
  props: {
    userId: { type: String },
    userLink: { type: Object },
  },
  computed: {
    isTouchDevice() {
      return isTouchDevice()
    },
    user() {
      return (this.User && this.User[0]) ?? null
    },
    isOwner() {
      return this.user.id === this.$store.getters['auth/user'].id
    },
  },
  apollo: {
    User: {
      query() {
        return userTeaserQuery(this.$i18n)
      },
      variables() {
        return { id: this.userId }
      },
    },
  },
}
</script>

<style scoped>
.user-teaser-popover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 16px;
  min-width: 200px;
}

@media (max-height: 800px) {
  .user-teaser-popover {
    padding: 0;
    gap: 0;
  }
}

.location-info {
  margin-bottom: 12px;
}

.link {
  margin-top: 16px;
}

.statistics {
  display: flex;
  justify-content: space-between;
  width: 100%;
}
</style>
