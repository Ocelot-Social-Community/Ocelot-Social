<template>
  <div class="invitation-list">
    <ul v-if="validInviteCodes.length">
      <invitation
        v-for="inviteCode in validInviteCodes"
        :key="inviteCode.code"
        :invite-code="inviteCode"
        @invalidate-invite-code="invalidateInviteCode"
      />
    </ul>
    <div v-else class="no-invitation">
      {{ $t('invite-codes.no-links', { max: maxLinks }) }}
    </div>
    <create-invitation @generate-invite-code="generateInviteCode" :disabled="isLimitReached" />
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
    maxLinks() {
      return Number(this.$env.INVITE_LINK_LIMIT)
    },
    isLimitReached() {
      return this.validInviteCodes.length >= this.maxLinks
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

<style scoped lang="scss">
.invitation-list {
  display: flex;
  flex-flow: column;
  gap: $space-base;
  padding-bottom: $space-base;

  ul {
    list-style: none;
  }
}
</style>
