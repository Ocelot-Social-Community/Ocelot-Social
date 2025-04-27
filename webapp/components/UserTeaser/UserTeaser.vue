<template>
  <div class="user-teaser" v-if="displayAnonymous">
    <profile-avatar v-if="showAvatar" size="small" />
    <span class="info anonymous">{{ $t('profile.userAnonym') }}</span>
  </div>
  <div v-else :class="[{ 'disabled-content': user.disabled }]" placement="top-start">
    <dropdown class="user-teaser">
      <template #default="{ openMenu, closeMenu }">
        <component
          v-if="showAvatar"
          :is="linkToProfile ? 'nuxt-link' : 'span'"
          :to="userLink"
          @mouseover.native="() => showPopover && openMenu(true)"
          @mouseleave.native="closeMenu(true)"
        >
          <profile-avatar :profile="user" size="small" />
        </component>
        <div class="info flex-direction-column">
          <div :class="wide ? 'flex-direction-row' : 'flex-direction-column'">
            <component
              :is="linkToProfile ? 'nuxt-link' : 'span'"
              :to="userLink"
              @mouseover.native="() => showPopover && openMenu(true)"
              @mouseleave.native="closeMenu(true)"
            >
              <span class="text">
                <span
                  class="slug"
                  @mouseover="() => showPopover && openMenu(true)"
                  @mouseleave="closeMenu(true)"
                >
                  {{ userSlug }}
                </span>
                <span class="name">{{ userName }}</span>
              </span>
            </component>
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
          <user-teaser-popover
            :user="user"
            v-if="user.badgeVerification"
            @close="closeMenu(true)"
          />
        </div>
      </template>
      <template #popover="{ isOpen }" v-if="showPopover">
        <user-teaser-popover :user="user" @close="closeMenu(true)" v-if="isOpen" />
      </template>
    </dropdown>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import DateTime from '~/components/DateTime'
import Dropdown from '~/components/Dropdown'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import UserTeaserPopover from './UserTeaserPopover'

export default {
  name: 'UserTeaser',
  components: {
    Dropdown,
    DateTime,
    ProfileAvatar,
    UserTeaserPopover,
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
    displayAnonymous() {
      const { user, isModerator } = this
      return !user || user.deleted || (user.disabled && !isModerator)
    },
    userLink() {
      const { id, slug } = this.user
      if (!(id && slug)) return ''
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

<style lang="scss">
.trigger {
  max-width: 100%;
  display: flex !important;
}

.user-teaser {
  display: flex;
  flex-wrap: nowrap;

  .profile-avatar {
    flex-shrink: 0;
  }

  .info {
    padding-left: $space-xx-small;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.anonymous {
      font-size: $font-size-base;
    }

    .slug {
      color: $color-primary;
      font-size: $font-size-base;
    }

    .name {
      color: $text-color-soft;
      font-size: $font-size-small;
    }
  }

  .flex-direction-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .flex-direction-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    > .ds-text {
      display: inline;
    }
  }
}
</style>
