<template>
  <section class="ds-section">
    <div class="ds-mb-large">
      <h1 class="ds-heading ds-heading-h3">{{ $t('admin.invites.title') }}</h1>
      <p class="ds-text">{{ $t('admin.invites.description') }}</p>
    </div>
    <os-card>
      <signup :invitation="true" />
    </os-card>
  </section>
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
