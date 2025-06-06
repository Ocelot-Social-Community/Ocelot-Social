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
        <email-display-and-verify :email="sliderData.collectedInputData.email" />

        <div v-if="askForRealName" class="full-name">
          <!-- <p>{{ $t('settings.data.realNamePlease') }}</p>-->
          <ds-input
            id="givenName"
            model="givenName"
            :label="$t('settings.data.givenName')"
            :placeholder="$t('settings.data.givenNamePlaceholder')"
          />
          <ds-input
            id="surName"
            model="surName"
            :label="$t('settings.data.surName')"
            :placeholder="$t('settings.data.surNamePlaceholder')"
          />
        </div>
        <ds-input
          v-else
          id="name"
          model="name"
          :label="$t('settings.data.labelName')"
          :placeholder="$t('settings.data.namePlaceholder')"
        />
        <div class="password-wrapper">
          <ds-input
            id="password"
            model="password"
            :type="showPassword ? 'text' : 'password'"
            :label="$t('settings.security.change-password.label-new-password')"
            autocomplete="off"
            class="password-field"
            ref="password"
          />
          <show-password
            class="show-password-toggle with-label"
            @show-password="toggleShowPassword('password')"
            :iconName="iconNamePassword"
          />
        </div>
        <div class="password-wrapper">
          <ds-input
            id="passwordConfirmation"
            model="passwordConfirmation"
            :type="showPasswordConfirm ? 'text' : 'password'"
            :label="$t('settings.security.change-password.label-new-password-confirm')"
            autocomplete="off"
            class="password-field"
            ref="confirmPassword"
          />
          <show-password
            class="show-password-toggle with-label"
            @show-password="toggleShowPassword('confirmPassword')"
            :iconName="iconNamePasswordConfirm"
          />
        </div>
        <password-strength
          class="password-strength"
          :password="formData.password"
          style="margin: 30px 0 20px 0"
        />

        <!-- location -->
        <location-select
          v-if="locationRequired"
          v-model="locationName"
          :canBeCleared="false"
          :showPreviousLocation="false"
        />

        <div class="checkbox-group">
          <div class="checkbox-item">
            <input
              id="checkbox0"
              type="checkbox"
              v-model="termsAndConditionsConfirmed"
              :checked="termsAndConditionsConfirmed"
              class="checkbox-input"
            />
            <label for="checkbox0" class="checkbox-label">
              <span class="checkbox-text">
                {{ $t('components.registration.create-user-account.termsAndCondsEtcConfirmed') }}
              </span>
              <div class="checkbox-links">
                <page-params-link :pageParams="links.TERMS_AND_CONDITIONS" forceTargetBlank>
                  {{ $t('site.termsAndConditions') }}
                </page-params-link>
                <span class="separator">•</span>
                <page-params-link :pageParams="links.DATA_PRIVACY" forceTargetBlank>
                  {{ $t('site.data-privacy') }}
                </page-params-link>
              </div>
            </label>
          </div>

          <div class="checkbox-item">
            <input
              id="checkbox1"
              type="checkbox"
              v-model="receiveCommunicationAsEmailsEtcConfirmed"
              :checked="receiveCommunicationAsEmailsEtcConfirmed"
              class="checkbox-input"
            />
            <label for="checkbox1" class="checkbox-label">
              <span class="checkbox-text">
                {{
                  $t(
                    'components.registration.create-user-account.receiveCommunicationAsEmailsEtcConfirmed',
                  )
                }}
              </span>
            </label>
          </div>
        </div>
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
  padding: 0;
  height: $input-height;
  margin-top: 40px;
  margin-bottom: 16px;

  .password-field {
    width: 100%;
    padding: 0;
  }

  ::v-deep .ds-input-wrap {
    bottom: 4px;
    left: -1px;
  }
}

.full-name {
  padding-bottom: $space-small;
}

.checkbox-group {
  margin: 20px 0;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 16px;
  background-color: #f8f9fa; // Light gray background
  border-radius: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #f0f2f5; // Slightly darker on hover
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.checkbox-input {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-right: 12px;
  margin-top: 2px; // Align with first line of text
  cursor: pointer;
}

.checkbox-label {
  flex: 1;
  cursor: pointer;
  line-height: 1.5;
  color: #374151; // Dark gray text
}

.checkbox-text {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.checkbox-links {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.875rem; // Slightly smaller text for links

  .separator {
    color: #9ca3af; // Light gray separator
    font-size: 0.75rem;
  }
}
</style>
