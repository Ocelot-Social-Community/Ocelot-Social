<template>
  <base-card>
    <h2 class="title">{{ $t('settings.notifications.name') }}</h2>
    <div v-for="topic in emailNotificationSettings" :key="topic.type">
      <h3>{{ $t(`settings.notifications.${topic.type}`) }}</h3>
      <ds-space margin-bottom="small" v-for="setting in topic.settings" :key="setting.name" >
        <input :id="setting.name" type="checkbox" v-model="setting.value" />
        <label :for="setting.name">{{ $t(`settings.notifications.${setting.name}`) }}</label>
      </ds-space>
    </div>
    <base-button @click="activateAll">
      {{ $t('settings.notifications.activateAll') }}
    </base-button>
    <base-button @click="deactivateAll">
      {{ $t('settings.notifications.deactivateAll') }}
    </base-button>
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
      emailNotificationSettings: {},
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    disabled() {
      return Object.entries(this.emailNotificationSettings).every(
        // TODO deep equals
        (value, index) => value === this.currentUser.emailNotificationSettings[index],
      )
    },
  },
  created() {
    this.emailNotificationSettings = [ ...this.currentUser.emailNotificationSettings.map(topic => ({
      type: topic.type,
      settings: topic.settings.map(setting => ({
        name: setting.name,
        value: setting.value,
      })),
    }))]
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    setAll(value) {
      for (const key of Object.keys(this.emailNotificationSettings)) {
        this.emailNotificationSettings[key] = value
      }
    },
    activateAll() {
      this.setAll(true)
    },
    deactivateAll() {
      this.setAll(false)
    },
    transformToEmailSettingsInput(emailSettings) {
      const emailSettingsInput = []
      for (const topic of emailSettings) {
        for (const setting of topic.settings) {
          emailSettingsInput.push({
            name: setting.name,
            value: setting.value,
          })
        }
      }
      return emailSettingsInput
    },
    async submit() {
      try {
        await this.$apollo.mutate({
          mutation: updateUserMutation(),
          variables: {
            id: this.currentUser.id,
            emailNotificationSettings: this.transformToEmailSettingsInput(this.emailNotificationSettings),
          },
          update: (_, { data: { UpdateUser } }) => {
            const { emailNotificationSettings } = UpdateUser
            this.setCurrentUser({
              ...this.currentUser,
              emailNotificationSettings,
            })
            this.$toast.success(this.$t('settings.notifications.success-update'))
          },
        })
      } catch (error) {
        this.$toast.error(error.message)
      }
    },
  },
}
</script>
