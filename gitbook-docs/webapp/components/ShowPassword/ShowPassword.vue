<template>
  <span class="click-wrapper" @click="togglePassword">
    <span class="icon-wrapper" :data-test="iconName">
      <base-icon class="toggle-icon" :name="iconName" />
    </span>
  </span>
</template>

<script>
export default {
  props: ['iconName'],
  emits: ['toggle-password'],
  methods: {
    togglePassword(event) {
      event.preventDefault()
      this.$emit('show-password')
    },
  },
}
</script>

<style lang="scss">
.icon-wrapper {
  margin-right: 2px;
}

.click-wrapper {
  padding: 8px;
  align-content: center;
  color: $text-color-disabled;
  cursor: pointer;
}

.click-wrapper:hover {
  &:focus-within {
    background-color: $background-color-base;
    border: $input-border-size solid $border-color-active;

    .toggle-icon {
      color: $text-color-base;
    }
  }
}
</style>
