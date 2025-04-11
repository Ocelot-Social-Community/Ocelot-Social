<template>
  <base-card>
    <h2 class="title">{{ $t('settings.security.name') }}</h2>
    <change-password />
  </base-card>
</template>

<script>
import ChangePassword from '~/components/Password/Change'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    ChangePassword,
  },
}
</script>
