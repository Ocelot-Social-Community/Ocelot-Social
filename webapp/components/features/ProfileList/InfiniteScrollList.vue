<template>
  <os-card>
    <div class="infinite-scroll-list" :class="{ 'filter-active': showFilter }">
      <h5 v-if="title" class="title">
        {{ title }}
        <span v-if="count !== null" class="count">({{ count }})</span>
      </h5>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      <div ref="scrollEl" class="scroll-container" @scroll="onScroll">
        <slot />
        <p v-if="empty && !loading" class="nobody-message">{{ nobodyMessage }}</p>
        <div v-if="loading" class="loading-indicator">
          <os-spinner size="md" />
        </div>
      </div>
      <div v-if="showFilter" class="filter-wrap">
        <ocelot-input
          :name="`infinite-scroll-filter-${_uid}`"
          :placeholder="filterPlaceholder || $t('common.filter')"
          :value="filterValue"
          icon="filter"
          size="small"
          class="filter-input"
          @input.native="onFilterInput"
        />
        <span class="filter-clear-wrap" :class="{ 'filter-clear-wrap--hidden': !filterValue }">
          <os-button
            variant="primary"
            appearance="ghost"
            circle
            size="sm"
            :aria-label="$t('actions.clear')"
            @click="clearFilter"
          >
            <template #icon>
              <os-icon :icon="icons.close" />
            </template>
          </os-button>
        </span>
      </div>
    </div>
  </os-card>
</template>

<script>
import { OsButton, OsCard, OsIcon, OsSpinner } from '@ocelot-social/ui'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'InfiniteScrollList',
  components: { OsButton, OsCard, OsIcon, OsSpinner, OcelotInput },
  props: {
    title: { type: String, default: null },
    count: { type: Number, default: null },
    nobodyMessage: { type: String, default: null },
    empty: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: false },
    subtitle: { type: String, default: null },
    showFilter: { type: Boolean, default: false },
    filterPlaceholder: { type: String, default: null },
    filterMinLength: { type: Number, default: 3 },
  },
  data() {
    return {
      filterValue: '',
    }
  },
  created() {
    this.icons = iconRegistry
  },
  mounted() {
    this.$nextTick(this.checkScrollable)
  },
  updated() {
    this.$nextTick(this.checkScrollable)
  },
  beforeDestroy() {
    clearTimeout(this._scrollTimer)
    clearTimeout(this._filterTimer)
  },
  methods: {
    clearFilter() {
      this.filterValue = ''
      clearTimeout(this._filterTimer)
      this.$emit('filter-change', '')
    },
    onFilterInput(evt) {
      const val = evt.target.value
      this.filterValue = val
      clearTimeout(this._filterTimer)
      this._filterTimer = setTimeout(() => {
        this.$emit('filter-change', val.length >= this.filterMinLength ? val : '')
      }, 300)
    },
    onScroll() {
      const el = this.$refs.scrollEl
      if (!el) return

      if (!el.classList.contains('is-scrolling')) {
        this.$emit('scrolling-change', true)
      }
      el.classList.add('is-scrolling')
      clearTimeout(this._scrollTimer)
      this._scrollTimer = setTimeout(() => {
        el.classList.remove('is-scrolling')
        this.$emit('scrolling-change', false)
      }, 800)

      if (!this.hasMore || this.loading) return
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
        this.$emit('load-more')
      }
    },
    checkScrollable() {
      if (!this.hasMore || this.loading) return
      const el = this.$refs.scrollEl
      if (!el) return
      if (el.scrollHeight <= el.clientHeight) {
        this.$emit('load-more')
      }
    },
  },
}
</script>

<style scoped>
.infinite-scroll-list {
  display: flex;
  flex-direction: column;
  max-height: 360px;

  &.filter-active {
    height: 360px;
  }

  > .title {
    color: var(--text-color-soft);
    font-size: var(--font-size-base);
    margin-bottom: var(--space-small);

    .count {
      font-weight: normal;
    }
  }
}

.subtitle {
  font-size: var(--font-size-small);
  color: var(--text-color-soft);
  margin-top: calc(-1 * var(--space-x-small));
  margin-bottom: var(--space-small);
}

.filter-wrap {
  flex-shrink: 0;
  position: relative;
  margin-top: var(--space-small);

  .filter-input {
    margin-top: 0;
    margin-bottom: 0;
  }

  .filter-clear-wrap {
    position: absolute;
    right: var(--space-xx-small);
    top: 50%;
    transform: translateY(-50%);

    ::v-deep button {
      width: 20px !important;
      height: 20px !important;
      min-width: unset !important;
      padding: 0 !important;

      svg {
        width: 10px !important;
        height: 10px !important;
      }
    }
  }

  .filter-clear-wrap--hidden {
    opacity: 0;
    pointer-events: none;
  }
}

.scroll-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  /* Standard: Firefox + Safari 18+ */
  scrollbar-width: none;

  &.is-scrolling {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
  }

  /* Webkit: Safari < 18, Chrome */
  &::-webkit-scrollbar {
    width: 0;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
  }

  &.is-scrolling::-webkit-scrollbar {
    width: 6px;
  }

  &.is-scrolling::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.25);
  }
}

.nobody-message {
  text-align: center;
  color: var(--text-color-soft);
  padding: var(--space-x-small) 0;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: var(--space-x-small) 0;
}
</style>
