<template>
  <ds-container width="small" class="password-reset">
    <div class="back-link">
      <nuxt-link to="/login">{{ $t('site.back-to-login') }}</nuxt-link>
    </div>

    <os-card class="--columns">
      <aside class="image-column">
        <page-params-link :pageParams="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)">
          <logo logoType="passwordReset" />
        </page-params-link>
      </aside>
      <section class="content-column">
        <nuxt-child />
      </section>
      <aside class="top-menu">
        <locale-switch offset="5" />
      </aside>
    </os-card>
  </ds-container>
</template>

<script>
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import loginConstants from '~/constants/loginBranded.js'
import { OsCard } from '@ocelot-social/ui'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'
import Logo from '~/components/Logo/Logo'
import PageParamsLink from '~/components/_new/features/PageParamsLink/PageParamsLink.vue'

export default {
  components: {
    LocaleSwitch,
    Logo,
    OsCard,
    PageParamsLink,
  },
  layout: loginConstants.LAYOUT,
  data() {
    return {
      metadata,
      links,
    }
  },
  asyncData({ store, redirect }) {
    if (store.getters['auth/isLoggedIn']) {
      redirect('/')
    }
  },
}
</script>

<style lang="scss">
.back-link {
  height: 35px;
}
</style>
