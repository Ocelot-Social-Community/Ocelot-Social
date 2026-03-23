<template>
  <form class="enter-nonce" @submit.prevent="onSubmit" novalidate>
    <ocelot-input
      :placeholder="$t('components.registration.email-nonce.form.nonce')"
      model="nonce"
      name="nonce"
      id="nonce"
      icon="question-circle"
    />
    <p class="ds-text">
      {{ $t('components.registration.email-nonce.form.description') }}
    </p>
    <p class="ds-text">
      {{ $t('components.registration.email-nonce.form.click-next') }}
    </p>
    <os-button
      variant="primary"
      appearance="filled"
      :disabled="disabled"
      name="submit"
      type="submit"
    >
      {{ $t('components.registration.email-nonce.form.next') }}
    </os-button>
    <slot></slot>
  </form>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import registrationConstants from '~/constants/registration'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  name: 'EnterNonce',
  mixins: [formValidation],
  components: { OsButton, OcelotInput },
  props: {
    email: { type: String, required: true },
  },
  data() {
    return {
      formData: {
        nonce: '',
      },
      formSchema: {
        nonce: {
          type: 'string',
          min: 5,
          max: 5,
          required: true,
          message: this.$t('components.registration.email-nonce.form.validations.length', {
            nonceLength: registrationConstants.NONCE_LENGTH,
          }),
        },
      },
      disabled: true,
    }
  },
  methods: {
    async handleInput() {
      this.disabled = true
    },
    async handleInputValid() {
      this.disabled = false
    },
    onSubmit() {
      this.formSubmit(this.handleSubmitVerify)
    },
    handleSubmitVerify() {
      const { nonce } = this.formData
      const email = this.email
      this.$emit('nonceEntered', { email, nonce })
    },
  },
}
</script>

<style lang="scss">
.enter-nonce {
  display: flex;
  flex-direction: column;
  margin: $space-large 0 $space-xxx-small 0;
}
</style>
