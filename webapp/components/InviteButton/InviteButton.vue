<template>
  <dropdown class="invite-button" offset="8" :placement="placement" noMouseLeaveClosing>
    <template #default="{ toggleMenu }">
      <os-button
        variant="primary"
        appearance="ghost"
        circle
        v-tooltip="{
          content: $t('invite-codes.button.tooltip'),
          placement: 'bottom-start',
        }"
        @click.prevent="toggleMenu"
      >
        <template #icon>
          <base-icon name="user-plus" />
        </template>
      </os-button>
    </template>
    <template #popover>
      <div class="invite-list">
        <h2>{{ $t('invite-codes.my-invite-links') }}</h2>
        <invitation-list
          @generate-invite-code="generatePersonalInviteCode"
          @invalidate-invite-code="invalidateInviteCode"
          :inviteCodes="user.inviteCodes"
          :copy-message="
            $t('invite-codes.invite-link-message-personal', {
              network: $env.NETWORK_NAME,
            })
          "
        />
      </div>
    </template>
  </dropdown>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import Dropdown from '~/components/Dropdown'
import { mapGetters, mapMutations } from 'vuex'
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import { generatePersonalInviteCode, invalidateInviteCode } from '~/graphql/InviteCode'

export default {
  components: {
    OsButton,
    Dropdown,
    InvitationList,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },

  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    inviteCode() {
      return this.user.inviteCodes[0] || null
    },
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER_PARTIAL',
    }),
    async generatePersonalInviteCode(comment) {
      try {
        await this.$apollo.mutate({
          mutation: generatePersonalInviteCode(),
          variables: {
            comment,
          },
          update: (_, { data: { generatePersonalInviteCode } }) => {
            this.setCurrentUser({
              ...this.currentUser,
              inviteCodes: [...this.user.inviteCodes, generatePersonalInviteCode],
            })
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
            this.setCurrentUser({
              ...this.currentUser,
              inviteCodes: this.user.inviteCodes.map((inviteCode) => ({
                ...inviteCode,
                isValid: inviteCode.code === code ? false : inviteCode.isValid,
              })),
            })
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

<style lang="scss" scoped>
.invite-button {
  color: $color-secondary;
}

.invite-list {
  max-width: min(400px, 90vw);
  padding: $space-small;
  margin-top: $space-base;
  display: flex;
  flex-flow: column;
  gap: $space-small;
  --invitation-column-max-width: 75%;
}
</style>
