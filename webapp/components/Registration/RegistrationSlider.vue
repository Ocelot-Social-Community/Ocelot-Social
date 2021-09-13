<template>
  <section class="registration-slider">
    <base-card>
      <template #imageColumn>
        <page-params-link :pageParams="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)">
          <logo logoType="signup" />
        </page-params-link>
      </template>

      <component-slider :sliderData="sliderData">
        <template #no-public-registration>
          <registration-slide-no-public :sliderData="sliderData" />
        </template>

        <template #enter-invite>
          <registration-slide-invite :sliderData="sliderData" />
        </template>

        <template #enter-email>
          <registration-slide-email :sliderData="sliderData" :invitation="false" />
        </template>

        <template #enter-nonce>
          <registration-slide-nonce :sliderData="sliderData" />
        </template>

        <template #create-user-account>
          <registration-slide-create :sliderData="sliderData" />
        </template>

        <template v-if="registrationType !== 'no-public-registration'" #footer>
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
import Logo from '~/components/Logo/Logo'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'
import RegistrationSlideCreate from './RegistrationSlideCreate'
import RegistrationSlideEmail from './RegistrationSlideEmail'
import RegistrationSlideInvite from './RegistrationSlideInvite'
import RegistrationSlideNonce from './RegistrationSlideNonce'
import RegistrationSlideNoPublic from './RegistrationSlideNoPublic'

export default {
  name: 'RegistrationSlider',
  components: {
    ComponentSlider,
    LocaleSwitch,
    Logo,
    PageParamsLink,
    RegistrationSlideCreate,
    RegistrationSlideEmail,
    RegistrationSlideInvite,
    RegistrationSlideNonce,
    RegistrationSlideNoPublic,
  },
  props: {
    registrationType: { type: String, required: true },
    overwriteSliderData: { type: Object, default: () => {} },
    activePage: { type: String, default: null, required: false },
  },
  data() {
    const slidersPortfolio = {
      noPublicRegistration: {
        name: 'no-public-registration',
        titleIdent: 'components.registration.no-public-registrstion.title',
        validated: false,
        data: { request: null, response: null },
        button: {
          titleIdent: 'site.back-to-login',
          icon: null,
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      enterInvite: {
        name: 'enter-invite',
        titleIdent: { id: 'components.registration.signup.title', data: metadata },
        validated: false,
        data: { request: null, response: { isValidInviteCode: false } },
        button: {
          titleIdent: 'components.registration.invite-code.buttonTitle',
          icon: 'arrow-right',
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      enterEmail: {
        name: 'enter-email',
        titleIdent: 'components.registration.email.title',
        validated: false,
        data: { request: null, response: null },
        button: {
          titleIdent: 'components.registration.email.buttonTitle.send', // changed by slider component
          icon: 'envelope', // changed by slider component
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      enterNonce: {
        name: 'enter-nonce',
        titleIdent: 'components.registration.email-nonce.title',
        validated: false,
        data: { request: null, response: { VerifyNonce: false } },
        button: {
          titleIdent: 'components.registration.email-nonce.buttonTitle',
          icon: 'arrow-right',
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
      createUserAccount: {
        name: 'create-user-account',
        titleIdent: 'components.registration.create-user-account.title',
        validated: false,
        data: { request: null, response: null },
        button: {
          titleIdent: 'components.registration.create-user-account.buttonTitle',
          icon: 'check',
          loading: false,
          callback: this.buttonCallback,
          sliderCallback: null, // optional set by slot
        },
      },
    }
    let sliders = []
    switch (this.registrationType) {
      case 'no-public-registration':
        sliders = [slidersPortfolio.noPublicRegistration]
        break
      case 'invite-code':
        sliders = [
          slidersPortfolio.enterInvite,
          slidersPortfolio.enterEmail,
          slidersPortfolio.enterNonce,
          slidersPortfolio.createUserAccount,
        ]
        break
      case 'public-registration':
        sliders = [
          slidersPortfolio.enterEmail,
          slidersPortfolio.enterNonce,
          slidersPortfolio.createUserAccount,
        ]
        break
      case 'invite-mail':
        sliders = [slidersPortfolio.enterNonce, slidersPortfolio.createUserAccount]
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
          termsAndConditionsConfirmed: null,
          recieveCommunicationAsEmailsEtcConfirmed: null,
        },
        sliderIndex:
          this.activePage === null ? 0 : sliders.findIndex((el) => el.name === this.activePage),
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
    setSliderValuesCallback(
      isValid = null,
      { collectedInputData, sliderData, sliderSettings } = {},
    ) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      if (isValid !== null) {
        this.sliderData.sliders[this.sliderIndex].validated = isValid
      }
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
        const { buttonTitleIdent, buttonIcon, buttonLoading, buttonSliderCallback } = sliderSettings
        if (buttonTitleIdent !== undefined) {
          this.sliderData.sliders[this.sliderIndex].button.titleIdent = buttonTitleIdent
        }
        if (buttonIcon !== undefined) {
          this.sliderData.sliders[this.sliderIndex].button.icon = buttonIcon
        }
        if (buttonLoading !== undefined) {
          this.sliderData.sliders[this.sliderIndex].button.loading = buttonLoading
        }
        if (buttonSliderCallback !== undefined) {
          this.sliderData.sliders[this.sliderIndex].button.sliderCallback = buttonSliderCallback
        }
      }
    },
    sliderSelectorCallback(selectedIndex) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      if (selectedIndex <= this.sliderIndex + 1 && selectedIndex < this.sliderData.sliders.length) {
        this.sliderData.sliderIndex = selectedIndex

        if (this.sliderData.sliders[this.sliderIndex].button.loading !== undefined) {
          this.sliderData.sliders[this.sliderIndex].button.loading = false
        }
      }
    },
    buttonCallback(success) {
      // all changes of 'this.sliders' has to be filled in from the top to be spread to the component slider and all slider components in the slot

      return success
    },
  },
}
</script>

<style lang="scss">
.registration-slider {
  width: 80vw;
  max-width: 620px;
  margin: auto;
}
</style>
