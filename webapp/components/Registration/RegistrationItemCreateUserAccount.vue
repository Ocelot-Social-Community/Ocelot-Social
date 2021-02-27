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
    <!-- <ds-space margin-top="large">
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
          id="about"
          model="about"
          type="textarea"
          rows="3"
          :label="$t('settings.data.labelBio')"
          :placeholder="$t('settings.data.labelBio')"
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

        <ds-text>
          <!-- Wolle {{ $t('components.enter-nonce.form.description') }} -->
          Your e-mail address:
          <b>{{ this.sliderData.collectedInputData.email }}</b>
        </ds-text>

        <ds-text>
          <input
            id="checkbox0"
            type="checkbox"
            v-model="termsAndConditionsConfirmed"
            :checked="termsAndConditionsConfirmed"
          />
          <label for="checkbox0">
            {{ $t('termsAndConditions.termsAndConditionsConfirmed') }}
            <br />
            <nuxt-link to="/terms-and-conditions">{{ $t('site.termsAndConditions') }}</nuxt-link>
          </label>
        </ds-text>
        <ds-text>
          <input id="checkbox1" type="checkbox" v-model="dataPrivacy" :checked="dataPrivacy" />
          <label for="checkbox1">
            {{ $t('components.registration.signup.form.data-privacy') }}
            <br />
            <nuxt-link to="/data-privacy">
              {{ $t('site.data-privacy') }}
            </nuxt-link>
          </label>
        </ds-text>
        <ds-text>
          <input id="checkbox2" type="checkbox" v-model="minimumAge" :checked="minimumAge" />
          <label
            for="checkbox2"
            v-html="$t('components.registration.signup.form.minimum-age')"
          ></label>
        </ds-text>
        <ds-text>
          <input id="checkbox3" type="checkbox" v-model="noCommercial" :checked="noCommercial" />
          <label
            for="checkbox3"
            v-html="$t('components.registration.signup.form.no-commercial')"
          ></label>
        </ds-text>
        <ds-text>
          <input id="checkbox4" type="checkbox" v-model="noPolitical" :checked="noPolitical" />
          <label
            for="checkbox4"
            v-html="$t('components.registration.signup.form.no-political')"
          ></label>
        </ds-text>
        <!-- Wolle <base-button
          style="float: right"
          icon="check"
          type="submit"
          filled
          :loading="$apollo.loading"
          :disabled="
            errors ||
            !termsAndConditionsConfirmed ||
            !dataPrivacy ||
            !minimumAge ||
            !noCommercial ||
            !noPolitical
          "
        >
          {{ $t('actions.save') }}
        </base-button> -->
      </template>
    </ds-form>
  </div>
</template>

<script>
import { VERSION } from '~/constants/terms-and-conditions-version.js'
import links from '~/constants/links'
import emails from '~/constants/emails'
import PasswordStrength from '../Password/Strength'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import { SignupVerificationMutation } from '~/graphql/Registration.js'

export default {
  name: 'RegistrationItemCreateUserAccount',
  components: {
    PasswordStrength,
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
        about: '',
        ...passwordForm.formData,
      },
      formSchema: {
        name: {
          type: 'string',
          required: true,
          min: 3,
        },
        about: {
          type: 'string',
          required: false,
        },
        ...passwordForm.formSchema,
      },
      response: null,
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      termsAndConditionsConfirmed: false,
      dataPrivacy: false,
      minimumAge: false,
      noCommercial: false,
      noPolitical: false,
    }
  },
  mounted: function () {
    this.$nextTick(function () {
      // Code that will run only after the entire view has been rendered
      this.formData.name = this.sliderData.collectedInputData.name
        ? this.sliderData.collectedInputData.name
        : ''
      this.formData.about = this.sliderData.collectedInputData.about
        ? this.sliderData.collectedInputData.about
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
      this.dataPrivacy = this.sliderData.collectedInputData.dataPrivacy
        ? this.sliderData.collectedInputData.dataPrivacy
        : false
      this.minimumAge = this.sliderData.collectedInputData.minimumAge
        ? this.sliderData.collectedInputData.minimumAge
        : false
      this.noCommercial = this.sliderData.collectedInputData.noCommercial
        ? this.sliderData.collectedInputData.noCommercial
        : false
      this.noPolitical = this.sliderData.collectedInputData.noPolitical
        ? this.sliderData.collectedInputData.noPolitical
        : false
      this.sendValidation()

      // Wolle this.sliderData.setSliderValuesCallback(this.validInput, {}, {}, this.onNextClick)
      this.sliderData.setSliderValuesCallback(this.valid, {}, this.onNextClick)
    })
  },
  computed: {
    valid() {
      const isValid =
        this.formData.name.length >= 3 &&
        this.formData.password.length >= 1 &&
        this.formData.password === this.formData.passwordConfirmation &&
        this.termsAndConditionsConfirmed &&
        this.dataPrivacy &&
        this.minimumAge &&
        this.noCommercial &&
        this.noPolitical
      return isValid
    },
  },
  watch: {
    termsAndConditionsConfirmed() {
      this.sendValidation()
    },
    dataPrivacy() {
      this.sendValidation()
    },
    minimumAge() {
      this.sendValidation()
    },
    noCommercial() {
      this.sendValidation()
    },
    noPolitical() {
      this.sendValidation()
    },
  },
  methods: {
    sendValidation() {
      const { name, about, password, passwordConfirmation } = this.formData
      const termsAndConditionsAgreedVersion = VERSION
      const {
        termsAndConditionsConfirmed,
        dataPrivacy,
        minimumAge,
        noCommercial,
        noPolitical,
      } = this
      const locale = this.$i18n.locale()
      const values = {
        name,
        about,
        password,
        passwordConfirmation,
        termsAndConditionsAgreedVersion,
        termsAndConditionsConfirmed,
        dataPrivacy,
        minimumAge,
        noCommercial,
        noPolitical,
        locale,
      }
      // Wolle validate in backend
      // toaster
      this.sliderData.setSliderValuesCallback(this.valid, { collectedInputData: values })
    },
    async handleInput() {
      this.sendValidation()
    },
    async handleInputValid() {
      this.sendValidation()
    },
    async submit() {
      const { name, password, about } = this.formData
      // Wolle const { email, nonce } = this
      const { email, nonce } = this.sliderData.collectedInputData
      const termsAndConditionsAgreedVersion = VERSION
      const locale = this.$i18n.locale()
      try {
        await this.$apollo.mutate({
          mutation: SignupVerificationMutation,
          variables: {
            name,
            password,
            about,
            email,
            nonce,
            termsAndConditionsAgreedVersion,
            locale,
          },
        })
        this.response = 'success'
        setTimeout(() => {
          this.$emit('userCreated', {
            email,
            password,
          })
        }, 3000)
      } catch (err) {
        this.response = 'error'
      }
    },
    onNextClick() {
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
