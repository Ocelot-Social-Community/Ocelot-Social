<template>
  <div class="user-teaser" v-if="displayAnonymous">
    <profile-avatar v-if="showAvatar" size="small" />
    <span class="info anonymous">{{ $t('profile.userAnonym') }}</span>
  </div>
  <div v-else :class="[{ 'disabled-content': user.disabled }]" placement="top-start">
    <!-- isTouchDevice only supported on client-->
    <client-only>
      <user-teaser-non-anonymous
        v-if="user"
        :link-to-profile="linkToProfile"
        :user="user"
        :group="group"
        :wide="wide"
        :show-avatar="showAvatar"
        :date-time="dateTime"
        :show-popover="showPopover"
        :injectedText="injectedText"
        :injectedDate="injectedDate"
        @close="closeMenu"
      />
    </client-only>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import UserTeaserNonAnonymous from './UserTeaserNonAnonymous'

export default {
  name: 'UserTeaser',
  components: {
    ProfileAvatar,
    UserTeaserNonAnonymous,
  },
  props: {
    linkToProfile: { type: Boolean, default: true },
    user: { type: Object, default: null },
    group: { type: Object, default: null },
    wide: { type: Boolean, default: false },
    showAvatar: { type: Boolean, default: true },
    dateTime: { type: [Date, String], default: null },
    showPopover: { type: Boolean, default: true },
    injectedText: { type: String, default: null },
    injectedDate: { type: Boolean, default: false },
  },
  computed: {
    ...mapGetters({
      isModerator: 'auth/isModerator',
    }),
    displayAnonymous() {
      const { user, isModerator } = this
      return !user || user.deleted || (user.disabled && !isModerator)
    },
  },
  methods: {
    closeMenu() {
      this.$emit('close')
    },
  },
}
</script>

<style lang="scss">
.user-teaser {
  display: flex;
  flex-wrap: nowrap;

  .trigger {
    max-width: 100%;
    display: flex !important;
    justify-content: center;
    align-items: center;
  }

  .profile-avatar {
    flex-shrink: 0;
  }

  .info {
    padding-left: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: break-spaces;

    &.anonymous {
      font-size: $font-size-base;
    }

    .slug {
      color: $color-primary;
      font-size: calc(1.15 * $font-size-base);
    }

    .name {
      color: $text-color-soft;
      font-size: $font-size-base;
    }
  }

  .flex-direction-column {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
  }

  .flex-direction-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    padding-left: 2px;
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
