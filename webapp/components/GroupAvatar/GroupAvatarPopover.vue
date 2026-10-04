<template>
  <component
    :is="canNavigate ? 'nuxt-link' : 'div'"
    :to="canNavigate ? groupLink : undefined"
    class="group-avatar-popover"
    :class="{ 'is-clickable': canNavigate }"
  >
    <div v-if="!showContent" class="loading-state">
      <os-spinner size="md" />
    </div>
    <template v-else-if="showContent && resolvedGroup">
      <div class="group-header">
        <avatar-image :profile="resolvedGroup" class="popover-avatar" />
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
        <os-badge variant="primary">{{ $t(`group.types.${resolvedGroup.visibility}`) }}</os-badge>
        <os-badge v-if="resolvedGroup.myGroupRole" variant="primary">
          {{ roleLabel(resolvedGroup.myGroupRole) }}
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
        v-if="showProfileLink && groupLink"
        as="nuxt-link"
        :to="groupLink"
        class="open-link"
        variant="primary"
        appearance="outline"
        size="sm"
      >
        {{ $t('group.teaser.openGroup') }}
      </os-button>
    </template>
    <empty v-else-if="showContent" icon="alert" :message="$t('group.teaser.unavailable')" />
  </component>
</template>

<script>
import { OsBadge, OsButton, OsNumber, OsSpinner } from '@ocelot-social/ui'
import Empty from '~/components/Empty/Empty'
import LocationInfo from '~/components/LocationInfo/LocationInfo'
import AvatarImage from '~/components/_new/generic/AvatarImage/AvatarImage'
import { groupTeaserQuery } from '~/graphql/groups'
import groupRights from '~/mixins/groupRights'

export default {
  name: 'GroupAvatarPopover',
  mixins: [groupRights],
  components: {
    Empty,
    LocationInfo,
    OsBadge,
    OsButton,
    OsNumber,
    OsSpinner,
    AvatarImage,
  },
  props: {
    group: { type: Object, default: null },
    groupId: { type: String, default: null },
    groupLink: { type: Object, default: null },
    // Shows the old explicit "open group" button again, in addition to the whole card already
    // being a link (see canNavigate) — off by default, kept for callers that might still want an
    // extra, more discoverable call-to-action alongside the click-anywhere card.
    showProfileLink: { type: Boolean, default: false },
  },
  data() {
    return {
      showContent: false,
      minSpinnerDone: false,
      querySettled: false,
      // A network/GraphQL error settles the query too, but it's not evidence the group is
      // actually gone — only a successful, empty response is (see confirmedMissing).
      queryFailed: false,
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
    // Confirmed gone (content settled, nothing came back) — don't navigate to a group we already
    // know doesn't exist, even though groupLink is still set. A failed query must NOT count as
    // confirmation — that would block navigation on a transient network error.
    confirmedMissing() {
      return this.showContent && !this.queryFailed && !this.resolvedGroup
    },
    // Whole card becomes a link whenever we have somewhere to send it and haven't ruled that out
    // — including while still loading, so an eager click (e.g. from pages/map.vue's popups)
    // navigates immediately instead of waiting on the teaser query.
    canNavigate() {
      return !!this.groupLink && !this.confirmedMissing
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
        this.queryFailed = true
        this.onQuerySettled()
      },
    },
  },
}
</script>

<style scoped>
.group-avatar-popover {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  gap: 12px;
  min-width: 200px;
  max-width: 280px;
  width: 280px;
  min-height: 260px;
  /* Overrides resets.css's global `a { color: var(--color-primary) }` for the
     nuxt-link case (see canNavigate) — the card's own text keeps its normal
     color, only the explicit "open group" button below still looks like a
     button/link. */
  color: var(--text-color-base);
}

.group-avatar-popover.is-clickable {
  /* Belt-and-braces: the native anchor already shows a pointer, but this
     holds regardless of which element renders the root (e.g. the map
     popover already forces this too, scoped more narrowly, in
     pages/map.vue). */
  cursor: pointer;
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
  margin-top: var(--space-x-small);
}

.popover-avatar {
  width: 64px;
  height: 64px;
  font-size: 1.5rem;
}
</style>
