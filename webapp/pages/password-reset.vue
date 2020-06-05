<template>
  <ds-container width="small" class="password-reset">
    <base-card>
      <template #imageColumn>
        <img alt="Reset your password" src="/custom/password-reset.svg" class="image" />
      </template>
      <nuxt-child />
      <template #topMenu>
        <locale-switch offset="5" />
      </template>
    </base-card>
  </ds-container>
</template>

<script>
import LocaleSwitch from '~/components/LocaleSwitch/LocaleSwitch'

export default {
  components: {
    LocaleSwitch,
  },
  layout: 'no-header',
  asyncData({ store, redirect }) {
    if (store.getters['auth/isLoggedIn']) {
      redirect('/')
    }
  },
}
</script>
