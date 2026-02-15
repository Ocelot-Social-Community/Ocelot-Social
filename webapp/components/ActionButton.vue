<template>
  <div class="action-button">
    <os-button
      variant="primary"
      :appearance="filled ? 'filled' : 'outline'"
      :loading="loading"
      :disabled="disabled"
      :aria-label="text"
      circle
      @click="click"
    >
      <template #icon>
        <os-icon :icon="icon" />
      </template>
    </os-button>
    <div class="count">{{ count }}</div>
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'

export default {
  components: { OsButton, OsIcon },
  props: {
    count: { type: Number, required: true },
    text: { type: String, required: true },
    icon: { type: [Object, Function], required: true },
    filled: { type: Boolean, default: false },
    disabled: { type: Boolean },
    loading: { type: Boolean },
  },
  methods: {
    click() {
      this.$emit('click')
    },
  },
}
</script>

<style lang="scss" scoped>
.action-button {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: $space-xx-small;
  position: relative;
  --icon-size: calc(var(--circle-button-width, #{$size-button-base}) / 2);
}
.count {
  user-select: none;
  color: $color-primary-dark;
  background-color: $color-secondary-inverse;
  border: 1px solid $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -12px;
  left: calc(100% - 16px);
  --diameter: calc(var(--circle-button-width, #{$size-button-base}) * 0.7);
  min-width: var(--diameter);
  height: var(--diameter);
  border-radius: 12px;
  font-size: 12px;
  padding-inline: 2px;
}
</style>
