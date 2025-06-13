<template>
  <button
    :class="buttonClass"
    :disabled="disabled || loading"
    :type="type"
    @click.capture="(event) => $emit('click', event)"
  >
    <base-icon v-if="icon" :name="icon" />
    <loading-spinner v-if="loading" />
    <slot />
  </button>
</template>

<script>
import LoadingSpinner from '~/components/_new/generic/LoadingSpinner/LoadingSpinner'

export default {
  components: {
    LoadingSpinner,
  },
  props: {
    bullet: {
      type: Boolean,
      default: false,
    },
    circle: {
      type: Boolean,
      default: false,
    },
    danger: {
      type: Boolean,
      default: false,
    },
    filled: {
      type: Boolean,
      default: false,
    },
    ghost: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String,
      default: 'regular',
      validator(value) {
        return value.match(/(tiny|small|regular|large)/)
      },
    },
    padding: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      default: 'button',
      validator(value) {
        return value.match(/(button|submit)/)
      },
    },
    disabled: {
      // type: Boolean, // makes some errors that an Object was passed instead a Boolean and could not find how to solve in a acceptable time
      default: false,
    },
  },
  computed: {
    buttonClass() {
      let buttonClass = 'base-button'

      if (this.$slots.default === undefined) buttonClass += ' --icon-only'
      if (this.bullet) buttonClass += ' --bullet'
      if (this.circle) buttonClass += ' --circle'
      if (this.danger) buttonClass += ' --danger'
      if (this.loading) buttonClass += ' --loading'
      if (this.size === 'tiny') buttonClass += ' --tiny'
      if (this.size === 'small') buttonClass += ' --small'
      if (this.size === 'large') buttonClass += ' --large'
      if (this.padding) buttonClass += ' --padding'

      if (this.filled) buttonClass += ' --filled'
      else if (this.ghost) buttonClass += ' --ghost'

      return buttonClass
    },
  },
}
</script>

<style lang="scss">
@import '~/assets/_new/styles/mixins/buttonStates.scss';

.base-button {
  @include buttonStates;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: $size-button-base;
  padding: 0 $space-x-small;
  vertical-align: bottom;
  border: $border-size-base solid;
  border-radius: $border-radius-x-large;
  overflow: hidden;
  font-weight: $font-weight-bold;
  letter-spacing: $letter-spacing-large;
  cursor: pointer;
  white-space: nowrap;

  &.--danger {
    @include buttonStates($color-scheme: danger);
  }

  &.--filled {
    @include buttonStates($filled: true);
  }

  &.--danger.--filled {
    @include buttonStates($color-scheme: danger, $filled: true);
  }

  &.--circle {
    width: var(--circle-button-width, $size-button-base);
    height: var(--circle-button-width, $size-button-base);
    border-radius: 50%;
  }

  &.--bullet {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    &[disabled] {
      background-color: transparent;
      border: 1px solid $color-neutral-80;
    }
  }

  &.--ghost {
    border: none;
  }

  &.--tiny {
    height: $size-button-tiny;
    &.--bullet,
    &.--circle {
      width: $size-button-tiny;
    }
  }

  &.--small {
    height: $size-button-small;
    font-size: $font-size-small;

    &.--bullet,
    &.--circle {
      width: $size-button-small;
    }
  }

  &.--large {
    height: $size-button-large;
    font-size: $font-size-large;

    &.--bullet,
    &.--circle {
      width: $size-button-large;
    }
  }

  &.--padding {
    padding: 0 20px;
  }
  @media screen and (max-width: 400px) {
    &.--padding {
      padding: 0 15px;
    }
  }

  &:not(.--icon-only) > .base-icon {
    margin-right: $space-xx-small;
  }

  &:disabled.--loading {
    color: $color-neutral-80;
  }

  > .loading-spinner {
    position: absolute;
    height: $size-button-small;
    color: $color-neutral-60;
  }

  &.--filled > .loading-spinner {
    color: $color-neutral-100;
  }
}
</style>
