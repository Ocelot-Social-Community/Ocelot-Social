<template>
  <base-card>
    <h2 class="title">{{ $t('settings.badges.name') }}</h2>
    <ds-space margin-bottom="big">
      <div class="presenterContainer">
        <badges
          :badges="selectedBadges"
          :selection-mode="true"
          :scale="2"
          @badge-selected="handleBadgeSelection"
          ref="badgesComponent"
        />
      </div>

      <div v-if="selectedBadgeIndex !== null" class="selection-info">
        Ausgewählter Slot: {{ selectedBadgeIndex }}

        <badge-selection :badges="availableBadges" />
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
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    selectedBadges() {
      const emptyBadge = {
        key: 'empty',
        icon: 'http://172.23.0.7:3000/img/badges/slot-empty.svg',
        description: '',
      }

      const badges = [
        this.currentUser.badgeVerification || emptyBadge,
        ...(this.currentUser.badgeTrophiesSelected || []),
      ].map((item) => item || emptyBadge)

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
    disabled() {
      return false
    },
  },
  created() {},
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    handleBadgeSelection(index) {
      console.log(this.currentUser.badgeTrophies)

      console.log('Badge ausgewählt:', index)
      this.selectedBadgeIndex = index

      // Hier kannst du weitere Aktionen basierend auf der Auswahl durchführen
    },
    resetSelection() {
      this.$refs.badgesComponent.resetSelection()
      this.selectedBadgeIndex = null
      console.log('Auswahl zurückgesetzt')
    },
    async submit() {
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            showShoutsPublicly: this.shoutsAllowed,
          },
          update: (_, { data: { UpdateUser } }) => {
            const { showShoutsPublicly } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              showShoutsPublicly,
            })
            this.$toast.success(this.$t('settings.privacy.success-update'))
          },
        })
      } catch (error) {
        this.shoutsAllowed = !this.shoutsAllowed
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
</style>
