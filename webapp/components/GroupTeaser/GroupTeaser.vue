<template>
  <dropdown class="group-teaser" placement="top-start">
    <template #default="{ openMenu, closeMenu }">
      <user-teaser-helper
        :link-to-profile="true"
        :user-link="groupLink"
        :show-popover="showPopover"
        :hover-delay="hoverDelay"
        @open-menu="openMenu(false)"
        @close-menu="closeMenu(false)"
      >
        <profile-avatar :profile="group" size="small" class="group-teaser__avatar" />
        <span class="group-teaser__name">{{ group.name }}</span>
      </user-teaser-helper>
    </template>
    <template #popover>
      <group-teaser-popover :group="group" :group-link="groupLink" />
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import UserTeaserHelper from '~/components/UserTeaser/UserTeaserHelper'
import GroupTeaserPopover from './GroupTeaserPopover'

export default {
  name: 'GroupTeaser',
  components: {
    Dropdown,
    GroupTeaserPopover,
    ProfileAvatar,
    UserTeaserHelper,
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
.group-teaser {
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

.group-teaser__avatar {
  flex-shrink: 0;
}

.group-teaser__name {
  font-size: var(--font-size-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-color-soft);
}
</style>
