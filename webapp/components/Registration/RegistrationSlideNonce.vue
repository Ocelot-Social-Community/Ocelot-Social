<template>
  <ds-form
    class="enter-nonce"
    v-model="formData"
    :schema="formSchema"
    @submit="handleSubmitVerify"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <email-display-and-verify :email="sliderData.collectedInputData.email" />
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
    <slot></slot>
    <ds-space margin="xxx-small" />
  </ds-form>
</template>

<script>
import gql from 'graphql-tag'
import { isEmail } from 'validator'
import CONSTANTS_REGISTRATION from './../../constants/registration'

import EmailDisplayAndVerify from './EmailDisplayAndVerify'

export const verifyNonceQuery = gql`
  query ($email: String!, $nonce: String!) {
    VerifyNonce(email: $email, nonce: $nonce)
  }
`
export default {
  name: 'RegistrationSlideNonce',
  components: {
    EmailDisplayAndVerify,
  },
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
          min: CONSTANTS_REGISTRATION.NONCE_LENGTH,
          max: CONSTANTS_REGISTRATION.NONCE_LENGTH,
          required: true,
          message: this.$t('components.registration.email-nonce.form.validations.length', {
            nonceLength: CONSTANTS_REGISTRATION.NONCE_LENGTH,
          }),
        },
      },
      dbRequestInProgress: false,
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
    isEmailFormat() {
      return isEmail(this.sliderData.collectedInputData.email)
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

      if (!this.isVariablesRequested(variables) && !this.dbRequestInProgress) {
        try {
          this.dbRequestInProgress = true

          const response = await this.$apollo.query({ query: verifyNonceQuery, variables })
          this.sliderData.setSliderValuesCallback(null, {
            sliderData: { request: { variables }, response: response.data },
          })

          if (this.sliderData.sliders[this.sliderIndex].data.response) {
            if (this.sliderData.sliders[this.sliderIndex].data.response.VerifyNonce) {
              this.$toast.success(
                this.$t('components.registration.email-nonce.form.validations.success', {
                  email,
                  nonce,
                }),
              )
            } else {
              this.$toast.error(
                this.$t('components.registration.email-nonce.form.validations.error', {
                  email,
                  nonce,
                }),
              )
            }
          }
        } catch (err) {
          this.sliderData.setSliderValuesCallback(false, {
            sliderData: { response: { VerifyNonce: false } },
          })

          const { message } = err
          this.$toast.error(message)
        } finally {
          this.dbRequestInProgress = false
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
