<template>
  <os-button
    size="sm"
    circle
    variant="primary"
    :appearance="isActive ? 'outline' : 'ghost'"
    @click="onClick"
  >
    <template #icon>
      <base-icon :name="icon" />
    </template>
    <span v-if="label">{{ label }}</span>
  </os-button>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  components: { OsButton },
  props: {
    isActive: Boolean,
    icon: String,
    label: String,
    onClick: { type: Function, default: () => {} },
  },
}
</script>
