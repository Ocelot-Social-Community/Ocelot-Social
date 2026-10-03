<template>
  <!--
    A row of buttons of which one is the current one — the role tabs, for one. Hand-made rows
    like that keep their own active and hover rules, and the role tabs got one wrong: hovering
    the current tab put its white text on the light hover background. Built on OsButton, so how a button looks in each state is the
    library's business and the same as everywhere else in the app.
  -->
  <div class="toggle-group" role="group" :aria-label="label">
    <os-button
      v-for="item in items"
      :key="item.value"
      :variant="item.value === value ? 'primary' : 'default'"
      :appearance="item.value === value ? 'filled' : 'outline'"
      size="sm"
      :aria-pressed="String(item.value === value)"
      class="toggle-group__item"
      :class="{ 'toggle-group__item--active': item.value === value }"
      :data-test="item.testId"
      @click="$emit('select', item.value)"
      @mouseenter="$emit('hover', item.value)"
      @mouseleave="$emit('hover', null)"
    >
      {{ item.label }}
      <!-- Whatever a row adds to its buttons: a lock, for instance. -->
      <slot name="extra" :item="item" />
    </os-button>
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'

export default {
  name: 'ToggleGroup',
  components: { OsButton },
  props: {
    /** The buttons: `{ value, label, testId? }`. */
    items: { type: Array, required: true },
    /** The current one. */
    value: { type: String, default: null },
    /** What the row as a whole chooses, for assistive tech. */
    label: { type: String, default: null },
  },
}
</script>

<style scoped>
.toggle-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-xx-small);
}

.toggle-group__item {
  gap: var(--space-xxx-small);
}
</style>
