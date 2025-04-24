<template>
  <div class="badge-selection">
    <button
      v-for="(badge, index) in badges"
      :key="badge.id"
      class="badge-selection-item"
      @click="handleBadgeClick(badge, index)"
    >
      <div class="badge-icon">
        <img :src="badge.icon | proxyApiUrl" :alt="badge.id" />
      </div>
      <div class="badge-info">
        <div class="badge-description">{{ badge.description }}</div>
      </div>
    </button>
  </div>
</template>

<script>
export default {
  name: 'BadgeSelection',
  props: {
    badges: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      selectedIndex: null,
    }
  },
  methods: {
    handleBadgeClick(badge, index) {
      if (this.selectedIndex === index) {
        this.selectedIndex = null
        this.$emit('badge-selected', null)
        return
      }

      this.selectedIndex = index
      this.$emit('badge-selected', badge)
    },
    resetSelection() {
      this.selectedIndex = null
    },
  },
}
</script>

<style lang="scss" scoped>
.badge-selection {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;

  .badge-selection-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    margin-bottom: 8px;
    border-radius: 8px;
    background-color: #f5f5f5;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    cursor: pointer;

    &:hover {
      background-color: #e0e0e0;
    }

    .badge-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      margin-right: 16px;

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }

    .badge-info {
      flex-grow: 1;

      .badge-title {
        font-weight: bold;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .badge-description {
        font-size: 14px;
        color: #666;
      }
    }
  }
}
</style>
