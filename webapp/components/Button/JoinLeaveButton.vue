<template>
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
</template>

<script>
import { mapMutations } from 'vuex'
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { ocelotIcons } from '@ocelot-social/ui/ocelot'
import { joinGroupMutation, leaveGroupMutation } from '~/graphql/groups'

export default {
  name: 'JoinLeaveButton',
  components: { OsButton, OsIcon },
  created() {
    this.icons = ocelotIcons
  },
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
    }
  },
  computed: {
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
  methods: {
    ...mapMutations({
      commitModalData: 'modal/SET_OPEN',
    }),
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
      this.commitModalData(this.leaveModalData())
    },
    leaveModalData() {
      return {
        name: 'confirm',
        data: {
          type: '',
          resource: { id: '' },
          modalData: {
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
          },
        },
      }
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
