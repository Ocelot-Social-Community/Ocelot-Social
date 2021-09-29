<template>
  <base-card>
    <h2 class="title">{{ $t('settings.notifications.name') }}</h2>
    <ds-space margin-bottom="small">
      <input id="send-email" type="checkbox" v-model="notifyByEmail" />
      <label for="send-email">{{ $t('settings.notifications.send-email-notifications') }}</label>
    </ds-space>
    <base-button class="save-button" filled @click="submit" :disabled="disabled">
      {{ $t('actions.save') }}
    </base-button>
  </base-card>
</template>

<script>
import { mapGetters, mapMutations } from 'vuex'
import { updateUserMutation } from '~/graphql/User'

export default {
  data() {
    return {
      notifyByEmail: false,
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return this.notifyByEmail === this.currentUser.sendNotificationEmails
    },
  },
  created() {
    this.notifyByEmail = this.currentUser.sendNotificationEmails || false
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
            sendNotificationEmails: this.notifyByEmail,
          },
          update: (_, { data: { UpdateUser } }) => {
            const { sendNotificationEmails } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              sendNotificationEmails,
            })
            this.$toast.success(this.$t('settings.notifications.success-update'))
          },
        })
      } catch (error) {
        this.notifyByEmail = !this.notifyByEmail
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
