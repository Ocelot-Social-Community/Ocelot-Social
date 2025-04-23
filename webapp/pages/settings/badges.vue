<template>
  <base-card>
    <h2 class="title">{{ $t('settings.badges.name') }}</h2>
    <ds-space margin-bottom="big">
      <div class="presenterContainer">
        <badges
          :badges="[currentUser.badgeVerification, ...selectedBadges]"
          :selection-mode="true"
          :scale="2"
          @badge-selected="handleBadgeSlotSelection"
          ref="badgesComponent"
        />
      </div>

      <div v-if="selectedBadgeIndex !== null && !isEmptySlot" class="badge-actions">
        <base-button @click="removeBadgeFromSlot" class="remove-button">
          {{ $t('settings.badges.remove') }}
        </base-button>
      </div>

      <div v-if="selectedBadgeIndex !== null && isEmptySlot" class="selection-info">
        <badge-selection
          :badges="availableBadges"
          @badge-selected="assignBadgeToSlot"
          ref="badgeSelection"
        />
      </div>
    </ds-space>
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { setTrophyBadgeSelected } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import Badges from '../../components/Badges.vue'
import BadgeSelection from '../../components/BadgeSelection.vue'

export default {
  components: { BadgeSelection, Badges },
  mixins: [scrollToContent],
  data() {
    return {
      selectedBadgeIndex: null,
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    selectedBadges() {
      return this.currentUser.badgeTrophiesSelected
    },
    availableBadges() {
      return this.currentUser.badgeTrophiesUnused
    },
    isEmptySlot() {
      console.log('selectedBadgeIndex', this.selectedBadgeIndex)
      console.log('selectedBadges', this.selectedBadges)
      return this.selectedBadges[this.selectedBadgeIndex]?.isDefault ?? true
    },
  },
  created() {
    this.userBadges = [...(this.currentUser.badgeTrophiesSelected || [])]
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    handleBadgeSlotSelection(index) {
      if (index === 0) {
        this.$toast.info(
          this.$t('settings.badges.verification') ||
            'Dies ist deine Verifikations-Badge und kann nicht geändert werden.',
        )
        this.$refs.badgesComponent.resetSelection()
        return
      }

      this.selectedBadgeIndex = index === null ? null : index - 1 // The first badge in badges component is the verification badge
    },
    async setSlot(badge, slot) {
      await this.$apollo.mutate({
        mutation: setTrophyBadgeSelected,
        variables: {
          badgeId: badge?.id ?? null,
          slot,
        },
        update: (_, { data: { setTrophyBadgeSelected } }) => {
          const { badgeTrophiesSelected, badgeTrophiesUnused } = setTrophyBadgeSelected
          this.setCurrentUser({
            ...this.currentUser,
            badgeTrophiesSelected,
            badgeTrophiesUnused,
          })
        },
      })
    },
    async assignBadgeToSlot(badge) {
      if (!badge || this.selectedBadgeIndex === null) {
        return
      }

      await this.setSlot(badge, this.selectedBadgeIndex)

      this.$toast.success(this.$t('settings.badges.success-update'))

      if (this.$refs.badgeSelection && this.$refs.badgeSelection.resetSelection) {
        this.$refs.badgeSelection.resetSelection()
      }
      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
    async removeBadgeFromSlot() {
      if (this.selectedBadgeIndex === null) return

      await this.setSlot(null, this.selectedBadgeIndex)

      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
  },
}
</script>

<style lang="scss">
.presenterContainer {
  padding-top: 50px;
  min-height: 250px;
}

.badge-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;

  .remove-button {
    margin-top: 8px;
  }
}

.selection-info {
  margin-top: 20px;
  padding: 16px;
}
</style>
