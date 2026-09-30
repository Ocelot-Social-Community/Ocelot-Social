<script>
import { canInGroup } from '~/plugins/group-permissions'

/**
 * Renders its default slot only when the current user holds `permission` — the
 * "hide" pattern for permission-gated UI.
 *
 * With `group`, the right is checked INSIDE that group instead of network-wide: the group
 * carries `myGroupPermissions`, so the same component serves both axes.
 *
 * For the "gray out" pattern, bind `:disabled="!$can('x')"` (or
 * `:disabled="!$canInGroup('x', group)"`) directly on the element instead — the action stays
 * visible but inert, with a tooltip explaining why.
 */
export default {
  name: 'PermissionGate',
  props: {
    permission: { type: String, required: true },
    group: { type: Object, default: null },
  },
  render(h) {
    const allowed = this.group
      ? canInGroup(this.permission, this.group)
      : this.$can(this.permission)
    if (!allowed) return h()
    const slot = this.$slots.default
    if (!slot || !slot.length) return h()
    return slot.length === 1 ? slot[0] : h('span', slot)
  },
}
</script>
