<template>
  <os-card>
    <h2 class="title">{{ $t('admin.notifications.name') }}</h2>
    <hc-empty icon="tasks" message="Coming Soon…" />
  </os-card>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import HcEmpty from '~/components/Empty/Empty'

export default {
  components: {
    OsCard,
    HcEmpty,
  },
}
</script>
