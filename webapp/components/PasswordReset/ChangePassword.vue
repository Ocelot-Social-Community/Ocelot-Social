<template>
  <div class="ds-mt-base ds-mb-xxx-small">
    <password-form
      v-if="!changePasswordResult"
      ref="form"
      @submit="handleSubmit"
    />
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
      <slot></slot>
    </div>
  </div>
</template>

<script>
import gql from 'graphql-tag'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import emails from '../../constants/emails.js'
import PasswordForm from '../Password/PasswordForm'

export default {
  components: {
    SweetalertIcon,
    PasswordForm,
  },
  props: {
    email: { type: String, required: true },
    nonce: { type: String, required: true },
  },
  data() {
    return {
      supportEmail: emails.SUPPORT_EMAIL,
      changePasswordResult: null,
    }
  },
  methods: {
    async handleSubmit(formData) {
      const mutation = gql`
        mutation ($nonce: String!, $email: String!, $password: String!) {
          resetPassword(nonce: $nonce, email: $email, newPassword: $password)
        }
      `
      const { password } = formData
      const { email, nonce } = this
      try {
        const {
          data: { resetPassword },
        } = await this.$apollo.mutate({ mutation, variables: { password, email, nonce } })
        this.changePasswordResult = resetPassword ? 'success' : 'error'
        setTimeout(() => {
          this.$emit('passwordResetResponse', this.changePasswordResult)
        }, 3000)
        this.$refs.form.done()
      } catch (err) {
        this.$toast.error(err.message)
        this.$refs.form.fail()
      }
    },
  },
}
</script>
