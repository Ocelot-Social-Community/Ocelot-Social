<template>
  <os-card>
    <h2 class="title">{{ $t('settings.badges.name') }}</h2>
    <p>{{ $t('settings.badges.description') }}</p>
    <div class="ds-mb-small ds-mt-base badge-content">
      <div class="presenterContainer">
        <badges
          :badges="[currentUser.badgeVerification, ...selectedBadges]"
          :selection-mode="true"
          :drag-enabled="dragSupported"
          @badge-selected="handleBadgeSlotSelection"
          @drag-start="handleHexDragStart"
          @drag-end="handleHexDragEnd"
          @badge-drop="handleBadgeDrop"
          ref="badgesComponent"
        />
      </div>

      <p v-if="dragSupported" class="drag-instruction">
        {{ $t('settings.badges.drag-instruction') }}
      </p>

      <p v-if="!availableBadges.length && isEmptySlotSelected">
        {{ $t('settings.badges.no-badges-available') }}
      </p>

      <div v-if="availableBadges.length > 0">
        <strong>
          {{
            selectedBadgeIndex === null
              ? $t('settings.badges.click-to-select')
              : isEmptySlotSelected
                ? $t('settings.badges.click-to-use')
                : ''
          }}
        </strong>
      </div>

      <div v-if="selectedBadgeIndex !== null && !isEmptySlotSelected" class="badge-actions">
        <os-button
          variant="primary"
          appearance="outline"
          class="remove-button"
          @click="removeBadgeFromSlot"
        >
          {{ $t('settings.badges.remove') }}
        </os-button>
      </div>

      <div v-if="availableBadges.length > 0" class="selection-info">
        <h3 v-if="dragSupported || selectedBadgeIndex !== null" class="reserve-title">
          {{ $t('settings.badges.reserve-title') }}
        </h3>
        <badge-selection
          v-if="dragSupported || (selectedBadgeIndex !== null && isEmptySlotSelected)"
          :badges="availableBadges"
          :drag-enabled="dragSupported"
          @badge-selected="assignBadgeToSlot"
          @badge-returned="handleBadgeReturn"
          ref="badgeSelection"
        />
      </div>

      <div
        v-if="isDraggingFromHex && !availableBadges.length"
        class="empty-reserve-drop-zone"
        @dragover.prevent="emptyReserveDragOver = true"
        @dragleave="emptyReserveDragOver = false"
        @drop.prevent="handleEmptyReserveDrop"
        :class="{ 'reserve-drag-over': emptyReserveDragOver }"
      >
        {{ $t('settings.badges.drop-to-remove') }}
      </div>
    </div>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { setTrophyBadgeSelected } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'
import Badges from '../../components/Badges.vue'
import BadgeSelection from '../../components/BadgeSelection.vue'

export default {
  components: { OsButton, OsCard, BadgeSelection, Badges },
  mixins: [scrollToContent],
  data() {
    return {
      selectedBadgeIndex: null,
      isDraggingFromHex: false,
      isProcessingDrop: false,
      emptyReserveDragOver: false,
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
    this.dragSupported = this.detectDragSupport()
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    detectDragSupport() {
      if (typeof window === 'undefined') return false
      if (!window.matchMedia) return !('ontouchstart' in window)
      const hasFinePointer = window.matchMedia('(pointer: fine)').matches
      const isWideScreen = window.matchMedia('(min-width: 640px)').matches
      return hasFinePointer && isWideScreen
    },
    handleBadgeSlotSelection(index) {
      if (index === 0) {
        this.$toast.info(this.$t('settings.badges.verification'))
        this.$refs.badgesComponent.resetSelection()
        return
      }

      this.selectedBadgeIndex = index === null ? null : index - 1 // The first badge in badges component is the verification badge
    },
    handleHexDragStart() {
      this.isDraggingFromHex = true
    },
    handleHexDragEnd() {
      this.isDraggingFromHex = false
    },
    async handleBadgeDrop(dropData) {
      if (this.isProcessingDrop) return
      this.isProcessingDrop = true

      try {
        const source = dropData.source
        const targetIndex = dropData.targetIndex - 1 // adjust for verification badge offset
        const targetBadge = dropData.targetBadge

        if (source && source.source === 'reserve') {
          // Assign: Reserve → Slot
          await this.setSlot(source.badge, targetIndex)
          this.$toast.success(this.$t('settings.badges.success-update'))
        } else if (source && source.source === 'hex') {
          const sourceIndex = source.index - 1 // adjust for verification badge offset
          if (targetBadge.isDefault) {
            // Move to empty slot: 1 mutation
            await this.setSlot(source.badge, targetIndex)
            this.$toast.success(this.$t('settings.badges.success-update'))
          } else {
            // Swap: 2 mutations
            await this.swapBadges(source.badge, sourceIndex, targetBadge, targetIndex)
          }
        }
      } catch (error) {
        this.$toast.error(this.$t('settings.badges.error-update'))
      } finally {
        this.isProcessingDrop = false
        this.isDraggingFromHex = false
        this.$refs.badgesComponent.resetSelection()
        this.selectedBadgeIndex = null
      }
    },
    async handleBadgeReturn(data) {
      if (this.isProcessingDrop) return
      this.isProcessingDrop = true

      try {
        const sourceIndex = data.index - 1 // adjust for verification badge offset
        await this.setSlot(null, sourceIndex)
        this.$toast.success(this.$t('settings.badges.success-update'))
      } catch (error) {
        this.$toast.error(this.$t('settings.badges.error-update'))
      } finally {
        this.isProcessingDrop = false
        this.isDraggingFromHex = false
      }
    },
    async handleEmptyReserveDrop(event) {
      this.emptyReserveDragOver = false
      try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'))
        if (data.source === 'hex') {
          await this.handleBadgeReturn(data)
        }
      } catch {
        // ignore invalid drag data
      }
    },
    async swapBadges(sourceBadge, sourceIndex, targetBadge, targetIndex) {
      // Mutation 1: Move source badge to target slot (target badge goes to unused)
      await this.setSlot(sourceBadge, targetIndex)
      try {
        // Mutation 2: Move former target badge to now-empty source slot
        await this.setSlot(targetBadge, sourceIndex)
      } catch {
        this.$toast.error(this.$t('settings.badges.swap-partial-error'))
        return
      }
      this.$toast.success(this.$t('settings.badges.success-update'))
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
      // Keep the slot selected so the (now empty) slot immediately shows
      // available badges, including the one that was just removed.
    },
  },
}
</script>

<style scoped>
.badge-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

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

.drag-instruction {
  font-size: 13px;
  color: #888;
  margin-top: 0;
  margin-bottom: 16px;
}

.reserve-title {
  font-size: 16px;
  margin-bottom: 12px;
}

.empty-reserve-drop-zone {
  margin-top: 20px;
  padding: 24px;
  border: 2px dashed #ccc;
  border-radius: 12px;
  text-align: center;
  color: #888;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.empty-reserve-drop-zone.reserve-drag-over {
  border-color: $color-success;
  background-color: rgba($color-success, 0.05);
  color: $color-success;
}
</style>
