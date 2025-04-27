<template>
  <div class="user-teaser-popover">
    <badges
      v-if="$env.BADGES_ENABLED"
      :badges="[user.badgeVerification, ...user.badgeTrophiesSelected]"
    />
    <div class="location" v-if="user.location">
      <base-icon name="map-marker" />
      {{ user.location.name }}
    </div>
    <ds-flex>
      <ds-flex-item class="ds-tab-nav-item">
        <ds-space margin="small">
          <ds-number
            :count="user.followedByCount"
            :label="$t('profile.followers')"
            size="x-large"
          />
        </ds-space>
      </ds-flex-item>
      <ds-flex-item class="ds-tab-nav-item">
        <ds-space margin="small">
          <ds-number
            :count="user.contributionsCount"
            :label="$t('common.post', null, user.contributionsCount)"
          />
        </ds-space>
      </ds-flex-item>
      <ds-flex-item class="ds-tab-nav-item">
        <ds-space margin="small">
          <ds-number
            :count="user.commentedCount"
            :label="$t('common.comment', null, user.commentedCount)"
          />
        </ds-space>
      </ds-flex-item>
    </ds-flex>
    <nuxt-link v-if="isTouchDevice && linkToProfile" :to="userLink" class="link">
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
    linkToProfile: { type: Boolean, default: true },
    userLink: { type: Object, default: null },
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
  min-width: 200px;
}

.location {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-block: 16px;
}

.link {
  margin-top: 16px;
}
</style>
