<template>
  <div
    class="badge-selection"
    :class="{ 'reserve-drag-over': reserveDragOver }"
    @dragover.prevent="handleContainerDragOver"
    @dragleave="handleContainerDragLeave"
    @drop.prevent="handleContainerDrop"
  >
    <button
      v-for="(badge, index) in badges"
      :key="badge.id"
      class="badge-selection-item"
      :class="{ dragging: draggingIndex === index }"
      :draggable="dragEnabled"
      @click="handleBadgeClick(badge, index)"
      @dragstart="handleItemDragStart($event, badge, index)"
      @dragend="handleItemDragEnd"
    >
      <div class="badge-icon">
        <img :src="backendPath(badge.icon)" :alt="badge.id" />
      </div>
      <div class="badge-info">
        <div class="badge-description">{{ badge.description }}</div>
      </div>
    </button>
  </div>
</template>

<script>
import { backendPath } from '~/helpers/backendPath'
export default {
  name: 'BadgeSelection',
  props: {
    badges: {
      type: Array,
      default: () => [],
    },
    dragEnabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedIndex: null,
      draggingIndex: null,
      reserveDragOver: false,
    }
  },
  methods: {
    backendPath,
    handleBadgeClick(badge, index) {
      if (this.selectedIndex === index) {
        this.selectedIndex = null
        this.$emit('badge-selected', null)
        return
      }

      this.selectedIndex = index
      this.$emit('badge-selected', badge)
    },
    handleItemDragStart(event, badge, index) {
      if (!this.dragEnabled) {
        event.preventDefault()
        return
      }
      this.draggingIndex = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData(
        'application/json',
        JSON.stringify({ source: 'reserve', badge }),
      )
    },
    handleItemDragEnd() {
      this.draggingIndex = null
    },
    handleContainerDragOver() {
      this.reserveDragOver = true
    },
    handleContainerDragLeave() {
      this.reserveDragOver = false
    },
    handleContainerDrop(event) {
      this.reserveDragOver = false
      try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'))
        if (data.source === 'hex') {
          this.$emit('badge-returned', data)
        }
      } catch {
        // ignore invalid drag data
      }
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
  border: 2px solid transparent;
  border-radius: 12px;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &.reserve-drag-over {
    border-color: #4caf50;
    border-style: dashed;
    background-color: rgba(76, 175, 80, 0.05);
  }

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

    &.dragging {
      opacity: 0.4;
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
