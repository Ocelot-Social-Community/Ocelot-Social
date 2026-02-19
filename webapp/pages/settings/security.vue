<template>
  <os-card>
    <h2 class="title">{{ $t('settings.security.name') }}</h2>
    <change-password />
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import ChangePassword from '~/components/Password/Change'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    ChangePassword,
  },
}
</script>
