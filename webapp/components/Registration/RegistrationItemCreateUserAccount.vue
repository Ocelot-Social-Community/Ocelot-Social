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

    <ds-form class="create-user-account" v-model="formData" :schema="formSchema" @submit="submit">
      <template v-slot="{ errors }">
      <!-- <template> -->
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
        <password-strength :password="formData.password" />

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
        <!-- this is neccessary to have the 'errors' status as 'formErrors' in Javascript. I didn't found another way yet -->
        <watch-scoped-slots-callback :scopedData="{ errors }" :changeCallback="watchScopedSlotsCallback"></watch-scoped-slots-callback>
        <!-- <base-button
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
import WatchScopedSlotsCallback from './WatchScopedSlotsCallback'
import PasswordStrength from '../Password/Strength'
import { SweetalertIcon } from 'vue-sweetalert-icons'
import PasswordForm from '~/components/utils/PasswordFormHelper'
import { SignupVerificationMutation } from '~/graphql/Registration.js'

export default {
  name: 'RegistrationItemCreateUserAccount',
  components: {
    PasswordStrength,
    SweetalertIcon,
    WatchScopedSlotsCallback,
  },
  props: {
    sliderData: { type: Object, required: true },
    // nonce: { type: String, required: true },
    // email: { type: String, required: true },
  },
  data() {
    const passwordForm = PasswordForm({ translate: this.$t })
    return {
      links,
      supportEmail: emails.SUPPORT,
      formData: {
        name: '',
        // about: '',
        // Wolle name: this.sliderData.collectedInputData.name ? this.sliderData.collectedInputData.name : '',
        about: this.sliderData.collectedInputData.about ? this.sliderData.collectedInputData.about : '',
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
      formErrors: null,
      // Wolle disabled: true,
      response: null,
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      // termsAndConditionsConfirmed: false,
      // dataPrivacy: false,
      // minimumAge: false,
      // noCommercial: false,
      // noPolitical: false,
      // TODO: Our styleguide does not support checkmarks.
      // Integrate termsAndConditionsConfirmed into `this.formData` once we
      // have checkmarks available.
      termsAndConditionsConfirmed: this.sliderData.collectedInputData.termsAndConditionsConfirmed ? this.sliderData.collectedInputData.termsAndConditionsConfirmed : false,
      dataPrivacy: this.sliderData.collectedInputData.dataPrivacy ? this.sliderData.collectedInputData.dataPrivacy : false,
      minimumAge: this.sliderData.collectedInputData.minimumAge ? this.sliderData.collectedInputData.minimumAge : false,
      noCommercial: this.sliderData.collectedInputData.noCommercial ? this.sliderData.collectedInputData.noCommercial : false,
      noPolitical: this.sliderData.collectedInputData.noPolitical ? this.sliderData.collectedInputData.noPolitical : false,
    }
  },
  computed: {
    valid() {
      // console.log('valid !!! this.formErrors: ', this.formErrors)
      // console.log('valid !!! this.$slots: ', this.$slots)
      // console.log('valid !!! this.$scopedSlots: ', this.$scopedSlots)
      // console.log('this.formSchema: ', this.formSchema)
      // console.log('this.formData: ', this.formData)
      // return (this.formErrors ||
      //   !this.termsAndConditionsConfirmed ||
      //   !this.dataPrivacy ||
      //   !this.minimumAge ||
      //   !this.noCommercial ||
      //   !this.noPolitical)
      // const isNotValid = 
      //   // this.formErrors ||
      //   this.formErrors ||
      //   !this.termsAndConditionsConfirmed ||
      //   !this.dataPrivacy ||
      //   !this.minimumAge ||
      //   !this.noCommercial ||
      //   !this.noPolitical
      const isValid = 
        !this.formErrors &&
        this.formData.name.lenght >= 3 &&
        this.termsAndConditionsConfirmed &&
        this.dataPrivacy &&
        this.minimumAge &&
        this.noCommercial &&
        this.noPolitical
      // console.log('valid : ', !isNotValid)
      console.log('valid : ', isValid)
      // const { name, about } = this.formData
      // // const { email, nonce } = this
      // // const { email, nonce } = this.sliderData.collectedInputData
      // const termsAndConditionsAgreedVersion = VERSION
      // const {
      //   termsAndConditionsConfirmed,
      //   dataPrivacy,
      //   minimumAge,
      //   noCommercial,
      //   noPolitical,
      // } = this
      // // const locale = this.$i18n.locale()
      // // this.sliderData.validateCallback(true, {
      // this.sliderData.validateCallback(!isNotValid, {
      //   name,
      //   // password,
      //   about,
      //   // email,
      //   // nonce,
      //   termsAndConditionsAgreedVersion,
      //   termsAndConditionsConfirmed,
      //   dataPrivacy,
      //   minimumAge,
      //   noCommercial,
      //   noPolitical,
      //   // locale,
      // })
      // return !isNotValid
      return isValid
    },
  },
  watch: {
    // notValid(newVal, _oldVal) {
    //   // Wolle const [oldPropertyA, oldProvertyB] = oldVal.split('|');
    //   // const [newPropertyA, newProvertyB] = newVal.split('|');
    //   // doSomething
    //   if (newVal) {
    //     this.sliderData.validateCallback(false)
    //   } else {
    //     const { name, about } = this.formData
    //     // const { email, nonce } = this
    //     // const { email, nonce } = this.sliderData.collectedInputData
    //     const termsAndConditionsAgreedVersion = VERSION
    //     const {
    //       termsAndConditionsConfirmed,
    //       dataPrivacy,
    //       minimumAge,
    //       noCommercial,
    //       noPolitical,
    //     } = this
    //     // const locale = this.$i18n.locale()
    //     // this.sliderData.validateCallback(true, {
    //     this.sliderData.validateCallback(true, {
    //       name,
    //       // password,
    //       about,
    //       // email,
    //       // nonce,
    //       termsAndConditionsAgreedVersion,
    //       termsAndConditionsConfirmed,
    //       dataPrivacy,
    //       minimumAge,
    //       noCommercial,
    //       noPolitical,
    //       // locale,
    //     })
    //   }
    // },
    valid(newVal) {
      // Wolle const [oldPropertyA, oldProvertyB] = oldVal.split('|');
      // const [newPropertyA, newProvertyB] = newVal.split('|');
      // doSomething
      if (newVal) {
        this.sliderData.validateCallback(false)
      } else {
        const { name, about } = this.formData
        // const { email, nonce } = this
        // const { email, nonce } = this.sliderData.collectedInputData
        const termsAndConditionsAgreedVersion = VERSION
        const {
          termsAndConditionsConfirmed,
          dataPrivacy,
          minimumAge,
          noCommercial,
          noPolitical,
        } = this
        // const locale = this.$i18n.locale()
        // this.sliderData.validateCallback(true, {
        this.sliderData.validateCallback(true, {
          name,
          // password,
          about,
          // email,
          // nonce,
          termsAndConditionsAgreedVersion,
          termsAndConditionsConfirmed,
          dataPrivacy,
          minimumAge,
          noCommercial,
          noPolitical,
          // locale,
        })
      }
    },
    formData: {
      handler(newValue) {
        this.sendValidation(newValue)
      },
      deep: true,
      immediate: true,
    },
    termsAndConditionsConfirmed(newValue) {
      this.sendValidation({termsAndConditionsConfirmed: newValue})
    },
    dataPrivacy(newValue) {
      this.sendValidation({dataPrivacy: newValue})
    },
    minimumAge(newValue) {
      this.sendValidation({minimumAge: newValue})
    },
    noCommercial(newValue) {
      this.sendValidation({noCommercial: newValue})
    },
    noPolitical(newValue) {
      this.sendValidation({noPolitical: newValue})
    },
  },
  methods: {
    // setErrors(errors) {
    //   this.formErrors = errors
    //   // console.log('setErrors !!! this.formErrors: ', this.formErrors)
    //   return errors
    // },
    watchScopedSlotsCallback({errors}) {
      this.formErrors = errors
      console.log('watchScopedSlotsCallback !!! this.formErrors: ', this.formErrors)
    },
    sendValidation(newValues) {
      const { name, about } = this.formData
      // const { email, nonce } = this
      // const { email, nonce } = this.sliderData.collectedInputData
      const termsAndConditionsAgreedVersion = VERSION
      const {
        termsAndConditionsConfirmed,
        dataPrivacy,
        minimumAge,
        noCommercial,
        noPolitical,
      } = this
      // const locale = this.$i18n.locale()
      const nowValues = {
        name,
        // password,
        about,
        // email,
        // nonce,
        termsAndConditionsAgreedVersion,
        termsAndConditionsConfirmed,
        dataPrivacy,
        minimumAge,
        noCommercial,
        noPolitical,
        // locale,
      }
      this.sliderData.validateCallback(this.valid, {...nowValues, ...newValues})
    },
    async submit() {
      const { name, password, about } = this.formData
      // const { email, nonce } = this
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
  },
}
</script>

<style lang="scss" scoped>
.create-account-image {
  width: 50%;
  max-width: 200px;
}
</style>
