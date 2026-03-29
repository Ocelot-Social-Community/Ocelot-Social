<template>
  <div class="ds-mt-base ds-mb-xxx-small">
    <password-form v-if="!changePasswordResult" ref="form" @submit="handleSubmit" />
    <div v-else class="ds-mb-large">
      <template v-if="changePasswordResult === 'success'">
        <transition name="ds-transition-fade">
          <sweetalert-icon icon="success" />
        </transition>
        <p class="ds-text">
          {{ $t('components.password-reset.change-password.success') }}
        </p>
      </template>
      <template v-else>
        <transition name="ds-transition-fade">
          <sweetalert-icon icon="error" />
        </transition>
        <p class="ds-text">
          {{ $t(`components.password-reset.change-password.error`) }}
        </p>
        <p class="ds-text">
          {{ $t('components.password-reset.change-password.help') }}
        </p>
        <p class="ds-text">
          <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
        </p>
      </template>
      <div class="ds-mb-large ds-space-centered">
        <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
      </div>
    </div>
  </div>
</template>

<script>
import { SweetalertIcon } from 'vue-sweetalert-icons'
import emails from '~/constants/emails.js'
import { useResetPassword } from '~/composables/useResetPassword'
import PasswordForm from '~/components/Password/PasswordForm'

export default {
  components: {
    SweetalertIcon,
    PasswordForm,
  },
  data() {
    const { email = '', nonce = '' } = this.$route.query
    return {
      email,
      nonce,
      supportEmail: emails.SUPPORT_EMAIL,
      changePasswordResult: null,
    }
  },
  created() {
    const { resetPassword } = useResetPassword({
      apollo: this.$apollo,
      toast: this.$toast,
    })
    this._resetPassword = resetPassword
  },
  methods: {
    async handleSubmit(formData) {
      const { password } = formData
      const { email, nonce } = this
      const { success, result } = await this._resetPassword({ password, email, nonce })
      this.changePasswordResult = result
      if (success) {
        this.$refs.form.done()
        setTimeout(() => {
          if (this.changePasswordResult === 'success') {
            this.$router.push('/login')
          }
        }, 3000)
      } else {
        this.$refs.form.fail()
      }
    },
  },
}
</script>
