<template>
  <ds-section>
    <ds-space>
      <ds-heading size="h3">{{ $t('admin.invites.title') }}</ds-heading>
      <ds-text>{{ $t('admin.invites.description') }}</ds-text>
    </ds-space>
    <os-card>
      <signup :invitation="true" />
    </os-card>
  </ds-section>
</template>

<script>
import { OsCard } from '@ocelot-social/ui'
import Signup from '~/components/Registration/Signup'

export default {
  components: {
    OsCard,
    Signup,
  },
}
</script>
