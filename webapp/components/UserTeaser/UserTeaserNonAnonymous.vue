<template>
  <dropdown class="user-teaser">
    <template #default="{ openMenu, closeMenu }">
      <user-teaser-helper
        v-if="showAvatar"
        :link-to-profile="linkToProfile"
        :show-popover="showPopover"
        :user-link="userLink"
        @open-menu="openMenu(false)"
        @close-menu="closeMenu(false)"
        data-test="avatarUserLink"
      >
        <profile-avatar :profile="user" size="small" />
      </user-teaser-helper>
      <div class="info flex-direction-column">
        <div :class="wide ? 'flex-direction-row' : 'flex-direction-column'">
          <user-teaser-helper
            :link-to-profile="linkToProfile"
            :show-popover="showPopover"
            :user-link="userLink"
            @open-menu="openMenu(false)"
            @close-menu="closeMenu(false)"
          >
            <span class="slug">{{ userSlug }}</span>
            <span class="name">{{ userName }}</span>
          </user-teaser-helper>
          <span v-if="wide">&nbsp;</span>
          <span v-if="group">
            <span class="text">
              {{ $t('group.in') }}
            </span>
            <nuxt-link :to="groupLink">
              <span class="text">
                <span class="slug">{{ groupSlug }}</span>
                <span v-if="!userOnly" class="name">{{ groupName }}</span>
              </span>
            </nuxt-link>
          </span>
        </div>
        <span v-if="!userOnly && dateTime" class="text">
          <base-icon name="clock" />
          <date-time :date-time="dateTime" />
          <slot name="dateTime"></slot>
        </span>
      </div>
    </template>
    <template #popover="{ isOpen }" v-if="showPopover">
      <user-teaser-popover
        v-if="isOpen"
        :user-id="user.id"
        :user-link="linkToProfile ? userLink : null"
      />
    </template>
  </dropdown>
</template>

<script>
import { mapGetters } from 'vuex'

import DateTime from '~/components/DateTime'
import Dropdown from '~/components/Dropdown'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import UserTeaserPopover from './UserTeaserPopover'
import UserTeaserHelper from './UserTeaserHelper.vue'

export default {
  name: 'UserTeaser',
  components: {
    ProfileAvatar,
    UserTeaserPopover,
    UserTeaserHelper,
    Dropdown,
    DateTime,
  },
  props: {
    linkToProfile: { type: Boolean, default: true },
    user: { type: Object, default: null },
    group: { type: Object, default: null },
    wide: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: true },
    dateTime: { type: [Date, String], default: null },
    showPopover: { type: Boolean, default: true },
  },
  computed: {
    ...mapGetters({
      isModerator: 'auth/isModerator',
    }),

    itsMe() {
      return this.user.slug === this.$store.getters['auth/user'].slug
    },
    userLink() {
      const { id, slug } = this.user
      if (!(id && slug)) return null
      return { name: 'profile-id-slug', params: { slug, id } }
    },
    userSlug() {
      const { slug } = this.user || {}
      return slug && `@${slug}`
    },
    userName() {
      const { name } = this.user || {}
      return name || this.$t('profile.userAnonym')
    },
    userOnly() {
      return !this.dateTime && !this.group
    },
    groupLink() {
      const { id, slug } = this.group
      if (!(id && slug)) return ''
      return { name: 'groups-id-slug', params: { slug, id } }
    },
    groupSlug() {
      const { slug } = this.group || {}
      return slug && `&${slug}`
    },
    groupName() {
      const { name } = this.group || {}
      return name || this.$t('profile.userAnonym')
    },
  },
}
</script>
