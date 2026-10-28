<template>
  <article :class="['active-video-call', { 'active-video-call--joined': joined }]">
    <nuxt-link :to="groupLink" class="active-video-call__group" data-test="call-group">
      <avatar-image :profile="group" size="small" class="active-video-call__group-avatar" />
      <span class="active-video-call__group-name">{{ group.name }}</span>
      <os-icon
        v-if="group.visibility !== 'public'"
        :icon="icons.lock"
        class="active-video-call__lock"
        :aria-label="$t(`group.types.${group.visibility}`)"
        role="img"
        data-test="call-lock"
      />
    </nuxt-link>
    <div class="active-video-call__people">
      <ul class="active-video-call__avatars" :aria-label="$t('dock.activeVideoCalls.participants')">
        <li
          v-for="(user, index) in shownParticipants"
          :key="`${user.id}-${index}`"
          class="active-video-call__avatar"
          :title="participantTitle(user)"
        >
          <avatar-image :profile="user" size="small" :show-profile-name-title="false" />
          <span v-if="user.isBlocked" class="active-video-call__blocked" data-test="call-blocked">
            <os-icon :icon="icons.ban" />
          </span>
          <span class="active-video-call__sr-only">{{ participantTitle(user) }}</span>
        </li>
        <li v-if="hiddenParticipants" class="active-video-call__more" data-test="call-more">
          +{{ hiddenParticipants }}
        </li>
      </ul>
      <span class="active-video-call__count" data-test="call-count">
        <os-icon :icon="icons.videoCamera" />
        {{ $t('dock.activeVideoCalls.count', { count: call.participantCount }) }}
      </span>
    </div>
    <p v-if="joined" class="active-video-call__joined" data-test="call-joined">
      {{ $t('dock.activeVideoCalls.joined') }}
    </p>
    <os-button
      v-else
      data-test="call-join"
      variant="primary"
      appearance="outline"
      size="sm"
      full-width
      @click="join"
    >
      {{ $t('dock.activeVideoCalls.join') }}
    </os-button>
  </article>
</template>

<script>
import { mapMutations } from 'vuex'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'

const MAX_AVATARS = 5

export default {
  name: 'ActiveVideoCallCard',
  components: { AvatarImage, OsButton, OsIcon },
  props: {
    call: { type: Object, required: true },
    // Whether the viewer is in this call right now.
    joined: { type: Boolean, default: false },
  },
  computed: {
    group() {
      return this.call.group
    },
    groupLink() {
      const { id, slug } = this.group
      return { name: 'groups-id-slug', params: { id, slug } }
    },
    shownParticipants() {
      // With more than MAX_AVATARS, the last slot goes to "+n".
      const { participants } = this.call
      return participants.length > MAX_AVATARS
        ? participants.slice(0, MAX_AVATARS - 1)
        : participants
    },
    hiddenParticipants() {
      return this.call.participants.length - this.shownParticipants.length
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    ...mapMutations({ openVideoCall: 'videoCall/OPEN' }),
    participantTitle(user) {
      return user.isBlocked
        ? this.$t('dock.activeVideoCalls.blocked', { name: user.name })
        : user.name
    },
    join() {
      // The call is running and listed because the viewer may join it — no "may I open it"
      // check like on the group page.
      this.openVideoCall({
        groupId: this.group.id,
        groupName: this.group.name,
        groupSlug: this.group.slug,
        groupAvatar: this.group.avatar,
      })
    },
  },
}
</script>

<style>
.active-video-call {
  display: flex;
  flex-direction: column;
  gap: var(--space-x-small);
  padding: var(--space-small);
  border-radius: var(--border-radius-x-large);
  background-color: var(--background-color-base);
  box-shadow: var(--box-shadow-base);
}
.active-video-call--joined {
  /*  Inside the card, not an outline: the dock panel scrolls, and clips what sticks out. */
  box-shadow:
    inset 0 0 0 2px var(--color-primary),
    var(--box-shadow-base);
}
.active-video-call__group {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  min-width: 0;
  color: var(--text-color-base);
  font-weight: bold;
}
.active-video-call__group-avatar {
  /*  The long group name next to it must shrink, not the avatar. */
  flex-shrink: 0;
}
.active-video-call__group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.active-video-call__lock {
  flex-shrink: 0;
  color: var(--text-color-soft);
}
.active-video-call__people {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-x-small);
}
.active-video-call__avatars {
  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}
.active-video-call__avatar,
.active-video-call__more {
  position: relative;
  flex-shrink: 0;
  margin-right: calc(-1 * var(--space-xx-small));
}
.active-video-call__more {
  display: flex;
  align-items: center;
  padding-left: var(--space-x-small);
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
}
.active-video-call__blocked {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: flex;
  border-radius: var(--border-radius-rounded);
  background-color: var(--background-color-base);
  color: var(--color-danger);
  font-size: var(--font-size-small);
}
.active-video-call__count {
  display: flex;
  align-items: center;
  gap: var(--space-xx-small);
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
  white-space: nowrap;
}
.active-video-call__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.active-video-call__joined {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-primary);
}
</style>
