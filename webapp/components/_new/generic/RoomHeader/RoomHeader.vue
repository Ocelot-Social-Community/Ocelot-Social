<template>
  <!--
    The header of a room: whose it is — avatar and name, linking there — and, at its end,
    whatever buttons the place it is used in has for it. The look of the chat's own header
    and of the video call's, for places that show a room without either of them.
  -->
  <div :class="['room-header', { 'room-header--compact': compact }]">
    <div class="room-header__info">
      <avatar-image :profile="profile" size="small" class="room-header__avatar" />
      <room-title-link
        :name="title"
        :to="to"
        :show-group-icon="showGroupIcon"
        :aria-label="ariaLabel"
        @click="$emit('title-click', $event)"
      />
    </div>
    <div v-if="$slots.default" class="room-header__actions">
      <slot />
    </div>
  </div>
</template>

<script>
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import RoomTitleLink from '~/components/_new/generic/RoomTitleLink/RoomTitleLink'

export default {
  name: 'RoomHeader',
  components: { AvatarImage, RoomTitleLink },
  props: {
    // Who the room belongs to, as AvatarImage takes it: `{ id, name, avatar }`.
    profile: { type: Object, default: null },
    title: { type: String, default: '' },
    // Where avatar's owner lives; a route object, a path, or null for no link.
    to: { type: [Object, String], default: null },
    showGroupIcon: { type: Boolean, default: false },
    // What the title's link announces, where the title alone does not say where it leads.
    ariaLabel: { type: String, default: null },
    // Lower, with a smaller avatar, where every pixel goes to something else: the video call.
    compact: { type: Boolean, default: false },
  },
}
</script>

<style scoped>
.room-header {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  box-sizing: border-box;
  /*  The height of the chat's and the call's header: the base avatar's with a small space */
  /*  above and below, although the avatar shown is the small one. */
  height: calc(var(--size-avatar-base) + 2 * var(--space-x-small));
  padding: 0 var(--space-small);
  background: var(--color-header-background);
  border-bottom: 1px solid var(--color-neutral-85);
  color: var(--text-color-base);
}

/*  The small buttons (26px) still have a small space above and below; the title keeps */
/*  its size. */
.room-header--compact {
  height: calc(28px + 2 * var(--space-x-small));
}

.room-header--compact .room-header__avatar {
  width: 28px;
  height: 28px;
}

.room-header__info {
  display: flex;
  align-items: center;
  gap: var(--space-x-small);
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

/*  RoomTitleLink is medium-weight for its use inside a chat; as the heading of a room it */
/*  reads bold, as in the chat's and the call's header. */
.room-header__info ::v-deep .room-title-link {
  font-weight: var(--text-weight-bold);
}

.room-header__avatar {
  flex-shrink: 0;
}

.room-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-xx-small);
  margin-left: auto;
  flex-shrink: 0;
}
</style>
