<template>
  <os-card>
    <h2 class="title">{{ $t('settings.invites.name') }}</h2>
    <invitation-list
      @generate-invite-code="generatePersonalInviteCode"
      @invalidate-invite-code="invalidateInviteCode"
      @open-delete-modal="openDeleteModal"
      :inviteCodes="user.inviteCodes"
      :copy-message="
        $t('invite-codes.invite-link-message-personal', {
          network: $env.NETWORK_NAME,
        })
      "
    />
    <confirm-modal
      v-if="showConfirmModal"
      :modalData="modalData"
      @close="showConfirmModal = false"
    />
  </os-card>
</template>

<script>
import { mapGetters } from 'vuex'
import { OsCard } from '@ocelot-social/ui'
import InvitationList from '~/components/_new/features/Invitations/InvitationList.vue'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import { useInviteCode } from '~/composables/useInviteCode'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    InvitationList,
    ConfirmModal,
  },
  data() {
    return {
      showConfirmModal: false,
      modalData: null,
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
  },
  created() {
    const { generatePersonalInviteCode, invalidateInviteCode } = useInviteCode({
      apollo: this.$apollo,
      toast: this.$toast,
      t: (key, ...args) => this.$t(key, ...args),
      store: this.$store,
    })
    this._generateInviteCode = generatePersonalInviteCode
    this._invalidateInviteCode = invalidateInviteCode
  },
  methods: {
    async generatePersonalInviteCode(comment) {
      await this._generateInviteCode(comment)
    },
    async invalidateInviteCode(code) {
      await this._invalidateInviteCode(code)
    },
    openDeleteModal(modalData) {
      this.modalData = modalData
      this.showConfirmModal = true
    },
  },
}
</script>
