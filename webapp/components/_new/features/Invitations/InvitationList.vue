<template>
  <div>
    <ul v-if="validInviteCodes.length" class="invitation-list">
      <invitation
        v-for="inviteCode in inviteCodes"
        :key="inviteCode.code"
        :invite-code="inviteCode"
        @invalidate-invite-code="invalidateInviteCode"
      />
    </ul>
    <div v-else class="no-invitation">
      {{ $t('components.invitations.no-invitation') }}
    </div>
    <create-invitation @generate-invite-code="generateInviteCode" />
  </div>
</template>

<script>
import Invitation from './Invitation.vue'
import CreateInvitation from './CreateInvitation.vue'

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
    CreateInvitation,
  },
  computed: {
    validInviteCodes() {
      return this.inviteCodes.filter((inviteCode) => inviteCode.isValid)
    },
  },
  methods: {
    generateInviteCode(comment) {
      this.$emit('generate-invite-code', comment)
    },
    invalidateInviteCode(code) {
      this.$emit('invalidate-invite-code', code)
    },
  },
}
</script>
