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
      <invitation-list @create-invite-code="createInviteCode" :inviteCodes="user.inviteCodes" />
      <!--
      <div class="invite-button-menu-popover">
        <div v-if="inviteCode && inviteCode.code">
          <p class="description">{{ $t('invite-codes.your-code') }}</p>
          <base-card class="code-card" wideContent>
            <base-button
              v-if="canCopy"
              class="invite-code"
              icon="copy"
              ghost
              @click="copyInviteLink"
            >
              <ds-text bold>{{ $t('invite-codes.copy-code') }}</ds-text>
            </base-button>
          </base-card>
        </div>
        <div v-else>
          <ds-text>{{ $t('invite-codes.not-available') }}</ds-text>
        </div>
      </div>
      -->
    </template>
  </dropdown>
</template>

<script>
import Dropdown from '~/components/Dropdown'
import { mapGetters } from 'vuex'
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import { create } from 'core-js/core/object'
import { generatePersonalInviteCode } from '~/graphql/InviteCode'

export default {
  components: {
    Dropdown,
    InvitationList,
  },
  props: {
    placement: { type: String, default: 'top-end' },
  },
  data() {
    return {
      canCopy: false,
    }
  },
  created() {
    this.canCopy = !!navigator.clipboard
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    inviteCode() {
      return this.user.inviteCodes[0] || null
    },
    inviteLink() {
      return (
        window.location.origin +
        '/registration?method=invite-code&inviteCode=' +
        this.inviteCode.code
      )
    },
  },
  methods: {
    async createInviteCode(comment) {
      await this.$apollo.mutate({
        mutation: generatePersonalInviteCode,
        variables: {
          comment,
        },
      })
      this.$toast.success(this.$t('invite-codes.create-success'))
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
