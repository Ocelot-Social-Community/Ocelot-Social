<template>
  <os-card>
    <h2 class="title">{{ $t('settings.privacy.name') }}</h2>
    <div class="ds-mb-small">
      <input id="allow-shouts" type="checkbox" v-model="shoutsAllowed" />
      <label for="allow-shouts">{{ $t('settings.privacy.make-shouts-public') }}</label>
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
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return this.shoutsAllowed === this.currentUser.showShoutsPublicly
    },
  },
  created() {
    this.shoutsAllowed = this.currentUser.showShoutsPublicly || false
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
