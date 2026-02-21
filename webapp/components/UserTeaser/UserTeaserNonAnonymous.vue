<template>
  <dropdown class="user-teaser">
    <template #default="{ openMenu, closeMenu }">
      <user-teaser-helper
        v-if="showAvatar"
        :link-to-profile="linkToProfile"
        :show-popover="showPopover"
        :user-link="userLink"
        :hover-delay="hoverDelay"
        @open-menu="loadPopover(openMenu)"
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
            :hover-delay="hoverDelay"
            @open-menu="loadPopover(openMenu)"
            @close-menu="closeMenu(false)"
          >
            <span v-if="showSlug" class="slug">{{ userSlug }}</span>
            <span class="name">{{ userName }}</span>
          </user-teaser-helper>
          <span v-if="wide">&nbsp;</span>
          <span v-if="group" class="group-info">
            <span class="text">{{ $t('group.in') }}</span>
            <nuxt-link :to="groupLink" class="group-link" :title="groupName">
              {{ groupName }}
            </nuxt-link>
          </span>
          <!-- eslint-disable-next-line prettier/prettier -->
          <span>{{ injectedText }}<span v-if="injectedText && injectedDate && !userOnly && dateTime"> {{$t('notifications.reason.on_date')}} <date-time :date-time="dateTime" /></span></span>
        </div>
        <span v-if="!userOnly && !injectedDate && dateTime" class="text">
          <os-icon :icon="icons.clock" />
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
import { OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { mapGetters } from 'vuex'

import { userTeaserQuery } from '~/graphql/User.js'
import DateTime from '~/components/DateTime'
import Dropdown from '~/components/Dropdown'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import UserTeaserPopover from './UserTeaserPopover'
import UserTeaserHelper from './UserTeaserHelper.vue'

export default {
  name: 'UserTeaserNonAnonymous',
  components: {
    DateTime,
    Dropdown,
    OsIcon,
    ProfileAvatar,
    UserTeaserHelper,
    UserTeaserPopover,
  },
  props: {
    linkToProfile: { type: Boolean, default: true },
    user: { type: Object, default: null },
    group: { type: Object, default: null },
    wide: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: true },
    showSlug: { type: Boolean, default: false },
    dateTime: { type: [Date, String], default: null },
    showPopover: { type: Boolean, default: true },
    injectedText: { type: String, default: null },
    injectedDate: { type: Boolean, default: false },
    hoverDelay: { type: Number, default: 500 },
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
    groupName() {
      const { name } = this.group || {}
      return name || this.$t('profile.userAnonym')
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    async loadPopover(openMenu) {
      // Load user data if not already loaded, to avoid flickering
      await this.$apollo.query({
        query: userTeaserQuery(this.$i18n),
        variables: { id: this.user.id },
      })
      openMenu(false)
    },
  },
}
</script>
