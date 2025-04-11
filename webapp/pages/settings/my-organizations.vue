<template>
  <base-card>
    <h2 class="title">{{ $t('settings.organizations.name') }}</h2>
    <hc-empty icon="tasks" message="Coming Soon…" />
  </base-card>
</template>

<script>
import HcEmpty from '~/components/Empty/Empty'
import scrollToContent from './scroll-to-content.js'

export default {
  mixins: [scrollToContent],
  components: {
    HcEmpty,
  },
}
</script>
