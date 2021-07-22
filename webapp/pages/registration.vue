<template>
  <registration-slider
    :registrationType="registrationType.method"
    :activePage="registrationType.activePage"
    :overwriteSliderData="overwriteSliderData"
  />
</template>

<script>
import RegistrationSlider from '~/components/Registration/RegistrationSlider'

export default {
  layout: 'no-header',
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
      publicRegistration: this.$env.PUBLIC_REGISTRATION === true, // for 'false' in .env PUBLIC_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling
      inviteRegistration: this.$env.INVITE_REGISTRATION === true, // for 'false' in .env INVITE_REGISTRATION is of type undefined and not(!) boolean false, because of internal handling
    }
  },
  asyncData({ store, redirect }) {
    if (store.getters['auth/isLoggedIn']) {
      redirect('/')
    }
  },
  computed: {
    registrationType() {
      if (!this.method) {
        return (
          (this.publicRegistration && { method: 'public-registration', activePage: null }) ||
          (this.inviteRegistration && { method: 'invite-code', activePage: null }) || {
            method: 'no-public-registration',
            activePage: null,
          }
        )
      } else {
        if (
          this.method === 'invite-mail' ||
          (this.method === 'invite-code' && this.inviteRegistration)
        ) {
          if (
            this.method === 'invite-code' &&
            this.overwriteSliderData.collectedInputData.inviteCode &&
            this.overwriteSliderData.collectedInputData.nonce &&
            this.overwriteSliderData.collectedInputData.email
          ) {
            return { method: this.method, activePage: 'enter-nonce' }
          }
          return { method: this.method, activePage: null }
        }
        return {
          method: this.publicRegistration ? 'public-registration' : 'no-public-registration',
          activePage: null,
        }
      }
    },
  },
}
</script>
