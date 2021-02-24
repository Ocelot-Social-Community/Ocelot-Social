<template>
  <ds-space v-if="!data && !error" margin="large">
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
    </ds-form>
  </ds-space>
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
  </div>
</template>

<script>
import gql from 'graphql-tag'
import metadata from '~/constants/metadata'
import { isEmail } from 'validator'
import normalizeEmail from '~/components/utils/NormalizeEmail'
import { SweetalertIcon } from 'vue-sweetalert-icons'

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
    SweetalertIcon,
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
      // Wolle disabled: true,
      data: null,
      error: null,
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered
      this.formData.email = this.sliderData.collectedInputData.email
        ? this.sliderData.collectedInputData.email
        : ''
      this.sendValidation()
    })
  },
  computed: {
    submitMessage() {
      const { email } = this.data.Signup
      return this.$t('components.registration.signup.form.success', { email })
    },
    sliderIndex() {
      return this.sliderData.sliderIndex
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
      const value = { email }

      let validated = false
      if (this.validInput) {
        await this.handleSubmitVerify()
        if (this.sliderData.sliders[this.sliderIndex].data.response) {
          const {email: respnseEmail} = this.sliderData.sliders[this.sliderIndex].data.response.Signup || this.sliderData.sliders[this.sliderIndex].data.response.SignupByInvitation
          validated = (email === respnseEmail)
        }
      }
      this.sliderData.validateCallback(validated, value)
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    async handleSubmitVerify() {
      const mutation = this.token ? SignupByInvitationMutation : SignupMutation
      const { token } = this
      const { email } = this.formData
      const variables = { email, token }

      if (
        !this.sliderData.sliders[this.sliderIndex].data.request ||
        !this.sliderData.sliders[this.sliderIndex].data.request.variables ||
        (this.sliderData.sliders[this.sliderIndex].data.request.variables &&
          !this.sliderData.sliders[this.sliderIndex].data.request.variables.is(variables))
      )
      {
        this.sliderData.sliders[this.sliderIndex].data.request = { variables }

        try {
          const response = await this.$apollo.mutate({ mutation, variables })
          this.sliderData.sliders[this.sliderIndex].data.response = response.data

          if (this.sliderData.sliders[this.sliderIndex].data.response) {
            const {email: respnseEmail} = this.sliderData.sliders[this.sliderIndex].data.response.Signup || this.sliderData.sliders[this.sliderIndex].data.response.SignupByInvitation
            this.$toast.success(
              this.$t('components.registration.email.form.success', { email: respnseEmail }),
            )
          }
        } catch (err) {
          this.sliderData.sliders[this.sliderIndex].data = { request: null, response: null }

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
