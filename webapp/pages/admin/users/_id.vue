<template>
  <ds-section>
    <ds-space>
      <ds-heading size="h3">
        {{ user && user.name }}
        -
        {{ $t('admin.badges.title') }}
      </ds-heading>
      <ds-text>{{ $t('admin.badges.description') }}</ds-text>
    </ds-space>
    <base-card v-if="!isLoadingBadges">
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
    </base-card>
  </ds-section>
</template>

<script>
import BadgesSection from '~/components/_new/features/Admin/Badges/BadgesSection.vue'
import {
  queryBadges,
  rewardTrophyBadge,
  revokeBadge,
  setVerificationBadge,
} from '~/graphql/admin/Badges'
import { adminUserBadgesQuery } from '~/graphql/User'

export default {
  components: {
    BadgesSection,
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
          id: this.$route.params.id,
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
      return this.$apollo.queries.User.loading || this.$apollo.queries.Badge.loading
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
