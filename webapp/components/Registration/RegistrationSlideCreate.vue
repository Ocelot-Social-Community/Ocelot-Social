<template>
  <div v-if="response === 'success'">
    <transition name="ds-transition-fade">
      <sweetalert-icon icon="success" />
    </transition>
    <ds-text align="center" bold color="success">
      {{ $t('components.registration.create-user-account.success') }}
    </ds-text>
    <ds-space margin="xxx-small" />
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
    <ds-space margin="xxx-small" />
  </div>
  <div v-else class="create-account-card">
    <ds-form
      class="create-user-account"
      v-model="formData"
      :schema="formSchema"
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
        <label for="password">
          {{ $t('settings.security.change-password.label-new-password') }}
        </label>
        <div class="password-wrapper">
          <ds-input
            id="password"
            model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="off"
            class="password-field"
            ref="password"
          />
          <show-password
            @show-password="toggleShowPassword('password')"
            :iconName="iconNamePassword"
          />
        </div>
        <label for="passwordConfirmation">
          {{ $t('settings.security.change-password.label-new-password-confirm') }}
        </label>
        <div class="password-wrapper">
          <ds-input
            id="passwordConfirmation"
            model="passwordConfirmation"
            :type="showPasswordConfirm ? 'text' : 'password'"
            autocomplete="off"
            class="password-field"
            ref="confirmPassword"
          />
          <show-password
            @show-password="toggleShowPassword('confirmPassword')"
            :iconName="iconNamePasswordConfirm"
          />
        </div>
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
            <page-params-link :pageParams="links.TERMS_AND_CONDITIONS">
              {{ $t('site.termsAndConditions') }}
            </page-params-link>
            <br />
            <page-params-link :pageParams="links.DATA_PRIVACY">
              {{ $t('site.data-privacy') }}
            </page-params-link>
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
      <ds-space margin="xxx-small" />
    </ds-form>
  </div>
</template>

<script>
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import links from '~/constants/links'
import emails from '~/constants/emails'
import { SignupVerificationMutation } from '~/graphql/Registration.js'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import PasswordStrength from '~/components/Password/Strength'
import EmailDisplayAndVerify from './EmailDisplayAndVerify'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import ShowPassword from '../ShowPassword/ShowPassword.vue'

export default {
  name: 'RegistrationSlideCreate',
  components: {
    EmailDisplayAndVerify,
    PageParamsLink,
    PasswordStrength,
    ShowPassword,
    SweetalertIcon,
  },
  props: {
    sliderData: { type: Object, required: true },
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    return {
      links,
      supportEmail: emails.SUPPORT_EMAIL,
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
      response: null,
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      termsAndConditionsConfirmed: false,
      recieveCommunicationAsEmailsEtcConfirmed: false,
      showPassword: false,
      showPasswordConfirm: false,
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
    iconNamePassword() {
      return this.showPassword ? 'eye-slash' : 'eye'
    },
    iconNamePasswordConfirm() {
      return this.showPasswordConfirm ? 'eye-slash' : 'eye'
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
    toggleShowPassword(e) {
      if (e === 'password') {
        this.showPassword = !this.showPassword
        this.$nextTick(() => {
          this.$refs.password.$el.children[1].children[0].focus()
          this.$emit('focus')
        })
      } else {
        this.showPasswordConfirm = !this.showPasswordConfirm
        this.$nextTick(() => {
          this.$refs.confirmPassword.$el.children[1].children[0].focus()
          this.$emit('focus')
        })
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.password-strength {
  margin-bottom: 14px;
}

.password-wrapper {
  display: flex;
  width: 100%;
  align-items: center;
  padding: $input-padding-vertical $space-x-small;
  padding-left: 0;
  padding-right: 0;
  height: $input-height;
  margin-bottom: 10px;
  margin-bottom: 16px;

  color: $text-color-base;
  background: $background-color-disabled;

  border: $input-border-size solid $border-color-softer;
  border-left: none;
  border-radius: $border-radius-base;
  outline: none;
  transition: all $duration-short $ease-out;

  &:focus-within {
    background-color: $background-color-base;
    border: $input-border-size solid $border-color-active;

    .toggle-icon {
      color: $text-color-base;
    }
  }

  .password-field {
    position: relative;
    padding-top: 16px;
    border: none;
    border-style: none;
    appearance: none;
    margin-left: 0;
    width: 100%;
  }
}
</style>
