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
          <registration-item-enter-email :sliderData="sliderData" :invitation="false" />
        </template>

        <template
          v-if="['invite-code', 'public-registration', 'invite-mail'].includes(registrationType)"
          #enter-nonce
        >
          <registration-item-enter-nonce :sliderData="sliderData" />
        </template>

        <template #create-user-account>
          <registration-item-create-user-account :sliderData="sliderData" />
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
          sliderCallback: null, // optional set by slot
        },
      },
      {
        name: 'enter-email',
        title: 'E-Mail', // Wolle
        validated: false,
        data: { request: null, response: null },
        button: {
          title: '', // set by slider component
          icon: '', // set by slider component
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      {
        name: 'enter-nonce',
        title: 'E-Mail Confirmation', // Wolle
        validated: false,
        data: { request: null, response: null },
        button: {
          title: 'Confirm', // Wolle
          icon: 'arrow-right',
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      {
        name: 'create-user-account',
        title: this.$t('components.registration.create-user-account.title'),
        validated: false,
        data: { request: null, response: null },
        button: {
          // title: this.$t('actions.save'), // Wolle
          title: 'Create', // Wolle
          icon: 'check',
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
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
          termsAndConditionsConfirmed: null,
          dataPrivacy: null,
          minimumAge: null,
          noCommercial: null,
          noPolitical: null,
        },
        sliderIndex: 0,
        sliders: sliders,
        sliderSelectorCallback: this.sliderSelectorCallback,
        setSliderValuesCallback: this.setSliderValuesCallback,
        ...this.overwriteSliderData,
      },
    }
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex // to have a shorter notation
    },
  },
  methods: {
    setSliderValuesCallback(isValid, { collectedInputData, sliderData, sliderSettings }) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      this.sliderData.sliders[this.sliderIndex].validated = isValid

      if (collectedInputData) {
        this.sliderData.collectedInputData = {
          ...this.sliderData.collectedInputData,
          ...collectedInputData,
        }
      }
      if (sliderData) {
        if (this.sliderData.sliders[this.sliderIndex].data) {
          this.sliderData.sliders[this.sliderIndex].data = {
            request: sliderData.request
              ? sliderData.request
              : this.sliderData.sliders[this.sliderIndex].data.request,
            response: sliderData.response
              ? sliderData.response
              : this.sliderData.sliders[this.sliderIndex].data.response,
          }
        }
      }
      if (sliderSettings) {
        const { buttonTitle, buttonIcon, buttonSliderCallback } = sliderSettings
        if (buttonTitle) {
          this.sliderData.sliders[this.sliderIndex].button.title = buttonTitle
        }
        if (buttonIcon) {
          this.sliderData.sliders[this.sliderIndex].button.icon = buttonIcon
        }
        if (buttonSliderCallback) {
          this.sliderData.sliders[this.sliderIndex].button.sliderCallback = buttonSliderCallback
        }
      }
    },
    sliderSelectorCallback(selectedIndex) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      if (selectedIndex <= this.sliderIndex + 1 && selectedIndex < this.sliderData.sliders.length) {
        this.sliderData.sliderIndex = selectedIndex
      }
    },
    buttonCallback(success) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      return success
    },
  },
}
</script>

<style lang="scss"></style>
