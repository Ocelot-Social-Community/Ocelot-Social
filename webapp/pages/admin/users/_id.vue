<template>
  <ds-section>
    <ds-space>
      <ds-heading size="h3">{{ $t('admin.badges.title') }}</ds-heading>
      <ds-text>{{ $t('admin.badges.description') }}</ds-text>
    </ds-space>
    <base-card>
      <div>
        <h4>{{ $t('admin.badges.verificationBadges') }}</h4>

        <div v-for="badge in verificationBadges" :key="badge.id">
          <button @click="toggleBadge(badge)" :class="{ inactive: !badge.isActive }">
            {{ badge.icon }} {{ badge.isActive ? 'Active' : 'Inactive' }}
            <img :src="badge.icon" alt="Badge Icon" />
          </button>
        </div>
      </div>
      <div>
        <h4>{{ $t('admin.badges.standardBadges') }}</h4>

        <div v-for="badge in standardBadges" :key="badge.id">
          <button @click="toggleBadge(badge)" :class="{ inactive: !badge.isActive }">
            {{ badge.icon }} {{ badge.isActive ? 'Active' : 'Inactive' }}
            <img :src="badge.icon" alt="Badge Icon" />
          </button>
        </div>
      </div>
    </base-card>
  </ds-section>
</template>

<script>
import { queryBadges, reward, unreward, verify } from '~/graphql/admin/Badges'
import { adminUserBadgesQuery } from '~/graphql/User'

export default {
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
    standardBadges() {
      if (!this.user?.badges) return []

      return this.badges
        .filter((badge) => badge.type === 'badge')
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
        this.grantRewardBadge(badge.id)
      }
    },
    async grantRewardBadge(badgeId) {
      try {
        const { data } = await this.$apollo.mutate({
          mutation: reward(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success('Badge rewarded successfully')
      } catch (error) {
        this.$toast.error('Error rewarding badge')
      }
    },
    async revokeBadge(badgeId) {
      try {
        const { data } = this.$apollo.mutate({
          mutation: unreward(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success('Badge revoked successfully')
      } catch (error) {
        this.$toast.error('Error revoking badge')
      }
    },
    async setVerificationBadge(badgeId) {
      try {
        const { data } = this.$apollo.mutate({
          mutation: verify(),
          variables: {
            badgeId,
            userId: this.user.id,
          },
        })

        this.$toast.success('Verification badge set successfully')
      } catch (error) {
        this.$toast.error('Error setting verification badge')
      }
    },
  },
}
</script>
