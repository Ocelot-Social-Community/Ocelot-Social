<template>
  <div class="user-teaser" v-if="displayAnonymous">
    <profile-avatar v-if="showAvatar" size="small" />
    <span class="info anonymous">{{ $t('profile.userAnonym') }}</span>
  </div>
  <div v-else :class="[{ 'disabled-content': user.disabled }]" placement="top-start">
    <div :class="['user-teaser']">
      <nuxt-link :to="userLink" data-test="avatarUserLink">
        <profile-avatar v-if="showAvatar" :profile="user" size="small" />
      </nuxt-link>
      <div class="info flex-direction-column">
        <div :class="wide ? 'flex-direction-row' : 'flex-direction-column'">
          <nuxt-link :to="userLink" class="flex-direction-column_link">
            <span class="text">
              <span class="slug">{{ userSlug }}</span>
              <span v-if="!userOnly" class="name">{{ userName }}</span>
            </span>
          </nuxt-link>
          <span v-if="wide">&nbsp;</span>
          <span v-if="group">
            <span class="text">
              {{ $t('group.in') }}
            </span>
            <nuxt-link :to="groupLink" class="flex-direction-column_link">
              <span class="text">
                <span class="slug">{{ groupSlug }}</span>
                <span v-if="!userOnly" class="name">{{ groupName }}</span>
              </span>
            </nuxt-link>
          </span>
        </div>
        <span v-if="!userOnly" class="text">
          <base-icon name="clock" />
          <relative-date-time :date-time="dateTime" />
          <slot name="dateTime"></slot>
        </span>
        <span v-else class="text">{{ userName }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import RelativeDateTime from '~/components/RelativeDateTime'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'

export default {
  name: 'UserTeaser',
  components: {
    RelativeDateTime,
    ProfileAvatar,
  },
  props: {
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
      return { name: 'group-id-slug', params: { slug, id } }
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
  methods: {
    optimisticFollow({ followedByCurrentUser }) {
      const inc = followedByCurrentUser ? 1 : -1
      this.user.followedByCurrentUser = followedByCurrentUser
      this.user.followedByCount += inc
    },
    updateFollow({ followedByCurrentUser, followedByCount }) {
      this.user.followedByCount = followedByCount
      this.user.followedByCurrentUser = followedByCurrentUser
    },
  },
}
</script>

<style lang="scss">
.trigger {
  max-width: 100%;
}

.user-teaser {
  display: flex;
  flex-wrap: nowrap;

  > .profile-avatar {
    flex-shrink: 0;
  }

  > .info {
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

  .flex-direction-column_link {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    color: #70677e;
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
