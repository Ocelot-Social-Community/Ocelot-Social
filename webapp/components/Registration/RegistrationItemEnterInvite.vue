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
      :placeholder="$t('components.enter-nonce.form.nonce')"
      model="nonce"
      name="nonce"
      id="nonce"
      icon="question-circle"
    />
    <ds-text>
      {{ $t('components.enter-nonce.form.description') }}
    </ds-text>
    <!-- Wolle <base-button :disabled="disabled" filled name="submit" type="submit">
      {{ $t('components.enter-nonce.form.next') }}
    </base-button> -->
    <slot></slot>
  </ds-form>
</template>

<script>
export default {
  name: 'RegistrationItemEnterInvite',
  props: {
    sliderData: { type: Object, required: true },
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
          min: 6,
          max: 6,
          required: true,
          message: this.$t('components.enter-nonce.form.validations.length'),
        },
      },
      disabled: true,
    }
  },
  methods: {
    async handleInput() {
      // Wolle console.log('handleInput !!!')
      // console.log('email: ', this.email)
      this.sliderData.validateCallback(false)
    },
    async handleInputValid() {
      // Wolle console.log('handleInputValid !!!')
      const { nonce } = this.formData
      const email = this.email
      this.sliderData.validateCallback(true, { email, nonce })
    },
    handleSubmitVerify() {
      // Wolle const { nonce } = this.formData
      // const email = this.email
      // this.$emit('nonceEntered', { email, nonce })
      // this.$emit('validation', { email, nonce })
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
