<template>
  <form v-if="!submitted" @submit.prevent="onSubmit" novalidate>
    <div class="ds-my-small">
      <ocelot-input
        :placeholder="$t('login.email')"
        type="email"
        id="email"
        model="email"
        name="email"
        icon="envelope"
      />
    </div>
    <div class="ds-mb-large">
      <p class="ds-text ds-text-left">
        {{ $t('components.password-reset.request.form.description') }}
      </p>
    </div>
    <os-button
      variant="primary"
      appearance="filled"
      :disabled="disabled"
      :loading="$apollo.loading"
      type="submit"
    >
      {{ $t('components.password-reset.request.form.submit') }}
    </os-button>
    <slot></slot>
  </form>
  <div v-else>
    <transition name="ds-transition-fade">
      <div class="ds-flex ds-flex-centered">
        <sweetalert-icon icon="info" />
      </div>
    </transition>
    <p class="ds-text ds-text-left" v-html="submitMessage" />
  </div>
</template>

<script>
import { OsButton } from '@ocelot-social/ui'
import gql from 'graphql-tag'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  mixins: [formValidation],
  components: {
    OsButton,
    SweetalertIcon,
    OcelotInput,
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
    onSubmit() {
      this.formSubmit(this.handleSubmit)
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
