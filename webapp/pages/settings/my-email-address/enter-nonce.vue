<template>
  <form @submit.prevent="onSubmit" novalidate>
    <os-card>
      <h2 class="title">{{ $t('settings.email.name') }}</h2>
      <ds-input
        id="email"
        model="email"
        icon="envelope"
        disabled
        :label="$t('settings.email.labelNewEmail')"
      />
      <ds-input
        id="nonce"
        model="nonce"
        icon="question-circle"
        :label="$t('settings.email.labelNonce')"
      />
      <os-button variant="primary" appearance="filled" type="submit" :disabled="!!formErrors">
        <template #icon><os-icon :icon="icons.check" /></template>
        {{ $t('actions.save') }}
      </os-button>
    </os-card>
  </form>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import formValidation from '~/mixins/formValidation'

export default {
  mixins: [formValidation],
  components: { OsButton, OsCard, OsIcon },
  data() {
    return {
      formData: {
        email: '',
        nonce: '',
      },
      formSchema: {
        nonce: { type: 'string', required: true },
      },
    }
  },
  mounted() {
    const { email = '', nonce = '' } = this.$route.query
    this.formData.email = email
    this.formData.nonce = nonce
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
    onSubmit() {
      this.formSubmit(this.submit)
    },
    async submit() {
      const { email, nonce } = this.formData
      this.$router.replace({
        path: 'verify',
        query: { email, nonce },
      })
    },
  },
}
</script>
