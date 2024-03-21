<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    name: string
    size?: 'small' | 'medium' | 'large'
    ariaHidden?: boolean
  }>(),
  { size: 'medium', ariaHidden: false },
)
</script>

<template>
  <v-icon
    class="base-icon"
    :class="['svg', `--${size}`]"
    :aria-hidden="props.ariaHidden"
    :icon="props.name"
  ></v-icon>
</template>

<style lang="scss">
.base-icon {
  display: inline-flex;
  vertical-align: bottom;

  > .svg {
    height: 1.2em;
    fill: currentColor;

    &.--small {
      height: 0.8em;
    }

    &.--medium {
      height: 1.2em;
    }

    &.--large {
      margin-left: 4px;
      height: 2.2em;
    }
  }
}
</style>
