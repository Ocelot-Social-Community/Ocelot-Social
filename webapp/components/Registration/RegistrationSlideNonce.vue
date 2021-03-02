<template>
  <ds-form
    class="enter-nonce"
    v-model="formData"
    :schema="formSchema"
    @submit="handleSubmitVerify"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <ds-text>
      <!-- Wolle {{ $t('components.enter-nonce.form.description') }} -->
      Your e-mail address:
      <b>{{ this.sliderData.collectedInputData.email }}</b>
    </ds-text>
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
    <slot></slot>
  </ds-form>
</template>

<script>
export default {
  name: 'RegistrationSlideNonce',
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
          // add again if the input has a validation without focus and typing
          // min: 5,
          // max: 5,
          required: true,
          message: this.$t('components.enter-nonce.form.validations.length'),
        },
      },
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered
      // console.log('mounted !!! ')
      this.formData.nonce = this.sliderData.collectedInputData.nonce
        ? this.sliderData.collectedInputData.nonce
        : ''
      this.sendValidation()

      this.sliderData.setSliderValuesCallback(this.validInput, {
        sliderSettings: { buttonSliderCallback: this.onNextClick },
      })
    })
  },
  computed: {
    validInput() {
      return this.formData.nonce.length === 5
    },
  },
  methods: {
    sendValidation() {
      const { nonce } = this.formData

      // Wolle shall the nonce be validated in the database?
      // let dbValidated = false
      // if (this.validInput) {
      //   await this.handleSubmitVerify()
      //   dbValidated = this.sliderData.sliders[this.sliderIndex].data.response.isValidInviteCode
      // }
      // this.sliderData.setSliderValuesCallback(dbValidated, {
      this.sliderData.setSliderValuesCallback(this.validInput, {
        collectedInputData: {
          nonce,
        },
      })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    handleSubmitVerify() {},
    onNextClick() {
      return true
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
