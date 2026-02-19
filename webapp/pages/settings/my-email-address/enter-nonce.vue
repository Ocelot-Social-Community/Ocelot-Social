<template>
  <ds-form v-model="form" :schema="formSchema" @submit="submit">
    <template #default="{ errors }">
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
        <os-button variant="primary" appearance="filled" type="submit" :disabled="!!errors">
          <template #icon><os-icon :icon="icons.check" /></template>
          {{ $t('actions.save') }}
        </os-button>
      </os-card>
    </template>
  </ds-form>
</template>

<script>
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'

export default {
  components: { OsButton,
    OsCard, OsIcon },
  data() {
    return {
      formSchema: {
        nonce: { type: 'string', required: true },
      },
    }
  },
  computed: {
    form: {
      get: function () {
        const { email = '', nonce = '' } = this.$route.query
        return { email, nonce }
      },
      set: function (formData) {
        this.formData = formData
      },
    },
  },
  created() {
    this.icons = iconRegistry
  },
  methods: {
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
