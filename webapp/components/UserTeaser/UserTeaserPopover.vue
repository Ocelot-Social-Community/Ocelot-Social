<template>
  <div v-if="user" class="user-teaser-popover">
    <div class="user-header">
      <profile-avatar :profile="user" class="popover-avatar" />
      <div class="user-names">
        <span class="user-name">{{ user.name }}</span>
        <span class="user-slug ds-text-soft">@{{ user.slug }}</span>
      </div>
    </div>
    <badges
      v-if="$policy.get('badgesEnabled') && user.badgeVerification"
      :badges="[user.badgeVerification, ...user.badgeTrophiesSelected]"
    />
    <location-info
      v-if="user.location"
      :location-data="user.location"
      :is-owner="userId === $store.getters['auth/user'].id"
      size="small"
      class="location-info"
    />
    <p v-if="user.about" class="user-about">{{ user.about }}</p>
    <!-- No :animated on OsNumber — popover appears on hover, animation would be distracting -->
    <ul class="statistics">
      <li>
        <os-number :count="user.followedByCount" :label="$t('profile.followers')" />
      </li>
      <li>
        <os-number
          :count="user.contributionsCount"
          :label="$t('common.post', null, user.contributionsCount)"
        />
      </li>
      <li>
        <os-number
          :count="user.commentedCount"
          :label="$t('common.comment', null, user.commentedCount)"
        />
      </li>
    </ul>
    <os-button
      v-if="isTouchDevice && userLink"
      as="nuxt-link"
      :to="userLink"
      class="open-link"
      variant="primary"
    >
      {{ $t('user-teaser.popover.open-profile') }}
    </os-button>
  </div>
</template>

<script>
import { OsButton, OsNumber } from '@ocelot-social/ui'
import Badges from '~/components/Badges.vue'
import LocationInfo from '~/components/LocationInfo/LocationInfo.vue'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import touchDevice from '~/mixins/touchDevice'
import { userTeaserQuery } from '~/graphql/User.js'

export default {
  name: 'UserTeaserPopover',
  mixins: [touchDevice],
  components: {
    Badges,
    LocationInfo,
    OsButton,
    OsNumber,
    ProfileAvatar,
  },
  props: {
    userId: { type: String, required: true },
    userLink: { type: Object },
  },
  computed: {
    user() {
      return (this.User && this.User[0]) ?? null
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
  gap: 12px;
  min-width: 200px;
  max-width: 280px;
  width: 280px;
}

.user-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.user-names {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 100%;
}

.user-name {
  font-weight: bold;
  font-size: 1rem;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.user-slug {
  font-size: 0.875rem;
  text-align: center;
}

.user-about {
  font-size: 0.875rem;
  text-align: center;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.location-info {
  margin-bottom: 4px;
}

.statistics {
  display: flex;
  justify-content: space-around;
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
}

.open-link {
  margin-top: 4px;
}

.popover-avatar {
  width: 64px;
  height: 64px;
  font-size: 1.5rem;
}
</style>
