<template>
  <!-- Nothing to offer somebody who may neither enter nor ask: a group can close its door
       entirely (neither `group.join` nor `group.join.request` on the role a stranger carries),
       and a button that the shield would refuse is worse than no button. -->
  <div v-if="isMember || mayEnter">
    <os-button
      data-test="join-leave-btn"
      :variant="isMember && hovered ? 'danger' : 'primary'"
      :appearance="filled || (isMember && !hovered) ? 'filled' : 'outline'"
      :disabled="disabled"
      :loading="localLoading"
      :full-width="fullWidth"
      v-tooltip="tooltip"
      @mouseenter="onHover"
      @mouseleave="hovered = false"
      @click.prevent="toggle"
    >
      <template #icon>
        <os-icon :icon="icon" />
      </template>
      {{ label }}
    </os-button>
    <confirm-modal
      v-if="showConfirmModal"
      :modalData="leaveModalData"
      @close="showConfirmModal = false"
    />
  </div>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import { useJoinLeaveGroup } from '~/composables/useJoinLeaveGroup'
import groupRights from '~/mixins/groupRights'
import { ADMIN_GROUP_ROLE, OWNER_GROUP_ROLE } from '~/constants/groups'

export default {
  name: 'JoinLeaveButton',
  mixins: [groupRights],
  components: { ConfirmModal, OsButton, OsIcon },
  props: {
    group: { type: Object, required: true },
    userId: { type: String, required: true },
    isMember: { type: Boolean, required: true },
    isNonePendingMember: { type: Boolean, required: true },
    filled: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    fullWidth: { type: Boolean, default: true },
  },
  data() {
    return {
      localLoading: this.loading,
      hovered: false,
      showConfirmModal: false,
    }
  },
  computed: {
    /**
     * What leaving actually costs, which is not the same for everybody.
     *
     * An ordinary member walks out. Somebody who ADMINISTERS the group gives that up with the
     * same click, and an owner may leave the group without one at all — after which only a
     * network administrator can make it workable again (concept 3.9). The same button for three
     * different consequences needs three different sentences in front of it.
     */
    leaveMessageIdent() {
      const role = this.group?.myGroupRole?.name
      if (role === OWNER_GROUP_ROLE) return 'group.leaveModal.messageOwner'
      if (role === ADMIN_GROUP_ROLE) return 'group.leaveModal.messageAdmin'
      return 'group.leaveModal.message'
    },
    leaveModalData() {
      return {
        titleIdent: 'group.leaveModal.title',
        messageIdent: this.leaveMessageIdent,
        messageParams: {
          name: this.group.name,
        },
        buttons: {
          confirm: {
            danger: true,
            icon: this.icons.signOut,
            textIdent: 'group.leaveModal.confirmButton',
            callback: this.joinLeave,
          },
          cancel: {
            icon: this.icons.close,
            textIdent: 'actions.cancel',
            callback: () => {},
          },
        },
      }
    },
    icon() {
      if (this.mayCompleteJoin) {
        return this.icons.plus
      }
      if (this.isMember) {
        if (this.isNonePendingMember) {
          return this.hovered ? this.icons.close : this.icons.check
        } else {
          return this.hovered ? this.icons.close : this.icons.questionCircle
        }
      }
      // The same distinction as the label: entering adds you, asking raises a question.
      return this.mayJoinDirectly ? this.icons.plus : this.icons.questionCircle
    },
    // Entering and asking to enter are two rights, and which one the viewer holds is also what
    // the resolver reads to decide where the membership lands. The group TYPE is not consulted
    // any more: a public group may ask for approval and a closed one may let people straight
    // in, so a label derived from the type would now be wrong in both directions.
    mayJoinDirectly() {
      return this.canInGroup('group.join', this.group)
    },
    mayRequestToJoin() {
      return this.canInGroup('group.join.request', this.group)
    },
    mayEnter() {
      return this.mayJoinDirectly || this.mayRequestToJoin
    },
    /**
     * An applicant whose group has since opened its door to everybody.
     *
     * They hold `group.join` because the group grants it to non-members and nobody inside a
     * group holds less than a stranger — so the honest offer is "come in", not "you are still
     * waiting for an approval that nobody needs any more".
     */
    mayCompleteJoin() {
      return this.isMember && !this.isNonePendingMember && this.mayJoinDirectly
    },
    label() {
      if (this.mayCompleteJoin) {
        return this.$t('group.joinLeaveButton.join')
      }
      if (this.isMember) {
        if (this.isNonePendingMember) {
          return this.hovered
            ? this.$t('group.joinLeaveButton.leave')
            : this.$t('group.joinLeaveButton.iAmMember')
        } else {
          return this.$t('group.joinLeaveButton.pendingMember')
        }
      }
      // Say what will actually happen: with `group.join` they are in, with only
      // `group.join.request` they become an applicant and somebody has to let them in.
      return this.mayJoinDirectly
        ? this.$t('group.joinLeaveButton.join')
        : this.$t('group.joinLeaveButton.requestJoin')
    },
    tooltip() {
      return {
        content: this.$t('group.joinLeaveButton.tooltip'),
        placement: 'right',
        show: this.isMember && !this.isNonePendingMember && this.hovered,
        trigger: 'manual',
      }
    },
  },
  watch: {
    isMember() {
      this.localLoading = false
      this.hovered = false
    },
    loading() {
      this.localLoading = this.loading
    },
  },
  created() {
    this.icons = iconRegistry
    const { joinLeaveGroup } = useJoinLeaveGroup({
      apollo: this.$apollo,
      toast: this.$toast,
    })
    this._joinLeaveGroup = joinLeaveGroup
  },
  methods: {
    onHover() {
      if (!this.disabled && !this.localLoading) {
        this.hovered = true
      }
    },
    toggle() {
      // The applicant's button is a JOIN, although they already have an edge — so it must not
      // open the "leave this group" confirmation the way every other `isMember` click does.
      if (this.isMember && !this.mayCompleteJoin) {
        this.showConfirmModal = true
      } else {
        this.joinLeave()
      }
    },
    async joinLeave() {
      this.hovered = false
      const joining = !this.isMember || this.mayCompleteJoin
      this.$emit('prepare', joining)
      const { success, data } = await this._joinLeaveGroup({
        groupId: this.group.id,
        userId: this.userId,
        isMember: !joining,
      })
      if (success) {
        this.$emit('update', data)
      }
    },
  },
}
</script>
