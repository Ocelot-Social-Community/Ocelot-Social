<template>
  <os-card>
    <div class="infinite-scroll-list" :class="{ 'filter-active': filterActive }">
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
      <ocelot-input
        v-if="showFilter"
        :name="`infinite-scroll-filter-${_uid}`"
        :placeholder="filterPlaceholder || $t('common.filter')"
        :value="filterValue"
        icon="filter"
        size="small"
        class="filter-input"
        @input.native="onFilterInput"
      />
    </div>
  </os-card>
</template>

<script>
import { OsCard, OsSpinner } from '@ocelot-social/ui'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'InfiniteScrollList',
  components: { OsCard, OsSpinner, OcelotInput },
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
  computed: {
    filterActive() {
      return this.filterValue.length > 0
    },
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

<style lang="scss" scoped>
.infinite-scroll-list {
  display: flex;
  flex-direction: column;
  max-height: 360px;

  &.filter-active {
    height: 360px;
  }

  > .title {
    color: $text-color-soft;
    font-size: $font-size-base;
    margin-bottom: $space-small;

    .count {
      font-weight: normal;
    }
  }
}

.subtitle {
  font-size: $font-size-small;
  color: $text-color-soft;
  margin-top: -$space-x-small;
  margin-bottom: $space-small;
}

.filter-input {
  margin-top: $space-small;
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
  color: $text-color-soft;
  padding: $space-x-small 0;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  padding: $space-x-small 0;
}
</style>
