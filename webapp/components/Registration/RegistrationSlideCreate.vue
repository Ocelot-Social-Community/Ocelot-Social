<template>
  <div v-if="response === 'success'">
    <transition name="ds-transition-fade">
      <sweetalert-icon icon="success" />
    </transition>
    <ds-text align="center" bold color="success">
      {{ $t('components.registration.create-user-account.success') }}
    </ds-text>
  </div>
  <div v-else-if="response === 'error'">
    <transition name="ds-transition-fade">
      <sweetalert-icon icon="error" />
    </transition>
    <ds-text align="center" bold color="danger">
      {{ $t('components.registration.create-user-account.error') }}
    </ds-text>
    <ds-text align="center">
      {{ $t('components.registration.create-user-account.help') }}
      <a :href="'mailto:' + supportEmail">{{ supportEmail }}</a>
    </ds-text>
    <ds-space centered>
      <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
    </ds-space>
  </div>
  <div v-else class="create-account-card">
    <!-- Wolle <ds-space margin-top="large">
      <ds-heading size="h3">
        {{ $t('components.registration.create-user-account.title') }}
      </ds-heading>
    </ds-space> -->

    <ds-form
      class="create-user-account"
      v-model="formData"
      :schema="formSchema"
      @submit="submit"
      @input="handleInput"
      @input-valid="handleInputValid"
    >
      <!-- leave this here in case the scoped variable is needed in the future nobody would remember this -->
      <!-- <template v-slot="{ errors }"> -->
      <template>
        <ds-input
          id="name"
          model="name"
          icon="user"
          :label="$t('settings.data.labelName')"
          :placeholder="$t('settings.data.namePlaceholder')"
        />
        <ds-input
          id="password"
          model="password"
          type="password"
          autocomplete="off"
          :label="$t('settings.security.change-password.label-new-password')"
        />
        <ds-input
          id="passwordConfirmation"
          model="passwordConfirmation"
          type="password"
          autocomplete="off"
          :label="$t('settings.security.change-password.label-new-password-confirm')"
        />
        <password-strength class="password-strength" :password="formData.password" />

        <email-display-and-verify :email="sliderData.collectedInputData.email" />

        <ds-text>
          <input
            id="checkbox0"
            type="checkbox"
            v-model="termsAndConditionsConfirmed"
            :checked="termsAndConditionsConfirmed"
          />
          <label for="checkbox0">
            {{ $t('components.registration.create-user-account.termsAndCondsEtcConfirmed') }}
            <br />
            <a :href="'/terms-and-conditions'" target="_blank">
              {{ $t('site.termsAndConditions') }}
            </a>
            <br />
            <a :href="'/data-privacy'" target="_blank">
              {{ $t('site.data-privacy') }}
            </a>
          </label>
        </ds-text>
        <ds-text>
          <input
            id="checkbox1"
            type="checkbox"
            v-model="recieveCommunicationAsEmailsEtcConfirmed"
            :checked="recieveCommunicationAsEmailsEtcConfirmed"
          />
          <label for="checkbox1">
            {{
              $t(
                'components.registration.create-user-account.recieveCommunicationAsEmailsEtcConfirmed',
              )
            }}
          </label>
        </ds-text>
      </template>
    </ds-form>
  </div>
</template>

<script>
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import links from '~/constants/links'
import emails from '~/constants/emails'
import PasswordStrength from '~/components/Password/Strength'
import EmailDisplayAndVerify from './EmailDisplayAndVerify'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import { SignupVerificationMutation } from '~/graphql/Registration.js'

export default {
  name: 'RegistrationSlideCreate',
  components: {
    PasswordStrength,
    EmailDisplayAndVerify,
    SweetalertIcon,
  },
  props: {
    sliderData: { type: Object, required: true },
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    return {
      links,
      supportEmail: emails.SUPPORT,
      formData: {
        name: '',
        ...passwordForm.formData,
      },
      formSchema: {
        name: {
          type: 'string',
          required: true,
          min: 3,
        },
        ...passwordForm.formSchema,
      },
      response: null, // Wolle
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      termsAndConditionsConfirmed: false,
      recieveCommunicationAsEmailsEtcConfirmed: false,
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered

      this.formData.name = this.sliderData.collectedInputData.name
        ? this.sliderData.collectedInputData.name
        : ''
      this.formData.password = this.sliderData.collectedInputData.password
        ? this.sliderData.collectedInputData.password
        : ''
      this.formData.passwordConfirmation = this.sliderData.collectedInputData.passwordConfirmation
        ? this.sliderData.collectedInputData.passwordConfirmation
        : ''
      this.termsAndConditionsConfirmed = this.sliderData.collectedInputData
        .termsAndConditionsConfirmed
        ? this.sliderData.collectedInputData.termsAndConditionsConfirmed
        : false
      this.recieveCommunicationAsEmailsEtcConfirmed = this.sliderData.collectedInputData
        .recieveCommunicationAsEmailsEtcConfirmed
        ? this.sliderData.collectedInputData.recieveCommunicationAsEmailsEtcConfirmed
        : false
      this.sendValidation()

      this.sliderData.setSliderValuesCallback(this.validInput, {
        sliderSettings: { buttonSliderCallback: this.onNextClick },
      })
    })
  },
  computed: {
    validInput() {
      return (
        this.formData.name.length >= 3 &&
        this.formData.password.length >= 1 &&
        this.formData.password === this.formData.passwordConfirmation &&
        this.termsAndConditionsConfirmed &&
        this.recieveCommunicationAsEmailsEtcConfirmed
      )
    },
  },
  watch: {
    termsAndConditionsConfirmed() {
      this.sendValidation()
    },
    recieveCommunicationAsEmailsEtcConfirmed() {
      this.sendValidation()
    },
  },
  methods: {
    sendValidation() {
      const { name, password, passwordConfirmation } = this.formData
      const { termsAndConditionsConfirmed, recieveCommunicationAsEmailsEtcConfirmed } = this

      this.sliderData.setSliderValuesCallback(this.validInput, {
        collectedInputData: {
          name,
          password,
          passwordConfirmation,
          termsAndConditionsConfirmed,
          recieveCommunicationAsEmailsEtcConfirmed,
          // dataPrivacy,
          // minimumAge,
          // noCommercial,
          // noPolitical,
        },
      })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    async submit() {
      const { name, password } = this.formData
      const { email, inviteCode = null, nonce } = this.sliderData.collectedInputData
      const termsAndConditionsAgreedVersion = VERSION
      const locale = this.$i18n.locale()
      try {
        this.sliderData.setSliderValuesCallback(null, {
          sliderSettings: { buttonLoading: true },
        })
        await this.$apollo.mutate({
          mutation: SignupVerificationMutation,
          variables: {
            name,
            password,
            email,
            inviteCode,
            nonce,
            termsAndConditionsAgreedVersion,
            locale,
          },
        })
        this.response = 'success'
        setTimeout(async () => {
          await this.$store.dispatch('auth/login', { email, password })
          this.$toast.success(this.$t('login.success'))
          this.$router.push('/')
          this.sliderData.setSliderValuesCallback(null, {
            sliderSettings: { buttonLoading: false },
          })
        }, 3000)
      } catch (err) {
        this.sliderData.setSliderValuesCallback(null, {
          sliderSettings: { buttonLoading: false },
        })
        this.response = 'error'
      }
    },
    onNextClick() {
      this.submit()
      return true
    },
  },
}
</script>

<style lang="scss" scoped>
.password-strength {
  margin-bottom: 14px;
}
</style>
