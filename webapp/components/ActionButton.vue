<template>
  <div class="action-button">
    <base-button
      :loading="loading"
      :disabled="disabled"
      :filled="filled"
      :icon="icon"
      circle
      @click="click"
    />
    <span color="soft" class="text">{{ count }}x {{ text }}</span>
  </div>
</template>

<script>
export default {
  props: {
    count: { type: Number, required: true },
    text: { type: String, required: true },
    disabled: { type: Boolean, default: false },
    filled: { type: Boolean, required: true },
    icon: { type: String, required: true },
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
}
.text {
  user-select: none;
  color: $text-color-soft;
}
</style>
