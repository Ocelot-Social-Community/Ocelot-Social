<template>
  <div :class="[badges.length === 2 && 'hc-badges-dual']" class="hc-badges">
    <div v-for="badge in badges" :key="badge.id" class="hc-badge-container">
      <img :title="badge.key" :src="badge.icon | proxyApiUrl" class="hc-badge" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    badges: {
      type: Array,
      default: () => [],
    },
  },
}
</script>

<style lang="scss">
@use 'sass:math';
.hc-badges {
  text-align: center;
  position: relative;

  .hc-badge-container {
    display: inline-block;
    position: unset;
    overflow: hidden;
    vertical-align: middle;
  }

  .hc-badge {
    display: block;
    width: 100%;
  }

  $size: 30px;
  $offset: $size * -0.2;

  &.hc-badges-dual {
    padding-top: math.div($size, 2) - 2;
  }

  .hc-badge-container {
    width: $size;
    height: 26px;
    margin-left: -1px;

    &:nth-child(3n - 1) {
      margin-top: -$size - $offset - 3;
      margin-left: -$size * 0.33 - $offset - 2;
    }
    &:nth-child(3n + 0) {
      margin-top: $size + $offset + 3;
      margin-left: -$size;
    }
    &:nth-child(3n + 1) {
      margin-left: -6px;
    }
    &:first-child {
      margin-left: math.div(-$size, 3);
    }
    &:last-child {
      margin-right: math.div(-$size, 3);
    }
  }
}
</style>
