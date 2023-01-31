<template>
  <span v-if="svgIcon" class="base-icon">
    <component :class="['svg', `--${size}`]" :is="svgIcon" aria-hidden="true" focusable="false" />
  </span>
</template>

<script>
import icons, { iconNames } from '~/assets/_new/icons'

export default {
  props: {
    name: {
      type: String,
      required: true,
      validator(value) {
        return iconNames.includes(value)
      },
    },
    size: {
      type: String,
      default: 'regular',
      validator(value) {
        return value.match(/(small|regular|large)/)
      },
    },
  },
  computed: {
    svgIcon() {
      const icon = icons[this.name]
      if (!icon) {
        return false
      }
      /*
      a Vue component needs a render function,
      so we check if there is a render function directly on the icon –
      otherwise we know it is wrapped in icon.default
      */
      return icon.render ? icon : icon.default
    },
  },
}
</script>

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

    &.--regular {
      height: 1.2em;
    }

    &.--large {
      margin-top: 2.5px;
      margin-left: 3px;
      height: 45.4px;
    }
  }
}
</style>
