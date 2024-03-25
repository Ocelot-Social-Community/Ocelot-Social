<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    icon: string
    color?: string
    size: string | number | undefined
  }>(),
  { color: '' },
)
</script>

<template>
  <v-icon class="svg-color" :icon="props.icon" :size="props.size" />
</template>

<style lang="scss">
.svg-color {
  // there should be a '@use' directive to silent stylelint, but I couldn't find this out
  // stylelint-disable function-no-unknown
  color: v-bind('props.color');
  fill: currentcolor;
  stroke: currentcolor;
}
</style>
