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
import gql from 'graphql-tag'

export const verifyNonceQuery = gql`
  query($email: String!, $nonce: String!) {
    VerifyNonce(email: $email, nonce: $nonce)
  }
`
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
    sliderIndex() {
      return this.sliderData.sliderIndex // to have a shorter notation
    },
    validInput() {
      return this.formData.nonce.length === 5
    },
  },
  methods: {
    async sendValidation() {
      const { nonce } = this.formData

      this.sliderData.setSliderValuesCallback(null, { collectedInputData: { nonce } })

      let dbValidated = false
      if (this.validInput) {
        await this.handleSubmitVerify()
        dbValidated = this.sliderData.sliders[this.sliderIndex].data.response.VerifyNonce
      }
      this.sliderData.setSliderValuesCallback(dbValidated)
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    isVariablesRequested(variables) {
      return (
        this.sliderData.sliders[this.sliderIndex].data.request &&
        this.sliderData.sliders[this.sliderIndex].data.request.variables &&
        this.sliderData.sliders[this.sliderIndex].data.request.variables.email ===
          variables.email &&
        this.sliderData.sliders[this.sliderIndex].data.request.variables.nonce === variables.nonce
      )
    },
    async handleSubmitVerify() {
      const { email, nonce } = this.sliderData.collectedInputData
      const variables = { email, nonce }

      if (!this.isVariablesRequested(variables)) {
        try {
          const response = await this.$apollo.query({ query: verifyNonceQuery, variables })
          this.sliderData.setSliderValuesCallback(null, {
            sliderData: { request: { variables }, response: response.data },
          })

          if (
            this.sliderData.sliders[this.sliderIndex].data.response &&
            this.sliderData.sliders[this.sliderIndex].data.response.VerifyNonce
          ) {
            this.$toast.success(
              this.$t('components.registration.email-nonce.form.success', { email, nonce }),
            )
          }
        } catch (err) {
          this.sliderData.setSliderValuesCallback(false, {
            sliderData: { response: { VerifyNonce: false } },
          })

          const { message } = err
          this.$toast.error(message)
        }
      }
    },
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
