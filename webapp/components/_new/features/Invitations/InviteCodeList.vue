<template>
  <div class="invite-code-list">
    <h2 class="invite-code-list__title">
      {{ $t('invite-codes.my-invite-links') }}
      <span class="invite-code-list__count">({{ validInviteCodes.length }}/{{ maxLinks }})</span>
    </h2>
    <invitation-list
      @generate-invite-code="generateInviteCode"
      @invalidate-invite-code="invalidateInviteCode"
      @open-delete-modal="openDeleteModal"
      :inviteCodes="inviteCodes"
      :copy-message="copyMessage"
    />

    <p v-if="!showInvitedUsers && totalInvitedCount > 0" class="invite-code-list__invited-summary">
      {{ $t('invite-codes.invited-count', { count: totalInvitedCount }) }}
    </p>

    <template v-if="showInvitedUsers">
      <profile-list
        class="invite-code-list__profile-list"
        uniqueName="invitedUsersFilter"
        :title="$t('settings.invites.invited-users') + ' (' + totalInvitedCount + ')'"
        :title-nobody="$t('settings.invites.nobody-invited')"
        :all-profiles-count="totalInvitedCount"
        :profiles="visibleInvitedUsers"
        :loading="loadingAll"
        @fetchAllProfiles="loadAllInvitedUsers"
      />

      <div v-if="expiredCodes.length" class="invite-code-list__expired">
        <button
          class="invite-code-list__expired-toggle"
          :aria-expanded="String(showExpired)"
          aria-controls="expired-codes-list"
          @click="showExpired = !showExpired"
        >
          <span>
            {{ $t('settings.invites.expired-codes', { count: expiredCodes.length }) }}
          </span>
          <span class="invite-code-list__expired-chevron" :class="{ open: showExpired }">
            &#9660;
          </span>
        </button>
        <ul v-if="showExpired" id="expired-codes-list" class="invite-code-list__expired-list">
          <li v-for="code in expiredCodes" :key="code.code" class="invite-code-list__expired-code">
            <span class="invite-code-list__expired-code-text">{{ code.code }}</span>
            <span v-if="code.comment" class="invite-code-list__expired-code-comment">
              — {{ code.comment }}
            </span>
            <span class="invite-code-list__expired-code-redeemed">
              {{ $t('invite-codes.redeemed-count', { count: code.redeemedByCount }) }}
            </span>
          </li>
        </ul>
      </div>
    </template>

    <confirm-modal
      v-if="showConfirmModal"
      :modalData="modalData"
      @close="showConfirmModal = false"
    />
  </div>
</template>

<script>
import InvitationList from './InvitationList.vue'
import ConfirmModal from '~/components/Modal/ConfirmModal'
import ProfileList, {
  profileListVisibleCount,
} from '~/components/features/ProfileList/ProfileList.vue'
import { useInviteCode } from '~/composables/useInviteCode'

export default {
  name: 'InviteCodeList',
  components: {
    InvitationList,
    ConfirmModal,
    ProfileList,
  },
  props: {
    inviteCodes: {
      type: Array,
      required: true,
    },
    copyMessage: {
      type: String,
      default: '',
    },
    showInvitedUsers: {
      type: Boolean,
      default: false,
    },
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
    validInviteCodes() {
      return this.inviteCodes.filter((c) => c.isValid)
    },
    expiredCodes() {
      return this.inviteCodes.filter((c) => !c.isValid)
    },
    maxLinks() {
      return Number(this.$env.INVITE_LINK_LIMIT)
    },
    totalInvitedCount() {
      return this.inviteCodes.reduce((sum, c) => sum + (c.redeemedByCount || 0), 0)
    },
    allInvitedUsers() {
      const users = []
      this.inviteCodes.forEach((inviteCode) => {
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
    async generateInviteCode(comment) {
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

<style lang="scss">
.invite-code-list__title {
  margin-bottom: $space-small;
}

.invite-code-list__count {
  font-weight: normal;
  color: $text-color-soft;
}

.invite-code-list__invited-summary {
  margin-top: $space-base;
  color: $text-color-soft;
  font-size: $font-size-base;
}

.invite-code-list__profile-list.profile-list.os-card {
  padding: 0 !important;
  margin: $space-large 0 0;
  box-shadow: none !important;
  border: none;
  border-radius: 0;
  background: transparent !important;
}

.invite-code-list__expired {
  margin-top: $space-large;
}

.invite-code-list__expired-toggle {
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

.invite-code-list__expired-chevron {
  font-size: $font-size-small;
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.invite-code-list__expired-list {
  list-style: none;
  padding: 0;
}

.invite-code-list__expired-code {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-x-small;
  padding: $space-x-small 0;
  border-bottom: 1px dotted #e5e3e8;
  color: $text-color-soft;
}

.invite-code-list__expired-code-text {
  text-decoration: line-through;
}

.invite-code-list__expired-code-comment {
  font-style: italic;
}

.invite-code-list__expired-code-redeemed {
  font-size: $font-size-small;
}
</style>
