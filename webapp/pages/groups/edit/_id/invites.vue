<template>
  <div>
    <base-card>
      <invitation-list
        :inviteCodes="group.inviteCodes"
        @generate-invite-code="generateGroupInviteCode"
        @invalidate-invite-code="invalidateInviteCode"
      />
    </base-card>
  </div>
</template>

<script>
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import { generateGroupInviteCode, invalidateInviteCode } from '~/graphql/InviteCode'

export default {
  components: {
    InvitationList,
  },
  props: {
    group: {
      type: Object,
      required: true,
    },
  },
  methods: {
    async generateGroupInviteCode(comment) {
      try {
        await this.$apollo.mutate({
          mutation: generateGroupInviteCode(),
          variables: {
            comment,
          },
          update: (_, { data: { generateGroupInviteCode } }) => {
            /*
            this.setCurrentUser({
              ...this.currentUser,
              inviteCodes: [...this.user.inviteCodes, generateGroupInviteCode],
            })
            */
          },
        })
        this.$toast.success(this.$t('invite-codes.create-success'))
      } catch (error) {
        this.$toast.error(this.$t('invite-codes.create-error'))
      }
    },
    async invalidateInviteCode(code) {
      try {
        await this.$apollo.mutate({
          mutation: invalidateInviteCode(),
          variables: {
            code,
          },
          update: (_, { data: { _invalidateInviteCode } }) => {
            /*
            this.setCurrentUser({
              ...this.currentUser,
              inviteCodes: this.user.inviteCodes.map((inviteCode) => ({
                ...inviteCode,
                isValid: inviteCode.code === code ? false : inviteCode.isValid,
              })),
            })
            */
          },
        })
        this.$toast.success(this.$t('invite-codes.invalidate-success'))
      } catch (error) {
        this.$toast.error(this.$t('invite-codes.invalidate-error'))
      }
    },
  },
}
</script>
