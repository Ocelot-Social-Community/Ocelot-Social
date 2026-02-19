<template>
  <div class="ds-mt-base ds-mb-xxx-small">
    <ds-form
      v-if="!changePasswordResult"
      v-model="formData"
      :schema="formSchema"
      @submit="handleSubmitPassword"
      class="change-password"
    >
      <template #default="{ errors }">
        <ds-input
          id="password"
          model="password"
          type="password"
          autocomplete="off"
          :label="$t('settings.security.change-password.label-new-password')"
        />
        <ds-input
          id="passwordConfirmation"
          model="passwordConfirmation"
          type="password"
          autocomplete="off"
          :label="$t('settings.security.change-password.label-new-password-confirm')"
        />
        <password-strength :password="formData.password" />
        <div class="ds-mt-base ds-mb-xxx-small">
          <os-button
            variant="primary"
            appearance="filled"
            :loading="$apollo.loading"
            :disabled="!!errors"
            type="submit"
          >
            <template #icon>
              <os-icon :icon="icons.lock" />
            </template>
            {{ $t('settings.security.change-password.button') }}
          </os-button>
        </div>
      </template>
    </ds-form>
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
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import emails from '../../constants/emails.js'
import PasswordStrength from '../Password/Strength'
import gql from 'graphql-tag'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import PasswordForm from '~/components/utils/PasswordFormHelper'

export default {
  components: {
    OsButton,
    OsIcon,
    SweetalertIcon,
    PasswordStrength,
  },
  props: {
    email: { type: String, required: true },
    nonce: { type: String, required: true },
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    return {
      supportEmail: emails.SUPPORT_EMAIL,
      formData: {
        ...passwordForm.formData,
      },
      formSchema: {
        ...passwordForm.formSchema,
      },
      disabled: true,
      changePasswordResult: null,
    }
  },
  methods: {
    async handleSubmitPassword() {
      const mutation = gql`
        mutation ($nonce: String!, $email: String!, $password: String!) {
          resetPassword(nonce: $nonce, email: $email, newPassword: $password)
        }
      `
      const { password } = this.formData
      const { email, nonce } = this
      const variables = { password, email, nonce }
      try {
        const {
          data: { resetPassword },
        } = await this.$apollo.mutate({ mutation, variables })
        this.changePasswordResult = resetPassword ? 'success' : 'error'
        setTimeout(() => {
          this.$emit('passwordResetResponse', this.changePasswordResult)
        }, 3000)
        this.formData = {
          password: '',
          passwordConfirmation: '',
        }
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
}
</script>
