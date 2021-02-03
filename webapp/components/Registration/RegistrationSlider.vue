<template>
  <section class="login-form">
    <base-card>
      <template #imageColumn>
        <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
          <img class="image" alt="Welcome" src="/img/custom/welcome.svg" />
        </a>
      </template>

      <h1 class="title">{{ $t('components.registration.signup.title', metadata) }}</h1>

      <component-slider :sliderData="sliderData">
        <template #enter-invite>
          <registration-item-enter-invite :sliderData="sliderData" :inviteCode="sliderData.collectedComponentData.inviteCode ? sliderData.collectedComponentData.inviteCode : ''" :email="sliderData.collectedComponentData.email ? sliderData.collectedComponentData.email : ''">
            <ds-space margin-bottom="xxx-small" margin-top="large" centered>
              <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
            </ds-space>
          </registration-item-enter-invite>
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
        collectedComponentData: {
          inviteCode: null,
          email: null,
        },
        // sliderIndex: 0,
        sliders: [
          {
            name: 'enter-invite',
            validated: false,
            button: {
              title: 'Next', // Wolle
              callback: this.buttonCallback,
            },
          },
          // {
          //   name: 'enter-email',
            // validated: false,
            // button: {
            //   title: 'Next', // Wolle
            //   callback: this.buttonCallback,
            // },
          // },
          {
            name: 'create-user-account',
            validated: false,
            button: {
              title: this.$t('actions.save'), // Wolle
              callback: this.buttonCallback,
            },
          },
        ],
        activeSliderName: 'enter-invite',
        sliderSelectorCallback: this.sliderSelectorCallback,
        validateCallback: this.validateCallback,
      },
    }
  },
  computed: {
    sliderIndex() {
      return this.sliderIndexByName(this.sliderData.activeSliderName)
    },
  },
  methods: {
    sliderIndexByName(name) {
      return this.sliderData.sliders.findIndex((slider) => slider.name === name)
    },
    validateCallback(is, data = null) {
      if (is) {
        this.sliderData.collectedComponentData = {
          ...this.sliderData.collectedComponentData,
          ...data,
        }
      }
      this.sliderData.sliders[this.sliderIndex].validated = is
    },
    sliderSelectorCallback(sliderName) {
      if (this.sliderIndexByName(sliderName) < this.sliderIndex) {
        this.sliderData.activeSliderName = sliderName
      }
    },
    buttonCallback() {
      if (this.sliderIndex === this.sliderData.sliders.length - 1) {
        // console.log('submit data: ', this.sliderData.collectedComponentData)
      } else {
        if (this.sliderIndex < this.sliderData.sliders.length - 1) {
          this.sliderData.activeSliderName = this.sliderData.sliders[this.sliderIndex + 1].name
        }
      }
    },
  },
}
</script>

<style lang="scss"></style>
