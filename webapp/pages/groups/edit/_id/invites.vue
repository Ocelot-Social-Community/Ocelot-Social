<template>
  <div>
    <base-card>
      <invitation-list
        @generate-invite-code="generateGroupInviteCode"
        @invalidate-invite-code="invalidateInviteCode"
        :inviteCodes="group.inviteCodes"
        :copy-message="
          $t('invite-codes.invite-link-message-group', {
            groupName: group.name,
            network: $env.NETWORK_NAME,
          })
        "
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
            groupId: this.group.id,
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
        this.$toast.error(this.$t('invite-codes.create-error', { error: error.message }))
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
        this.$toast.error(this.$t('invite-codes.invalidate-error', { error: error.message }))
      }
    },
  },
}
</script>
