<template>
  <section class="login-form">
    <base-card>
      <template #imageColumn>
        <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
          <img class="image" alt="Welcome" src="/img/custom/welcome.svg" />
        </a>
      </template>

      <component-slider :sliderData="sliderData">
        <template #header>
          <ds-heading size="h2">
            {{ $t('components.registration.signup.title', metadata) }}
          </ds-heading>
        </template>

        <template v-if="['invite-code'].includes(registrationType)" #enter-invite>
          <registration-item-enter-invite :sliderData="sliderData" />
        </template>

        <template
          v-if="['invite-code', 'public-registration'].includes(registrationType)"
          #enter-email
        >
          <!-- Wolle !!! may create same source with 'webapp/pages/registration/signup.vue' -->
          <!-- <signup v-if="publicRegistration" :invitation="false" @submit="handleSubmitted"> -->
          <registration-item-enter-email  ref="RegistrationItemEnterEmail" :sliderData="sliderData" :invitation="false" />
        </template>

        <template
          v-if="['invite-code', 'public-registration', 'invite-mail'].includes(registrationType)"
          #enter-nonce
        >
          <registration-item-enter-nonce :sliderData="sliderData" />
        </template>

        <template #create-user-account>
          <registration-item-create-user-account
            :sliderData="sliderData"
            nonce="AAAAAA"
            email="user@example.org"
          />
        </template>

        <template #footer>
          <ds-space margin-bottom="xxx-small" margin-top="small" centered>
            <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
          </ds-space>
        </template>
      </component-slider>

      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </section>
</template>

<script>
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import ComponentSlider from '~/components/ComponentSlider/ComponentSlider'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import RegistrationItemCreateUserAccount from './RegistrationItemCreateUserAccount'
import RegistrationItemEnterEmail from '~/components/Registration/RegistrationItemEnterEmail'
import RegistrationItemEnterInvite from './RegistrationItemEnterInvite'
import RegistrationItemEnterNonce from './RegistrationItemEnterNonce'

export default {
  name: 'RegistrationSlider',
  components: {
    ComponentSlider,
    LocaleSwitch,
    RegistrationItemCreateUserAccount,
    RegistrationItemEnterEmail,
    RegistrationItemEnterInvite,
    RegistrationItemEnterNonce,
  },
  props: {
    registrationType: { type: String, required: true },
    overwriteSliderData: { type: Object, default: () => {} },
  },
  data() {
    const slidersPortfolio = [
      {
        name: 'enter-invite',
        // title: this.$t('components.registration.create-user-account.title'),
        title: 'Invitation', // Wolle
        validated: false,
        data: { request: null, response: { isValidInviteCode: false } },
        button: {
          title: 'Next', // Wolle
          icon: 'arrow-right',
          callback: this.buttonCallback,
        },
      },
      {
        name: 'enter-email',
        title: 'E-Mail', // Wolle
        validated: false,
        data: { request: null, response: null },
        button: {
          // title: 'Send E-Mail', // Wolle
          title: this.enterEmailButtonTitle(this.overwriteSliderData.emailSend), // Wolle
          icon: 'envelope',
          callback: this.buttonCallback,
        },
      },
      {
        name: 'enter-nonce',
        title: 'E-Mail Confirmation', // Wolle
        validated: false,
        button: {
          title: 'Confirm', // Wolle
          icon: 'arrow-right',
          callback: this.buttonCallback,
        },
      },
      {
        name: 'create-user-account',
        title: this.$t('components.registration.create-user-account.title'),
        validated: false,
        button: {
          // title: this.$t('actions.save'), // Wolle
          title: 'Create', // Wolle
          icon: 'check',
          callback: this.buttonCallback,
        },
      },
    ]
    let sliders = []
    switch (this.registrationType) {
      case 'invite-code':
        sliders = [
          slidersPortfolio[0],
          slidersPortfolio[1],
          slidersPortfolio[2],
          slidersPortfolio[3],
        ]
        break
      case 'public-registration':
        sliders = [slidersPortfolio[1], slidersPortfolio[2], slidersPortfolio[3]]
        break
      case 'invite-mail':
        sliders = [slidersPortfolio[2], slidersPortfolio[3]]
        break
    }

    return {
      links,
      metadata,
      sliderData: {
        collectedInputData: {
          inviteCode: null,
          email: null,
          emailSend: null,
          nonce: null,
          name: null,
          password: null,
          passwordConfirmation: null,
          about: null,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: null,
          dataPrivacy: null,
          minimumAge: null,
          noCommercial: null,
          noPolitical: null,
          locale: null, // Wolle: what to do? Is collected in the last slider?! and gets stored in the database …
        },
        sliderIndex: 0,
        sliders: sliders,
        sliderSelectorCallback: this.sliderSelectorCallback,
        validateCallback: this.validateCallback,
        ...this.overwriteSliderData,
      },
    }
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex
    },
  },
  methods: {
    enterEmailButtonTitle(emailSend) {
      return emailSend ? 'Resend E-Mail' : 'Send E-Mail'
    },
    validateCallback(isValid, data = null) {
      this.sliderData.sliders[this.sliderIndex].validated = isValid
      if (data) {
        this.sliderData.collectedInputData = {
          ...this.sliderData.collectedInputData,
          ...data,
        }
      }
    },
    sliderSelectorCallback(selectedIndex) {
      if (selectedIndex < this.sliderIndex) {
        this.sliderData.sliderIndex = selectedIndex
      }
    },
    buttonCallback() {
      if (this.sliderData.sliders[this.sliderIndex].name === 'enter-email') {
        this.$refs.RegistrationItemEnterEmail.handleSubmitVerify()
        this.sliderData.sliders[this.sliderIndex].button.title = this.enterEmailButtonTitle(this.sliderData.collectedInputData.emailSend)
      }

      if (this.sliderIndex === this.sliderData.sliders.length - 1) {
        // console.log('submit data: ', this.sliderData.collectedInputData)
      } else {
        if (this.sliderIndex < this.sliderData.sliders.length - 1) {
          this.sliderData.sliderIndex++
          if (this.sliderData.sliders[this.sliderIndex] === 'create-user-account') {
            this.sliderData.sliders[this.sliderIndex].validated = false
          }
        }
      }
    },
  },
}
</script>

<style lang="scss"></style>
