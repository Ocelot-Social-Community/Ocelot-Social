<template>
  <ds-space v-if="!data && !error" margin="large">
    <ds-form
      @input="handleInput"
      @input-valid="handleInputValid"
      v-model="formData"
      :schema="formSchema"
      @submit="handleSubmit"
    >
      <h1>
        {{
          invitation
            ? $t('profile.invites.title', metadata)
            : $t('components.registration.signup.title', metadata)
        }}
      </h1>
      <ds-space margin-botton="large">
        <ds-text>
          {{
            invitation
              ? $t('profile.invites.description')
              : $t('components.registration.signup.form.description')
          }}
        </ds-text>
      </ds-space>
      <ds-input
        :placeholder="invitation ? $t('profile.invites.emailPlaceholder') : $t('login.email')"
        type="email"
        id="email"
        model="email"
        name="email"
        icon="envelope"
      />
      <base-button
        :disabled="disabled"
        :loading="$apollo.loading"
        filled
        name="submit"
        type="submit"
        icon="envelope"
      >
        {{ $t('components.registration.signup.form.submit') }}
      </base-button>
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
import { SweetalertIcon } from 'vue-sweetalert-icons'
import translateErrorMessage from '~/components/utils/TranslateErrorMessage'

export const SignupMutation = gql`
  mutation ($email: String!, $inviteCode: String) {
    Signup(email: $email, inviteCode: $inviteCode) {
      email
    }
  }
`
export default {
  name: 'Signup',
  components: {
    SweetalertIcon,
  },
  props: {
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
      disabled: true,
      data: null,
      error: null,
    }
  },
  computed: {
    submitMessage() {
      const { email } = this.data.Signup
      return this.$t('components.registration.signup.form.success', { email })
    },
  },
  methods: {
    handleInput() {
      this.disabled = true
    },
    handleInputValid() {
      this.disabled = false
    },
    async handleSubmit() {
      const { email } = this.formData

      try {
        const response = await this.$apollo.mutate({
          mutation: SignupMutation,
          variables: { email, inviteCode: null },
        })
        this.data = response.data
        setTimeout(() => {
          this.$emit('submit', { email: this.data.Signup.email })
        }, 3000)
      } catch (err) {
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
