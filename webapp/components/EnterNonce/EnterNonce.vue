<template>
  <ds-form
    class="enter-nonce"
    v-model="formData"
    :schema="formSchema"
    @submit="handleSubmitVerify"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <ds-input
      :placeholder="$t('components.registration.email-nonce.form.nonce')"
      model="nonce"
      name="nonce"
      id="nonce"
      icon="question-circle"
    />
    <ds-text>
      {{ $t('components.registration.email-nonce.form.description') }}
    </ds-text>
    <ds-text>
      {{ $t('components.registration.email-nonce.form.click-next') }}
    </ds-text>
    <base-button :disabled="disabled" filled name="submit" type="submit">
      {{ $t('components.registration.email-nonce.form.next') }}
    </base-button>
    <slot></slot>
  </ds-form>
</template>

<script>
import registrationConstants from '~/constants/registration'

export default {
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
