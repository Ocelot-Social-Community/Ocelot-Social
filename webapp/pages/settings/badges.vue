<template>
  <base-card>
    <h2 class="title">{{ $t('settings.badges.name') }}</h2>
    <p>{{ $t('settings.badges.description') }}</p>
    <ds-space centered margin-bottom="small" margin-top="base">
      <div class="presenterContainer">
        <badges
          :badges="[currentUser.badgeVerification, ...selectedBadges]"
          :selection-mode="true"
          @badge-selected="handleBadgeSlotSelection"
          ref="badgesComponent"
        />
      </div>

      <p v-if="!availableBadges.length && isEmptySlotSelected">
        {{ $t('settings.badges.no-badges-available') }}
      </p>

      <div v-if="availableBadges.length > 0">
        <strong>
          {{
            selectedBadgeIndex === null
              ? this.$t('settings.badges.click-to-select')
              : isEmptySlotSelected
                ? this.$t('settings.badges.click-to-use')
                : ''
          }}
        </strong>
      </div>

      <div v-if="selectedBadgeIndex !== null && !isEmptySlotSelected" class="badge-actions">
        <os-button variant="primary" appearance="outline" class="remove-button" @click="removeBadgeFromSlot">
          {{ $t('settings.badges.remove') }}
        </os-button>
      </div>

      <div
        v-if="availableBadges.length && selectedBadgeIndex !== null && isEmptySlotSelected"
        class="selection-info"
      >
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
import { OsButton } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { setTrophyBadgeSelected } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import Badges from '../../components/Badges.vue'
import BadgeSelection from '../../components/BadgeSelection.vue'

export default {
  components: { OsButton, BadgeSelection, Badges },
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
    isEmptySlotSelected() {
      return this.selectedBadges[this.selectedBadgeIndex]?.isDefault ?? false
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
        this.$toast.info(this.$t('settings.badges.verification'))
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

      try {
        await this.setSlot(badge, this.selectedBadgeIndex)
        this.$toast.success(this.$t('settings.badges.success-update'))
      } catch (error) {
        this.$toast.error(this.$t('settings.badges.error-update'))
      }

      if (this.$refs.badgeSelection && this.$refs.badgeSelection.resetSelection) {
        this.$refs.badgeSelection.resetSelection()
      }
      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
    async removeBadgeFromSlot() {
      if (this.selectedBadgeIndex === null) return

      try {
        await this.setSlot(null, this.selectedBadgeIndex)
        this.$toast.success(this.$t('settings.badges.success-update'))
      } catch (error) {
        this.$toast.error(this.$t('settings.badges.error-update'))
      }

      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
    },
  },
}
</script>

<style scoped>
.presenterContainer {
  margin-top: 20px;
  padding-top: 50px;
  min-height: 220px;
  --badges-scale: 2;
}

@media screen and (max-width: 400px) {
  .presenterContainer {
    --badges-scale: 1.5;
  }
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
