<template>
  <ds-form
    v-if="!submitted"
    @input="handleInput"
    @input-valid="handleInputValid"
    v-model="formData"
    :schema="formSchema"
    @submit="handleSubmit"
  >
    <ds-space margin="small">
      <ds-input
        :placeholder="$t('login.email')"
        type="email"
        id="email"
        model="email"
        name="email"
        icon="envelope"
      />
    </ds-space>
    <ds-space margin-botton="large">
      <ds-text align="left">{{ $t('components.password-reset.request.form.description') }}</ds-text>
    </ds-space>
    <base-button
      :disabled="disabled"
      :loading="$apollo.loading"
      filled
      name="submit"
      type="submit"
      icon="envelope"
    >
      {{ $t('components.password-reset.request.form.submit') }}
    </base-button>
    <slot></slot>
  </ds-form>
  <div v-else>
    <transition name="ds-transition-fade">
      <ds-flex centered>
        <sweetalert-icon icon="info" />
      </ds-flex>
    </transition>
    <ds-text v-html="submitMessage" align="left" />
  </div>
</template>

<script>
import gql from 'graphql-tag'
import { SweetalertIcon } from 'vue-sweetalert-icons'

export default {
  components: {
    SweetalertIcon,
  },
  data() {
    return {
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
      submitted: false,
    }
  },
  computed: {
    submitMessage() {
      const email = this.formData.email
      return this.$t('components.password-reset.request.form.submitted', { email })
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
      const mutation = gql`
        mutation ($email: String!, $locale: String!) {
          requestPasswordReset(email: $email, locale: $locale)
        }
      `
      try {
        const email = this.formData.email
        await this.$apollo.mutate({ mutation, variables: { email, locale: this.$i18n.locale() } })
        this.submitted = true

        setTimeout(() => {
          this.$emit('handleSubmitted', { email })
        }, 3000)
      } catch (err) {
        this.$toast.error(err.message)
      }
    },
  },
}
</script>
