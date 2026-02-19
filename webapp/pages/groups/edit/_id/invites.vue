<template>
  <div>
    <os-card>
      <h3 class="ds-heading ds-heading-h3">{{ $t('invite-codes.group-invite-links') }}</h3>
      <div class="ds-my-large"></div>
      <invitation-list
        @generate-invite-code="generateGroupInviteCode"
        @invalidate-invite-code="invalidateInviteCode"
        :inviteCodes="group.inviteCodes"
        :copy-message="
          group.groupType === 'hidden'
            ? $t('invite-codes.invite-link-message-hidden-group', {
                network: $env.NETWORK_NAME,
              })
            : $t('invite-codes.invite-link-message-group', {
                groupName: group.name,
                network: $env.NETWORK_NAME,
              })
        "
      />
    </os-card>
  </div>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import { generateGroupInviteCode, invalidateInviteCode } from '~/graphql/InviteCode'

export default {
  components: {
    OsCard,
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
            this.$emit('update-invite-codes', [...this.group.inviteCodes, generateGroupInviteCode])
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
            this.$emit(
              'update-invite-codes',
              this.group.inviteCodes.map((inviteCode) => ({
                ...inviteCode,
                isValid: inviteCode.code === code ? false : inviteCode.isValid,
              })),
            )
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
