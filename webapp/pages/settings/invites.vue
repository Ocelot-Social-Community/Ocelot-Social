<template>
  <os-card>
    <h2 class="title">
      {{ $t('invite-codes.my-invite-links') }}
      <span class="title-count">({{ validInviteCodes.length }}/{{ maxLinks }})</span>
    </h2>
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

    <profile-list
      class="embedded-profile-list"
      uniqueName="invitedUsersFilter"
      :title="
        $t('settings.invites.invited-users') +
        ' (' +
        totalInvitedCount +
        ')'
      "
      :title-nobody="$t('settings.invites.nobody-invited')"
      :all-profiles-count="totalInvitedCount"
      :profiles="visibleInvitedUsers"
      :loading="loadingAll"
      @fetchAllProfiles="loadAllInvitedUsers"
    />

    <div v-if="expiredCodes.length" class="expired-section">
      <button class="expired-toggle" @click="showExpired = !showExpired">
        <span>
          {{ $t('settings.invites.expired-codes', { count: expiredCodes.length }) }}
        </span>
        <span class="expired-chevron" :class="{ open: showExpired }">&#9660;</span>
      </button>
      <ul v-if="showExpired" class="expired-list">
        <li v-for="code in expiredCodes" :key="code.code" class="expired-code">
          <span class="code-text">{{ code.code }}</span>
          <span v-if="code.comment" class="code-comment">— {{ code.comment }}</span>
          <span class="code-redeemed">
            {{ $t('invite-codes.redeemed-count', { count: code.redeemedByCount }) }}
          </span>
        </li>
      </ul>
    </div>

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
import ProfileList, {
  profileListVisibleCount,
} from '~/components/features/ProfileList/ProfileList.vue'
import { useInviteCode } from '~/composables/useInviteCode'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    InvitationList,
    ConfirmModal,
    ProfileList,
  },
  data() {
    return {
      showConfirmModal: false,
      modalData: null,
      showExpired: false,
      showAllInvited: false,
      loadingAll: false,
    }
  },
  computed: {
    ...mapGetters({
      user: 'auth/user',
    }),
    validInviteCodes() {
      return this.user.inviteCodes.filter((c) => c.isValid)
    },
    expiredCodes() {
      return this.user.inviteCodes.filter((c) => !c.isValid)
    },
    maxLinks() {
      return Number(this.$env.INVITE_LINK_LIMIT)
    },
    totalInvitedCount() {
      return this.user.inviteCodes.reduce((sum, c) => sum + (c.redeemedByCount || 0), 0)
    },
    allInvitedUsers() {
      const users = []
      this.user.inviteCodes.forEach((inviteCode) => {
        if (inviteCode.redeemedBy) {
          inviteCode.redeemedBy.forEach((u) => {
            users.push({
              id: u.id,
              name: u.name,
              slug: u.slug,
              avatar: u.avatar,
            })
          })
        }
      })
      return users
    },
    visibleInvitedUsers() {
      if (this.showAllInvited) return this.allInvitedUsers
      return this.allInvitedUsers.slice(0, profileListVisibleCount)
    },
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
    loadAllInvitedUsers() {
      this.loadingAll = true
      this.showAllInvited = true
      this.$nextTick(() => {
        this.loadingAll = false
      })
    },
  },
}
</script>

<style scoped lang="scss">
.title-count {
  font-weight: normal;
  color: $text-color-soft;
}


.expired-section {
  margin-top: $space-large;
}

.expired-toggle {
  display: flex;
  align-items: center;
  gap: $space-x-small;
  background: none;
  border: none;
  cursor: pointer;
  color: $text-color-soft;
  padding: $space-x-small 0;
  font-size: $font-size-base;

  &:hover {
    color: $text-color-base;
  }
}

.expired-chevron {
  font-size: $font-size-small;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.expired-list {
  list-style: none;
  padding: 0;
}

.expired-code {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-x-small;
  padding: $space-x-small 0;
  border-bottom: 1px dotted #e5e3e8;
  color: $text-color-soft;
}

.code-text {
  text-decoration: line-through;
}

.code-comment {
  font-style: italic;
}

.code-redeemed {
  font-size: $font-size-small;
}
</style>

<style lang="scss">
.embedded-profile-list.profile-list.os-card {
  padding: 0 !important;
  margin: $space-large 0 0;
  box-shadow: none !important;
  border: none;
  border-radius: 0;
  background: transparent !important;
}
</style>
