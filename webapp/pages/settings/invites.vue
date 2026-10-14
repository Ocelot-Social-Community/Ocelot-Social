<template>
  <os-card>
    <invite-code-list
      :inviteCodes="user.inviteCodes || []"
      :copy-message="$t('invite-codes.invite-link-message-personal', metadata)"
      showInvitedUsers
    />
  </os-card>
</template>

<script>
import { mapGetters } from 'vuex'
import { OsCard } from '@ocelot-social/ui'
import InviteCodeList from '~/components/_new/features/Invitations/InviteCodeList.vue'
import metadata from '~/constants/metadata.js'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    InviteCodeList,
  },
  data() {
    return {
      metadata,
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
  },
}
</script>
