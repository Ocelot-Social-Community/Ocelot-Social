<template>
  <ul v-if="inviteCodes.length" class="invitation-list">
    <invitation
      v-for="inviteCode in inviteCodes"
      :key="inviteCode.code"
      @invalidate-invite-code="invalidateInviteCode"
    />
  </ul>
  <div v-else class="no-invitation">
    {{ $t('components.invitations.no-invitation') }}
  </div>
</template>

<script>
import Invitation from './Invitation.vue'

export default {
  name: 'InvitationList',
  props: {
    inviteCodes: {
      type: Array,
      required: true,
    },
  },
  components: {
    Invitation,
  },
  methods: {
    generateInviteCode() {
      this.$emit('generate-invite-code')
    },
    invalidateInviteCode(code) {
      this.$emit('invalidate-invite-code', code)
    },
  },
}
</script>
