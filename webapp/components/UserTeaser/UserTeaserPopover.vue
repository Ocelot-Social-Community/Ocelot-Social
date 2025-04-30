<template>
  <div class="user-teaser-popover">
    <badges
      v-if="$env.BADGES_ENABLED"
      :badges="[user.badgeVerification, ...user.badgeTrophiesSelected]"
    />
    <location-info
      v-if="user.location"
      :location="{ ...user.location, distanceToMe: user.distanceToMe }"
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
import LocationInfo from '~/components/UserTeaser/LocationInfo.vue'
import { isTouchDevice } from '~/components/utils/isTouchDevice'

export default {
  name: 'UserTeaserPopover',
  components: {
    Badges,
    LocationInfo,
  },
  props: {
    user: { type: Object, default: null },
    userLink: { type: Object },
  },
  computed: {
    isTouchDevice() {
      return isTouchDevice()
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
