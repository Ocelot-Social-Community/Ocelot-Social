<template>
  <div class="group-teaser-popover">
    <div v-if="!showContent" class="loading-state">
      <os-spinner size="md" />
    </div>
    <template v-else-if="showContent && resolvedGroup">
      <div class="group-header">
        <profile-avatar :profile="resolvedGroup" class="popover-avatar" />
        <div class="group-names">
          <span class="group-name">{{ resolvedGroup.name }}</span>
          <span class="group-slug ds-text-soft">&amp;{{ resolvedGroup.slug }}</span>
        </div>
      </div>
      <location-info
        v-if="resolvedGroup.location"
        :location-data="resolvedGroup.location"
        :is-owner="false"
        size="small"
        class="location-info"
      />
      <div class="chips">
        <os-badge variant="primary">{{ $t(`group.types.${resolvedGroup.groupType}`) }}</os-badge>
        <os-badge v-if="resolvedGroup.myRole" variant="primary">
          {{ $t(`group.roles.${resolvedGroup.myRole}`) }}
        </os-badge>
        <os-badge v-if="resolvedGroup.actionRadius" variant="primary">
          {{ $t(`group.actionRadii.${resolvedGroup.actionRadius}`) }}
        </os-badge>
      </div>
      <p v-if="resolvedGroup.about" class="group-about">{{ resolvedGroup.about }}</p>
      <ul class="statistics">
        <li>
          <os-number
            :count="resolvedGroup.membersCount"
            :label="$t('group.membersCount', {}, resolvedGroup.membersCount)"
          />
        </li>
        <li v-if="resolvedGroup.postsCount !== undefined">
          <os-number
            :count="resolvedGroup.postsCount"
            :label="$t('common.post', null, resolvedGroup.postsCount)"
          />
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
    </template>
    <template v-else-if="showContent">
      <p class="group-unavailable">{{ $t('group.teaser.unavailable') }}</p>
    </template>
  </div>
</template>

<script>
import { OsBadge, OsButton, OsNumber, OsSpinner } from '@ocelot-social/ui'
import LocationInfo from '~/components/LocationInfo/LocationInfo'
import ProfileAvatar from '~/components/_new/generic/ProfileAvatar/ProfileAvatar'
import touchDevice from '~/mixins/touchDevice'
import { groupTeaserQuery } from '~/graphql/groups'

export default {
  name: 'GroupTeaserPopover',
  mixins: [touchDevice],
  components: {
    LocationInfo,
    OsBadge,
    OsButton,
    OsNumber,
    OsSpinner,
    ProfileAvatar,
  },
  props: {
    group: { type: Object, default: null },
    groupId: { type: String, default: null },
    groupLink: { type: Object, default: null },
  },
  data() {
    return {
      showContent: false,
      minSpinnerDone: false,
      querySettled: false,
      spinnerTimer: null,
    }
  },
  mounted() {
    if (this.resolvedGroup) {
      this.showContent = true
      return
    }
    this.spinnerTimer = setTimeout(() => {
      this.minSpinnerDone = true
      if (this.resolvedGroup || this.querySettled) this.showContent = true
    }, 400)
  },
  beforeDestroy() {
    if (this.spinnerTimer) clearTimeout(this.spinnerTimer)
  },
  computed: {
    resolvedGroup() {
      return this.group || (this.Group && this.Group[0]) || null
    },
  },
  watch: {
    resolvedGroup(group) {
      if (group && this.minSpinnerDone) this.showContent = true
    },
  },
  methods: {
    onQuerySettled() {
      if (this.minSpinnerDone) {
        this.showContent = true
      } else {
        this.querySettled = true
      }
    },
  },
  apollo: {
    Group: {
      query() {
        return groupTeaserQuery(this.$i18n)
      },
      variables() {
        return { id: this.groupId }
      },
      skip() {
        return !this.groupId || !!this.group
      },
      result() {
        this.onQuerySettled()
      },
      error() {
        this.onQuerySettled()
      },
    },
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
  min-height: 260px;
}

.loading-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
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
