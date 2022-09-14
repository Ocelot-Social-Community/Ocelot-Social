<template>
  <base-button
    class="track-button"
    :disabled="disabled"
    :loading="localLoading"
    :icon="icon"
    :filled="isMember && !hovered"
    :danger="isMember && hovered"
    @mouseenter.native="onHover"
    @mouseleave.native="hovered = false"
    @click.prevent="toggle"
  >
    {{ label }}
  </base-button>
</template>

<script>
import { joinGroupMutation, leaveGroupMutation } from '~/graphql/groups'

export default {
  name: 'JoinLeaveButton',
  props: {
    groupId: { type: String, required: true },
    userId: { type: String, required: true },
    isMember: { type: Boolean, required: true },
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
      if (this.isMember && this.hovered) {
        return 'close'
      } else {
        return this.isMember ? 'check' : 'plus'
      }
    },
    label() {
      if (this.isMember) {
        return this.$t('group.joinLeaveButton.iAmMember')
      } else {
        return this.$t('group.joinLeaveButton.join')
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
    onHover() {
      if (!this.disabled && !this.localLoading) {
        this.hovered = true
      }
    },
    async toggle() {
      const join = !this.isMember
      const mutation = join ? joinGroupMutation : leaveGroupMutation

      this.hovered = false
      this.$emit('prepare', join)

      try {
        const { data } = await this.$apollo.mutate({
          mutation,
          variables: { groupId: this.groupId, userId: this.userId },
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

<style lang="scss">
.track-button {
  display: block;
  width: 100%;
}
</style>
