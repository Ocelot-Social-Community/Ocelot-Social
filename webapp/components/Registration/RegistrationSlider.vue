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
          <registration-item-enter-invite :sliderData="sliderData" :email="'user@example.org'">
            <ds-space margin-bottom="xxx-small" margin-top="large" centered>
              <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
            </ds-space>
          </registration-item-enter-invite>
        </template>
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
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import ComponentSlider from '~/components/ComponentSlider/ComponentSlider'
import RegistrationItemEnterInvite from './RegistrationItemEnterInvite'
import RegistrationItemCreateUserAccount from './RegistrationItemCreateUserAccount'
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'

export default {
  name: 'RegistrationSlider',
  components: {
    LocaleSwitch,
    ComponentSlider,
    RegistrationItemEnterInvite,
    RegistrationItemCreateUserAccount,
  },
  // Wolle props: {
  //   id: { type: String },
  //   loading: { type: Boolean, default: false },
  //   options: { type: Array, default: () => [] },
  // },
  data() {
    return {
      links,
      metadata,
      sliderData: {
        collectedComponentData: {},
        sliders: ['enter-invite', 'create-user-account'],
        activeSliderName: 'enter-invite',
        sliderSelectorCallback: this.sliderSelectorCallback,
        validateCallback: this.validateCallback,
        button: {
          title: 'Next', // Wolle
          disabled: true,
          callback: this.buttonCallback,
        },
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
      return this.sliderData.sliders.findIndex((sliderName) => sliderName === name)
    },
    validateCallback(is, data = null) {
      if (is) {
        this.sliderData.collectedComponentData = {
          ...this.sliderData.collectedComponentData,
          ...data,
        }
      }
      this.sliderData.button.disabled = !is
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
          this.sliderData.activeSliderName = this.sliderData.sliders[this.sliderIndex + 1]
          this.sliderData.button.disabled = true
        }
        if (this.sliderIndex === this.sliderData.sliders.length - 1) {
          this.sliderData.button.title = this.$t('actions.save') // Wolle
        }
      }
    },
  },
}
</script>

<style lang="scss"></style>
