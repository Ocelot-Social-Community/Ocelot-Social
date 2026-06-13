<template>
  <span
    class="permission-disable"
    :class="{ 'permission-disable--denied': denied }"
    v-tooltip="tooltip"
  >
    <slot />
  </span>
</template>

<script>
/**
 * "Gray out" wrapper for permission-gated actions. When the current user lacks
 * `permission`, the wrapped element is grayed and made inert (no click / no link
 * navigation), and a tooltip explains why.
 *
 * The tooltip sits on the wrapper (not the disabled element) so it still appears on
 * hover — a native disabled <button> emits no pointer events. Pointer events are
 * removed from the wrapped element, so hovering it bubbles to the wrapper.
 */
export default {
  name: 'PermissionDisable',
  props: {
    // An empty permission is always granted — lets callers pass e.g.
    // :permission="isCreateMode ? 'post.create' : ''" for forms that also edit.
    permission: { type: String, default: '' },
  },
  computed: {
    denied() {
      return !!this.permission && !this.$can(this.permission)
    },
    tooltip() {
      return this.denied ? { content: this.$t('permissions.deniedHint') } : ''
    },
  },
}
</script>

<style lang="scss">
.permission-disable {
  display: inline-flex;

  &--denied {
    cursor: not-allowed;

    > * {
      pointer-events: none;
      opacity: 0.45;
      filter: grayscale(0.7);
    }
  }
}
</style>
