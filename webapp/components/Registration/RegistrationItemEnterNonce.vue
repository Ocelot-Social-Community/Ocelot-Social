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
    <!-- <base-button :disabled="disabled" filled name="submit" type="submit">
      {{ $t('components.enter-nonce.form.next') }}
    </base-button> -->
    <slot></slot>
  </ds-form>
</template>

<script>
export default {
  name: 'RegistrationItemEnterNonce',
  props: {
    sliderData: { type: Object, required: true },
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
      // disabled: true,
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered
      // console.log('mounted !!! ')
      this.formData.nonce = this.sliderData.collectedInputData.nonce
        ? this.sliderData.collectedInputData.nonce
        : ''
    })
  },
  methods: {
    async handleInput() {
      // this.disabled = true
      this.sliderData.validateCallback(false)
    },
    async handleInputValid() {
      // this.disabled = false
      const { nonce } = this.formData
      // validate in backend?
      // toaster?
      this.sliderData.validateCallback(true, { nonce })
    },
    handleSubmitVerify() {
      // const { nonce } = this.formData
      // const email = this.email
      // this.$emit('nonceEntered', { email, nonce })
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
