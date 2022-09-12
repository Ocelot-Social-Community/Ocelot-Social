<template>
  <base-card class="profile-list">
    <template v-if="profiles.length">
      <h5 class="title spacer-x-small">
        {{ title }}
      </h5>
      <ul :class="profilesClass">
        <li
          v-for="connection in filteredConnections"
          :key="connection.id"
          class="connections__item"
        >
          <user-teaser :user="connection" />
        </li>
      </ul>
      <ds-input
        v-if="isMoreAsVisible"
        :name="uniqueName"
        :placeholder="filter"
        class="spacer-x-small"
        icon="filter"
        size="small"
        @input.native="setFilter"
      />
      <base-button
        v-if="hasMore"
        :loading="loading"
        class="spacer-x-small"
        size="small"
        @click="$emit('fetchAllProfiles')"
      >
        {{
          $t('profile.network.andMore', {
            number: allProfilesCount - profiles.length,
          })
        }}
      </base-button>
    </template>
    <p v-else-if="titleNobody" class="nobody-message">{{ titleNobody }}</p>
  </base-card>
</template>

<script>
import { escape } from 'xregexp/xregexp-all.js'
import UserTeaser from '~/components/UserTeaser/UserTeaser'

export const profileListVisibleCount = 7

export default {
  name: 'ProfileList',
  components: {
    UserTeaser,
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
    }
  },
  computed: {
    hasMore() {
      return this.allProfilesCount > this.profiles.length
    },
    isMoreAsVisible() {
      return this.profiles.length > this.profileListVisibleCount
    },
    profilesClass() {
      return `profiles${this.isMoreAsVisible ? ' --overflow' : ''}`
    },
    filteredConnections() {
      if (!this.filter) {
        return this.profiles
      }

      // @example
      //  this.filter = 'foo';
      //  fuzzyExpression = /([^f]*f)([^o]*o)([^o]*o)/i
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

  .nobody-message {
    text-align: center;
    color: $text-color-soft;
  }

  > :nth-child(n):not(:last-child) {
    margin-bottom: $space-small;
  }
}
</style>
