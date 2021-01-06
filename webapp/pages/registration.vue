<template>
  <ds-container width="small">
    <base-card>
      <template #imageColumn>
        <a :href="links.ORGANIZATION" :title="$t('login.moreInfo', metadata)" target="_blank">
          <img class="image" alt="Sign up" src="/img/custom/sign-up.svg" />
        </a>
      </template>
      <nuxt-child />
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </ds-container>
</template>

<script>
import links from '~/constants/links.js'
import metadata from '~/constants/metadata.js'
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'

export default {
  components: {
    LocaleSwitch,
  },
  layout: 'no-header',
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
.image {
  width: 100%;
}
</style>
