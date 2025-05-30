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
        <div v-if="askForRealName" class="full-name">
          <!-- <p>{{ $t('settings.data.realNamePlease') }}</p>-->
          <ds-input
            id="givenName"
            model="givenName"
            icon="user"
            :label="$t('settings.data.givenName')"
            :placeholder="$t('settings.data.givenNamePlaceholder')"
          />
          <ds-input
            id="surName"
            model="surName"
            icon="user"
            :label="$t('settings.data.surName')"
            :placeholder="$t('settings.data.surNamePlaceholder')"
          />
        </div>
        <ds-input
          v-else
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

        <!-- location -->
        <location-select v-if="locationRequired" class="location-select" v-model="locationName" />

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
            <page-params-link :pageParams="links.TERMS_AND_CONDITIONS" forceTargetBlank>
              {{ $t('site.termsAndConditions') }}
            </page-params-link>
            <br />
            <page-params-link :pageParams="links.DATA_PRIVACY" forceTargetBlank>
              {{ $t('site.data-privacy') }}
            </page-params-link>
          </label>
        </ds-text>
        <ds-text>
          <input
            id="checkbox1"
            type="checkbox"
            v-model="receiveCommunicationAsEmailsEtcConfirmed"
            :checked="receiveCommunicationAsEmailsEtcConfirmed"
          />
          <label for="checkbox1">
            {{
              $t(
                'components.registration.create-user-account.receiveCommunicationAsEmailsEtcConfirmed',
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
import LocationSelect from '~/components/Select/LocationSelect'

const threePerEmSpace = ' ' // unicode u+2004;

export default {
  name: 'RegistrationSlideCreate',
  components: {
    EmailDisplayAndVerify,
    PageParamsLink,
    PasswordStrength,
    ShowPassword,
    SweetalertIcon,
    LocationSelect,
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
        givenName: '',
        surName: '',
        name: '',
        ...passwordForm.formData,
      },
      formSchema: {
        givenName: {
          type: 'string',
          required: this.$env.ASK_FOR_REAL_NAME,
          min: 2,
        },
        surName: {
          type: 'string',
          required: this.$env.ASK_FOR_REAL_NAME,
          min: 2,
        },
        name: {
          type: 'string',
          required: !this.$env.ASK_FOR_REAL_NAME,
          min: 3,
        },
        ...passwordForm.formSchema,
      },
      response: null,
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      locationName: '',
      termsAndConditionsConfirmed: false,
      receiveCommunicationAsEmailsEtcConfirmed: false,
      showPassword: false,
      showPasswordConfirm: false,
    }
  },
  mounted: function () {
    if (this.askForRealName) {
      if (this.sliderData.collectedInputData.name) {
        const split = this.sliderData.collectedInputData.name.split(threePerEmSpace)
        this.formData.givenName = split[0]
        this.formData.surName = split[1] || ''
      } else {
        this.formData.surName = ''
        this.formData.givenName = ''
      }
    } else {
      this.formData.name = this.sliderData.collectedInputData.name || ''
    }
    this.formData.password = this.sliderData.collectedInputData.password || ''
    this.formData.passwordConfirmation =
      this.sliderData.collectedInputData.passwordConfirmation || ''
    this.termsAndConditionsConfirmed =
      this.sliderData.collectedInputData.termsAndConditionsConfirmed || false
    this.receiveCommunicationAsEmailsEtcConfirmed =
      this.sliderData.collectedInputData.receiveCommunicationAsEmailsEtcConfirmed || false
    this.locationName = this.sliderData.collectedInputData.locationName || ''
    this.sendValidation()

    this.sliderData.setSliderValuesCallback(this.validInput, {
      sliderSettings: { buttonSliderCallback: this.onNextClick },
    })
  },
  computed: {
    formLocationName() {
      // toDo: Mixin or move it to location select component
      const isNestedValue =
        typeof this.locationName === 'object' && typeof this.locationName.value === 'string'
      const isDirectString = typeof this.locationName === 'string'
      return isNestedValue ? this.locationName.value : isDirectString ? this.locationName : ''
    },
    locationRequired() {
      return this.$env.REQUIRE_LOCATION
    },
    askForRealName() {
      return this.$env.ASK_FOR_REAL_NAME
    },
    validInput() {
      return (
        (this.askForRealName
          ? this.formData.givenName.length >= 2 && this.formData.surName.length >= 2
          : this.formData.name.length >= 3) &&
        this.formData.password.length >= 1 &&
        this.formData.password === this.formData.passwordConfirmation &&
        this.termsAndConditionsConfirmed &&
        this.receiveCommunicationAsEmailsEtcConfirmed &&
        (this.locationRequired ? this.formLocationName : true)
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
    receiveCommunicationAsEmailsEtcConfirmed() {
      this.sendValidation()
    },
    locationName() {
      this.sendValidation()
    },
  },
  methods: {
    buildName(data) {
      if (this.askForRealName) return `${data.givenName}${threePerEmSpace}${data.surName}`
      return data.name
    },
    sendValidation() {
      const { password, passwordConfirmation } = this.formData
      const name = this.buildName(this.formData)
      const { termsAndConditionsConfirmed, receiveCommunicationAsEmailsEtcConfirmed } = this
      const locationName = this.formLocationName

      this.sliderData.setSliderValuesCallback(this.validInput, {
        collectedInputData: {
          name,
          password,
          passwordConfirmation,
          termsAndConditionsConfirmed,
          receiveCommunicationAsEmailsEtcConfirmed,
          locationName,
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
      const { password } = this.formData
      const name = this.buildName(this.formData).replace(threePerEmSpace, ' ')
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
            locationName: this.formLocationName,
          },
        })
        this.response = 'success'
        setTimeout(async () => {
          await this.$store.dispatch('auth/login', { email, password })
          this.$toast.success(this.$t('login.success'))
          const { validateInviteCode } = this.sliderData.sliders[0].data.response
          if (
            validateInviteCode &&
            validateInviteCode.invitedTo &&
            validateInviteCode.invitedTo.groupType === 'public'
          ) {
            const { invitedTo } = validateInviteCode
            this.$router.push(`/groups/${invitedTo.slug}`)
          } else {
            this.$router.push('/')
          }
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

.full-name {
  padding-bottom: 16px;
}

.location-select {
  padding-bottom: 16px;
}
</style>
