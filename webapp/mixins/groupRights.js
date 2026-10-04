import { canInGroup, groupRoleLabel, isGroupApplicant, isGroupMember } from '~/utils/groupRights'

/**
 * Group-scoped rights for a component that has a group.
 *
 * A mixin rather than a plugin, unlike the network-wide `$can`: network permissions belong to
 * the session, group permissions belong to a group object the component already holds. That
 * also means a component test needs no global setup — mount it with a group and the methods
 * work.
 *
 * Usage: `mixins: [groupRights]`, then `canInGroup('group.post.create', group)` in a template
 * or `this.canInGroup(...)` in script.
 */
export default {
  methods: {
    canInGroup,
    isGroupMember,
    isGroupApplicant,
    /** The label a group gave a role, else the translation of a seeded name, else its key. */
    roleLabel(role) {
      return groupRoleLabel(role, (key) => this.$t(key))
    },
  },
}
