<template>
  <os-card>
    <h2 class="title">{{ $t('settings.invites.name') }}</h2>

    <div class="invite-summary">
      <p class="summary-text">
        {{ $t('settings.invites.total-invited', { count: totalInvitedCount }) }}
      </p>
      <p class="summary-text">
        {{
          $t('settings.invites.codes-active', {
            active: validInviteCodes.length,
            max: maxLinks,
          })
        }}
      </p>
    </div>

    <h3 class="section-title">{{ $t('invite-codes.my-invite-links') }}</h3>
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

    <div v-if="invitedUsers.length" class="invited-users-section">
      <h3 class="section-title">
        {{ $t('settings.invites.invited-users') }}
      </h3>
      <ul class="invited-users-list">
        <li v-for="invited in invitedUsers" :key="invited.id" class="invited-user">
          <nuxt-link :to="`/profile/${invited.id}/${invited.slug}`" class="invited-user-link">
            <span class="invited-user-name">{{ invited.name }}</span>
          </nuxt-link>
          <span class="invited-user-code">
            {{ $t('settings.invites.via-code', { code: invited.code }) }}
            <span v-if="!invited.codeIsValid" class="code-invalid">
              ({{ $t('settings.invites.deactivated') }})
            </span>
          </span>
        </li>
      </ul>
    </div>

    <div v-if="expiredCodes.length" class="expired-section">
      <button class="expired-toggle" @click="showExpired = !showExpired">
        <span>
          {{
            $t('settings.invites.expired-codes', { count: expiredCodes.length })
          }}
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
      showExpired: false,
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
    invitedUsers() {
      const users = []
      this.user.inviteCodes.forEach((inviteCode) => {
        if (inviteCode.redeemedBy) {
          inviteCode.redeemedBy.forEach((u) => {
            users.push({
              id: u.id,
              name: u.name,
              slug: u.slug,
              code: inviteCode.code,
              codeIsValid: inviteCode.isValid,
            })
          })
        }
      })
      return users
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
  },
}
</script>

<style scoped lang="scss">
.invite-summary {
  margin-bottom: $space-large;
  padding: $space-base;
  background-color: $color-neutral-90;
  border-radius: $border-radius-base;
}

.summary-text {
  margin: 0;
  line-height: 1.6;
}

.section-title {
  margin-top: $space-large;
  margin-bottom: $space-small;
}

.invited-users-section {
  margin-top: $space-large;
}

.invited-users-list {
  list-style: none;
  padding: 0;
}

.invited-user {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-x-small;
  padding: $space-x-small 0;
  border-bottom: 1px dotted #e5e3e8;
}

.invited-user-link {
  text-decoration: none;
}

.invited-user-name {
  font-weight: bold;
}

.invited-user-code {
  color: $text-color-soft;
  font-size: $font-size-small;
}

.code-invalid {
  color: $color-danger;
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
