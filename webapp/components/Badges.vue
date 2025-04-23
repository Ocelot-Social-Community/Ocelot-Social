<template>
  <div
    :class="[badges.length === 2 && 'hc-badges-dual']"
    class="hc-badges"
    :style="{ transform: `scale(${scale})` }"
  >
    <component
      :is="selectionMode ? 'button' : 'div'"
      class="hc-badge-container"
      v-for="(badge, index) in badges"
      :key="index"
      :title="badge.description"
      :class="{ selectable: selectionMode && index > 0, selected: selectedIndex === index }"
      @click="handleBadgeClick(index)"
    >
      <img :title="badge.key" :src="badge.icon | proxyApiUrl" class="hc-badge" />
    </component>
  </div>
</template>

<script>
export default {
  name: 'Badges',
  props: {
    badges: {
      type: Array,
      default: () => [],
    },
    scale: {
      type: Number,
      default: 1,
    },
    selectionMode: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      selectedIndex: null,
    }
  },
  methods: {
    handleBadgeClick(index) {
      if (!this.selectionMode || index === 0) {
        return
      }
      if (this.selectedIndex === index) {
        this.selectedIndex = null
        this.$emit('badge-selected', null)
        return
      }

      this.selectedIndex = index
      this.$emit('badge-selected', index)
    },
    resetSelection() {
      this.selectedIndex = null
    },
  },
}
</script>

<style lang="scss">
.hc-badges {
  position: relative;

  $badge-size-x: 30px;
  $badge-size-y: 26px;
  $main-badge-size-x: 60px;
  $main-badge-size-y: 52px;
  $gap-x: -6px;
  $gap-y: 1px;
  $slot-x: $badge-size-x + $gap-x;
  $slot-y: $badge-size-y + $gap-y;
  $offset-y: calc($badge-size-y / 2) - 2 * $gap-x;

  width: $main-badge-size-x + 4 * $badge-size-x + 4 * $gap-x;
  height: $offset-y + 3 * $badge-size-y + 4 * $gap-y;
  margin: auto;

  .hc-badge-container {
    position: absolute;
    width: $badge-size-x;
    height: $badge-size-y;

    &.selectable {
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.1);
        filter: brightness(1.1);
      }
    }

    &.selected {
      transform: scale(1.1);
      filter: brightness(1.2);
    }
  }

  .hc-badge {
    display: block;
    width: 100%;
    height: 100%;
  }

  .hc-badge-container:nth-child(1) {
    width: $main-badge-size-x;
    height: $main-badge-size-y;
    top: $offset-y + calc($gap-y / 2) - 1px;
    left: 0;
  }

  .hc-badge-container:nth-child(1)::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 0;
    width: 100%;
    height: 20px;
    background-image: url('/img/badges/stars.svg');
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }

  .hc-badge-container:nth-child(2) {
    top: $offset-y + calc(-1 * $gap-y / 2) - 1px;
    left: $main-badge-size-x + $gap-x;
  }

  .hc-badge-container:nth-child(3) {
    top: $offset-y + $slot-y + calc($gap-y / 2) - 1px;
    left: $main-badge-size-x + $gap-x;
  }

  .hc-badge-container:nth-child(4) {
    top: $offset-y + calc(-1 * $badge-size-y / 2) - (2 * $gap-y);
    left: $main-badge-size-x + $gap-x + $slot-x;
  }

  .hc-badge-container:nth-child(5) {
    top: $offset-y + calc($badge-size-y / 2);
    left: $main-badge-size-x + $gap-x + $slot-x;
  }

  .hc-badge-container:nth-child(6) {
    top: $offset-y + (1.5 * $badge-size-y) + (2 * $gap-y);
    left: $main-badge-size-x + $gap-x + $slot-x;
  }

  .hc-badge-container:nth-child(7) {
    top: $offset-y + calc(-1 * $gap-y / 2) - 1px;
    left: $main-badge-size-x + $gap-x + (2 * $slot-x);
  }

  .hc-badge-container:nth-child(8) {
    top: $offset-y + $slot-y + calc($gap-y / 2) - 1px;
    left: $main-badge-size-x + $gap-x + (2 * $slot-x);
  }

  .hc-badge-container:nth-child(9) {
    top: $offset-y + $slot-y - calc($badge-size-y / 2) - $gap-y;
    left: $main-badge-size-x + $gap-x + (3 * $slot-x);
  }

  .hc-badge-container:nth-child(10) {
    top: $offset-y + ($badge-size-y * 1.5) + (2 * $gap-y);
    left: $main-badge-size-x + $gap-x + (3 * $slot-x);
  }
}
</style>
