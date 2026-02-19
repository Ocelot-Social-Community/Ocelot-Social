<template>
  <os-card>
    <h2 class="title">{{ $t('settings.invites.name') }}</h2>
    <hc-empty icon="tasks" message="Coming Soon…" />
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import HcEmpty from '~/components/Empty/Empty'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    OsCard,
    HcEmpty,
  },
}
</script>
