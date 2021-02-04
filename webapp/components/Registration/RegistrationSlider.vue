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

        <template #enter-invite>
          <registration-item-enter-invite :sliderData="sliderData" />
        </template>

        <!-- <template #enter-email> -->
        <!-- Wolle !!! may create same source with 'webapp/pages/registration/signup.vue' -->
        <!-- <signup v-if="publicRegistration" :invitation="false" @submit="handleSubmitted"> -->
        <!-- <signup :invitation="false" @submit="handleSubmitted">
            <ds-space centered margin-top="large">
              <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
            </ds-space>
          </signup> -->
        <!-- <ds-space v-else centered>
            <hc-empty icon="events" :message="$t('components.registration.signup.unavailable')" />
            <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
          </ds-space> -->
        <!-- </template> -->

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
import Signup from '~/components/Registration/Signup'
import HcEmpty from '~/components/Empty/Empty'
import RegistrationItemEnterInvite from './RegistrationItemEnterInvite'
import RegistrationItemCreateUserAccount from './RegistrationItemCreateUserAccount'

export default {
  name: 'RegistrationSlider',
  components: {
    ComponentSlider,
    HcEmpty,
    LocaleSwitch,
    RegistrationItemEnterInvite,
    RegistrationItemCreateUserAccount,
    Signup,
  },
  data() {
    return {
      links,
      metadata,
      sliderData: {
        collectedInputData: {
          inviteCode: null,
          email: null,
          nonce: null,
          name: null,
          // password: null,
          about: null,
          termsAndConditionsAgreedVersion: null,
          termsAndConditionsConfirmed: null,
          dataPrivacy: null,
          minimumAge: null,
          noCommercial: null,
          noPolitical: null,
          // locale: null, // Wolle: what to do? Is collected in the last slider?! and gets stored in the database …
        },
        sliderIndex: 0,
        sliders: [
          {
            name: 'enter-invite',
            // title: this.$t('components.registration.create-user-account.title'),
            title: 'Invitation', // Wolle
            validated: false,
            button: {
              title: 'Next', // Wolle
              icon: 'arrow-right',
              callback: this.buttonCallback,
            },
          },
          // {
          //   name: 'enter-email',
          // validated: false,
          // title: 'E-Mail', // Wolle
          // button: {
          //   title: 'Next', // Wolle
          // icon:           :icon="(sliderIndex < sliderData.sliders.length - 1 && 'arrow-right') || (sliderIndex === sliderData.sliders.length - 1 && 'check')"
          //   callback: this.buttonCallback,
          // },
          // },
          {
            name: 'create-user-account',
            title: this.$t('components.registration.create-user-account.title'),
            validated: false,
            button: {
              title: this.$t('actions.save'), // Wolle
              icon: 'check',
              callback: this.buttonCallback,
            },
          },
        ],
        sliderSelectorCallback: this.sliderSelectorCallback,
        validateCallback: this.validateCallback,
      },
    }
  },
  computed: {
    sliderIndex() {
      return this.sliderData.sliderIndex
    },
  },
  methods: {
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
