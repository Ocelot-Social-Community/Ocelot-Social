<template>
  <div class="group-teaser-popover">
    <div class="group-header">
      <profile-avatar :profile="group" class="popover-avatar" />
      <div class="group-names">
        <span class="group-name">{{ group.name }}</span>
        <span class="group-slug ds-text-soft">&amp;{{ group.slug }}</span>
      </div>
    </div>
    <location-info
      v-if="group.location"
      :location-data="group.location"
      :is-owner="false"
      size="small"
      class="location-info"
    />
    <div class="chips">
      <os-badge variant="primary">{{ $t(`group.types.${group.groupType}`) }}</os-badge>
      <os-badge v-if="group.myRole" variant="primary">
        {{ $t(`group.roles.${group.myRole}`) }}
      </os-badge>
      <os-badge v-if="group.actionRadius" variant="primary">
        {{ $t(`group.actionRadii.${group.actionRadius}`) }}
      </os-badge>
    </div>
    <p v-if="group.about" class="group-about">{{ group.about }}</p>
    <ul class="statistics">
      <li>
        <os-number
          :count="group.membersCount"
          :label="$t('group.membersCount', {}, group.membersCount)"
        />
      </li>
      <li v-if="group.postsCount !== undefined">
        <os-number :count="group.postsCount" :label="$t('common.post', null, group.postsCount)" />
      </li>
    </ul>
    <os-button
      v-if="isTouchDevice && groupLink"
      as="nuxt-link"
      :to="groupLink"
      class="open-link"
      variant="primary"
    >
      {{ $t('group.teaser.openGroup') }}
    </os-button>
  </div>
</template>

<script>
import { OsBadge, OsButton, OsNumber } from '@ocelot-social/ui'
import LocationInfo from '~/components/LocationInfo/LocationInfo'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import touchDevice from '~/mixins/touchDevice'

export default {
  name: 'GroupTeaserPopover',
  mixins: [touchDevice],
  components: {
    LocationInfo,
    OsBadge,
    OsButton,
    OsNumber,
    ProfileAvatar,
  },
  props: {
    group: { type: Object, required: true },
    groupLink: { type: Object, default: null },
  },
}
</script>

<style scoped>
.group-teaser-popover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 12px;
  min-width: 200px;
  max-width: 280px;
  width: 280px;
}

.group-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.group-names {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  width: 100%;
}

.group-name {
  font-weight: bold;
  font-size: 1rem;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.group-slug {
  font-size: 0.875rem;
  text-align: center;
}

.group-about {
  font-size: 0.875rem;
  text-align: center;
  margin: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.statistics {
  display: flex;
  justify-content: space-around;
  width: 100%;
  list-style: none;
  padding: 0;
  margin: 0;
}

.location-info {
  margin-bottom: 4px;
}

.open-link {
  margin-top: 4px;
}

.popover-avatar {
  width: 64px;
  height: 64px;
  font-size: 1.5rem;
}
</style>
