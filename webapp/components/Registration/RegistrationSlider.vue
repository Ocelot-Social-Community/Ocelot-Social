<template>
  <section class="login-form">
    <base-card>
      <template #imageColumn>
        <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
          <img class="image" alt="Welcome" src="/img/custom/welcome.svg" />
        </a>
      </template>
      <h1 class="title">{{ $t('components.registration.signup.title', metadata) }}</h1>
      <component-slider :sliders="sliders">
        <template #enter-nonce>
          <registration-item-enter-invite email="user@example.org">
            <ds-space margin-bottom="xxx-small" margin-top="large" centered>
              <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
            </ds-space>
          </registration-item-enter-invite>
        </template>
        <template #create-user-account>
          <registration-item-create-user-account nonce="AAAAAA" email="user@example.org" />
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
      sliders: ['enter-nonce', 'create-user-account'],
    }
  },
  computed: {
    // Wolle emptyText() {
    //   return this.isActive && !this.loading ? this.$t('search.failed') : this.$t('search.hint')
    // },
  },
  methods: {
    // Wolle clear() {
    //   this.unprocessedSearchInput = ''
    //   this.previousSearchTerm = ''
    //   this.searchValue = ''
    //   this.$emit('clearSearch')
    //   clearTimeout(this.searchProcess)
    // },
  },
}
</script>

<style lang="scss">
</style>
