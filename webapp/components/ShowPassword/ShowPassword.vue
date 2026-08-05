<template>
  <span class="click-wrapper" @click="togglePassword">
    <span class="icon-wrapper">
      <os-icon class="toggle-icon" :icon="icon" />
    </span>
  </span>
</template>

<script>
import { OsIcon } from '@ocelot-social/ui'

export default {
  components: { OsIcon },
  props: {
    icon: { type: [Object, Function], required: true },
  },
  emits: ['show-password'],
  methods: {
    togglePassword(event) {
      event.preventDefault()
      this.$emit('show-password')
    },
  },
}
</script>

<style>
.icon-wrapper {
  margin-right: 2px;
}

.click-wrapper {
  padding: 8px;
  align-content: center;
  color: var(--text-color-disabled);
  cursor: pointer;
}

.click-wrapper:hover {
  &:focus-within {
    background-color: var(--background-color-base);
    border: var(--input-border-size) solid var(--border-color-active);

    .toggle-icon {
      color: var(--text-color-base);
    }
  }
}
</style>
