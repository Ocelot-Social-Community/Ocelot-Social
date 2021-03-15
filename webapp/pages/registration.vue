<template>
  <registration-slider
    :registrationType="registrationType"
    :overwriteSliderData="overwriteSliderData"
  />
</template>

<script>
import RegistrationSlider from '~/components/Registration/RegistrationSlider'

export default {
  name: 'Registration',
  components: {
    RegistrationSlider,
  },
  data() {
    const { method = null, email = null, inviteCode = null, nonce = null } = this.$route.query
    return {
      method,
      overwriteSliderData: {
        collectedInputData: {
          inviteCode,
          email,
          emailSend: !!email,
          nonce,
        },
      },
    }
  },
  asyncData({ app, store, redirect }) {
    if (store.getters['auth/isLoggedIn']) {
      redirect('/')
    }
    return {
      publicRegistration: app.$env.PUBLIC_REGISTRATION,
      inviteRegistration: app.$env.INVITE_REGISTRATION,
    }
  },
  computed: {
    registrationType() {
      if (!this.method) {
        return (
          (this.publicRegistration && 'public-registration') ||
          (this.inviteRegistration && 'invite-code') ||
          'no-public-registration'
        )
      } else {
        if (
          this.method === 'invite-mail' ||
          (this.method === 'invite-code' && this.inviteRegistration)
        ) {
          return this.method
        }
        return this.publicRegistration ? 'public-registration' : 'no-public-registration'
      }
    },
  },
}
</script>
