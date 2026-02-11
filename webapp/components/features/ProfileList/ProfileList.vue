<template>
  <base-card class="profile-list">
    <template v-if="profiles.length">
      <h5 class="title spacer-x-small">
        {{ title }}
      </h5>

      <!-- Virtual Scroller for better performance -->
      <recycle-scroller
        v-if="isMoreAsVisible && showVirtualScroll"
        :items="filteredConnections"
        :item-size="itemHeight"
        key-field="id"
        :class="profilesClass"
        class="profiles-virtual"
        v-slot="{ item }"
      >
        <div class="connections__item">
          <user-teaser :user="item" />
        </div>
      </recycle-scroller>

      <!-- Normal list for only a few items -->
      <ul v-else :class="profilesClass">
        <li
          v-for="connection in displayedConnections"
          :key="connection.id"
          class="connections__item"
        >
          <user-teaser :user="connection" />
        </li>
      </ul>

      <ds-input
        v-if="isMoreAsVisible && !hasMore"
        :name="uniqueName"
        :placeholder="filterPlaceholder"
        :value="filter"
        class="spacer-x-small"
        icon="filter"
        size="small"
        @input.native="setFilter"
      />

      <os-button
        v-if="hasMore"
        variant="primary"
        appearance="outline"
        :loading="loading"
        class="spacer-x-small"
        size="sm"
        @click="$emit('fetchAllProfiles')"
      >
        {{
          $t('profile.network.andMore', {
            number: allProfilesCount - profiles.length,
          })
        }}
      </os-button>
    </template>
    <p v-else-if="titleNobody" class="nobody-message">{{ titleNobody }}</p>
  </base-card>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import { escape } from 'xregexp/xregexp-all.js'
// @ts-ignore
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import UserTeaser from '~/components/UserTeaser/UserTeaser'

export const profileListVisibleCount = 6
const VIRTUAL_SCROLL_THRESHOLD = 50

export default {
  name: 'ProfileList',
  components: {
    OsButton,
    UserTeaser,
    RecycleScroller,
  },
  props: {
    uniqueName: { type: String, required: true },
    title: { type: String, required: true },
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
  methods: {
    setFilter(evt) {
      this.filter = evt.target.value
    },
  },
}
</script>

<style lang="scss">
.profile-list {
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

  > :nth-child(n):not(:last-child) {
    margin-bottom: $space-small;
  }
}

.vue-recycle-scroller__item-wrapper {
  overflow: visible;
}
</style>
