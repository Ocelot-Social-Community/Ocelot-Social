<template>
  <ds-section>
    <ds-space>
      <ds-heading size="h3">{{ $t('admin.badges.title') }}</ds-heading>
      <ds-text>{{ $t('admin.badges.description') }}</ds-text>
    </ds-space>
    <base-card>
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
      if (!this.user?.badges) return []

      return this.badges
        .filter((badge) => badge.type === 'verification')
        .map((badge) => ({
          ...badge,
          isActive: this.user.verified?.id === badge.id,
        }))
    },
    trophyBadges() {
      if (!this.user?.badges) return []

      return this.badges
        .filter((badge) => badge.type === 'trophy')
        .map((badge) => ({
          ...badge,
          isActive: this.user.badges.some((userBadge) => userBadge.id === badge.id),
        }))
    },
  },
  methods: {
    toggleBadge(badge) {
      if (badge.isActive) {
        this.revokeBadge(badge.id)
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

        this.$toast.success('admin.badges.rewardTrophy.success')
      } catch (error) {
        this.$toast.error('admin.badges.rewardTrophy.error')
      }
    },
    async revokeBadge(badgeId) {
      try {
        await this.$apollo.mutate({
          mutation: revokeBadge(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success('admin.badges.revoke.success')
      } catch (error) {
        this.$toast.error('admin.badges.revoke.error')
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

        this.$toast.success('admin.badges.setVerification.success')
      } catch (error) {
        this.$toast.error('admin.badges.setVerification.error')
      }
    },
  },
}
</script>
