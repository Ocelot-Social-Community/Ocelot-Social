<template>
  <dropdown class="invite-button" offset="8" :placement="placement">
    <template #default="{ toggleMenu }">
      <base-button
        icon="user-plus"
        circle
        ghost
        v-tooltip="{
          content: $t('invite-codes.button.tooltip'),
          placement: 'bottom-start',
        }"
        @click.prevent="toggleMenu"
      />
    </template>
    <template #popover>
      <h2>My invitation links</h2>
      <div>Create links to invite people to this network.</div>
      <invitation-list
        @generate-invite-code="generatePersonalInviteCode"
        @invalidate-invite-code="invalidateInviteCode"
        :inviteCodes="user.inviteCodes"
      />
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import { generatePersonalInviteCode, invalidateInviteCode } from '~/graphql/InviteCode'

export default {
  components: {
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
    async generatePersonalInviteCode(comment) {
      await this.$apollo.mutate({
        mutation: generatePersonalInviteCode(),
        variables: {
          comment,
        },
      })
      this.$toast.success(this.$t('invite-codes.create-success'))
      // TODO update the invite code list?
    },
    async invalidateInviteCode(code) {
      await this.$apollo.mutate({
        mutation: invalidateInviteCode(),
        variables: {
          code,
        },
      })
      this.$toast.success(this.$t('invite-codes.invalidate-success'))
      // TODO update the invite code list?
    },
  },
}
</script>

<style lang="scss" scope>
.invite-button {
  color: $color-secondary;
}

.invite-button-menu-popover {
  display: flex;
  justify-content: center;
  align-items: center;

  .description {
    margin-top: $space-x-small;
    margin-bottom: $space-x-small;
  }
  .code-card {
    margin-bottom: $space-x-small;
  }
}

.invite-code {
  margin-left: 25%;
}
</style>
