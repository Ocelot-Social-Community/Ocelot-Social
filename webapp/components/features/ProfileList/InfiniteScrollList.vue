<template>
  <os-card>
    <div class="infinite-scroll-list">
      <h5 v-if="title" class="title">
        {{ title }}
        <span v-if="count !== null" class="count">({{ count }})</span>
      </h5>
      <div ref="scrollEl" class="scroll-container" @scroll="onScroll">
        <slot />
        <p v-if="empty && !loading" class="nobody-message">{{ nobodyMessage }}</p>
      </div>
      <div v-if="loading" class="loading-indicator">
        <os-spinner size="sm" />
      </div>
    </div>
  </os-card>
</template>

<script>
import { OsCard, OsSpinner } from '@ocelot-social/ui'

export default {
  name: 'InfiniteScrollList',
  components: { OsCard, OsSpinner },
  props: {
    title: { type: String, default: null },
    count: { type: Number, default: null },
    nobodyMessage: { type: String, default: null },
    empty: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    hasMore: { type: Boolean, default: false },
  },
  mounted() {
    this.$nextTick(this.checkScrollable)
  },
  updated() {
    this.$nextTick(this.checkScrollable)
  },
  beforeDestroy() {
    clearTimeout(this._scrollTimer)
  },
  methods: {
    onScroll() {
      const el = this.$refs.scrollEl
      if (!el) return

      el.classList.add('is-scrolling')
      clearTimeout(this._scrollTimer)
      this._scrollTimer = setTimeout(() => {
        el.classList.remove('is-scrolling')
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

  > .title {
    color: $text-color-soft;
    font-size: $font-size-base;
    margin-bottom: $space-small;

    .count {
      font-weight: normal;
    }
  }
}

.scroll-container {
  max-height: 320px;
  overflow-y: auto;

  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &.is-scrolling {
    scrollbar-color: rgba(0, 0, 0, 0.25) transparent;
  }

  /* Webkit */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
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
