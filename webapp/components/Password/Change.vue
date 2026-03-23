<template>
  <form @submit.prevent="onSubmit" novalidate>
    <ocelot-input
      id="oldPassword"
      model="oldPassword"
      type="password"
      autocomplete="off"
      :label="$t('settings.security.change-password.label-old-password')"
    />
    <ocelot-input
      id="password"
      model="password"
      type="password"
      autocomplete="off"
      :label="$t('settings.security.change-password.label-new-password')"
    />
    <ocelot-input
      id="passwordConfirmation"
      model="passwordConfirmation"
      type="password"
      autocomplete="off"
      :label="$t('settings.security.change-password.label-new-password-confirm')"
    />
    <password-strength :password="formData.password" />
    <div class="ds-mt-base ds-mb-large">
      <os-button
        variant="primary"
        appearance="filled"
        :loading="loading"
        :disabled="!!formErrors"
        type="submit"
      >
        <template #icon>
          <os-icon :icon="icons.lock" />
        </template>
        {{ $t('settings.security.change-password.button') }}
      </os-button>
    </div>
  </form>
</template>

<script>
import { OsButton, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import gql from 'graphql-tag'
import PasswordStrength from './Strength'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'ChangePassword',
  mixins: [formValidation],
  components: {
    OsButton,
    OsIcon,
    PasswordStrength,
    OcelotInput,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    return {
      formData: {
        oldPassword: '',
        ...passwordForm.formData,
      },
      formSchema: {
        oldPassword: {
          type: 'string',
          required: true,
          message: this.$t('settings.security.change-password.message-old-password-required'),
        },
        ...passwordForm.formSchema,
      },
      loading: false,
    }
  },
  methods: {
    onSubmit() {
      this.formSubmit(this.handleSubmit)
    },
    async handleSubmit(data) {
      this.loading = true
      const mutation = gql`
        mutation ($oldPassword: String!, $password: String!) {
          changePassword(oldPassword: $oldPassword, newPassword: $password)
        }
      `
      const variables = this.formData

      try {
        const { data } = await this.$apollo.mutate({ mutation, variables })
        this.$store.commit('auth/SET_TOKEN', data.changePassword)
        this.$toast.success(this.$t('settings.security.change-password.success'))
        this.formData = {
          oldPassword: '',
          password: '',
          passwordConfirmation: '',
        }
      } catch (err) {
        this.$toast.error(err.message)
      } finally {
        this.loading = false
      }
    },
  },
}
</script>
