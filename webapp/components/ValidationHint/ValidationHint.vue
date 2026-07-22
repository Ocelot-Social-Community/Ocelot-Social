<template>
  <div v-if="hasContent" class="validation-hint" :class="rootClasses">
    <p v-if="text" class="validation-hint__text">{{ text }}</p>
    <os-badge
      v-if="hasCount || variant"
      :variant="badgeVariant"
      :class="badgeClasses"
      :role="variant ? 'alert' : null"
      :aria-live="variant ? 'assertive' : 'polite'"
    >
      <span v-if="hasCount">
        {{ count }}
        <template v-if="max != null">/ {{ max }}</template>
      </span>
      <os-icon v-if="variant" :icon="resolvedIcon" />
    </os-badge>
  </div>
</template>

<script>
import { OsBadge, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  name: 'ValidationHint',
  components: { OsBadge, OsIcon },
  props: {
    variant: {
      type: String,
      default: null,
      validator: (v) => v === null || v === 'warning' || v === 'error',
    },
    text: {
      type: String,
      default: null,
    },
    count: {
      type: [Number, String],
      default: null,
    },
    max: {
      type: [Number, String],
      default: null,
    },
  },
  computed: {
    hasCount() {
      return this.count != null
    },
    hasContent() {
      return !!(this.text || this.hasCount || this.variant)
    },
    resolvedIcon() {
      return this.variant === 'warning' ? iconRegistry.questionCircle : iconRegistry.warning
    },
    badgeVariant() {
      return this.variant === 'error' ? 'danger' : undefined
    },
    badgeClasses() {
      return this.variant === 'warning' ? 'validation-hint__badge--warning' : null
    },
    rootClasses() {
      return [
        this.text ? 'validation-hint--row' : 'validation-hint--badge',
        this.variant ? `validation-hint--${this.variant}` : null,
      ]
    },
  },
}
</script>

<style lang="scss">
.validation-hint {
  &--row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: $space-xxx-small;
  }

  &--badge {
    display: flex;
    justify-content: flex-end;
  }

  &__text {
    font-size: 0.75rem;
    line-height: 1;
    margin: 0;
    flex: 1;
    min-width: 0;
  }

  &--warning .validation-hint__text {
    color: $color-warning;
  }

  &--error .validation-hint__text {
    color: $color-danger;
  }
}

.validation-hint__badge--warning {
  --color-default: #{$color-warning};
  --color-default-contrast: white;
}
</style>
