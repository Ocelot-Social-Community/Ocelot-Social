<template>
  <dropdown class="user-avatar">
    <template #default="{ openMenu, closeMenu }">
      <user-avatar-helper
        v-if="showAvatar"
        :link-to-profile="linkToProfile"
        :show-popover="showPopover"
        :user-link="userLink"
        :hover-delay="hoverDelay"
        @open-menu="loadPopover(openMenu)"
        @close-menu="cancelAndClose(closeMenu)"
        data-test="avatarUserLink"
      >
        <avatar-image :profile="user" size="small" :show-profile-name-title="false" />
      </user-avatar-helper>
      <div class="info flex-direction-column">
        <div :class="wide ? 'flex-direction-row' : 'flex-direction-column'">
          <user-avatar-helper
            :link-to-profile="linkToProfile"
            :show-popover="showPopover"
            :user-link="userLink"
            :hover-delay="hoverDelay"
            @open-menu="loadPopover(openMenu)"
            @close-menu="cancelAndClose(closeMenu)"
          >
            <span v-if="showSlug" class="slug">{{ userSlug }}</span>
            <span class="name">{{ userName }}</span>
          </user-avatar-helper>
          <span v-if="wide">&nbsp;</span>
          <span v-if="group" class="group-info">
            <span class="text">{{ $t('group.in') }}</span>
            <dropdown placement="top-start">
              <template #default="{ openMenu, closeMenu }">
                <user-avatar-helper
                  :link-to-profile="true"
                  :user-link="groupLink"
                  :show-popover="true"
                  :hover-delay="hoverDelay"
                  @open-menu="loadGroupPopover(openMenu)"
                  @close-menu="cancelAndCloseGroup(closeMenu)"
                >
                  <span class="group-link">{{ groupName }}</span>
                </user-avatar-helper>
              </template>
              <template #popover="{ isOpen }">
                <group-avatar-popover v-if="isOpen" :group-id="group.id" :group-link="groupLink" />
              </template>
            </dropdown>
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
      <user-avatar-popover
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

import { userTeaserQuery } from '~/graphql/User.js'
import { groupTeaserQuery } from '~/graphql/groups'
import DateTime from '~/components/DateTime'
import Dropdown from '~/components/Dropdown'
import GroupAvatarPopover from '~/components/GroupAvatar/GroupAvatarPopover'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import UserAvatarPopover from './UserAvatarPopover'
import UserAvatarHelper from './UserAvatarHelper.vue'

export default {
  name: 'UserAvatarNonAnonymous',
  components: {
    DateTime,
    Dropdown,
    GroupAvatarPopover,
    OsIcon,
    AvatarImage,
    UserAvatarHelper,
    UserAvatarPopover,
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
      if (!(id && slug)) return null
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
  mounted() {
    if (this.group?.id) {
      this.$apollo
        .query({ query: groupTeaserQuery(this.$i18n), variables: { id: this.group.id } })
        .catch(() => {})
    }
  },
  data() {
    return {
      popoverPending: false,
      groupPopoverPending: false,
    }
  },
  methods: {
    async loadPopover(openMenu) {
      this.popoverPending = true
      try {
        // Pre-fetch user data to avoid flickering on first open
        await this.$apollo.query({
          query: userTeaserQuery(this.$i18n),
          variables: { id: this.user.id },
        })
      } catch {
        this.popoverPending = false
        return
      }
      if (this.popoverPending) {
        openMenu(false)
      }
    },
    cancelAndClose(closeMenu) {
      this.popoverPending = false
      closeMenu(false)
    },
    async loadGroupPopover(openMenu) {
      this.groupPopoverPending = true
      try {
        await this.$apollo.query({
          query: groupTeaserQuery(this.$i18n),
          variables: { id: this.group.id },
        })
      } catch {
        this.groupPopoverPending = false
        return
      }
      if (this.groupPopoverPending) {
        openMenu(false)
      }
    },
    cancelAndCloseGroup(closeMenu) {
      this.groupPopoverPending = false
      closeMenu(false)
    },
  },
}
</script>
