<template>
  <os-card>
    <h2 class="title">{{ $t('settings.privacy.name') }}</h2>
    <div class="ds-mb-small">
      <input id="allow-shouts" type="checkbox" v-model="shoutsAllowed" />
      <label for="allow-shouts">{{ $t('settings.privacy.make-shouts-public') }}</label>
    </div>
    <hr class="ds-my-small" />
    <p class="ds-text ds-text-soft ds-mb-x-small">
      {{ $t('settings.privacy.show-groups-on-profile-section') }}
    </p>
    <div class="ds-mb-x-small">
      <input id="show-public-groups" type="checkbox" v-model="showPublicGroups" />
      <label for="show-public-groups">
        {{ $t('settings.privacy.show-public-groups-on-profile') }}
      </label>
    </div>
    <div class="ds-mb-x-small">
      <input id="show-closed-groups" type="checkbox" v-model="showClosedGroups" />
      <label for="show-closed-groups">
        {{ $t('settings.privacy.show-closed-groups-on-profile') }}
      </label>
    </div>
    <div class="ds-mb-small">
      <input id="show-hidden-groups" type="checkbox" v-model="showHiddenGroups" />
      <label for="show-hidden-groups">
        {{ $t('settings.privacy.show-hidden-groups-on-profile') }}
      </label>
    </div>
    <os-button variant="primary" @click="submit" :disabled="disabled">
      {{ $t('actions.save') }}
    </os-button>
  </os-card>
</template>

<script>
import { OsButton, OsCard } from '@ocelot-social/ui'
import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User'
import scrollToContent from './scroll-to-content.js'

export default {
  components: { OsButton, OsCard },
  mixins: [scrollToContent],
  data() {
    return {
      shoutsAllowed: false,
      showPublicGroups: true,
      showClosedGroups: true,
      showHiddenGroups: true,
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return (
        this.shoutsAllowed === this.currentUser.showShoutsPublicly &&
        this.showPublicGroups === (this.currentUser.showPublicGroupsOnProfile !== false) &&
        this.showClosedGroups === (this.currentUser.showClosedGroupsOnProfile !== false) &&
        this.showHiddenGroups === (this.currentUser.showHiddenGroupsOnProfile !== false)
      )
    },
  },
  created() {
    this.shoutsAllowed = this.currentUser.showShoutsPublicly || false
    this.showPublicGroups = this.currentUser.showPublicGroupsOnProfile !== false
    this.showClosedGroups = this.currentUser.showClosedGroupsOnProfile !== false
    this.showHiddenGroups = this.currentUser.showHiddenGroupsOnProfile !== false
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    async submit() {
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            showShoutsPublicly: this.shoutsAllowed,
            showPublicGroupsOnProfile: this.showPublicGroups,
            showClosedGroupsOnProfile: this.showClosedGroups,
            showHiddenGroupsOnProfile: this.showHiddenGroups,
          },
          update: (_, { data: { UpdateUser } }) => {
            const {
              showShoutsPublicly,
              showPublicGroupsOnProfile,
              showClosedGroupsOnProfile,
              showHiddenGroupsOnProfile,
            } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              showShoutsPublicly,
              showPublicGroupsOnProfile,
              showClosedGroupsOnProfile,
              showHiddenGroupsOnProfile,
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
