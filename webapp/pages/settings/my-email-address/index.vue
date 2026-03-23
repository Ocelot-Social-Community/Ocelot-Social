<template>
  <os-card v-if="data">
    <transition name="ds-transition-fade">
      <sweetalert-icon icon="info" />
    </transition>
    <p class="ds-text" v-html="submitMessage" />
  </os-card>
  <form v-else @submit.prevent="onSubmit" novalidate>
    <os-card>
      <h2 class="title">{{ $t('settings.email.name') }}</h2>
      <ocelot-input id="email" model="email" icon="envelope" :label="$t('settings.email.labelEmail')" />
      <div class="ds-mb-large backendErrors" v-if="backendErrors">
        <p class="ds-text ds-text-center ds-text-bold ds-text-danger">
          {{ backendErrors.message }}
        </p>
      </div>
      <os-button
        :disabled="!!formErrors"
        :loading="loadingData"
        type="submit"
        variant="primary"
        appearance="filled"
      >
        <template #icon><os-icon :icon="icons.check" /></template>
        {{ $t('actions.save') }}
      </os-button>
    </os-card>
  </form>
</template>

<script>
import { mapGetters } from 'vuex'
import { OsButton, OsCard, OsIcon } from '@ocelot-social/ui'
import { iconRegistry } from '~/utils/iconRegistry'
import { AddEmailAddressMutation } from '~/graphql/EmailAddress.js'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import scrollToContent from '../scroll-to-content.js'
import formValidation from '~/mixins/formValidation'
import OcelotInput from '~/components/OcelotInput/OcelotInput.vue'

export default {
  mixins: [scrollToContent, formValidation],
  components: {
    OsButton,
    OsCard,
    OsIcon,
    SweetalertIcon,
    OcelotInput,
  },
  created() {
    this.icons = iconRegistry
  },
  data() {
    return {
      backendErrors: null,
      data: null,
      loadingData: false,
      formData: {
        email: '',
      },
    }
  },
  mounted() {
    this.formData.email = this.currentUser.email || ''
  },
  computed: {
    submitMessage() {
      const { email } = this.data.AddEmailAddress
      return this.$t('settings.email.submitted', { email })
    },
    ...mapGetters({
      currentUser: 'auth/user',
    }),
    formSchema() {
      const currentEmail = this.currentUser.email
      const sameEmailValidationError = this.$t('settings.email.validation.same-email')
      return {
        email: [
          { type: 'email', required: true },
          {
            validator(rule, value, callback, source, options) {
              const errors = []
              if (currentEmail === value) {
                errors.push(sameEmailValidationError)
              }
              return errors
            },
          },
        ],
      }
    },
  },
  methods: {
    onSubmit() {
      this.formSubmit(this.submit)
    },
    async submit() {
      this.loadingData = true
      const { email } = this.formData
      try {
        const response = await this.$apollo.mutate({
          mutation: AddEmailAddressMutation,
          variables: { email },
        })
        this.data = response.data
        this.$toast.success(this.$t('settings.email.success'))

        setTimeout(() => {
          this.$router.push({
            path: 'my-email-address/enter-nonce',
            query: { email: this.data.AddEmailAddress.email },
          })
        }, 3000)
      } catch (err) {
        if (err.message.includes('exists')) {
          // We cannot use form validation errors here, the backend does not
          // have a query to filter for email addresses. This is a privacy
          // consideration. We could implement a dedicated query to check that
          // but I think it's too much effort for this feature.
          this.backendErrors = {
            message: this.$t('components.registration.signup.form.errors.email-exists'),
          }
          return
        }
        this.$toast.error(err.message)
      } finally {
        this.loadingData = false
      }
    },
  },
}
</script>
