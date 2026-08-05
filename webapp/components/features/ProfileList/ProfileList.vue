<template>
  <os-card class="profile-list">
    <template v-if="profiles.length">
      <h5 class="title spacer-x-small">
        {{ title }}
      </h5>
      <p v-if="subtitle" class="ds-text ds-text-soft ds-text-size-small spacer-x-small">
        {{ subtitle }}
      </p>

      <!-- Virtual Scroller for better performance -->
      <recycle-scroller
        v-if="isMoreAsVisible && showVirtualScroll"
        ref="scrollEl"
        :items="filteredConnections"
        :item-size="itemHeight"
        key-field="id"
        :class="profilesClass"
        class="profiles-virtual"
        v-slot="{ item }"
        @scroll.native="onScroll"
      >
        <div class="connections__item">
          <slot name="item" :item="item">
            <user-avatar :user="item" />
          </slot>
        </div>
      </recycle-scroller>

      <!-- Normal list for only a few items -->
      <ul v-else ref="scrollEl" :class="profilesClass" @scroll="onScroll">
        <li
          v-for="connection in displayedConnections"
          :key="connection.id"
          class="connections__item"
        >
          <slot name="item" :item="connection">
            <user-avatar :user="connection" />
          </slot>
        </li>
      </ul>

      <ocelot-input
        v-if="isMoreAsVisible && !hasMore"
        :name="uniqueName"
        :placeholder="filterPlaceholder"
        :value="filter"
        class="spacer-x-small"
        icon="filter"
        size="small"
        @input.native="setFilter"
      />

      <div v-if="hasMore && loading" class="loading-more">
        <os-spinner size="xs" />
      </div>
    </template>
    <p v-else-if="titleNobody" class="nobody-message">{{ titleNobody }}</p>
  </os-card>
</template>

<script>
import { OsCard, OsSpinner } from '@ocelot-social/ui'
import { escape } from 'xregexp/xregexp-all.js'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export const profileListVisibleCount = 6

const VIRTUAL_SCROLL_THRESHOLD = 50

export default {
  name: 'ProfileList',
  components: {
    OsCard,
    OsSpinner,
    UserAvatar,
    RecycleScroller,
    OcelotInput,
  },
  props: {
    uniqueName: { type: String, required: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: null },
    titleNobody: { type: String, default: null },
    allProfilesCount: { type: Number, required: true },
    profiles: { type: Array, required: true },
    loading: { type: Boolean, default: false },
  },
  data() {
    return {
      profileListVisibleCount,
      filter: null,
      itemHeight: 56,
    }
  },
  computed: {
    hasMore() {
      return this.allProfilesCount > this.profiles.length
    },
    isMoreAsVisible() {
      return this.profiles.length > this.profileListVisibleCount
    },
    showVirtualScroll() {
      return process.client && this.filteredConnections.length > VIRTUAL_SCROLL_THRESHOLD
    },
    profilesClass() {
      return `profiles${this.isMoreAsVisible ? ' --overflow' : ''}`
    },
    displayedConnections() {
      return this.isMoreAsVisible
        ? this.filteredConnections
        : this.filteredConnections.slice(0, this.profileListVisibleCount)
    },
    filterPlaceholder() {
      return this.$t('common.filter')
    },
    filteredConnections() {
      if (!this.filter) {
        return this.profiles
      }

      const filterLower = this.filter.toLowerCase()

      const simpleMatches = this.profiles.filter((user) => {
        const name = (user.name || '').toLowerCase()
        const slug = (user.slug || '').toLowerCase()
        return name.includes(filterLower) || slug.includes(filterLower)
      })

      if (simpleMatches.length > 0) {
        return simpleMatches
      }

      const fuzzyExpression = new RegExp(
        `${this.filter.split('').reduce((expr, c) => `${expr}([^${escape(c)}]*${escape(c)})`, '')}`,
        'i',
      )

      const fuzzyScores = this.profiles
        .map((user) => {
          const match = user.name.match(fuzzyExpression)

          if (!match) {
            return false
          }

          let score = 1
          for (let i = 1; i <= this.filter.length; i++) {
            score *= match[i].length
          }

          return {
            user,
            score,
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.score - b.score)

      return fuzzyScores.map((score) => score.user)
    },
  },
  mounted() {
    this.$nextTick(this.checkScrollable)
  },
  updated() {
    this.$nextTick(this.checkScrollable)
  },
  methods: {
    setFilter(evt) {
      this.filter = evt.target.value
    },
    onScroll() {
      if (!this.hasMore || this.loading) return
      const el = this.$refs.scrollEl
      if (!el) return
      const domEl = el.$el || el
      if (domEl.scrollTop + domEl.clientHeight >= domEl.scrollHeight - 40) {
        this.$emit('fetchAllProfiles')
      }
    },
    checkScrollable() {
      if (!this.hasMore || this.loading) return
      const el = this.$refs.scrollEl
      if (!el) return
      const domEl = el.$el || el
      if (domEl.scrollHeight <= domEl.clientHeight) {
        this.$emit('fetchAllProfiles')
      }
    },
  },
}
</script>

<style lang="scss">
.profile-list.os-card {
  display: flex;
  flex-direction: column;
  position: relative;
  width: auto;

  > .title {
    color: $text-color-soft;
    font-size: $font-size-base;
  }

  .profiles {
    height: $size-height-connections;
    padding: $space-none;
    list-style-type: none;

    &.--overflow {
      overflow-y: auto;
    }

    > .connections__item {
      padding: $space-xx-small;

      &.is-selected,
      &:hover {
        background-color: $background-color-primary-inverse;
      }
    }
  }

  .profiles-virtual {
    height: $size-height-connections;
    padding: $space-none;

    &.--overflow {
      overflow-y: auto;
    }

    .connections__item {
      padding: $space-xx-small;
      height: 56px;
      display: flex;
      align-items: center;

      &:hover {
        background-color: $background-color-primary-inverse;
      }
    }
  }

  .nobody-message {
    text-align: center;
    color: $text-color-soft;
  }

  .loading-more {
    display: flex;
    justify-content: center;
    padding: $space-x-small 0;
  }

  > :nth-child(n):not(:last-child) {
    margin-bottom: $space-small;
  }
}

.vue-recycle-scroller__item-wrapper {
  overflow: visible;
}
</style>
