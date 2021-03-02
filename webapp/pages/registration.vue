<template>
  <section class="registration-form">
    <base-card>
      <registration-slider
        v-if="registrationType"
        :registrationType="registrationType"
        :overwriteSliderData="overwriteSliderData"
      />
      <ds-space v-else centered>
        <hc-empty icon="events" :message="$t('components.registration.signup.unavailable')" />
        <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
      </ds-space>
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </section>
</template>

<script>
import HcEmpty from '~/components/Empty/Empty'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import RegistrationSlider from '~/components/Registration/RegistrationSlider'

export default {
  name: 'Registration',
  components: {
    HcEmpty,
    LocaleSwitch,
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
      publicRegistration: app.$env.PUBLIC_REGISTRATION === 'true',
      inviteRegistration: app.$env.INVITE_REGISTRATION === 'true',
    }
  },
  computed: {
    registrationType() {
      if (this.method && ['invite-code', 'invite-mail'].includes(this.method)) {
        return this.method
      }
      return this.publicRegistration ? 'public-registration' : 'no-public-registration'
    },
  },
}
</script>
