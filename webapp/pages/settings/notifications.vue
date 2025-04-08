<template>
  <base-card>
    <h2 class="title">{{ $t('settings.notifications.name') }}</h2>
    <ds-space margin-top="base" v-for="topic in emailNotificationSettings" :key="topic.type">
      <ds-space margin-bottom="small">
      <h4>{{ $t(`settings.notifications.${topic.type}`) }}</h4>
    </ds-space>
    <div class="notifcation-settings-section">
    <ds-space margin-bottom="small" v-for="setting in topic.settings" :key="setting.name">
      <input :id="setting.name" type="checkbox" v-model="setting.value" />
      <label :for="setting.name" class="label">{{ $t(`settings.notifications.${setting.name}`) }}</label>
    </ds-space>
    </div>
    </ds-space>
    <base-button @click="checkAll" :disabled="isCheckAllDisabled">
      {{ $t('settings.notifications.checkAll') }}
    </base-button>
    <base-button @click="uncheckAll" :disabled="isUncheckAllDisabled">
      {{ $t('settings.notifications.uncheckAll') }}
    </base-button>
    <base-button class="save-button" filled @click="submit" :disabled="isSubmitDisabled">
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
      emailNotificationSettings: [],
    }
  },
  computed: {
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    isSubmitDisabled() {
      return this.emailNotificationSettings.every((topic) =>
        topic.settings.every(
          (setting) =>
            setting.value ===
            this.currentUser.emailNotificationSettings
              .find((t) => t.type === topic.type)
              .settings.find((s) => s.name === setting.name).value,
        ),
      )
    },
    isCheckAllDisabled() {
      return this.emailNotificationSettings.every((topic) =>
        topic.settings.every((setting) => setting.value),
      )
    },
    isUncheckAllDisabled() {
      return this.emailNotificationSettings.every((topic) =>
        topic.settings.every((setting) => !setting.value),
      )
    },
  },
  created() {
    this.emailNotificationSettings = [
      ...this.currentUser.emailNotificationSettings.map((topic) => ({
        type: topic.type,
        settings: topic.settings.map((setting) => ({
          name: setting.name,
          value: setting.value,
        })),
      })),
    ]
  },
  mounted() {
    document.getElementById('settings-content').scrollIntoView({
      behavior: 'smooth',
    })
  },
  methods: {
    ...mapMutations({
      setCurrentUser: 'auth/SET_USER',
    }),
    setAll(value) {
      for (const topic of this.emailNotificationSettings) {
        for (const setting of topic.settings) {
          setting.value = value
        }
      }
    },
    checkAll() {
      this.setAll(true)
    },
    uncheckAll() {
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
            emailNotificationSettings: this.transformToEmailSettingsInput(
              this.emailNotificationSettings,
            ),
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

<style lang="scss" scoped>
.notifcation-settings-section {
  margin-left: $space-x-small;
}
.label {
  margin-left: $space-xx-small;
}
</style>
