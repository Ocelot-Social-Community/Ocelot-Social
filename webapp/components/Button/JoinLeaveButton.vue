<template>
  <div>
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
      if (this.isMember) {
        this.showConfirmModal = true
      } else {
        this.joinLeave()
      }
    },
    async joinLeave() {
      this.hovered = false
      this.$emit('prepare', !this.isMember)
      const { success, data } = await this._joinLeaveGroup({
        groupId: this.group.id,
        userId: this.userId,
        isMember: this.isMember,
      })
      if (success) {
        this.$emit('update', data)
      }
    },
  },
}
</script>
