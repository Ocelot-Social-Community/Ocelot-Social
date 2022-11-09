<template>
  <ds-form
    class="enter-email"
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <ds-text>
      {{ $t('components.registration.signup.form.description') }}
    </ds-text>
    <ds-input
      :placeholder="$t('login.email')"
      type="email"
      id="email"
      model="email"
      name="email"
      icon="envelope"
    />
    <slot></slot>
    <ds-text v-if="sliderData.collectedInputData.emailSend">
      <input id="checkbox" type="checkbox" v-model="sendEmailAgain" :checked="sendEmailAgain" />
      <label for="checkbox0">
        {{ $t('components.registration.email.form.sendEmailAgain') }}
      </label>
    </ds-text>
    <ds-space margin="xxx-small" />
  </ds-form>
</template>

<script>
import gql from 'graphql-tag'
import metadata from '~/constants/metadata'
import { isEmail } from 'validator'
import normalizeEmail from '~/components/utils/NormalizeEmail'
import translateErrorMessage from '~/components/utils/TranslateErrorMessage'

export const SignupMutation = gql`
  mutation ($email: String!, $inviteCode: String) {
    Signup(email: $email, inviteCode: $inviteCode) {
      email
    }
  }
`
export default {
  name: 'RegistrationSlideEmail',
  props: {
    sliderData: { type: Object, required: true },
  },
  data() {
    return {
      metadata,
      formData: {
        email: '',
      },
      formSchema: {
        email: {
          type: 'email',
          required: true,
          message: this.$t('common.validations.email'),
        },
      },
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      sendEmailAgain: false,
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered

      this.formData.email = this.sliderData.collectedInputData.email
        ? this.sliderData.collectedInputData.email
        : ''
      this.sendValidation()

      this.sliderData.setSliderValuesCallback(this.validInput, {
        sliderSettings: {
          ...this.buttonValues().sliderSettings,
          buttonSliderCallback: this.onNextClick,
        },
      })
    })
  },
  watch: {
    sendEmailAgain() {
      this.setButtonValues()
    },
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex // to have a shorter notation
    },
    validInput() {
      return isEmail(this.formData.email)
    },
  },
  methods: {
    async sendValidation() {
      if (this.formData.email && isEmail(this.formData.email)) {
        this.formData.email = normalizeEmail(this.formData.email)
      }
      const { email } = this.formData

      this.sliderData.setSliderValuesCallback(this.validInput, { collectedInputData: { email } })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    buttonValues() {
      return {
        sliderSettings: {
          buttonTitleIdent: this.sliderData.collectedInputData.emailSend
            ? this.sendEmailAgain
              ? 'components.registration.email.buttonTitle.resend'
              : 'components.registration.email.buttonTitle.skipResend'
            : 'components.registration.email.buttonTitle.send',
          buttonIcon: this.sliderData.collectedInputData.emailSend
            ? this.sendEmailAgain
              ? 'envelope'
              : 'arrow-right'
            : 'envelope',
        },
      }
    },
    setButtonValues() {
      this.sliderData.setSliderValuesCallback(this.validInput, this.buttonValues())
    },
    isVariablesRequested(variables) {
      return (
        this.sliderData.sliders[this.sliderIndex].data.request &&
        this.sliderData.sliders[this.sliderIndex].data.request.variables &&
        this.sliderData.sliders[this.sliderIndex].data.request.variables.email === variables.email
      )
    },
    async onNextClick() {
      const { email } = this.formData
      const { inviteCode = null } = this.sliderData.collectedInputData
      const variables = { email, inviteCode }

      if (this.sliderData.collectedInputData.emailSend && !this.sendEmailAgain) {
        return true
      }

      if (
        !this.sliderData.collectedInputData.emailSend ||
        this.sendEmailAgain ||
        !this.isVariablesRequested(variables)
      ) {
        try {
          this.sliderData.setSliderValuesCallback(null, {
            sliderSettings: { buttonLoading: true },
          })
          const response = await this.$apollo.mutate({ mutation: SignupMutation, variables }) // e-mail is send in loginMiddleware of backend
          this.sliderData.setSliderValuesCallback(null, {
            sliderData: { request: { variables }, response: response.data },
          })

          if (this.sliderData.sliders[this.sliderIndex].data.response) {
            this.sliderData.setSliderValuesCallback(this.validInput, {
              collectedInputData: { emailSend: true },
            })
            this.setButtonValues()

            const { email: responseEmail } =
              this.sliderData.sliders[this.sliderIndex].data.response.Signup
            this.$toast.success(
              this.$t('components.registration.email.form.success', { email: responseEmail }),
            )
          }
          this.sliderData.setSliderValuesCallback(null, {
            sliderSettings: { buttonLoading: false },
          })
          return true
        } catch (err) {
          this.sliderData.setSliderValuesCallback(this.validInput, {
            sliderData: { request: null, response: null },
            collectedInputData: { emailSend: false },
            sliderSettings: { buttonLoading: false },
          })
          this.setButtonValues()

          this.$toast.error(
            translateErrorMessage(
              err.message,
              {
                'A user account with this email already exists':
                  'components.registration.signup.form.errors.email-exists',
              },
              this.$t,
            ),
          )
          return false
        }
      }
    },
  },
}
</script>
<style>
.space-top {
  margin-top: 6ex;
}
</style>
