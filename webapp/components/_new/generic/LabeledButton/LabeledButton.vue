<template>
  <div class="labeled-button">
    <os-button
      variant="primary"
      circle
      :appearance="filled ? 'filled' : 'outline'"
      @click="(event) => $emit('click', event)"
    >
      <template #icon>
        <base-icon :name="icon" />
      </template>
    </os-button>
    <label class="label">{{ label }}</label>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
  props: {
    filled: {
      type: Boolean,
      default: false,
    },
    icon: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
}
</script>

<style lang="scss">
.labeled-button {
  display: flex;
  flex-direction: column;
  align-items: center;

  > .label {
    margin-top: $space-x-small;
    font-size: $font-size-small;
    text-align: center;
  }
}
</style>
