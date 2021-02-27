<template>
  <!-- Wolle <ds-space v-if="!data && !error" margin="large"> -->
  <ds-form
    v-model="formData"
    :schema="formSchema"
    @input="handleInput"
    @input-valid="handleInputValid"
  >
    <!-- Wolle <h1>
        {{
          invitation
            ? $t('profile.invites.title', metadata)
            : $t('components.registration.signup.title', metadata)
        }}
      </h1> -->
    <ds-text
      v-if="token"
      v-html="$t('registration.signup.form.invitation-code', { code: token })"
    />
    <ds-text>
      {{
        invitation
          ? $t('profile.invites.description')
          : $t('components.registration.signup.form.description')
      }}
    </ds-text>
    <ds-input
      :placeholder="invitation ? $t('profile.invites.emailPlaceholder') : $t('login.email')"
      type="email"
      id="email"
      model="email"
      name="email"
      icon="envelope"
    />
    <!-- Wolle <base-button
        :disabled="disabled"
        :loading="$apollo.loading"
        filled
        name="submit"
        type="submit"
        icon="envelope"
      >
        {{ $t('components.registration.signup.form.submit') }}
      </base-button> -->
    <slot></slot>
    <ds-text v-if="sliderData.collectedInputData.emailSend">
      <!-- Wolle <ds-text v-if="sliderData.collectedInputData.emailSend"> -->
      <input id="checkbox" type="checkbox" v-model="sendEmailAgain" :checked="sendEmailAgain" />
      <label for="checkbox0">
        <!-- Wolle {{ $t('termsAndConditions.termsAndConditionsConfirmed') }} -->
        {{ 'Send e-mail again' }}
      </label>
    </ds-text>
  </ds-form>
  <!-- Wolle </ds-space>
  <div v-else margin="large">
    <template v-if="!error">
      <transition name="ds-transition-fade">
        <sweetalert-icon icon="info" />
      </transition>
      <ds-text align="center" v-html="submitMessage" />
    </template>
    <template v-else>
      <transition name="ds-transition-fade">
        <sweetalert-icon icon="error" />
      </transition>
      <ds-text align="center">{{ error.message }}</ds-text>
      <ds-space centered class="space-top">
        <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
      </ds-space>
    </template>
  </div> -->
</template>

<script>
import gql from 'graphql-tag'
import metadata from '~/constants/metadata'
import { isEmail } from 'validator'
import normalizeEmail from '~/components/utils/NormalizeEmail'
// Wolle import { SweetalertIcon } from 'vue-sweetalert-icons'

export const SignupMutation = gql`
  mutation($email: String!) {
    Signup(email: $email) {
      email
    }
  }
`
export const SignupByInvitationMutation = gql`
  mutation($email: String!, $token: String!) {
    SignupByInvitation(email: $email, token: $token) {
      email
    }
  }
`
export default {
  name: 'RegistrationItemEnterEmail',
  components: {
    // Wolle SweetalertIcon,
  },
  props: {
    sliderData: { type: Object, required: true },
    token: { type: String, default: null }, // Wolle not used???
    invitation: { type: Boolean, default: false },
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
      // Wolle disabled: true,
      // Wolle data: null,
      error: null, // Wolle
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
      return this.sliderData.sliderIndex
    },
    // Wolle submitMessage() {
    //   const { email } = this.data.Signup
    //   return this.$t('components.registration.signup.form.success', { email })
    // },
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
      const values = { email }

      this.sliderData.setSliderValuesCallback(this.validInput, { collectedInputData: values })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    // enterEmailButtonTitle(emailSend) {
    //   // return emailSend ? 'Resend e-mail' : 'Send e-mail'
    //   return emailSend ? (this.sendEmailAgain ? 'Resend e-mail' : 'Skip resend') : 'Send e-mail' // Wolle
    // },
    // enterEmailButtonIcon(emailSend) {
    //   // return emailSend ? 'Resend e-mail' : 'Send e-mail'
    //   return emailSend ? (this.sendEmailAgain ? 'envelope' : 'arrow-right') : 'envelope' // Wolle
    // },
    buttonValues() {
      return {
        sliderSettings: {
          // buttonTitle: this.enterEmailButtonTitle(this.sliderData.collectedInputData.emailSend),
          // buttonIcon: this.enterEmailButtonIcon(this.sliderData.collectedInputData.emailSend),
          buttonTitle: this.sliderData.collectedInputData.emailSend
            ? this.sendEmailAgain
              ? 'Resend e-mail'
              : 'Skip resend'
            : 'Send e-mail', // Wolle
          buttonIcon: this.sliderData.collectedInputData.emailSend
            ? this.sendEmailAgain
              ? 'envelope'
              : 'arrow-right'
            : 'envelope', // Wolle
        },
      }
    },
    setButtonValues() {
      this.sliderData.setSliderValuesCallback(this.validInput, this.buttonValues())
    },
    async onNextClick() {
      const mutation = this.token ? SignupByInvitationMutation : SignupMutation
      const { token } = this
      const { email } = this.formData
      const variables = { email, token }

      if (!this.sendEmailAgain && this.sliderData.collectedInputData.emailSend) {
        return true
      }

      if (
        this.sendEmailAgain ||
        !this.sliderData.sliders[this.sliderIndex].data.request ||
        (this.sliderData.sliders[this.sliderIndex].data.request &&
          !this.sliderData.sliders[this.sliderIndex].data.request.variables) ||
        (this.sliderData.sliders[this.sliderIndex].data.request &&
          this.sliderData.sliders[this.sliderIndex].data.request.variables &&
          !this.sliderData.sliders[this.sliderIndex].data.request.variables === variables)
      ) {
        this.sliderData.setSliderValuesCallback(
          this.sliderData.sliders[this.sliderIndex].validated,
          { sliderData: { request: { variables }, response: null } },
        )

        try {
          const response = await this.$apollo.mutate({ mutation, variables }) // e-mail is send in emailMiddleware of backend
          this.sliderData.setSliderValuesCallback(
            this.sliderData.sliders[this.sliderIndex].validated,
            { sliderData: { response: response.data } },
          )

          if (this.sliderData.sliders[this.sliderIndex].data.response) {
            // this.sliderData.collectedInputData.emailSend = true
            this.sliderData.setSliderValuesCallback(this.validInput, {
              collectedInputData: { emailSend: true },
            })
            this.setButtonValues()

            const { email: respnseEmail } =
              this.sliderData.sliders[this.sliderIndex].data.response.Signup ||
              this.sliderData.sliders[this.sliderIndex].data.response.SignupByInvitation
            this.$toast.success(
              this.$t('components.registration.email.form.success', { email: respnseEmail }),
            )
          }
          return true
        } catch (err) {
          this.sliderData.setSliderValuesCallback(
            this.sliderData.sliders[this.sliderIndex].validated,
            { sliderData: { request: null, response: null } },
          )
          // this.sliderData.collectedInputData.emailSend = false
          this.sliderData.setSliderValuesCallback(this.validInput, {
            collectedInputData: { emailSend: false },
          })
          this.setButtonValues()

          const { message } = err
          const mapping = {
            'A user account with this email already exists': 'email-exists',
            'Invitation code already used or does not exist': 'invalid-invitation-token',
          }
          for (const [pattern, key] of Object.entries(mapping)) {
            if (message.includes(pattern))
              this.error = {
                key,
                message: this.$t(`components.registration.signup.form.errors.${key}`),
              }
          }
          if (!this.error) {
            this.$toast.error(message)
          }
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
