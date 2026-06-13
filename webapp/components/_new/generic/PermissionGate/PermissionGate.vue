<script>
/**
 * Renders its default slot only when the current user holds `permission` — the
 * "hide" pattern for permission-gated UI.
 *
 * For the "gray out" pattern, bind `:disabled="!$can('x')"` directly on the element
 * instead (the action stays visible but inert, with a tooltip explaining why).
 */
export default {
  name: 'PermissionGate',
  props: {
    permission: { type: String, required: true },
  },
  render(h) {
    if (!this.$can(this.permission)) return h()
    const slot = this.$slots.default
    if (!slot || !slot.length) return h()
    return slot.length === 1 ? slot[0] : h('span', slot)
  },
}
</script>
