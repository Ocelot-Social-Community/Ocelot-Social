<template>
  <form @submit.prevent="onSubmit" novalidate>
    <ocelot-input
      v-if="requireOldPassword"
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
import PasswordStrength from './Strength'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'PasswordForm',
  mixins: [formValidation],
  components: {
    OsButton,
    OsIcon,
    PasswordStrength,
    OcelotInput,
  },
  props: {
    /** Require old password field (for authenticated password change) */
    requireOldPassword: {
      type: Boolean,
      default: false,
    },
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    const formData = { ...passwordForm.formData }
    const formSchema = { ...passwordForm.formSchema }
    if (this.requireOldPassword) {
      formData.oldPassword = ''
      formSchema.oldPassword = {
        type: 'string',
        required: true,
        message: this.$t('settings.security.change-password.message-old-password-required'),
      }
    }
    return {
      formData,
      formSchema,
      loading: false,
    }
  },
  methods: {
    onSubmit() {
      this.formSubmit(this.handleSubmit)
    },
    handleSubmit() {
      this.loading = true
      this.$emit('submit', { ...this.formData })
    },
    /** Called by parent after mutation completes */
    done() {
      this.loading = false
      const resetData = { password: '', passwordConfirmation: '' }
      if (this.requireOldPassword) resetData.oldPassword = ''
      this.formData = resetData
    },
    /** Called by parent on mutation error */
    fail() {
      this.loading = false
    },
  },
}
</script>
