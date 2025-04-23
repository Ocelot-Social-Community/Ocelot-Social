<template>
  <base-card>
    <h2 class="title">{{ $t('settings.badges.name') }}</h2>
    <ds-space margin-bottom="big">
      <div class="presenterContainer">
        <badges
          :badges="selectedBadges"
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
          :badges="currentUser.unusedBadges"
          @badge-selected="assignBadgeToSlot"
          ref="badgeSelection"
        />
      </div>
    </ds-space>
    <base-button filled @click="submit" :disabled="disabled">{{ $t('actions.save') }}</base-button>
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import Badges from '../../components/Badges.vue'
import BadgeSelection from '../../components/BadgeSelection.vue'

export default {
  components: { BadgeSelection, Badges },
  mixins: [scrollToContent],
  data() {
    return {
      selectedBadgeIndex: null,
      userBadges: [],
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    selectedBadges() {
      const emptyBadge = {
        key: 'empty',
        icon: '/img/badges/slot-empty.svg',
        description: '',
      }

      const badges = [this.currentUser.badgeVerification || emptyBadge, ...this.userBadges].map(
        (item) => item || emptyBadge,
      )

      while (badges.length < 10) {
        badges.push(emptyBadge)
      }

      return badges
    },
    availableBadges() {
      return (
        this.currentUser.badgeTrophies || [
          // Test Code
          {
            key: 'blue_panda',
            icon: '/api/img/badges/trophy_blue_panda.svg',
            description: 'Blue Panda Trophy - Auszeichnung für herausragende Kreativität',
          },
          {
            key: 'blue_tiger',
            icon: '/api/img/badges/trophy_blue_tiger.svg',
            description: 'Blue Tiger Trophy - Auszeichnung für außergewöhnliche Stärke',
          },
          {
            key: 'green_alienship',
            icon: '/api/img/badges/trophy_green_alienship.svg',
            description: 'Green Alienship Trophy - Auszeichnung für innovative Ideen',
          },
          {
            key: 'green_balloon',
            icon: '/api/img/badges/trophy_green_balloon.svg',
            description: 'Green Balloon Trophy - Auszeichnung für aufstrebende Talente',
          },
          {
            key: 'green_magicrainbow',
            icon: '/api/img/badges/trophy_green_magicrainbow.svg',
            description: 'Green Magic Rainbow Trophy - Auszeichnung für vielseitige Beiträge',
          },
          {
            key: 'green_superfounder',
            icon: '/api/img/badges/trophy_green_superfounder.svg',
            description: 'Green Superfounder Trophy - Auszeichnung für Gründerinitiativen',
          },
        ]
      )
    },
    availableBadgesFiltered() {
      const selectedBadgeKeys = this.userBadges.filter((badge) => badge).map((badge) => badge.key)

      return this.availableBadges.filter((badge) => !selectedBadgeKeys.includes(badge.key))
    },
    isEmptySlot() {
      if (this.selectedBadgeIndex === null) return false
      return this.selectedBadges[this.selectedBadgeIndex].key === 'empty'
    },
    disabled() {
      return false
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
      console.log('Slot ausgewählt:', index)

      if (index === 0) {
        this.$toast.info(
          this.$t('settings.badges.verification') ||
            'Dies ist deine Verifikations-Badge und kann nicht geändert werden.',
        )
        this.$refs.badgesComponent.resetSelection()
        return
      }

      this.selectedBadgeIndex = index
    },
    assignBadgeToSlot(badge) {
      console.log('Badge zum Zuweisen ausgewählt:', badge)

      if (!badge || this.selectedBadgeIndex === null) {
        return
      }

      const userBadgeIndex = this.selectedBadgeIndex - 1

      while (this.userBadges.length <= userBadgeIndex) {
        this.userBadges.push(null)
      }

      this.$set(this.userBadges, userBadgeIndex, badge)

      if (this.$refs.badgeSelection && this.$refs.badgeSelection.resetSelection) {
        this.$refs.badgeSelection.resetSelection()
      }
      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
    removeBadgeFromSlot() {
      if (this.selectedBadgeIndex === null || this.selectedBadgeIndex === 0) {
        return
      }

      const userBadgeIndex = this.selectedBadgeIndex - 1

      if (userBadgeIndex < this.userBadges.length) {
        this.$set(this.userBadges, userBadgeIndex, null)

        let lastIndex = this.userBadges.length - 1
        while (lastIndex >= 0 && this.userBadges[lastIndex] === null) {
          this.userBadges.pop()
          lastIndex--
        }
      }

      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
    async submit() {
      try {
        const cleanedBadges = this.userBadges.filter((badge) => badge !== null)

        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            badgeTrophiesSelected: cleanedBadges,
          },
          update: (_, { data: { UpdateUser } }) => {
            const { badgeTrophiesSelected } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              badgeTrophiesSelected,
            })
            this.$toast.success(
              this.$t('settings.badges.success-update') ||
                'Deine Badges wurden erfolgreich aktualisiert',
            )
          },
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
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
