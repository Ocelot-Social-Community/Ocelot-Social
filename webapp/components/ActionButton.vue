<template>
  <div class="action-button">
    <base-button
      :loading="loading"
      :disabled="disabled"
      :icon="icon"
      :aria-label="text"
      circle
      @click="click"
    />
    <div class="count">{{ count }}</div>
  </div>
</template>

<script>
export default {
  props: {
    count: { type: Number, required: true },
    text: { type: String, required: true },
    icon: { type: String, required: true },
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
  color: $color-secondary-inverse;
  background-color: $color-primary-dark;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: -8px;
  right: -8px;
  --diameter: calc(var(--circle-button-width, #{$size-button-base}) * 0.7);
  width: var(--diameter);
  height: var(--diameter);
  border-radius: 12px;
  font-size: 12px;
}
</style>
