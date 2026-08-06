<template>
  <dropdown class="group-avatar" placement="top-start">
    <template #default="{ openMenu, closeMenu }">
      <user-avatar-helper
        :link-to-profile="true"
        :user-link="groupLink"
        :show-popover="showPopover"
        :hover-delay="hoverDelay"
        @open-menu="openMenu(false)"
        @close-menu="closeMenu(false)"
      >
        <avatar-image :profile="group" size="small" class="group-avatar__avatar" />
        <span class="group-avatar__name">{{ group.name }}</span>
      </user-avatar-helper>
    </template>
    <template #popover>
      <group-avatar-popover :group="group" :group-link="groupLink" />
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import UserAvatarHelper from '~/components/UserAvatar/UserAvatarHelper'
import GroupAvatarPopover from './GroupAvatarPopover'

export default {
  name: 'GroupAvatar',
  components: {
    Dropdown,
    GroupAvatarPopover,
    AvatarImage,
    UserAvatarHelper,
  },
  props: {
    group: { type: Object, required: true },
    showPopover: { type: Boolean, default: true },
    hoverDelay: { type: Number, default: 500 },
  },
  computed: {
    groupLink() {
      const { id, slug } = this.group || {}
      if (!(id && slug)) return null
      return { name: 'groups-id-slug', params: { id, slug } }
    },
  },
}
</script>

<style>
.group-avatar {
  display: flex;
  align-items: center;
  min-width: 0;

  .trigger {
    display: flex !important;
    align-items: center;
    min-width: 0;
    overflow: hidden;

    > a,
    > button,
    > span {
      display: flex !important;
      align-items: center;
      gap: var(--space-x-small);
      min-width: 0;
      overflow: hidden;
    }
  }
}

.group-avatar__avatar {
  flex-shrink: 0;
}

.group-avatar__name {
  font-size: var(--font-size-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color-soft);
}
</style>
