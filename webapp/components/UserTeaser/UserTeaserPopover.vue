<template>
  <div class="user-teaser-popover">
    <badges
      v-if="$env.BADGES_ENABLED"
      :badges="[user.badgeVerification, ...user.badgeTrophiesSelected]"
    />
    <div class="location-info">
      <div class="location" v-if="user.location">
        <base-icon name="map-marker" />
        {{ user.location.name }}
      </div>
      <div v-if="distanceToMe" class="distance">{{ distanceToMe }}</div>
    </div>
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
import { isTouchDevice } from '~/components/utils/isTouchDevice'

export default {
  name: 'UserTeaserPopover',
  components: {
    Badges,
  },
  props: {
    user: { type: Object, default: null },
    userLink: { type: Object },
  },
  computed: {
    isTouchDevice() {
      return isTouchDevice()
    },
    distanceToMe() {
      if (this.user.location /* && this.user.location.distanceToMe */) {
        return this.$t('location.distance', {
          distance: this.user.location.distanceToMe ?? 5000 /* todo remove when backend is ready */,
        })
      }
      return null
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
  min-width: 200px;
}

.location-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-block: 16px;

  .location {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .distance {
    margin-top: 8px;
  }
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
