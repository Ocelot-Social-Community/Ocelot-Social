<template>
  <div>
    <os-button
      data-test="join-leave-btn"
      :variant="isMember && hovered ? 'danger' : 'primary'"
      :appearance="filled || (isMember && !hovered) ? 'filled' : 'outline'"
      :disabled="disabled"
      :loading="localLoading"
      full-width
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
import { joinGroupMutation, leaveGroupMutation } from '~/graphql/groups'

export default {
  name: 'JoinLeaveButton',
  components: { ConfirmModal, OsButton, OsIcon },
  props: {
    group: { type: Object, required: true },
    userId: { type: String, required: true },
    isMember: { type: Boolean, required: true },
    isNonePendingMember: { type: Boolean, required: true },
    filled: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
  },
  data() {
    return {
      localLoading: this.loading,
      hovered: false,
      showConfirmModal: false,
    }
  },
  computed: {
    leaveModalData() {
      return {
        titleIdent: 'group.leaveModal.title',
        messageIdent: 'group.leaveModal.message',
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
      if (this.isMember) {
        if (this.isNonePendingMember) {
          return this.hovered ? this.icons.close : this.icons.check
        } else {
          return this.hovered ? this.icons.close : this.icons.questionCircle
        }
      }
      return this.icons.plus
    },
    label() {
      if (this.isMember) {
        if (this.isNonePendingMember) {
          return this.hovered
            ? this.$t('group.joinLeaveButton.leave')
            : this.$t('group.joinLeaveButton.iAmMember')
        } else {
          return this.$t('group.joinLeaveButton.pendingMember')
        }
      }
      return this.$t('group.joinLeaveButton.join')
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
  },
  methods: {
    onHover() {
      if (!this.disabled && !this.localLoading) {
        this.hovered = true
      }
    },
    toggle() {
      if (this.isMember) {
        this.openLeaveModal()
      } else {
        this.joinLeave()
      }
    },
    openLeaveModal() {
      this.showConfirmModal = true
    },
    async joinLeave() {
      const join = !this.isMember
      const mutation = join ? joinGroupMutation() : leaveGroupMutation()

      this.hovered = false
      this.$emit('prepare', join)

      try {
        const { data } = await this.$apollo.mutate({
          mutation,
          variables: { groupId: this.group.id, userId: this.userId },
        })
        const joinedLeftGroupResult = join ? data.JoinGroup : data.LeaveGroup
        this.$emit('update', joinedLeftGroupResult)
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
