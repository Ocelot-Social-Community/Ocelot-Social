<template>
  <section class="ds-section">
    <div class="ds-mb-large">
      <h1 class="ds-heading ds-heading-h3">
        {{ user && user.name }}
        -
        {{ $t('admin.badges.title') }}
      </h1>
      <p class="ds-text">{{ $t('admin.badges.description') }}</p>
    </div>
    <os-card v-if="!isLoadingBadges">
      <badges-section
        :title="$t('admin.badges.verificationBadges')"
        :badges="verificationBadges"
        @toggleBadge="toggleBadge"
      />
      <badges-section
        :title="$t('admin.badges.trophyBadges')"
        :badges="trophyBadges"
        @toggleBadge="toggleBadge"
      />
    </os-card>
  </section>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import BadgesSection from '~/components/_new/features/Admin/Badges/BadgesSection.vue'
import {
  queryBadges,
  rewardTrophyBadge,
  revokeBadge,
  setVerificationBadge,
} from '~/graphql/admin/Badges'
import { adminUserBadgesQuery } from '~/graphql/User'

// Shared per-user badge management, used by both the admin and moderation areas. The
// underlying mutations are gated on badge.manage in the backend shield, so this is
// reachable by any badge.manage holder regardless of admin status. Carries no email
// or role field, so it is safe to reuse for moderators without those permissions.
export default {
  components: {
    OsCard,
    BadgesSection,
  },
  props: {
    // Id of the user whose badges are managed.
    userId: {
      type: [String, Number],
      required: true,
    },
  },
  data() {
    return {
      user: null,
      badges: [],
    }
  },
  apollo: {
    User: {
      query() {
        return adminUserBadgesQuery()
      },
      variables() {
        return {
          id: this.userId,
        }
      },
      update({ User }) {
        this.user = User[0]
      },
    },
    Badge: {
      query() {
        return queryBadges()
      },
      update({ Badge }) {
        this.badges = Badge
      },
    },
  },
  computed: {
    verificationBadges() {
      if (!this.user) return []

      return this.badges
        .filter((badge) => badge.type === 'verification')
        .map((badge) => ({
          ...badge,
          isActive: this.user.badgeVerification?.id === badge.id,
        }))
    },
    trophyBadges() {
      if (!this.user?.badgeTrophies) return []

      return this.badges
        .filter((badge) => badge.type === 'trophy')
        .map((badge) => ({
          ...badge,
          isActive: this.user.badgeTrophies.some((userBadge) => userBadge.id === badge.id),
        }))
    },
    isLoadingBadges() {
      return this.$apollo.queries.Badge.loading
    },
  },
  methods: {
    toggleBadge(badge) {
      if (badge.isActive) {
        this.revokeBadge(badge)
        return
      }

      if (badge.type === 'verification') {
        this.setVerificationBadge(badge.id)
      } else {
        this.rewardTrophyBadge(badge.id)
      }
    },
    async rewardTrophyBadge(badgeId) {
      try {
        await this.$apollo.mutate({
          mutation: rewardTrophyBadge(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success(this.$t('admin.badges.rewardTrophy.success'))
      } catch (error) {
        this.$toast.error(this.$t('admin.badges.rewardTrophy.error'))
      }
    },
    async revokeBadge(badge) {
      try {
        await this.$apollo.mutate({
          mutation: revokeBadge(),
          variables: {
            badgeId: badge.id,
            userId: this.user.id,
          },
        })

        this.$toast.success(
          this.$t(
            badge.type === 'verification'
              ? 'admin.badges.revokeVerification.success'
              : 'admin.badges.revokeTrophy.success',
          ),
        )
      } catch (error) {
        this.$toast.error(
          this.$t(
            badge.type === 'verification'
              ? 'admin.badges.revokeVerification.error'
              : 'admin.badges.revokeTrophy.error',
          ),
        )
      }
    },
    async setVerificationBadge(badgeId) {
      try {
        await this.$apollo.mutate({
          mutation: setVerificationBadge(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success(this.$t('admin.badges.setVerification.success'))
      } catch (error) {
        this.$toast.error(this.$t('admin.badges.setVerification.error'))
      }
    },
  },
}
</script>
