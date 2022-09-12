<template>
  <base-button
    class="track-button"
    :disabled="disabled"
    :loading="loading"
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
import { joinGroupMutation } from '~/graphql/groups'

export default {
  name: 'JoinLeaveButton',
  props: {
    groupId: { type: String, required: true },
    userId: { type: String, required: true },
    isMember: { type: Boolean, required: true },
  },
  data() {
    return {
      disabled: false,
      loading: false,
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
      this.loading = false
      this.hovered = false
    },
  },
  methods: {
    onHover() {
      if (!this.disabled && !this.loading) {
        this.hovered = true
      }
    },
    async toggle() {
      const join = !this.isMember
      const mutation = join ? joinGroupMutation : null // Wolle: implement "leaveGroupMutation"

      this.hovered = false
      const optimisticResult = { joinedByCurrentUser: join }
      this.$emit('optimistic', optimisticResult)

      try {
        const { data } = await this.$apollo.mutate({
          mutation,
          variables: { groupId: this.groupId, userId: this.userId },
        })
        const joinedGroup = join ? data.JoinGroup : { myRoleInGroup: null } // Wolle: implement "leaveGroupMutation"
        this.$emit('update', joinedGroup)
      } catch (error) {
        optimisticResult.joinedByCurrentUser = !join
        this.$emit('optimistic', optimisticResult)
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
